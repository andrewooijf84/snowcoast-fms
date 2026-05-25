import { useState, useMemo, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import {
  format, differenceInDays, startOfMonth, endOfMonth,
  eachDayOfInterval, isWeekend,
} from 'date-fns'
import { Plus, BarChart2, Table2, ChevronLeft, ChevronRight, Pencil, Trash2, AlertTriangle, FileUp, ChevronDown } from 'lucide-react'
import { useAppStore } from '@/store/useStore'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { PageSpinner, InlineError } from '@/components/ui/spinner'
import OrderForm, { toEditForm, BLANK_ORDER } from '@/components/OrderForm'
import OrderImportModal from '@/components/import/OrderImportModal'
import { LINES } from '@/data/mockData'
import { shipmentGapWorkingDays } from '@/lib/workingDays'
import { fetchOrderProgressAll } from '@/lib/api'

const STATUS_CFG = {
  active:    { label: 'Active',    variant: 'info' },
  completed: { label: 'Completed', variant: 'success' },
  pending:   { label: 'Pending',   variant: 'warning' },
  delayed:   { label: 'Delayed',   variant: 'danger' },
}
const COLORS = ['#3b82f6','#8b5cf6','#f59e0b','#22c55e','#ef4444','#ec4899','#06b6d4','#84cc16','#f97316','#6366f1']

function isIncomplete(o) {
  // Incomplete if no portions have a sew start date
  const hasSewStart = (o.portions || []).some(p => p.sewStartDate)
  return !o.smv || (!hasSewStart && !o.sewStartDate)
}

function ShipmentGapIcon({ order }) {
  const completionDate = order.completionDate
  const shipDate = order.shipDate || order.latestExfactory
  if (!completionDate || !shipDate) return null
  const gap = shipmentGapWorkingDays(completionDate, shipDate)
  if (gap === null) return null
  if (gap < 0) {
    return (
      <span title={`Critical: completion date exceeds shipment date by ${Math.abs(gap)} working day(s)`}>
        <AlertTriangle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
      </span>
    )
  }
  if (gap <= 5) {
    return (
      <span title={`Warning: only ${gap} working day(s) between sewing completion and shipment date`}>
        <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
      </span>
    )
  }
  return null
}

// Milestone dot colours
const MILESTONE_COLORS = {
  'Material Arrival': '#94a3b8',
  'Cut Start':        '#3b82f6',
  'Emb Start':        '#ec4899',
  'Sew Start':        '#22c55e',
  'Completion':       '#f59e0b',
  'Ex-Factory':       '#ef4444',
}

// ── Gantt chart ────────────────────────────────────────────────────────────────
function GanttChart({ orders, onEdit, canEdit, orderProgress }) {
  const [viewDate, setViewDate] = useState(new Date())
  const days = useMemo(() => eachDayOfInterval({ start: startOfMonth(viewDate), end: endOfMonth(viewDate) }), [viewDate])
  const monthStart = startOfMonth(viewDate)
  const monthEnd   = endOfMonth(viewDate)
  const DW = 28
  const todayStr = format(new Date(), 'yyyy-MM-dd')

  // Bar spans from earliest sew start to latest ex-factory across all portions
  const bar = (order) => {
    const s = new Date(order.earliestSewStart || order.startDate || order.cutStartDate || order.materialArrivalDate)
    const e = new Date(order.latestExfactory  || order.endDate   || order.completionDate)
    if (!s || !e || isNaN(s) || isNaN(e)) return null
    const cs = s < monthStart ? monthStart : s
    const ce = e > monthEnd   ? monthEnd   : e
    if (cs > monthEnd || ce < monthStart) return null
    return {
      left:  differenceInDays(cs, monthStart) * DW,
      width: Math.max((differenceInDays(ce, cs) + 1) * DW, DW),
    }
  }

  // Milestone markers for all portions
  const getMilestoneMarkers = (order) => {
    const markers = []
    const portions = order.portions && order.portions.length > 0
      ? order.portions
      : [{
          sewStartDate: order.sewStartDate, exfactoryDate: order.shipDate,
          materialArrivalDate: order.materialArrivalDate, cutStartDate: order.cutStartDate,
          completionDate: order.completionDate, embStartDate: order.embStartDate,
          portionName: 'Full order',
        }]

    const milestoneFields = [
      { key: 'materialArrivalDate', label: 'Mat',  color: MILESTONE_COLORS['Material Arrival'] },
      { key: 'cutStartDate',        label: 'Cut',  color: MILESTONE_COLORS['Cut Start'] },
      { key: 'embStartDate',        label: 'Emb',  color: MILESTONE_COLORS['Emb Start'] },
      { key: 'sewStartDate',        label: 'Sew',  color: MILESTONE_COLORS['Sew Start'] },
      { key: 'completionDate',      label: 'Done', color: MILESTONE_COLORS['Completion'] },
      { key: 'exfactoryDate',       label: 'Ship', color: MILESTONE_COLORS['Ex-Factory'] },
    ]

    portions.forEach((portion, pi) => {
      milestoneFields.forEach(({ key, label, color }) => {
        const val = portion[key]
        if (!val) return
        const dt = new Date(val)
        if (dt < monthStart || dt > monthEnd) return
        const left = differenceInDays(dt, monthStart) * DW + DW / 2 - 4
        const portionLabel = portions.length > 1 ? `${portion.portionName || `P${pi+1}`}: ${label}` : label
        markers.push({ left, color, label: portionLabel, date: format(dt, 'MMM d'), portionIdx: pi })
      })
    })
    return markers
  }

  return (
    <div className="overflow-auto">
      <div className="flex items-center gap-2 mb-3">
        <Button variant="outline" size="icon" onClick={() => setViewDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <span className="text-sm font-semibold w-28 text-center">{format(viewDate, 'MMMM yyyy')}</span>
        <Button variant="outline" size="icon" onClick={() => setViewDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))}>
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
      <div className="min-w-max">
        <div className="flex mb-1">
          <div className="w-64 flex-shrink-0 text-xs font-semibold text-slate-400 uppercase pr-4">Order</div>
          <div className="flex">
            {days.map(day => (
              <div key={day.toISOString()} style={{ width: DW }}
                className={`text-center text-xs flex-shrink-0 ${isWeekend(day) ? 'text-slate-300' : format(day,'yyyy-MM-dd') === todayStr ? 'text-blue-600 font-bold' : 'text-slate-400'}`}>
                <div>{format(day,'d')}</div>
                <div className="text-slate-300">{format(day,'E')[0]}</div>
              </div>
            ))}
          </div>
        </div>

        {orders.length === 0 && (
          <div className="text-center py-12 text-slate-400 text-sm">No orders yet — click "New Order" to add one</div>
        )}

        {orders.map(order => {
          const b = bar(order)
          const markers = getMilestoneMarkers(order)
          const portionsCount = (order.portions || []).length

          return (
            <div key={order.id} className="flex items-center border-t border-slate-100 hover:bg-slate-50 group">
              <div className="w-64 flex-shrink-0 py-2 pr-3">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: order.color }} />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1">
                      <p className="text-xs font-semibold text-slate-800 truncate">{order.orderNo}</p>
                      <ShipmentGapIcon order={order} />
                      {isIncomplete(order) && (
                        <span className="text-xs bg-amber-100 text-amber-700 px-1 rounded">Incomplete</span>
                      )}
                      {portionsCount > 1 && (
                        <span className="text-xs bg-blue-50 text-blue-600 px-1 rounded">{portionsCount}P</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400">{order.buyer}{order.season ? ` · ${order.season}` : ''}</p>
                  </div>
                  {canEdit && (
                    <button onClick={() => onEdit(order)}
                      className="ml-auto opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-slate-200 text-slate-400 hover:text-blue-600 transition-opacity">
                      <Pencil className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
              <div className="relative flex" style={{ height: 34 }}>
                {days.map(day => (
                  <div key={day.toISOString()} style={{ width: DW }}
                    className={`h-full flex-shrink-0 border-r border-slate-50 ${isWeekend(day) ? 'bg-slate-50' : ''} ${format(day,'yyyy-MM-dd') === todayStr ? 'bg-blue-50' : ''}`} />
                ))}
                {b && (() => {
                  const cumActual = orderProgress[order.id] || 0
                  const pct = order.qty > 0 ? Math.min(100, Math.round(cumActual / order.qty * 100)) : (order.progress || 0)
                  return (
                    <div className="gantt-bar absolute top-1 rounded-md overflow-hidden flex items-center"
                      style={{ left: b.left, width: b.width - 2, height: 24, background: order.color + '55' }}>
                      <div className="absolute top-0 left-0 h-full rounded-md"
                        style={{ width: `${pct}%`, background: order.color }} />
                      <span className="relative text-white text-xs font-bold px-2 truncate drop-shadow">
                        {order.qty ? order.qty.toLocaleString() + 'p' : order.orderNo}
                        {cumActual > 0 && <span className="ml-1 opacity-80 text-xs">· {pct}%</span>}
                      </span>
                    </div>
                  )
                })()}
                {/* Milestone markers */}
                {markers.map((m, i) => (
                  <div key={i} className="absolute" style={{ left: m.left, top: 2, zIndex: 10 }}
                    title={`${m.label}: ${m.date}`}>
                    <div className="w-2 h-2 rounded-full border border-white shadow-sm"
                      style={{ background: m.color }} />
                  </div>
                ))}
                {/* Ship date line */}
                {(() => {
                  const ship = order.latestExfactory || order.shipDate ? new Date(order.latestExfactory || order.shipDate) : null
                  if (ship && ship >= monthStart && ship <= monthEnd) {
                    return <div className="absolute top-0 bottom-0 w-0.5 bg-red-400 opacity-60"
                      style={{ left: differenceInDays(ship, monthStart) * DW + DW / 2 }}
                      title={`Ex-Factory: ${format(ship,'MMM dd')}`} />
                  }
                })()}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Progress cell ─────────────────────────────────────────────────────────────
function OrderProgressCell({ order, orderProgress }) {
  const cumActual = orderProgress[order.id] || 0
  const qty = order.qty || 0

  if (cumActual > 0 && qty > 0) {
    const pct = Math.min(100, Math.round(cumActual / qty * 100))
    const color = pct >= 75 ? '#22c55e' : pct >= 40 ? '#f59e0b' : '#ef4444'
    const textColor = pct >= 75 ? 'text-green-700' : pct >= 40 ? 'text-amber-600' : 'text-red-600'
    return (
      <div className="space-y-1 min-w-[130px]">
        <div className="flex items-center gap-1.5">
          <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
          </div>
          <span className={`text-xs font-bold ${textColor}`}>{pct}%</span>
        </div>
        <p className="text-xs text-slate-500">
          {cumActual.toLocaleString()} / {qty.toLocaleString()} pcs
        </p>
      </div>
    )
  }

  const pct = order.progress || 0
  return (
    <div className="space-y-1 min-w-[90px]">
      <div className="flex items-center gap-1.5">
        <Progress value={pct} className="flex-1 h-1.5" />
        <span className="text-xs text-slate-400">{pct}%</span>
      </div>
      <p className="text-xs text-slate-400 italic">manual</p>
    </div>
  )
}

// ── Table view ─────────────────────────────────────────────────────────────────
function OrderTable({ orders, onEdit, onDelete, canEdit, orderProgress }) {
  const [expanded, setExpanded] = useState(new Set())
  const toggle = (id) => setExpanded(prev => {
    const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s
  })

  return (
    <div className="overflow-auto">
      {orders.length === 0 && (
        <div className="text-center py-12 text-slate-400 text-sm">No orders yet</div>
      )}
      {orders.length > 0 && (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200">
              {['Order No', 'Customer', 'Style', 'Season', 'Total Qty', 'Portions', 'SMV', 'Emb?', 'Output Progress', 'Status', ''].map(h => (
                <th key={h} className="text-left py-2 px-3 text-xs font-semibold text-slate-500 uppercase whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {orders.map(o => {
              const cfg = STATUS_CFG[o.status] || STATUS_CFG.pending
              const isOpen = expanded.has(o.id)
              const portions = o.portions || []

              return [
                // Main order row
                <tr key={o.id} className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer"
                  onClick={() => portions.length > 0 && toggle(o.id)}>
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: o.color }} />
                      <span className="font-semibold text-slate-800">{o.orderNo}</span>
                      {o.requiresEmbroidery && <span className="text-xs bg-pink-100 text-pink-700 px-1 rounded">Emb</span>}
                      {isIncomplete(o) && <Badge variant="warning" className="text-xs py-0 px-1">Incomplete</Badge>}
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-slate-700">{o.buyer}</td>
                  <td className="py-2.5 px-3 text-slate-600">{o.style}</td>
                  <td className="py-2.5 px-3 text-slate-500 text-xs">{o.season}</td>
                  <td className="py-2.5 px-3 font-medium">{o.qty?.toLocaleString()}</td>
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-1">
                      <span className="text-xs bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-medium">
                        {portions.length} {portions.length === 1 ? 'portion' : 'portions'}
                      </span>
                      {portions.length > 0 && (
                        isOpen
                          ? <ChevronDown className="w-3 h-3 text-slate-400" />
                          : <ChevronLeft className="w-3 h-3 text-slate-400 rotate-180" />
                      )}
                    </div>
                  </td>
                  <td className="py-2.5 px-3">{o.smv || <span className="text-amber-500">—</span>}</td>
                  <td className="py-2.5 px-3">
                    {o.requiresEmbroidery ? <span className="text-xs text-pink-600">Yes</span> : <span className="text-xs text-slate-300">No</span>}
                  </td>
                  <td className="py-2.5 px-3" onClick={e => e.stopPropagation()}>
                    <OrderProgressCell order={o} orderProgress={orderProgress} />
                  </td>
                  <td className="py-2.5 px-3"><Badge variant={cfg.variant}>{cfg.label}</Badge></td>
                  <td className="py-2.5 px-3" onClick={e => e.stopPropagation()}>
                    <div className="flex gap-1">
                      {canEdit && (
                        <button onClick={() => onEdit(o)} className="p-1.5 rounded hover:bg-slate-100 text-slate-400 hover:text-blue-600">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {canEdit && (
                        <button onClick={() => onDelete(o.id)} className="p-1.5 rounded hover:bg-red-50 text-slate-400 hover:text-red-600">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>,
                // Portion sub-rows
                ...(isOpen ? portions.map((portion, pi) => (
                  <tr key={`${o.id}-portion-${pi}`} className="border-b border-blue-50 bg-blue-50/40">
                    <td className="py-1.5 px-3 pl-9">
                      <span className="text-xs text-blue-700 font-semibold">{portion.portionName}</span>
                    </td>
                    <td className="py-1.5 px-3">
                      <span className="text-xs font-medium text-slate-700">{portion.portionQty.toLocaleString()} pcs</span>
                      <span className="text-xs text-slate-400 ml-1">
                        ({o.qty > 0 ? Math.round(portion.portionQty / o.qty * 100) : 0}%)
                      </span>
                    </td>
                    <td className="py-1.5 px-3 text-xs text-slate-500 whitespace-nowrap">
                      {portion.materialArrivalDate ? format(new Date(portion.materialArrivalDate), 'MMM dd') : '—'}
                    </td>
                    <td className="py-1.5 px-3 text-xs text-slate-500 whitespace-nowrap">
                      {portion.cutStartDate ? format(new Date(portion.cutStartDate), 'MMM dd') : '—'}
                    </td>
                    <td className="py-1.5 px-3 text-xs text-slate-500 whitespace-nowrap">
                      {portion.sewStartDate ? format(new Date(portion.sewStartDate), 'MMM dd') : '—'}
                    </td>
                    <td className="py-1.5 px-3 text-xs text-slate-500 whitespace-nowrap">
                      {o.requiresEmbroidery ? (portion.embStartDate ? format(new Date(portion.embStartDate), 'MMM dd') : '—') : <span className="text-slate-200">—</span>}
                    </td>
                    <td className="py-1.5 px-3 text-xs text-slate-500 whitespace-nowrap">
                      {portion.completionDate ? format(new Date(portion.completionDate), 'MMM dd') : '—'}
                    </td>
                    <td className="py-1.5 px-3 text-xs text-slate-500 whitespace-nowrap">
                      {portion.exfactoryDate ? (
                        <span className="font-medium text-red-600">{format(new Date(portion.exfactoryDate), 'MMM dd')}</span>
                      ) : '—'}
                    </td>
                    <td className="py-1.5 px-3 text-xs text-slate-400" colSpan={3}>
                      <Badge variant={
                        portion.status === 'completed' ? 'success'
                        : portion.status === 'in-production' ? 'info'
                        : 'secondary'
                      } className="text-xs">{portion.status}</Badge>
                      {portion.notes && <span className="ml-2 italic">{portion.notes}</span>}
                    </td>
                  </tr>
                )) : []),
              ]
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────────
export default function MasterPlan() {
  const { orders, masterPlanView, setMasterPlanView, addOrder, updateOrder, deleteOrder, fetchAll, loading, errors, canEdit } = useAppStore()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [showImport, setShowImport] = useState(false)
  const [orderProgress, setOrderProgress] = useState({})

  const editable = canEdit()

  useEffect(() => {
    fetchOrderProgressAll().then(setOrderProgress).catch(() => {})
  }, [])

  const filtered = useMemo(() => orders.filter(o => {
    const q = search.toLowerCase()
    return (!q || o.orderNo?.toLowerCase().includes(q) || o.buyer?.toLowerCase().includes(q) || o.style?.toLowerCase().includes(q))
      && (statusFilter === 'all' || o.status === statusFilter)
  }), [orders, search, statusFilter])

  const openEdit = (o) => {
    setEditing(toEditForm(o))
    setShowForm(true)
  }

  const handleSave = async (data) => {
    if (editing?.id) await updateOrder(editing.id, data)
    else {
      const c = COLORS[orders.length % COLORS.length]
      await addOrder({ ...data, color: data.color || c })
    }
  }

  const handleDelete = async (id) => {
    if (window.confirm('Delete this order?')) await deleteOrder(id)
  }

  if (loading.orders && !orders.length) return <PageSpinner />

  return (
    <div className="space-y-4">
      <InlineError message={errors.orders} />

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search orders…"
          className="h-9 w-56 px-3 rounded-md border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="h-9 px-3 rounded-md border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="all">All Status</option>
          {Object.entries(STATUS_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <div className="ml-auto flex items-center gap-2">
          <div className="flex border border-slate-200 rounded-lg overflow-hidden">
            {[['gantt', <BarChart2 key="g" className="w-4 h-4" />, 'Gantt'], ['table', <Table2 key="t" className="w-4 h-4" />, 'Table']].map(([v, icon, label]) => (
              <button key={v} onClick={() => setMasterPlanView(v)}
                className={`px-3 py-1.5 text-sm flex items-center gap-1.5 transition-colors ${masterPlanView === v ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}>
                {icon}{label}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            {editable && (
              <Button size="sm" variant="outline" onClick={() => setShowImport(true)}>
                <FileUp className="w-4 h-4" />Import Orders
              </Button>
            )}
            {editable && (
              <Button size="sm" onClick={() => { setEditing(null); setShowForm(true) }}>
                <Plus className="w-4 h-4" />New Order
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="flex gap-2 flex-wrap">
        {Object.entries(STATUS_CFG).map(([k, v]) => (
          <Badge key={k} variant={v.variant}>{v.label}: {orders.filter(o => o.status === k).length}</Badge>
        ))}
        <Badge variant="secondary">Total: {orders.length}</Badge>
        {orders.some(isIncomplete) && (
          <Badge variant="warning">Incomplete: {orders.filter(isIncomplete).length}</Badge>
        )}
      </div>

      <Card>
        <CardContent className="pt-5">
          {masterPlanView === 'gantt'
            ? <GanttChart orders={filtered} onEdit={openEdit} canEdit={editable} orderProgress={orderProgress} />
            : <OrderTable orders={filtered} onEdit={openEdit} onDelete={handleDelete} canEdit={editable} orderProgress={orderProgress} />}
        </CardContent>
      </Card>

      <OrderForm open={showForm} onClose={() => setShowForm(false)} initial={editing} onSave={handleSave} />
      <OrderImportModal open={showImport} onClose={() => setShowImport(false)} onImportDone={() => { setShowImport(false); fetchAll() }} />
    </div>
  )
}
