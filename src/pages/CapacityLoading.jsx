import { useState, useMemo, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { format, eachWeekOfInterval, addDays, endOfWeek } from 'date-fns'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine,
} from 'recharts'
import { Plus, Calculator, Trash2, Pencil } from 'lucide-react'
import { useAppStore } from '@/store/useStore'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PageSpinner, InlineError } from '@/components/ui/spinner'
import { FormModal, TextField, SelectField, TextareaField } from '@/components/ui/form-modal'
import { LINES } from '@/data/mockData'
import { countWorkingDays } from '@/lib/workingDays'

const OPERATORS = 25
const HOURS = 8
const EFF = 0.85

function LoadBadge({ pct }) {
  if (pct >= 100) return <Badge variant="danger">{pct}%</Badge>
  if (pct >= 85)  return <Badge variant="warning">{pct}%</Badge>
  if (pct >= 50)  return <Badge variant="success">{pct}%</Badge>
  return <Badge variant="secondary">{pct}%</Badge>
}

const fmt = (d) => d ? (d instanceof Date ? d.toISOString().split('T')[0] : String(d).slice(0, 10)) : ''

// ── Allocation Form ────────────────────────────────────────────────────────────
function AllocationForm({ open, onClose, orders, onSave, initial }) {
  const BLANK = { orderId: '', linePairNo: '1', startDate: '', endDate: '', allocatedQty: '', targetDailyPcs: '', notes: '' }
  const [f, setF] = useState(() => initial
    ? { ...initial, linePairNo: String(initial.linePairNo), startDate: fmt(initial.startDate), endDate: fmt(initial.endDate) }
    : BLANK)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const set = (k, v) => setF(p => ({ ...p, [k]: v }))

  useEffect(() => {
    if (open) {
      setF(initial
        ? { ...initial, linePairNo: String(initial.linePairNo), startDate: fmt(initial.startDate), endDate: fmt(initial.endDate) }
        : BLANK)
      setErr('')
    }
  }, [open])

  const orderOpts = orders.map(o => ({ value: o.id, label: `${o.orderNo} — ${o.buyer}` }))
  const lineOpts  = LINES.map(l => ({ value: String(l.pairNo), label: `Line ${String(l.pairNo).padStart(2,'0')} (${l.componentLine}/${l.assemblyLine})` }))

  const workingDays = (f.startDate && f.endDate)
    ? countWorkingDays(new Date(f.startDate), new Date(f.endDate))
    : 0
  const avgPcsDay = (workingDays > 0 && Number(f.allocatedQty) > 0)
    ? Math.round(Number(f.allocatedQty) / workingDays)
    : 0

  const handleSave = async () => {
    if (!f.orderId || !f.startDate || !f.endDate) {
      setErr('Order, Start Date and End Date are required.'); return
    }
    setSaving(true); setErr('')
    try {
      await onSave({ ...f, linePairNo: Number(f.linePairNo), startDate: new Date(f.startDate), endDate: new Date(f.endDate) })
      onClose()
    } catch (e) { setErr(e.message) }
    finally { setSaving(false) }
  }

  return (
    <FormModal open={open} onClose={onClose} title={initial ? 'Edit Allocation' : 'New Line Allocation'}
      onSave={handleSave} saving={saving} error={err}>
      <SelectField label="Order *" value={f.orderId} onChange={v => set('orderId', v)}
        options={orderOpts} placeholder="Select order…" span={2} />
      <SelectField label="Line Pair *" value={f.linePairNo} onChange={v => set('linePairNo', v)} options={lineOpts} />
      <TextField label="Allocated Qty" value={f.allocatedQty} onChange={v => set('allocatedQty', v)} type="number" min="0" />
      <TextField label="Start Date *" value={f.startDate} onChange={v => set('startDate', v)} type="date" />
      <TextField label="End Date *"   value={f.endDate}   onChange={v => set('endDate', v)}   type="date" />
      <TextField label="Target Daily Pcs" value={f.targetDailyPcs} onChange={v => set('targetDailyPcs', v)} type="number" min="0" />
      {workingDays > 0 && (
        <div className="col-span-2 flex gap-4 text-xs text-slate-500 bg-slate-50 rounded p-2">
          <span>Working days: <strong>{workingDays}</strong></span>
          {avgPcsDay > 0 && <span>Avg pcs/day: <strong>{avgPcsDay.toLocaleString()}</strong></span>}
        </div>
      )}
      <TextareaField label="Notes" value={f.notes} onChange={v => set('notes', v)} span={2} />
    </FormModal>
  )
}

