import { useState, useCallback } from 'react'
import * as XLSX from 'xlsx'
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle, AlertTriangle, Download } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Spinner } from '@/components/ui/spinner'
import { excelDateToString, parseLPNumber, readSheetRows, downloadExcelReport } from '@/lib/excelImport'
import { fetchExistingOrderNos, createOrder, createLineAllocation, updateOrder } from '@/lib/api'

// ── Helpers ────────────────────────────────────────────────────────────────────

function str(v) { return String(v ?? '').trim() }

// Parse the "Order Portions" sheet — returns { [orderNo]: portion[] }
function parsePortionsSheet(rows) {
  if (!rows || rows.length < 2) return {}
  const portionsByOrder = {}
  // Skip header row (row 0)
  rows.slice(1).forEach(row => {
    const [A, B, C, D, E, F, G, H, I, J] = row
    if (!A && !B) return
    const orderNo    = str(A)
    const portionName = str(B) || 'Full order'
    const portionQty  = Number(C) || 0
    if (!orderNo) return
    const portion = {
      portionName,
      portionQty,
      materialArrivalDate: excelDateToString(D),
      cutStartDate:        excelDateToString(E),
      embStartDate:        excelDateToString(F),
      sewStartDate:        excelDateToString(G),
      completionDate:      excelDateToString(H),
      exfactoryDate:       excelDateToString(I),
      notes:               str(J),
      status:              'pending',
    }
    if (!portionsByOrder[orderNo]) portionsByOrder[orderNo] = []
    portionsByOrder[orderNo].push(portion)
  })
  return portionsByOrder
}

