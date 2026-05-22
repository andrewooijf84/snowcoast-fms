import { useState, useCallback } from 'react'
import * as XLSX from 'xlsx'
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle, AlertTriangle, Download } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Spinner } from '@/components/ui/spinner'
import { excelDateToString, parseLPNumber, SECTION_MAP, readSheetRows, downloadExcelReport } from '@/lib/excelImport'
import {
  fetchOrderNoMap,
  fetchExistingDailyOutput, fetchExistingSectionOutput,
  createDailyLineOutput, updateDailyLineOutput,
  createSectionOutputEntry, updateSectionOutputEntry,
} from '@/lib/api'

// ── Sheet parsers ──────────────────────────────────────────────────────────────

function parseDailySheet(rows, orderMap) {
  const valid = [], errors = []
  const data = rows.slice(4)
  data.forEach((row, i) => {
    const [A, B, C, D, E, F, , H, I, J, , L, M, N, O, P] = row
    if (!A && !B && !C) return
    const rowNum = i + 5
    const date = excelDateToString(A)
    const lpNum = parseLPNumber(B)
    const orderNo = String(C ?? '').trim()
    const targetPcs = Number(E)
    const actualPcs = Number(F)

    const errs = []
    if (!date) errs.push('Invalid date')
    if (!lpNum) errs.push('Invalid line pair (use LP-01 to LP-20)')
    if (!orderNo) errs.push('Order number required')
    else if (!orderMap[orderNo]) errs.push(`Order ${orderNo} not found in system`)
    if (!targetPcs || targetPcs <= 0) errs.push('Target pcs must be > 0')
    if (actualPcs === null || actualPcs === undefined || actualPcs < 0) errs.push('Actual pcs invalid')

    if (errs.length) { errors.push({ rowNum, sheet: 'Daily', orderNo, error: errs.join('; ') }); return }

    valid.push({
      rowNum, date, linePairNo: lpNum, orderNo,
      orderId: orderMap[orderNo],
      targetPcs, actualPcs,
      workersPresent: Number(H) || 0,
      downtimeHours: Number(I) || 0,
      downtimeReason: String(J ?? '').trim(),
      wipReceived: Number(L) || 0,
      wipPassedOut: Number(M) || 0,
      section: SECTION_MAP[String(N ?? '').trim()] || null,
      remarks: String(P ?? '').trim(),
    })
  })
  return { valid, errors }
}