// ── SMV Calculator ────────────────────────────────────────────────────────────
function SMVCalculator() {
  const [inp, setInp] = useState({ operators: 25, workingDays: 5, hoursPerDay: 8, efficiency: 85 })
  const [smv, setSmv] = useState(35.5)
  const [qty, setQty] = useState(5000)
  const set = (k, v) => setInp(p => ({ ...p, [k]: Number(v) }))

  const res = useMemo(() => {
    const avail = inp.operators * inp.workingDays * inp.hoursPerDay * 60 * (inp.efficiency / 100)
    const req   = smv * qty
    const days  = Math.ceil(req / (inp.operators * inp.hoursPerDay * 60 * (inp.efficiency / 100)))
    return { avail: Math.round(avail), req: Math.round(req), days, pct: Math.round((req / avail) * 100) }
  }, [inp, smv, qty])

  const ic = 'flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Calculator className="w-5 h-5 text-blue-600" />SMV Calculator
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          {[['operators','Operators'],['workingDays','Working Days'],['hoursPerDay','Hours/Day'],['efficiency','Efficiency %']].map(([k,l]) => (
            <div key={k}>
              <p className="text-xs font-medium text-slate-600 mb-1">{l}</p>
              <input type="number" value={inp[k]} onChange={e => set(k, e.target.value)} className={ic} />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3 border-t pt-3">
          <div><p className="text-xs font-medium text-slate-600 mb-1">Order SMV</p>
            <input type="number" step="0.1" value={smv} onChange={e => setSmv(+e.target.value)} className={ic} /></div>
          <div><p className="text-xs font-medium text-slate-600 mb-1">Order Qty</p>
            <input type="number" value={qty} onChange={e => setQty(+e.target.value)} className={ic} /></div>
        </div>
        <div className="bg-slate-50 rounded-xl p-4 space-y-2 border border-slate-200">
          {[['Available Minutes', res.avail.toLocaleString()],['Required Minutes', res.req.toLocaleString()],['Days Required', res.days]].map(([l,v]) => (
            <div key={l} className="flex justify-between text-xs">
              <span className="text-slate-600">{l}</span><span className="font-bold">{v}</span>
            </div>
          ))}
          <div className="flex justify-between items-center border-t pt-2">
            <span className="text-xs font-semibold">Loading %</span>
            <LoadBadge pct={res.pct} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────────
export default function CapacityLoading() {
  const { orders, lineAllocations, addLineAllocation, updateLineAllocation, removeLineAllocation, loading, errors, canEdit } = useAppStore()
  const [showForm, setShowForm] = useState(false)
  const [editingAlloc, setEditingAlloc] = useState(null)

  const editable = canEdit()

  // Build weekly capacity from allocations using working days
  const weeklyData = useMemo(() => {
    if (!lineAllocations.length && !orders.length) return []
    const now = new Date()
    const weeks = eachWeekOfInterval(
      { start: addDays(now, -21), end: addDays(now, 63) },
      { weekStartsOn: 1 }
    )
    const pairsCount = 20
    const capPcsPerWeek = pairsCount * 2 * OPERATORS * HOURS * 5 * EFF * 60 / 35

    return weeks.map((wStart, i) => {
      const wEnd = endOfWeek(wStart, { weekStartsOn: 1 })
      let loadedPcs = 0
      lineAllocations.forEach(a => {
        const aStart = new Date(a.startDate)
        const aEnd   = new Date(a.endDate)
        if (aStart <= wEnd && aEnd >= wStart) {
          const overlapStart = aStart > wStart ? aStart : wStart
          const overlapEnd   = aEnd < wEnd ? aEnd : wEnd
          const wd = countWorkingDays(overlapStart, overlapEnd)
          loadedPcs += (a.targetDailyPcs || 0) * wd
        }
      })
      return {
        week: `W${i + 1}`,
        weekLabel: format(wStart, 'MMM d'),
        capacityPcs: Math.round(capPcsPerWeek),
        loadedPcs: Math.round(loadedPcs),
        loadingPct: Math.round((loadedPcs / capPcsPerWeek) * 100),
      }
    })
  }, [lineAllocations])

  const openEdit = (a) => {
    setEditingAlloc(a)
    setShowForm(true)
  }

  const handleSave = async (data) => {
    if (editingAlloc) {
      await updateLineAllocation(editingAlloc.id, data)
    } else {
      await addLineAllocation(data)
    }
  }

  if (loading.allocations && !lineAllocations.length && loading.orders) return <PageSpinner />

  return (
    <div className="space-y-6">
      <InlineError message={errors.allocations} />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <SMVCalculator />

        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Weekly Capacity vs Loaded (Pieces)</CardTitle>
            </CardHeader>
            <CardContent>
              {weeklyData.length === 0
                ? <div className="text-center py-10 text-slate-400 text-sm">No allocations yet</div>
                : (
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={weeklyData} margin={{ top: 5, right: 5, left: -15, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="weekLabel" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip formatter={v => Math.round(v).toLocaleString()} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Bar dataKey="capacityPcs" name="Capacity" fill="#e2e8f0" radius={[2,2,0,0]} />
                      <Bar dataKey="loadedPcs"   name="Loaded"   fill="#3b82f6" radius={[2,2,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Loading % by Week</CardTitle>
            </CardHeader>
            <CardContent>
              {weeklyData.length === 0
                ? <div className="text-center py-6 text-slate-400 text-sm">No data</div>
                : (
                  <ResponsiveContainer width="100%" height={140}>
                    <BarChart data={weeklyData} margin={{ top: 5, right: 5, left: -15, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="weekLabel" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} domain={[0, 120]} />
                      <Tooltip formatter={v => `${v}%`} />
                      <ReferenceLine y={100} stroke="#ef4444" strokeDasharray="4 4" />
                      <Bar dataKey="loadingPct" name="Loading %" fill="#8b5cf6" radius={[2,2,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Allocations table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Line Allocations</CardTitle>
            {editable && (
              <Button size="sm" onClick={() => { setEditingAlloc(null); setShowForm(true) }}>
                <Plus className="w-4 h-4" />New Allocation
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {lineAllocations.length === 0
            ? <div className="text-center py-10 text-slate-400 text-sm">No allocations yet — assign an order to a line pair</div>
            : (
              <div className="overflow-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200">
                      {['Order','Line Pair','Start','End','Alloc Qty','Daily Target','Working Days','Avg Pcs/Day','Notes',''].map(h => (
                        <th key={h} className="text-left py-2 px-3 text-xs font-semibold text-slate-500 uppercase whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {lineAllocations.map(a => {
                      const wd = countWorkingDays(new Date(a.startDate), new Date(a.endDate))
                      const avgPcs = wd > 0 && a.allocatedQty > 0 ? Math.round(a.allocatedQty / wd) : 0
                      return (
                        <tr key={a.id} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full" style={{ background: a.color }} />
                              <span className="font-semibold">{a.orderNo}</span>
                            </div>
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="font-medium">Line {String(a.linePairNo).padStart(2,'0')}</span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">{format(new Date(a.startDate),'MMM dd')}</td>
                          <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">{format(new Date(a.endDate),'MMM dd')}</td>
                          <td className="py-2.5 px-3 font-medium">{a.allocatedQty.toLocaleString()}</td>
                          <td className="py-2.5 px-3">{a.targetDailyPcs.toLocaleString()}</td>
                          <td className="py-2.5 px-3 text-slate-500">{wd}</td>
                          <td className="py-2.5 px-3 text-slate-600 font-medium">{avgPcs > 0 ? `${avgPcs.toLocaleString()} pcs/day` : '—'}</td>
                          <td className="py-2.5 px-3 text-slate-500 text-xs max-w-[150px] truncate">{a.notes}</td>
                          <td className="py-2.5 px-3">
                            <div className="flex gap-1">
                              {editable && (
                                <button onClick={() => openEdit(a)}
                                  className="p-1.5 rounded hover:bg-slate-100 text-slate-400 hover:text-blue-600">
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                              )}
                              {editable && (
                                <button onClick={() => { if (window.confirm('Remove allocation?')) removeLineAllocation(a.id) }}
                                  className="p-1.5 rounded hover:bg-red-50 text-slate-400 hover:text-red-600">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
        </CardContent>
      </Card>

      <AllocationForm
        open={showForm}
        onClose={() => setShowForm(false)}
        orders={orders}
        onSave={handleSave}
        initial={editingAlloc}
      />
    </div>
  )
}
