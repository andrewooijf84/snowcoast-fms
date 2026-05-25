import { useState, useCallback } from 'react'
import * as XLSX from 'xlsx'
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle, AlertTriangle, Download } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Spinner } from '@/components/ui/spinner'
import { downloadExcelReport } from '@/lib/excelImport'
import { fetchExistingOrderNos, createOrder, updateOrder } from '@/lib/api'

// ── Helpers ────────────────────────────────────────────────────────────────────

function str(v) { return String(v ?? '').trim() }

// Robust date parser — handles JS Date, Excel serial number, and string formats
function parseDate(v) {
  if (v === null || v === undefined || v === '') return null
  if (v instanceof Date) {
    if (isNaN(v.getTime())) return null
    const y  = v.getFullYear()
    const mo = String(v.getMonth() + 1).padStart(2, '0')
    const da = String(v.getDate()).padStart(2, '0')
    return `${y}-${mo}-${da}`
  }
  if (typeof v === 'number') {
    // Excel serial → UTC date
    const ms = Math.round((v - 25569) * 86400 * 1000)
    const d  = new Date(ms)
    if (isNaN(d.getTime())) return null
    const y  = d.getUTCFullYear()
    const mo = String(d.getUTCMonth() + 1).padStart(2, '0')
    const da = String(d.getUTCDate()).padStart(2, '0')
    return `${y}-${mo}-${da}`
  }
  if (typeof v === 'string') {
    const s = v.trim()
    if (!s) return null
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
    // "6/15/2026" or "15/6/2026" or "Jun 15, 2026" etc.
    const d = new Date(s)
    if (!isNaN(d.getTime())) {
      const y  = d.getFullYear()
      const mo = String(d.getMonth() + 1).padStart(2, '0')
      const da = String(d.getDate()).padStart(2, '0')
      return `${y}-${mo}-${da}`
    }
  }
  return null
}

// ── Parser ─────────────────────────────────────────────────────────────────────
// Sheet: "Order & Portions"
// Col: A=row#(skip) B=order_no C=customer D=style E=order_qty
//      F=smv G=emb(YES/NO) H=season I=portion_name J=portion_qty
//      K=mat_arrival L=cut_start M=emb_start N=sew_start O=completion P=exfactory Q=notes

const DATE_COLS = ['K','L','M','N','O','P']
const DATE_KEYS = ['materialArrivalDate','cutStartDate','embStartDate','sewStartDate','completionDate','exfactoryDate']

// Words that indicate a row is a header / label, not data
const HEADER_WORDS = new Set([
  'order_number','order no','order no.','orderno','order number',
  'b','col b','column b','#','no','no.',
])

function isHeaderCell(v) {
  if (v === null || v === undefined || v === '') return false
  return HEADER_WORDS.has(String(v).trim().toLowerCase())
}

function parseSheet(rows) {
  // Auto-detect where data starts:
  // Find the first row where col B is non-empty AND not a header keyword.
  // This handles templates that have any number of title rows above.
  let dataStart = 0
  for (let i = 0; i < rows.length; i++) {
    const b = rows[i][1]  // column B (index 1)
    if (b !== null && b !== undefined && b !== '' && !isHeaderCell(b)) {
      dataStart = i
      break
    }
  }

  const data        = rows.slice(dataStart)
  const groups      = {}      // orderNo → order record
  const errors      = []
  const allPortions = []      // flat list for preview tab

  data.forEach((row, i) => {
    const [A, B, C, D, E, F, G, H, Ic, J, K, L, M, N, O, P, Q] = row

    // Skip rows where B C D E are ALL empty/null
    const empty = v => v === null || v === undefined || v === ''
    if (empty(B) && empty(C) && empty(D) && empty(E)) return

    const rowNum  = dataStart + i + 1   // 1-based row number for error messages
    const orderNo  = str(B)
    const customer = str(C)
    const style    = str(D)
    const qty      = parseInt(str(E), 10) || 0
    const smv      = !empty(F) ? Number(F) : null
    const requiresEmbroidery = str(G).toUpperCase() === 'YES'
    const season   = str(H)
    const portionName = str(Ic) || 'Full order'
    const portionQtyRaw = !empty(J) ? parseInt(str(J), 10) : null

    const errs = []
    if (!orderNo)  errs.push('Order No (col B) is required')
    if (!customer) errs.push('Customer (col C) is required')
    if (!style)    errs.push('Style (col D) is required')
    if (empty(E) || qty <= 0) errs.push('Order Qty (col E) must be > 0')
    if (portionQtyRaw !== null && portionQtyRaw <= 0) errs.push('Portion Qty (col J) must be > 0')

    // Parse date columns K–P
    const parsedDates = {}
    DATE_KEYS.forEach((key, di) => {
      const raw = [K, L, M, N, O, P][di]
      if (!empty(raw)) {
        const s = parseDate(raw)
        if (!s) errs.push(`Invalid date in col ${DATE_COLS[di]}`)
        parsedDates[key] = s
      } else {
        parsedDates[key] = null
      }
    })

    if (errs.length) {
      errors.push({ rowNum, orderNo: orderNo || '—', error: errs.join('; ') })
      return
    }

    if (!groups[orderNo]) {
      groups[orderNo] = {
        orderNo, buyer: customer, style, qty,
        smv, requiresEmbroidery, season,
        notes: str(Q),
        portions: [],
        rowNum,
      }
    }

    const portion = {
      portionName,
      portionQty: portionQtyRaw ?? qty,
      status: 'pending',
      ...parsedDates,
    }
    groups[orderNo].portions.push(portion)
    allPortions.push({
      orderNo, portionName,
      portionQty:    portion.portionQty,
      sewStartDate:  parsedDates.sewStartDate,
      completionDate: parsedDates.completionDate,
      exfactoryDate: parsedDates.exfactoryDate,
    })
  })

  return { groups: Object.values(groups), errors, allPortions }
}