function parseSectionSheet(rows, orderMap) {
  const valid = [], errors = []
  const data = rows.slice(4)
  data.forEach((row, i) => {
    const [A, B, C, , E, F, , H, I, J, , L, M] = row
    if (!A && !B && !C) return
    const rowNum = i + 5
    const date = excelDateToString(A)
    const sectionRaw = String(B ?? '').trim()
    const section = SECTION_MAP[sectionRaw]
    const orderNo = String(C ?? '').trim()
    const targetPcs = Number(E)
    const actualPcs = Number(F)

    const errs = []
    if (!date) errs.push('Invalid date')
    if (!section) errs.push(`Unknown section "${sectionRaw}"`)
    if (!orderNo) errs.push('Order number required')
    else if (!orderMap[orderNo]) errs.push(`Order ${orderNo} not found in system`)
    if (!targetPcs || targetPcs <= 0) errs.push('Target pcs must be > 0')
    if (actualPcs === null || actualPcs === undefined || actualPcs < 0) errs.push('Actual pcs invalid')

    if (errs.length) { errors.push({ rowNum, sheet: 'Section', orderNo, error: errs.join('; ') }); return }

    valid.push({
      rowNum, date, section, orderNo,
      orderId: orderMap[orderNo],
      targetPcs, actualPcs,
      wipReceived: Number(H) || 0,
      wipPassedOut: Number(I) || 0,
      workersPresent: Number(J) || 0,
      remarks: String(M ?? '').trim(),
    })
  })
  return { valid, errors }
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
              {columns.map(c => <th key={c.key} className="text-left px-3 py-2 font-semibold text-slate-500 whitespace-nowrap">{c.label}</th>)}
              {extra && <th className="px-3 py-2" />}
            </tr>
          </thead>
          <tbody>
            {slice.map((row, i) => (
              <tr key={i} className="border-t border-slate-100 hover:bg-slate-50">
                {columns.map(c => <td key={c.key} className="px-3 py-2 text-slate-700">{c.render ? c.render(row) : (row[c.key] ?? '—')}</td>)}
                {extra && <td className="px-3 py-2">{extra(row)}</td>}
              </tr>
            ))}
            {!slice.length && <tr><td colSpan={columns.length + (extra ? 1 : 0)} className="px-3 py-6 text-center text-slate-400">No rows</td></tr>}
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

export default function OutputImportModal({ open, onClose, onImportDone }) {
  const [step, setStep] = useState('upload')
  const [parsed, setParsed] = useState(null)
  const [dupActions, setDupActions] = useState({})
  const [result, setResult] = useState(null)
  const [errMsg, setErrMsg] = useState('')
  const [dragging, setDragging] = useState(false)

  const reset = () => { setStep('upload'); setParsed(null); setDupActions({}); setResult(null); setErrMsg('') }
  const handleClose = () => { reset(); onClose() }

  const processFile = useCallback(async (file) => {
    if (!file?.name.endsWith('.xlsx')) { setErrMsg('Please upload an .xlsx file.'); return }
    setStep('parsing'); setErrMsg('')
    try {
      const buf = await file.arrayBuffer()
      const wb = XLSX.read(buf, { type: 'array', cellDates: true })

      const dailyRows = readSheetRows(wb, 'Daily Line Output')
      const sectionRows = readSheetRows(wb, 'Section Output')
      if (!dailyRows && !sectionRows) throw new Error('Neither "Daily Line Output" nor "Section Output" sheets found.')

      const orderMap = await fetchOrderNoMap()

      const daily = dailyRows ? parseDailySheet(dailyRows, orderMap) : { valid: [], errors: [] }
      const section = sectionRows ? parseSectionSheet(sectionRows, orderMap) : { valid: [], errors: [] }

      // Duplicate check for daily output
      const dailyDates = [...new Set(daily.valid.map(r => r.date))]
      const existingDaily = await fetchExistingDailyOutput(dailyDates)
      const dailyDupMap = {}
      existingDaily.forEach(r => { dailyDupMap[`${r.date}_${r.line_pair_no}_${r.order_id}`] = r.id })

      // Duplicate check for section output
      const sectionDates = [...new Set(section.valid.map(r => r.date))]
      const existingSection = await fetchExistingSectionOutput(sectionDates)
      const sectionDupMap = {}
      existingSection.forEach(r => { sectionDupMap[`${r.period_date}_${r.section}_${r.order_id}`] = r.id })

      const dailyValid = [], dailyDupes = []
      daily.valid.forEach(r => {
        const key = `${r.date}_${r.linePairNo}_${r.orderId}`
        const existId = dailyDupMap[key]
        if (existId) dailyDupes.push({ ...r, existingId: existId, dupKey: key, source: 'Daily' })
        else dailyValid.push(r)
      })

      const sectionValid = [], sectionDupes = []
      section.valid.forEach(r => {
        const key = `${r.date}_${r.section}_${r.orderId}`
        const existId = sectionDupMap[key]
        if (existId) sectionDupes.push({ ...r, existingId: existId, dupKey: key, source: 'Section' })
        else sectionValid.push(r)
      })

      const duplicates = [...dailyDupes, ...sectionDupes]
      const allErrors = [...daily.errors, ...section.errors]

      const initDupActions = {}
      duplicates.forEach(r => { initDupActions[r.dupKey] = 'skip' })

      setParsed({ dailyValid, sectionValid, duplicates, errors: allErrors })
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
    const stats = { dailyImported: 0, dailyUpdated: 0, dailySkipped: 0, sectionImported: 0, sectionUpdated: 0, sectionSkipped: 0, failed: 0 }
    const failedRows = []

    try {
      for (const r of parsed.dailyValid) {
        try {
          await createDailyLineOutput({
            date: new Date(r.date), linePairNo: r.linePairNo, orderId: r.orderId,
            targetPcs: r.targetPcs, actualPcs: r.actualPcs,
            workersPresent: r.workersPresent, downtimeHours: r.downtimeHours,
            downtimeReason: r.downtimeReason, remarks: r.remarks,
          })
          stats.dailyImported++
        } catch (e) { stats.failed++; failedRows.push({ Sheet: 'Daily', Row: r.rowNum, Order: r.orderNo, Error: e.message }) }
      }

      for (const r of parsed.sectionValid) {
        try {
          await createSectionOutputEntry({
            date: new Date(r.date), section: r.section, orderId: r.orderId,
            target: r.targetPcs, actual: r.actualPcs,
            wipReceived: r.wipReceived, wipPassedOut: r.wipPassedOut, remarks: r.remarks,
          })
          stats.sectionImported++
        } catch (e) { stats.failed++; failedRows.push({ Sheet: 'Section', Row: r.rowNum, Order: r.orderNo, Error: e.message }) }
      }

      for (const r of parsed.duplicates) {
        const action = dupActions[r.dupKey] || 'skip'
        if (action === 'update') {
          try {
            if (r.source === 'Daily') {
              await updateDailyLineOutput(r.existingId, {
                targetPcs: r.targetPcs, actualPcs: r.actualPcs,
                workersPresent: r.workersPresent, downtimeHours: r.downtimeHours,
                downtimeReason: r.downtimeReason, remarks: r.remarks,
              })
              stats.dailyUpdated++
            } else {
              await updateSectionOutputEntry(r.existingId, {
                targetPcs: r.targetPcs, actualPcs: r.actualPcs,
                wipReceived: r.wipReceived, wipPassedOut: r.wipPassedOut, remarks: r.remarks,
              })
              stats.sectionUpdated++
            }
          } catch (e) { stats.failed++; failedRows.push({ Sheet: r.source, Row: r.rowNum, Order: r.orderNo, Error: e.message }) }
        } else {
          r.source === 'Daily' ? stats.dailySkipped++ : stats.sectionSkipped++
        }
      }

      setResult({ stats, failedRows })
      setStep('done')
      if (onImportDone) onImportDone()
    } catch (e) {
      setErrMsg(e.message)
      setStep('preview')
    }
  }

  const tDailyValid = parsed?.dailyValid.length ?? 0
  const tSectionValid = parsed?.sectionValid.length ?? 0
  const tDupes = parsed?.duplicates.length ?? 0
  const tErrors = parsed?.errors.length ?? 0

  const OUTPUT_COLS = [
    { key: 'date', label: 'Date' },
    { key: 'orderNo', label: 'Order' },
    { key: 'targetPcs', label: 'Target' },
    { key: 'actualPcs', label: 'Actual' },
  ]

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col gap-0 p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-200">
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-blue-600" />
            Import IE Output
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
                  <p className="text-xs text-slate-400 mt-1">.xlsx files only — Sheets: "Daily Line Output" + "Section Output"</p>
                </div>
                <input type="file" accept=".xlsx" className="sr-only"
                  onChange={e => { if (e.target.files[0]) processFile(e.target.files[0]) }} />
              </label>
              {errMsg && <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-lg px-4 py-3"><AlertCircle className="w-4 h-4 shrink-0" />{errMsg}</div>}
              <div className="bg-slate-50 rounded-lg p-4 text-xs text-slate-500 space-y-1">
                <p className="font-medium text-slate-700 mb-2">Expected file structure:</p>
                <p>• Sheet <strong>Daily Line Output</strong>: headers row 4, data row 5+. Cols A=Date, B=LP-XX, C=Order No, E=Target, F=Actual</p>
                <p>• Sheet <strong>Section Output</strong>: headers row 4, data row 5+. Cols A=Date, B=Section, C=Order No, E=Target, F=Actual</p>
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
                  <CheckCircle className="w-4 h-4" />{tDailyValid} daily + {tSectionValid} section ready
                </span>
                {tDupes > 0 && (
                  <span className="inline-flex items-center gap-1.5 text-sm text-amber-700 bg-amber-50 px-3 py-1.5 rounded-full font-medium">
                    <AlertTriangle className="w-4 h-4" />{tDupes} duplicates
                  </span>
                )}
                {tErrors > 0 && (
                  <span className="inline-flex items-center gap-1.5 text-sm text-red-700 bg-red-50 px-3 py-1.5 rounded-full font-medium">
                    <AlertCircle className="w-4 h-4" />{tErrors} errors
                  </span>
                )}
              </div>

              <Tabs defaultValue="daily">
                <TabsList>
                  <TabsTrigger value="daily">Daily Output ({tDailyValid})</TabsTrigger>
                  <TabsTrigger value="section">Section Output ({tSectionValid})</TabsTrigger>
                  <TabsTrigger value="dupes">Duplicates ({tDupes})</TabsTrigger>
                  <TabsTrigger value="errors">Errors ({tErrors})</TabsTrigger>
                </TabsList>

                <TabsContent value="daily" className="mt-3">
                  <PagedTable rows={parsed.dailyValid} columns={[
                    { key: 'date', label: 'Date' },
                    { key: 'linePairNo', label: 'Line', render: r => `LP-${String(r.linePairNo).padStart(2,'0')}` },
                    { key: 'orderNo', label: 'Order' },
                    { key: 'targetPcs', label: 'Target' },
                    { key: 'actualPcs', label: 'Actual' },
                    { key: 'efficiency', label: 'Eff %', render: r => r.targetPcs > 0 ? Math.round(r.actualPcs / r.targetPcs * 100) + '%' : '—' },
                  ]} />
                </TabsContent>

                <TabsContent value="section" className="mt-3">
                  <PagedTable rows={parsed.sectionValid} columns={[
                    { key: 'date', label: 'Date' },
                    { key: 'section', label: 'Section' },
                    { key: 'orderNo', label: 'Order' },
                    { key: 'targetPcs', label: 'Target' },
                    { key: 'actualPcs', label: 'Actual' },
                    { key: 'efficiency', label: 'Eff %', render: r => r.targetPcs > 0 ? Math.round(r.actualPcs / r.targetPcs * 100) + '%' : '—' },
                  ]} />
                </TabsContent>

                <TabsContent value="dupes" className="mt-3">
                  <PagedTable rows={parsed.duplicates} columns={[
                    { key: 'source', label: 'Sheet' },
                    { key: 'date', label: 'Date' },
                    { key: 'orderNo', label: 'Order' },
                    { key: 'targetPcs', label: 'Target' },
                    { key: 'actualPcs', label: 'Actual' },
                  ]} extra={row => (
                    <div className="flex gap-2">
                      {['skip', 'update'].map(a => (
                        <button key={a} onClick={() => setDupActions(p => ({ ...p, [row.dupKey]: a }))}
                          className={`text-xs px-2.5 py-1 rounded-full font-medium border transition-colors ${
                            (dupActions[row.dupKey] || 'skip') === a
                              ? a === 'skip' ? 'bg-slate-700 text-white border-slate-700' : 'bg-blue-500 text-white border-blue-500'
                              : 'border-slate-300 text-slate-600 hover:border-slate-400'
                          }`}>
                          {a === 'skip' ? 'Skip' : 'Update'}
                        </button>
                      ))}
                    </div>
                  )} />
                </TabsContent>

                <TabsContent value="errors" className="mt-3">
                  <PagedTable rows={parsed.errors} columns={[
                    { key: 'sheet', label: 'Sheet' },
                    { key: 'rowNum', label: 'Row' },
                    { key: 'orderNo', label: 'Order' },
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
              <p className="text-sm text-slate-600">Saving output data to database…</p>
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
                    Daily Output: {result.stats.dailyImported} imported · {result.stats.dailyUpdated} updated · {result.stats.dailySkipped} skipped
                  </p>
                  <p className="text-sm text-slate-500">
                    Section Output: {result.stats.sectionImported} imported · {result.stats.sectionUpdated} updated · {result.stats.sectionSkipped} skipped
                  </p>
                  {result.stats.failed > 0 && <p className="text-sm text-red-600">{result.stats.failed} rows failed</p>}
                </div>
              </div>
              {result.failedRows.length > 0 && (
                <Button variant="outline" size="sm" onClick={() => downloadExcelReport(result.failedRows, 'output_import_errors.xlsx')}>
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
                  <Button onClick={handleConfirm} disabled={tDailyValid === 0 && tSectionValid === 0 && !Object.values(dupActions).some(a => a === 'update')}>
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