function parseOrderSheet(rows) {
  // rows[3] = header row (row 4), rows[4+] = data
  const data = rows.slice(4)
  const groups = {}   // orderNo → order obj
  const errors = []

  data.forEach((row, i) => {
    const [A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R] = row
    if (!A && !B && !C && !D) return // blank row

    const rowNum = i + 5
    const orderNo = str(A)
    const customer = str(B)
    const style = str(C)
    const qty = Number(D)

    const errs = []
    if (!orderNo) errs.push('Order number required')
    if (!customer) errs.push('Customer required')
    if (!style) errs.push('Style code required')
    if (!D || qty <= 0) errs.push('Order qty must be > 0')

    const dateFields = { matDate: H, cutDate: I, embDate: J, sewDate: K, compDate: L, shipDate: M }
    const parsed = {}
    Object.entries(dateFields).forEach(([k, v]) => {
      if (v !== null && v !== undefined && v !== '') {
        const s = excelDateToString(v)
        if (!s) errs.push(`Invalid date in column ${k.replace('Date','').toUpperCase()}`)
        parsed[k] = s
      } else {
        parsed[k] = null
      }
    })

    if (errs.length) {
      errors.push({ rowNum, orderNo: orderNo || '—', error: errs.join('; ') })
      return
    }

    const lpNum = parseLPNumber(N)
    const alloc = lpNum ? {
      linePairNo: lpNum,
      allocatedQty: Number(O) || 0,
      startDate: excelDateToString(P),
      endDate: excelDateToString(Q),
    } : null

    if (!groups[orderNo]) {
      groups[orderNo] = {
        orderNo, buyer: customer, style, qty,
        smv: Number(E) || null,
        requiresEmbroidery: str(F).toUpperCase() === 'YES',
        season: str(G),
        materialArrivalDate: parsed.matDate,
        cutStartDate: parsed.cutDate,
        embStartDate: parsed.embDate,
        sewStartDate: parsed.sewDate,
        completionDate: parsed.compDate,
        shipDate: parsed.shipDate,
        notes: str(R),
        allocations: [],
        rowNum,
      }
    }
    if (alloc) groups[orderNo].allocations.push(alloc)
  })

  return { groups: Object.values(groups), errors }
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
            <tr>{columns.map(c => <th key={c.key} className="text-left px-3 py-2 font-semibold text-slate-500 whitespace-nowrap">{c.label}</th>)}</tr>
          </thead>
          <tbody>
            {slice.map((row, i) => (
              <tr key={i} className="border-t border-slate-100 hover:bg-slate-50">
                {columns.map(c => <td key={c.key} className="px-3 py-2 text-slate-700">{c.render ? c.render(row) : row[c.key] ?? '—'}</td>)}
                {extra && <td className="px-3 py-2">{extra(row)}</td>}
              </tr>
            ))}
            {!slice.length && <tr><td colSpan={columns.length} className="px-3 py-6 text-center text-slate-400">No rows</td></tr>}
          </tbody>
        </table>
      </div>
      {total > PAGE && (
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>{page * PAGE + 1}–{Math.min((page + 1) * PAGE, total)} of {total}</span>
          <div className="flex gap-1">
            <button onClick={() => setPage(p => p - 1)} disabled={page === 0} className="px-2 py-1 rounded border disabled:opacity-40 hover:bg-slate-100">‹</button>
            <button onClick={() => setPage(p => p + 1)} disabled={(page + 1) * PAGE >= total} className="px-2 py-1 rounded border disabled:opacity-40 hover:bg-slate-100">›</button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main Modal ─────────────────────────────────────────────────────────────────

export default function OrderImportModal({ open, onClose, onImportDone }) {
  const [step, setStep] = useState('upload')
  const [parsed, setParsed] = useState(null)
  const [dupActions, setDupActions] = useState({})
  const [result, setResult] = useState(null)
  const [errMsg, setErrMsg] = useState('')
  const [dragging, setDragging] = useState(false)

  const reset = () => {
    setStep('upload'); setParsed(null); setDupActions({}); setResult(null); setErrMsg('')
  }

  const handleClose = () => { reset(); onClose() }

  const processFile = useCallback(async (file) => {
    if (!file?.name.endsWith('.xlsx')) { setErrMsg('Please upload an .xlsx file.'); return }
    setStep('parsing'); setErrMsg('')
    try {
      const buf = await file.arrayBuffer()
      const wb = XLSX.read(buf, { type: 'array', cellDates: true })
      const rows = readSheetRows(wb, 'Order Import')
      if (!rows) throw new Error('Sheet "Order Import" not found in this file.')

      // Parse Order Portions sheet (optional)
      const portionRows = readSheetRows(wb, 'Order Portions')
      const portionsData = parsePortionsSheet(portionRows)

      const { groups, errors } = parseOrderSheet(rows)
      if (!groups.length && !errors.length) throw new Error('No data rows found (sheet may be empty).')

      const allNos = groups.map(o => o.orderNo)
      const existing = await fetchExistingOrderNos(allNos)
      const existingMap = Object.fromEntries(existing.map(r => [r.order_no, r.id]))

      const valid = groups.filter(o => !existingMap[o.orderNo])
      const duplicates = groups.filter(o => existingMap[o.orderNo]).map(o => ({ ...o, existingId: existingMap[o.orderNo] }))

      const initDupActions = {}
      duplicates.forEach(o => { initDupActions[o.orderNo] = 'skip' })

      setParsed({ valid, duplicates, errors, portionsData })
      setDupActions(initDupActions)
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

  const handleConfirm = async () => {
    setStep('importing')
    let imported = 0, skipped = 0, failed = 0
    const failedRows = []

    try {
      // Import valid orders
      const portionsData = parsed.portionsData || {}

      for (const order of parsed.valid) {
        try {
          // Build portions from "Order Portions" sheet, or create default from order dates
          const portionList = portionsData[order.orderNo]
          const portions = portionList && portionList.length > 0
            ? portionList.map(p => ({
                ...p,
                materialArrivalDate: p.materialArrivalDate ? new Date(p.materialArrivalDate) : null,
                cutStartDate:        p.cutStartDate        ? new Date(p.cutStartDate)        : null,
                embStartDate:        p.embStartDate        ? new Date(p.embStartDate)        : null,
                sewStartDate:        p.sewStartDate        ? new Date(p.sewStartDate)        : null,
                completionDate:      p.completionDate      ? new Date(p.completionDate)      : null,
                exfactoryDate:       p.exfactoryDate       ? new Date(p.exfactoryDate)       : null,
              }))
            : undefined // createOrder will auto-create "Full order" portion from order dates

          const saved = await createOrder({
            orderNo: order.orderNo, buyer: order.buyer, style: order.style,
            qty: order.qty, smv: order.smv,
            requiresEmbroidery: order.requiresEmbroidery,
            season: order.season,
            materialArrivalDate: order.materialArrivalDate ? new Date(order.materialArrivalDate) : null,
            cutStartDate: order.cutStartDate ? new Date(order.cutStartDate) : null,
            embStartDate: order.embStartDate ? new Date(order.embStartDate) : null,
            sewStartDate: order.sewStartDate ? new Date(order.sewStartDate) : null,
            completionDate: order.completionDate ? new Date(order.completionDate) : null,
            shipDate: order.shipDate ? new Date(order.shipDate) : null,
            notes: order.notes, status: 'pending', progress: 0, color: '#3b82f6',
            portions,
          })
          for (const a of order.allocations) {
            if (a.startDate && a.endDate) {
              await createLineAllocation({
                orderId: saved.id, linePairNo: a.linePairNo,
                allocatedQty: a.allocatedQty,
                targetDailyPcs: 0,
                startDate: new Date(a.startDate), endDate: new Date(a.endDate),
                notes: '',
              })
            }
          }
          imported++
        } catch (e) {
          failed++
          failedRows.push({ Order: order.orderNo, Error: e.message })
        }
      }

      // Handle duplicates
      for (const order of parsed.duplicates) {
        const action = dupActions[order.orderNo] || 'skip'
        if (action === 'overwrite') {
          try {
            await updateOrder(order.existingId, {
              buyer: order.buyer, style: order.style, qty: order.qty, smv: order.smv,
              requiresEmbroidery: order.requiresEmbroidery, season: order.season,
              materialArrivalDate: order.materialArrivalDate ? new Date(order.materialArrivalDate) : null,
              cutStartDate: order.cutStartDate ? new Date(order.cutStartDate) : null,
              embStartDate: order.embStartDate ? new Date(order.embStartDate) : null,
              sewStartDate: order.sewStartDate ? new Date(order.sewStartDate) : null,
              completionDate: order.completionDate ? new Date(order.completionDate) : null,
              shipDate: order.shipDate ? new Date(order.shipDate) : null,
              notes: order.notes,
            })
            imported++
          } catch (e) { failed++; failedRows.push({ Order: order.orderNo, Error: e.message }) }
        } else {
          skipped++
        }
      }

      setResult({ imported, skipped, failed, errors: parsed.errors.length, failedRows })
      setStep('done')
      if (onImportDone) onImportDone()
    } catch (e) {
      setErrMsg(e.message)
      setStep('preview')
    }
  }

  const totalErrors = parsed ? parsed.errors.length : 0
  const totalDupes = parsed ? parsed.duplicates.length : 0
  const totalValid = parsed ? parsed.valid.length : 0

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
          {(step === 'upload') && (
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
                  <p className="text-xs text-slate-400 mt-1">.xlsx files only — Sheet name: "Order Import"</p>
                </div>
                <input type="file" accept=".xlsx" className="sr-only"
                  onChange={e => { if (e.target.files[0]) processFile(e.target.files[0]) }} />
              </label>
              {errMsg && <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-lg px-4 py-3"><AlertCircle className="w-4 h-4 shrink-0" />{errMsg}</div>}
              <div className="bg-slate-50 rounded-lg p-4 text-xs text-slate-500 space-y-1">
                <p className="font-medium text-slate-700 mb-2">Expected sheet structure:</p>
                <p>• Sheet <strong>Order Import</strong> — headers on row 4, data from row 5</p>
                <p>• Columns A–D (Order No, Customer, Style, Qty) are required</p>
                <p>• Columns N–Q for line allocation (optional)</p>
                <p className="pt-1 font-medium text-slate-600">Optional: Order Portions sheet</p>
                <p>• Sheet <strong>Order Portions</strong> — A=Order No, B=Portion Name, C=Qty, D–I=Dates, J=Notes</p>
                <p>• Multiple rows with same order number = multiple portions per order</p>
                <p>• If sheet is missing, one "Full order" portion is created automatically</p>
              </div>
            </div>
          )}

          {/* ── Parsing ── */}
          {step === 'parsing' && (
            <div className="flex flex-col items-center gap-4 py-16">
              <Spinner className="w-10 h-10" />
              <p className="text-sm text-slate-600">Parsing and validating Excel file…</p>
            </div>
          )}

          {/* ── Preview ── */}
          {step === 'preview' && parsed && (
            <div className="space-y-4">
              <div className="flex gap-3 flex-wrap">
                <span className="inline-flex items-center gap-1.5 text-sm text-green-700 bg-green-50 px-3 py-1.5 rounded-full font-medium">
                  <CheckCircle className="w-4 h-4" />{totalValid} ready
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
              </div>

              <Tabs defaultValue="valid">
                <TabsList>
                  <TabsTrigger value="valid">Valid ({totalValid})</TabsTrigger>
                  <TabsTrigger value="dupes">Duplicates ({totalDupes})</TabsTrigger>
                  <TabsTrigger value="errors">Errors ({totalErrors})</TabsTrigger>
                </TabsList>

                <TabsContent value="valid" className="mt-3">
                  <PagedTable rows={parsed.valid} columns={[
                    { key: 'orderNo', label: 'Order No' },
                    { key: 'buyer', label: 'Customer' },
                    { key: 'style', label: 'Style' },
                    { key: 'qty', label: 'Qty', render: r => r.qty.toLocaleString() },
                    { key: 'smv', label: 'SMV' },
                    { key: 'shipDate', label: 'Ship Date' },
                    { key: 'allocations', label: 'Line Pairs', render: r => r.allocations.length || '—' },
                  ]} />
                </TabsContent>

                <TabsContent value="dupes" className="mt-3">
                  <PagedTable rows={parsed.duplicates} columns={[
                    { key: 'orderNo', label: 'Order No' },
                    { key: 'buyer', label: 'Customer' },
                    { key: 'style', label: 'Style' },
                    { key: 'qty', label: 'Qty', render: r => r.qty.toLocaleString() },
                  ]} extra={row => (
                    <div className="flex gap-2">
                      {['skip', 'overwrite'].map(a => (
                        <button key={a} onClick={() => setDupActions(p => ({ ...p, [row.orderNo]: a }))}
                          className={`text-xs px-2.5 py-1 rounded-full font-medium border transition-colors ${
                            (dupActions[row.orderNo] || 'skip') === a
                              ? a === 'skip' ? 'bg-slate-700 text-white border-slate-700' : 'bg-amber-500 text-white border-amber-500'
                              : 'border-slate-300 text-slate-600 hover:border-slate-400'
                          }`}>
                          {a === 'skip' ? 'Skip' : 'Overwrite'}
                        </button>
                      ))}
                    </div>
                  )} />
                </TabsContent>

                <TabsContent value="errors" className="mt-3">
                  <PagedTable rows={parsed.errors} columns={[
                    { key: 'rowNum', label: 'Row' },
                    { key: 'orderNo', label: 'Order No' },
                    { key: 'error', label: 'Error' },
                  ]} />
                </TabsContent>
              </Tabs>
              {errMsg && <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-lg px-4 py-3"><AlertCircle className="w-4 h-4 shrink-0" />{errMsg}</div>}
            </div>
          )}

          {/* ── Importing ── */}
          {step === 'importing' && (
            <div className="flex flex-col items-center gap-4 py-16">
              <Spinner className="w-10 h-10" />
              <p className="text-sm text-slate-600">Saving orders to database…</p>
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
                    {result.imported} orders imported · {result.skipped} skipped ·{' '}
                    {result.errors + result.failed} errors
                  </p>
                </div>
              </div>
              {result.failedRows.length > 0 && (
                <Button variant="outline" size="sm" onClick={() => downloadExcelReport(result.failedRows, 'order_import_errors.xlsx')}>
                  <Download className="w-4 h-4" />Download Error Report
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
                  <Button onClick={handleConfirm} disabled={totalValid === 0 && !Object.values(dupActions).some(a => a === 'overwrite')}>
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