// ── Paged Table ────────────────────────────────────────────────────────────────

function PagedTable({ rows, columns, extra }) {
  const PAGE = 10
  const [page, setPage] = useState(0)
  const total = rows.length
  const slice = rows.slice(page * PAGE, page * PAGE + PAGE)
  return (
    <div className="space-y-2">
      <div className="overflow-auto rounded border border-slate-200">
        <table className="w-full text-xs">
          <thead className="bg-slate-50">
            <tr>
              {columns.map(c => (
                <th key={c.key} className="text-left px-3 py-2 font-semibold text-slate-500 whitespace-nowrap">{c.label}</th>
              ))}
              {extra && <th className="px-3 py-2" />}
            </tr>
          </thead>
          <tbody>
            {slice.map((row, i) => (
              <tr key={i} className="border-t border-slate-100 hover:bg-slate-50">
                {columns.map(c => (
                  <td key={c.key} className="px-3 py-2 text-slate-700">
                    {c.render ? c.render(row) : (row[c.key] ?? '—')}
                  </td>
                ))}
                {extra && <td className="px-3 py-2">{extra(row)}</td>}
              </tr>
            ))}
            {!slice.length && (
              <tr>
                <td colSpan={columns.length + (extra ? 1 : 0)} className="px-3 py-6 text-center text-slate-400">
                  No rows
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {total > PAGE && (
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>{page * PAGE + 1}–{Math.min((page + 1) * PAGE, total)} of {total}</span>
          <div className="flex gap-1">
            <button onClick={() => setPage(p => p - 1)} disabled={page === 0}
              className="px-2 py-1 rounded border disabled:opacity-40 hover:bg-slate-100">‹</button>
            <button onClick={() => setPage(p => p + 1)} disabled={(page + 1) * PAGE >= total}
              className="px-2 py-1 rounded border disabled:opacity-40 hover:bg-slate-100">›</button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main Modal ─────────────────────────────────────────────────────────────────

export default function OrderImportModal({ open, onClose, onImportDone }) {
  const [step, setStep]             = useState('upload')
  const [parsed, setParsed]         = useState(null)
  const [dupActions, setDupActions] = useState({})
  const [result, setResult]         = useState(null)
  const [errMsg, setErrMsg]         = useState('')
  const [dragging, setDragging]     = useState(false)
  const [debugInfo, setDebugInfo]   = useState('')

  const reset = () => {
    setStep('upload'); setParsed(null); setDupActions({})
    setResult(null); setErrMsg(''); setDebugInfo('')
  }
  const handleClose = () => { reset(); onClose() }

  const processFile = useCallback(async (file) => {
    if (!file?.name.endsWith('.xlsx')) { setErrMsg('Please upload an .xlsx file.'); return }
    setStep('parsing'); setErrMsg(''); setDebugInfo('')
    try {
      const buf = await file.arrayBuffer()
      const wb  = XLSX.read(buf, { type: 'array', cellDates: true })

      const sheetNames = Object.keys(wb.Sheets)

      // Find sheet — case-insensitive, ignoring extra spaces
      const targetName = sheetNames.find(
        n => n.trim().toLowerCase().replace(/\s+/g, ' ') === 'order & portions'
      )
      if (!targetName) {
        throw new Error(
          `Sheet "Order & Portions" not found.\nSheets in this file: ${sheetNames.join(', ') || '(none)'}`
        )
      }

      const ws   = wb.Sheets[targetName]
      // raw: true + cellDates: true → date cells come as JS Date objects, numbers as numbers, strings as strings
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, raw: true })

      if (!rows.length) throw new Error('The sheet is empty.')

      // Debug info — show first 8 rows so we can diagnose layout issues
      const preview = rows.slice(0, 8).map((r, i) =>
        `Row ${i+1}: B="${r[1]}" C="${r[2]}" D="${r[3]}" E="${r[4]}"`
      ).join('\n')
      setDebugInfo(`Sheet found: "${targetName}"\nRows read: ${rows.length}\n\nFirst 8 rows:\n${preview}`)

      const { groups, errors, allPortions } = parseSheet(rows)

      if (!groups.length && !errors.length) {
        throw new Error(
          `No data rows found. Check that:\n` +
          `• Column B has order numbers starting from row 7\n` +
          `• The sheet name is exactly "Order & Portions"`
        )
      }

      const allNos      = groups.map(o => o.orderNo)
      const existing    = await fetchExistingOrderNos(allNos)
      const existingMap = Object.fromEntries(existing.map(r => [r.order_no, r.id]))

      const valid      = groups.filter(o => !existingMap[o.orderNo])
      const duplicates = groups.filter(o =>  existingMap[o.orderNo])
        .map(o => ({ ...o, existingId: existingMap[o.orderNo] }))

      const initDup = {}
      duplicates.forEach(o => { initDup[o.orderNo] = 'skip' })

      setParsed({ valid, duplicates, errors, allPortions })
      setDupActions(initDup)
      setStep('preview')
    } catch (e) {
      setErrMsg(e.message)
      setStep('upload')
    }
  }, [])

  const handleDrop = useCallback((e) => {
    e.preventDefault(); setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }, [processFile])

  function hydratePortion(p) {
    return {
      ...p,
      materialArrivalDate: p.materialArrivalDate ? new Date(p.materialArrivalDate) : null,
      cutStartDate:        p.cutStartDate        ? new Date(p.cutStartDate)        : null,
      embStartDate:        p.embStartDate        ? new Date(p.embStartDate)        : null,
      sewStartDate:        p.sewStartDate        ? new Date(p.sewStartDate)        : null,
      completionDate:      p.completionDate      ? new Date(p.completionDate)      : null,
      exfactoryDate:       p.exfactoryDate       ? new Date(p.exfactoryDate)       : null,
    }
  }

  const handleConfirm = async () => {
    setStep('importing')
    let imported = 0, skipped = 0, failed = 0, portionsImported = 0
    const failedRows = []

    try {
      const importOne = async (order) => {
        const portions     = order.portions.map(hydratePortion)
        const firstPortion = portions[0] ?? {}
        await createOrder({
          orderNo: order.orderNo, buyer: order.buyer, style: order.style,
          qty: order.qty, smv: order.smv,
          requiresEmbroidery: order.requiresEmbroidery,
          season: order.season, notes: order.notes,
          status: 'pending', progress: 0, color: '#3b82f6',
          materialArrivalDate: firstPortion.materialArrivalDate ?? null,
          cutStartDate:        firstPortion.cutStartDate        ?? null,
          embStartDate:        firstPortion.embStartDate        ?? null,
          sewStartDate:        firstPortion.sewStartDate        ?? null,
          completionDate:      firstPortion.completionDate      ?? null,
          shipDate:            firstPortion.exfactoryDate       ?? null,
          portions,
        })
        portionsImported += portions.length
        imported++
      }

      const overwriteOne = async (order) => {
        const portions = order.portions.map(hydratePortion)
        await updateOrder(order.existingId, {
          buyer: order.buyer, style: order.style, qty: order.qty, smv: order.smv,
          requiresEmbroidery: order.requiresEmbroidery,
          season: order.season, notes: order.notes,
          portions,
        })
        portionsImported += portions.length
        imported++
      }

      for (const order of parsed.valid) {
        try   { await importOne(order) }
        catch (e) { failed++; failedRows.push({ Order: order.orderNo, Error: e.message }) }
      }
      for (const order of parsed.duplicates) {
        if ((dupActions[order.orderNo] || 'skip') === 'overwrite') {
          try   { await overwriteOne(order) }
          catch (e) { failed++; failedRows.push({ Order: order.orderNo, Error: e.message }) }
        } else { skipped++ }
      }

      setResult({ imported, skipped, failed, errors: parsed.errors.length, failedRows, portionsImported })
      setStep('done')
      if (onImportDone) onImportDone()
    } catch (e) {
      setErrMsg(e.message)
      setStep('preview')
    }
  }

  const totalValid  = parsed?.valid.length      ?? 0
  const totalDupes  = parsed?.duplicates.length  ?? 0
  const totalErrors = parsed?.errors.length      ?? 0
  const allOrders   = parsed ? [...parsed.valid, ...parsed.duplicates] : []
  const allPortions = parsed?.allPortions ?? []
  const canImport   = totalValid > 0 || Object.values(dupActions).some(a => a === 'overwrite')

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col gap-0 p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-200">
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-blue-600" />
            Import Orders
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4">

          {/* ── Upload ── */}
          {step === 'upload' && (
            <div className="space-y-4">
              <label
                onDragOver={e => { e.preventDefault(); setDragging(true) }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                className={`flex flex-col items-center justify-center gap-3 border-2 border-dashed rounded-xl p-12 cursor-pointer transition-colors ${
                  dragging ? 'border-blue-500 bg-blue-50' : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50'
                }`}
              >
                <Upload className="w-10 h-10 text-slate-400" />
                <div className="text-center">
                  <p className="text-sm font-medium text-slate-700">Drag your Excel file here, or click to browse</p>
                  <p className="text-xs text-slate-400 mt-1">.xlsx only · Template: SnowCoast_Order_Import_Simple.xlsx</p>
                </div>
                <input type="file" accept=".xlsx" className="sr-only"
                  onChange={e => { if (e.target.files[0]) processFile(e.target.files[0]) }} />
              </label>

              {errMsg && (
                <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 rounded-lg px-4 py-3">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <pre className="whitespace-pre-wrap font-sans">{errMsg}</pre>
                </div>
              )}

              {debugInfo && (
                <details className="bg-slate-50 rounded-lg p-3">
                  <summary className="text-xs font-medium text-slate-500 cursor-pointer">Debug info</summary>
                  <pre className="text-xs text-slate-400 mt-2 whitespace-pre-wrap">{debugInfo}</pre>
                </details>
              )}

              <div className="bg-slate-50 rounded-lg p-4 text-xs text-slate-500 space-y-1">
                <p className="font-semibold text-slate-700 mb-2">Template: SnowCoast_Order_Import_Simple.xlsx</p>
                <p>• Sheet name must be: <strong>"Order &amp; Portions"</strong></p>
                <p>• Rows 1–6: title / labels (skipped automatically)</p>
                <p>• Row 7+: data — one row per portion</p>
                <p>• Col B–E required · Col I–J: portion name &amp; qty · Col K–P: dates</p>
                <p>• Same Order No on multiple rows = multiple portions</p>
              </div>
            </div>
          )}

          {/* ── Parsing ── */}
          {step === 'parsing' && (
            <div className="flex flex-col items-center gap-4 py-16">
              <Spinner className="w-10 h-10" />
              <p className="text-sm text-slate-600">Reading and validating Excel file…</p>
            </div>
          )}

          {/* ── Preview ── */}
          {step === 'preview' && parsed && (
            <div className="space-y-4">
              <div className="flex gap-3 flex-wrap">
                <span className="inline-flex items-center gap-1.5 text-sm text-green-700 bg-green-50 px-3 py-1.5 rounded-full font-medium">
                  <CheckCircle className="w-4 h-4" />{totalValid} new orders
                </span>
                {totalDupes > 0 && (
                  <span className="inline-flex items-center gap-1.5 text-sm text-amber-700 bg-amber-50 px-3 py-1.5 rounded-full font-medium">
                    <AlertTriangle className="w-4 h-4" />{totalDupes} duplicates
                  </span>
                )}
                {totalErrors > 0 && (
                  <span className="inline-flex items-center gap-1.5 text-sm text-red-700 bg-red-50 px-3 py-1.5 rounded-full font-medium">
                    <AlertCircle className="w-4 h-4" />{totalErrors} errors
                  </span>
                )}
                <span className="inline-flex items-center gap-1.5 text-sm text-slate-600 bg-slate-100 px-3 py-1.5 rounded-full font-medium">
                  {allPortions.length} portions
                </span>
              </div>

              <Tabs defaultValue="orders">
                <TabsList>
                  <TabsTrigger value="orders">Orders ({allOrders.length})</TabsTrigger>
                  <TabsTrigger value="portions">Portions ({allPortions.length})</TabsTrigger>
                  <TabsTrigger value="errors">Errors ({totalErrors})</TabsTrigger>
                </TabsList>

                <TabsContent value="orders" className="mt-3">
                  <PagedTable rows={allOrders} columns={[
                    { key: 'orderNo', label: 'Order No', render: r => (
                      <span className="flex items-center gap-1.5">
                        {r.existingId && <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">dup</span>}
                        <span className="font-semibold">{r.orderNo}</span>
                      </span>
                    )},
                    { key: 'buyer',   label: 'Customer' },
                    { key: 'style',   label: 'Style' },
                    { key: 'qty',     label: 'Qty', render: r => r.qty.toLocaleString() },
                    { key: 'portions',label: 'Portions', render: r => (
                      <span className="text-xs bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-medium">
                        {r.portions?.length ?? 1}p
                      </span>
                    )},
                    { key: 'requiresEmbroidery', label: 'Emb', render: r =>
                      r.requiresEmbroidery
                        ? <span className="text-pink-600 font-medium text-xs">YES</span>
                        : <span className="text-slate-300">—</span>
                    },
                  ]} extra={row => row.existingId ? (
                    <div className="flex gap-1.5">
                      {['skip','overwrite'].map(a => (
                        <button key={a}
                          onClick={() => setDupActions(p => ({ ...p, [row.orderNo]: a }))}
                          className={`text-xs px-2.5 py-1 rounded-full font-medium border transition-colors ${
                            (dupActions[row.orderNo] || 'skip') === a
                              ? a === 'skip'
                                ? 'bg-slate-700 text-white border-slate-700'
                                : 'bg-amber-500 text-white border-amber-500'
                              : 'border-slate-300 text-slate-600 hover:border-slate-400'
                          }`}>
                          {a === 'skip' ? 'Skip' : 'Overwrite'}
                        </button>
                      ))}
                    </div>
                  ) : null} />
                </TabsContent>

                <TabsContent value="portions" className="mt-3">
                  <PagedTable rows={allPortions} columns={[
                    { key: 'orderNo',       label: 'Order No' },
                    { key: 'portionName',   label: 'Portion' },
                    { key: 'portionQty',    label: 'Qty', render: r => r.portionQty?.toLocaleString() ?? '—' },
                    { key: 'sewStartDate',  label: 'Sew Start' },
                    { key: 'completionDate',label: 'Completion' },
                    { key: 'exfactoryDate', label: 'Ex-Factory' },
                  ]} />
                </TabsContent>

                <TabsContent value="errors" className="mt-3">
                  <PagedTable rows={parsed.errors} columns={[
                    { key: 'rowNum',  label: 'Row' },
                    { key: 'orderNo', label: 'Order No' },
                    { key: 'error',   label: 'Error' },
                  ]} />
                </TabsContent>
              </Tabs>

              {errMsg && (
                <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 rounded-lg px-4 py-3">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /><span>{errMsg}</span>
                </div>
              )}
            </div>
          )}

          {/* ── Importing ── */}
          {step === 'importing' && (
            <div className="flex flex-col items-center gap-4 py-16">
              <Spinner className="w-10 h-10" />
              <p className="text-sm text-slate-600">Saving to database…</p>
            </div>
          )}

          {/* ── Done ── */}
          {step === 'done' && result && (
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-8 h-8 text-green-500" />
                <div>
                  <p className="font-semibold text-slate-800">Import complete</p>
                  <p className="text-sm text-slate-500 mt-0.5">
                    {result.imported} order{result.imported !== 1 ? 's' : ''} and{' '}
                    {result.portionsImported} portion{result.portionsImported !== 1 ? 's' : ''} imported
                    {result.skipped > 0 ? ` · ${result.skipped} skipped` : ''}
                    {(result.errors + result.failed) > 0 ? ` · ${result.errors + result.failed} errors` : ''}
                  </p>
                </div>
              </div>
              {result.failedRows.length > 0 && (
                <Button variant="outline" size="sm"
                  onClick={() => downloadExcelReport(result.failedRows, 'order_import_errors.xlsx')}>
                  <Download className="w-4 h-4 mr-1.5" />Download Error Report
                </Button>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="px-6 py-4 border-t border-slate-200">
          {step === 'done'
            ? <Button onClick={handleClose}>Close</Button>
            : <>
                <Button variant="outline" onClick={handleClose} disabled={step === 'importing'}>Cancel</Button>
                {step === 'preview' && (
                  <Button onClick={handleConfirm} disabled={!canImport}>
                    Confirm Import
                  </Button>
                )}
              </>
          }
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
