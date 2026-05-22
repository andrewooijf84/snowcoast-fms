import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { format, getISOWeek } from 'date-fns'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Plus, Trash2, FileUp } from 'lucide-react'
import { useAppStore } from '@/store/useStore'
import OutputImportModal from '@/components/import/OutputImportModal'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PageSpinner, InlineError } from '@/components/ui/spinner'
import { FormModal, TextField, SelectField, TextareaField } from '@/components/ui/form-modal'
import { countWorkingDays } from '@/lib/workingDays'

const SECTION_KEYS = ['cutting','embroidery','downFilling','template','component','assembly','packing']
const SECTION_LABELS = {
  cutting:'Cutting', embroidery:'Embroidery / Print', downFilling:'Down Filling',
  template:'Template', component:'Component', assembly:'Assembly', packing:'Packing',
}
const SECTION_COLORS = {
  cutting:'#3b82f6', embroidery:'#ec4899', downFilling:'#06b6d4',
  template:'#f59e0b', component:'#8b5cf6', assembly:'#22c55e', packing:'#f97316',
}

function EffBadge({ pct }) {
  if (pct >= 100) return <Badge variant="success">{pct}%</Badge>
  if (pct >= 90)  return <Badge variant="info">{pct}%</Badge>
  if (pct >= 80)  return <Badge variant="warning">{pct}%</Badge>
  return <Badge variant="danger">{pct}%</Badge>
}

function RiskBadge({ risk }) {
  if (!risk) return <span className="text-slate-300">—</span>
  if (risk.type === 'critical') return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700 bg-red-50 px-1.5 py-0.5 rounded" title={risk.text}>
      ⚠ Risk
    </span>
  )
  if (risk.type === 'tight') return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded" title={risk.text}>
      ⚡ Tight
    </span>
  )
  if (risk.type === 'ok') return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 px-1.5 py-0.5 rounded">
      ✓ OK
    </span>
  )
  return null
}

function BalanceDaysBadge({ days }) {
  if (days === null || days === undefined) return <span className="text-slate-300">—</span>
  const cls = days > 10 ? 'text-green-700 bg-green-50' : days >= 5 ? 'text-amber-700 bg-amber-50' : 'text-red-700 bg-red-50'
  return <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${cls}`}>{days}d left</span>
}

// ── Output Entry Form ──────────────────────────────────────────────────────────
function OutputForm({ open, onClose, orders, onSave }) {
  const BLANK = {
    date: format(new Date(), 'yyyy-MM-dd'),
    section: 'cutting', orderId: '',
    target: '', actual: '', wipReceived: '', wipPassedOut: '', remarks: '',
  }
  const [f, setF] = useState(BLANK)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const set = (k, v) => setF(p => ({ ...p, [k]: v }))

  const efficiency = f.target > 0 ? Math.round((Number(f.actual) / Number(f.target)) * 100) : 0

  const orderOpts = useMemo(() => {
    const base = f.section === 'embroidery' ? orders.filter(o => o.requiresEmbroidery) : orders
    return [{ value: '', label: '— No specific order —' }, ...base.map(o => ({ value: o.id, label: `${o.orderNo} — ${o.buyer}` }))]
  }, [orders, f.section])

  const sectionOpts = useMemo(() => {
    const selectedOrder = orders.find(o => o.id === f.orderId)
    return SECTION_KEYS
      .filter(k => k !== 'embroidery' || !f.orderId || selectedOrder?.requiresEmbroidery)
      .map(k => ({ value: k, label: SECTION_LABELS[k] }))
  }, [orders, f.orderId])

  const handleSave = async () => {
    if (!f.date || !f.section || !f.target) { setErr('Date, Section and Target are required.'); return }
    setSaving(true); setErr('')
    try {
      await onSave({ ...f, target: Number(f.target), actual: Number(f.actual), wipReceived: Number(f.wipReceived) || 0, wipPassedOut: Number(f.wipPassedOut) || 0 })
      setF(BLANK); onClose()
    } catch (e) { setErr(e.message) }
    finally { setSaving(false) }
  }

  return (
    <FormModal open={open} onClose={onClose} title="Add Output Entry" onSave={handleSave} saving={saving} error={err}>
      <TextField label="Date *" value={f.date} onChange={v => set('date', v)} type="date" />
      <SelectField label="Section *" value={f.section} onChange={v => set('section', v)} options={sectionOpts} />
      <SelectField label="Order" value={f.orderId} onChange={v => set('orderId', v)} options={orderOpts} span={2} />
      <TextField label="Target Pcs *" value={f.target} onChange={v => set('target', v)} type="number" min="0" />
      <TextField label="Actual Pcs" value={f.actual} onChange={v => set('actual', v)} type="number" min="0" />
      <TextField label="Efficiency %" value={efficiency} onChange={() => {}} type="number" disabled />
      <div />
      <TextField label="WIP Received" value={f.wipReceived} onChange={v => set('wipReceived', v)} type="number" min="0" />
      <TextField label="WIP Passed Out" value={f.wipPassedOut} onChange={v => set('wipPassedOut', v)} type="number" min="0" />
      <TextareaField label="Remarks" value={f.remarks} onChange={v => set('remarks', v)} span={2} />
    </FormModal>
  )
}

// ── Section Card ───────────────────────────────────────────────────────────────
function SectionCard({ section, rows, period, orders, sectionOutputRows }) {
  const color = SECTION_COLORS[section]
  const label = SECTION_LABELS[section]

  const chartData = useMemo(() => {
    if (period === 'daily') {
      return rows.slice(0, 14).reverse().map(r => ({
        label: r.periodDate ? format(new Date(r.periodDate), 'EEE d') : r.periodLabel,
        Target: r.target, Actual: r.actual,
      }))
    }
    if (period === 'weekly') {
      const byWeek = {}
      rows.forEach(r => {
        if (!r.periodDate) return
        const wk = `W${getISOWeek(new Date(r.periodDate))}`
        if (!byWeek[wk]) byWeek[wk] = { label: wk, Target: 0, Actual: 0 }
        byWeek[wk].Target += r.target
        byWeek[wk].Actual += r.actual
      })
      return Object.values(byWeek).slice(-8)
    }
    const byMonth = {}
    rows.forEach(r => {
      if (!r.periodDate) return
      const mo = format(new Date(r.periodDate), 'MMM')
      if (!byMonth[mo]) byMonth[mo] = { label: mo, Target: 0, Actual: 0 }
      byMonth[mo].Target += r.target
      byMonth[mo].Actual += r.actual
    })
    return Object.values(byMonth).slice(-6)
  }, [rows, period])

  const totTarget = rows.reduce((s, r) => s + r.target, 0)
  const totActual = rows.reduce((s, r) => s + r.actual, 0)
  const avgEff    = rows.length ? Math.round(rows.reduce((s, r) => s + r.efficiency, 0) / rows.length) : 0

  // Compute per-order balance/risk for this section
  const orderRisks = useMemo(() => {
    const today = new Date(); today.setHours(0,0,0,0)
    const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1)
    return orders
      .filter(o => o.status !== 'completed' && rows.some(r => r.orderId === o.id))
      .map(o => {
        const balDays = o.completionDate ? countWorkingDays(tomorrow, new Date(o.completionDate)) : null
        const orderSectionRows = sectionOutputRows.filter(r => r.orderId === o.id && r.section === section)
        const cumActual = orderSectionRows.reduce((s, r) => s + r.actual, 0)
        const balQty = (o.qty || 0) - cumActual
        if (balQty <= 0) return { orderNo: o.orderNo, type: 'complete', text: '✓ Complete', balDays }
        const sorted = [...orderSectionRows].sort((a, b) => {
          const da = a.periodDate ? new Date(a.periodDate) : new Date(0)
          const db = b.periodDate ? new Date(b.periodDate) : new Date(0)
          return db - da
        })
        const avgDaily = sorted.slice(0, 3).reduce((s, r) => s + r.actual, 0) / (Math.min(sorted.length, 3) || 1)
        const daysNeeded = avgDaily > 0 ? Math.ceil(balQty / avgDaily) : null
        if (daysNeeded === null || balDays === null) return { orderNo: o.orderNo, type: null, balDays }
        if (daysNeeded > balDays) {
          return { orderNo: o.orderNo, type: 'critical', text: `⚠ Need ${daysNeeded}d, only ${balDays}d left (behind ${daysNeeded - balDays}d)`, balDays }
        }
        if (daysNeeded > balDays - 2) {
          return { orderNo: o.orderNo, type: 'tight', text: `⚡ Tight: ${daysNeeded}d needed / ${balDays}d remaining`, balDays }
        }
        return { orderNo: o.orderNo, type: 'ok', text: `✓ On track (${daysNeeded}d needed, ${balDays}d left)`, balDays }
      })
  }, [orders, rows, sectionOutputRows, section])

  const criticalRisks = orderRisks.filter(r => r.type === 'critical')
  const tightRisks    = orderRisks.filter(r => r.type === 'tight')

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-sm" style={{ background: color }} />
            <CardTitle className="text-sm">{label}</CardTitle>
          </div>
          <div className="flex items-center gap-1.5">
            {criticalRisks.length > 0 && <span className="text-xs font-bold text-red-600">⚠ {criticalRisks.length} at risk</span>}
            {tightRisks.length > 0 && <span className="text-xs font-bold text-amber-600">⚡ {tightRisks.length} tight</span>}
            <EffBadge pct={avgEff} />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {chartData.length === 0
          ? <div className="text-center py-6 text-slate-300 text-xs">No data</div>
          : (
            <ResponsiveContainer width="100%" height={120}>
              <BarChart data={chartData} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip formatter={v => v.toLocaleString()} />
                <Bar dataKey="Target" fill="#e2e8f0" radius={[1,1,0,0]} />
                <Bar dataKey="Actual" fill={color} radius={[1,1,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        <div className="flex justify-between text-xs mt-2 p-2 rounded-lg bg-slate-50">
          <div><p className="text-slate-400">Target</p><p className="font-bold" style={{ color }}>{totTarget.toLocaleString()}</p></div>
          <div className="text-center"><p className="text-slate-400">Actual</p><p className="font-bold" style={{ color }}>{totActual.toLocaleString()}</p></div>
          <div className="text-right"><p className="text-slate-400">Variance</p>
            <p className={`font-bold ${totActual >= totTarget ? 'text-green-600' : 'text-red-600'}`}>
              {totActual >= totTarget ? '+' : ''}{(totActual - totTarget).toLocaleString()}
            </p>
          </div>
        </div>
        {orderRisks.filter(r => r.type && r.type !== 'complete').map(r => (
          <div key={r.orderNo} className={`mt-1.5 text-xs px-2 py-1 rounded ${r.type === 'critical' ? 'bg-red-50 text-red-700' : r.type === 'tight' ? 'bg-amber-50 text-amber-700' : 'bg-green-50 text-green-700'}`}>
            <span className="font-medium">{r.orderNo}:</span> {r.text}
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────────
export default function SectionOutput() {
  const { sectionOutputRows, orders, dailyLineOutput, addSectionOutput, removeSectionOutput, fetchAll, fetchSectionOutput, fetchDailyOutput, sectionOutputPeriod, setSectionOutputPeriod, loading, errors, canEdit, getRole } = useAppStore()
  const [showForm, setShowForm] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const canImportOutput = ['admin', 'ie'].includes(getRole())

  const editable = canEdit()

  const today = new Date(); today.setHours(0,0,0,0)
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1)

  const bySection = useMemo(() => {
    const map = {}
    SECTION_KEYS.forEach(k => { map[k] = [] })
    sectionOutputRows.forEach(r => { if (map[r.section]) map[r.section].push(r) })
    return map
  }, [sectionOutputRows])

  // Compute per-row metrics
  const rowMetrics = useMemo(() => {
    const map = {}
    sectionOutputRows.forEach(r => {
      // Workers present: sum from daily_line_output matching orderId + date
      let workersPresent = 0
      if (r.orderId && r.periodDate) {
        const dateStr = format(new Date(r.periodDate), 'yyyy-MM-dd')
        workersPresent = dailyLineOutput
          .filter(d => d.orderId === r.orderId && format(new Date(d.date), 'yyyy-MM-dd') === dateStr)
          .reduce((s, d) => s + (d.workersPresent || 0), 0)
      }
      const pcsPerHead = (workersPresent > 0 && r.actual > 0) ? (r.actual / workersPresent).toFixed(1) : null

      // Balance days remaining
      const order = r.orderId ? orders.find(o => o.id === r.orderId) : null
      const balDays = order?.completionDate ? countWorkingDays(tomorrow, new Date(order.completionDate)) : null

      // Overdue risk
      let risk = null
      if (order && order.qty && order.completionDate && r.orderId) {
        const sectionRows = sectionOutputRows.filter(x => x.orderId === r.orderId && x.section === r.section)
        const cumActual = sectionRows.reduce((s, x) => s + x.actual, 0)
        const balQty = order.qty - cumActual
        if (balQty <= 0) {
          risk = { type: 'ok', text: '✓ Complete' }
        } else {
          const sorted = [...sectionRows].sort((a, b) => {
            const da = a.periodDate ? new Date(a.periodDate) : new Date(0)
            const db = b.periodDate ? new Date(b.periodDate) : new Date(0)
            return db - da
          })
          const last3 = sorted.slice(0, 3)
          const avgDaily = last3.length ? last3.reduce((s, x) => s + x.actual, 0) / last3.length : 0
          const daysNeeded = avgDaily > 0 ? Math.ceil(balQty / avgDaily) : null
          if (daysNeeded !== null && balDays !== null) {
            if (daysNeeded > balDays) {
              risk = { type: 'critical', text: `⚠ Overdue risk: need ${daysNeeded} days but only ${balDays} working days left. Behind by ${daysNeeded - balDays} days — planning adjustment required.` }
            } else if (daysNeeded > balDays - 2) {
              risk = { type: 'tight', text: `⚡ Tight: estimated to finish on last day. No buffer remaining.` }
            } else {
              risk = { type: 'ok', text: `✓ On track` }
            }
          }
        }
      }

      map[r.id] = { pcsPerHead, balDays, risk }
    })
    return map
  }, [sectionOutputRows, orders, dailyLineOutput])

  if (loading.sections && !sectionOutputRows.length) return <PageSpinner />

  return (
    <div className="space-y-5">
      <InlineError message={errors.sections} />

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex border border-slate-200 rounded-lg overflow-hidden">
          {[['daily','Daily'],['weekly','Weekly'],['monthly','Monthly']].map(([v,l]) => (
            <button key={v} onClick={() => setSectionOutputPeriod(v)}
              className={`px-4 py-1.5 text-sm font-medium transition-colors ${sectionOutputPeriod === v ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}>
              {l}
            </button>
          ))}
        </div>
        <div className="ml-auto">
          <div className="flex gap-2">
            {canImportOutput && (
              <Button size="sm" variant="outline" onClick={() => setShowImport(true)}>
                <FileUp className="w-4 h-4" />Import Output
              </Button>
            )}
            {editable && (
              <Button size="sm" onClick={() => setShowForm(true)}>
                <Plus className="w-4 h-4" />Add Output
              </Button>
            )}
          </div>
        </div>
      </div>

      {sectionOutputRows.length === 0 && (
        <div className="text-center py-16 text-slate-400 text-sm border border-dashed border-slate-200 rounded-xl">
          No output data yet — click "Add Output" to start recording production
        </div>
      )}

      {/* Section cards */}
      {sectionOutputRows.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
          {SECTION_KEYS.map(k => (
            <SectionCard key={k} section={k} rows={bySection[k]} period={sectionOutputPeriod}
              orders={orders} sectionOutputRows={sectionOutputRows} />
          ))}
        </div>
      )}

      {/* Recent entries table */}
      {sectionOutputRows.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Recent Entries</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    {['Date','Section','Order','Target','Actual','Eff%','Pcs/Head/Day','Bal Days','Risk','WIP In','WIP Out','Remarks',''].map(h => (
                      <th key={h} className="text-left py-2 px-3 text-xs font-semibold text-slate-500 uppercase whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sectionOutputRows.slice(0, 50).map(r => {
                    const m = rowMetrics[r.id] || {}
                    return (
                      <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="py-2 px-3 text-slate-600 whitespace-nowrap">
                          {r.periodDate ? format(new Date(r.periodDate),'MMM dd') : r.periodLabel}
                        </td>
                        <td className="py-2 px-3">
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-sm" style={{ background: SECTION_COLORS[r.section] }} />
                            <span className="text-slate-700">{SECTION_LABELS[r.section]}</span>
                          </div>
                        </td>
                        <td className="py-2 px-3 text-slate-500 text-xs">{r.orderNo || '—'}</td>
                        <td className="py-2 px-3">{r.target.toLocaleString()}</td>
                        <td className="py-2 px-3 font-medium">{r.actual.toLocaleString()}</td>
                        <td className="py-2 px-3"><EffBadge pct={r.efficiency} /></td>
                        <td className="py-2 px-3 text-slate-600 whitespace-nowrap">
                          {m.pcsPerHead ? <span>{m.pcsPerHead} pcs/head/day</span> : <span className="text-slate-300">—</span>}
                        </td>
                        <td className="py-2 px-3"><BalanceDaysBadge days={m.balDays} /></td>
                        <td className="py-2 px-3"><RiskBadge risk={m.risk} /></td>
                        <td className="py-2 px-3 text-slate-500">{r.wipReceived}</td>
                        <td className="py-2 px-3 text-slate-500">{r.wipPassedOut}</td>
                        <td className="py-2 px-3 text-slate-400 text-xs max-w-[120px] truncate">{r.remarks}</td>
                        <td className="py-2 px-3">
                          <button onClick={() => { if (window.confirm('Delete?')) removeSectionOutput(r.id) }}
                            className="p-1 rounded hover:bg-red-50 text-slate-400 hover:text-red-600">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <OutputForm open={showForm} onClose={() => setShowForm(false)} orders={orders} onSave={addSectionOutput} />
      <OutputImportModal open={showImport} onClose={() => setShowImport(false)} onImportDone={() => { setShowImport(false); fetchSectionOutput(); fetchDailyOutput() }} />
    </div>
  )
}
