import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  format, differenceInDays, startOfMonth, endOfMonth,
  eachDayOfInterval, isWeekend,
} from 'date-fns'
import { Plus, BarChart2, Table2, ChevronLeft, ChevronRight, Pencil, Trash2, AlertTriangle } from 'lucide-react'
import { useAppStore } from '@/store/useStore'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { PageSpinner, InlineError } from '@/components/ui/spinner'
import OrderForm, { toEditForm, BLANK_ORDER } from '@/components/OrderForm'
import { LINES } from '@/data/mockData'
import { shipmentGapWorkingDays } from '@/lib/workingDays'

const STATUS_CFG = {
  active:    { label: 'Active',    variant: 'info' },
  completed: { label: 'Completed', variant: 'success' },
  pending:   { label: 'Pending',   variant: 'warning' },
  delayed:   { label: 'Delayed',   variant: 'danger' },
}
const COLORS = ['#3b82f6','#8b5cf6','#f59e0b','#22c55e','#ef4444','#ec4899','#06b6d4','#84cc16','#f97316','#6366f1']

function isIncomplete(o) {
  return !o.smv || !o.materialArrivalDate
}

function ShipmentGapIcon({ order }) {
  if (!order.completionDate || !order.shipDate) return null
  const gap = shipmentGapWorkingDays(order.completionDate, order.shipDate)
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

// ── Gantt chart ────────────────────────────────────────────────────────────────
function GanttChart({ orders, onEdit, canEdit }) {
  const [viewDate, setViewDate] = useState(new Date())
  const days = useMemo(() => eachDayOfInterval({ start: startOfMonth(viewDate), end: endOfMonth(viewDate) }), [viewDate])
  const monthStart = startOfMonth(viewDate)
  const monthEnd   = endOfMonth(viewDate)
  const DW = 28
  const todayStr = format(new Date(), 'yyyy-MM-dd')

  const bar = (order) => {
    const s = new Date(order.startDate || order.cutStartDate || order.materialArrivalDate)
    const e = new Date(order.endDate || order.completionDate)
    if (!s || !e || isNaN(s) || isNaN(e)) return null
    const cs = s < monthStart ? monthStart : s
    const ce = e > monthEnd   ? monthEnd   : e
    if (cs > monthEnd || ce < monthStart) return null
    return {
      left:  differenceInDays(cs, monthStart) * DW,
      width: Math.max((differenceInDays(ce, cs) + 1) * DW, DW),
    }
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
                {b && (
                  <div className="gantt-bar absolute top-1 rounded-md flex items-center px-2"
                    style={{ left: b.left, width: b.width - 2, height: 24, background: order.color }}>
                    <span className="text-white text-xs font-medium truncate">
                      {order.qty ? order.qty.toLocaleString() + 'p' : order.orderNo}
                    </span>
                  </div>
                )}
                {(() => {
                  const ship = order.shipDate ? new Date(order.shipDate) : null
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

// ── Table view ─────────────────────────────────────────────────────────────────
function OrderTable({ orders, onEdit, onDelete, canEdit }) {
  return (
    <div className="overflow-auto">
      {orders.length === 0 && (
        <div className="text-center py-12 text-slate-400 text-sm">No orders yet</div>
      )}
      {orders.length > 0 && (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200">
              {['Order No', 'Customer', 'Style', 'Season', 'Qty', 'SMV', 'Completion', 'Ex-Factory', 'Lines', 'Progress', 'Status', ''].map(h => (
                <th key={h} className="text-left py-2 px-3 text-xs font-semibold text-slate-500 uppercase whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {orders.map(o => {
              const cfg = STATUS_CFG[o.status] || STATUS_CFG.pending
              const gap = (o.completionDate && o.shipDate)
                ? shipmentGapWorkingDays(o.completionDate, o.shipDate)
                : null
              return (
                <tr key={o.id} className="border-b border-slate-100 hover:bg-slate-50">
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
                  <td className="py-2.5 px-3">{o.smv || <span className="text-amber-500">—</span>}</td>
                  <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap">
                    {o.completionDate ? format(new Date(o.completionDate), 'MMM dd') : '—'}
                  </td>
                  <td className="py-2.5 px-3 whitespace-nowrap">
                    <div className="flex items-center gap-1">
                      {gap !== null && gap < 0 && (
                        <span title={`Critical: completion exceeds ship date by ${Math.abs(gap)} working day(s)`}>
                          <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                        </span>
                      )}
                      {gap !== null && gap >= 0 && gap <= 5 && (
                        <span title={`Warning: only ${gap} working day(s) between completion and ship`}>
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                        </span>
                      )}
                      <span className={gap !== null && gap <= 5 && o.status !== 'completed' ? 'text-red-600 font-medium' : 'text-slate-700'}>
                        {o.shipDate ? format(new Date(o.shipDate), 'MMM dd') : '—'}
                      </span>
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-xs">
                    <span className="bg-slate-100 px-1 rounded">{o.componentLine}</span>
                    {' '}<span className="bg-blue-50 text-blue-700 px-1 rounded">{o.assemblyLine}</span>
                  </td>
                  <td className="py-2.5 px-3 min-w-[90px]">
                    <div className="flex items-center gap-1.5">
                      <Progress value={o.progress} className="flex-1 h-1.5" />
                      <span className="text-xs text-slate-400">{o.progress}%</span>
                    </div>
                  </td>
                  <td className="py-2.5 px-3"><Badge variant={cfg.variant}>{cfg.label}</Badge></td>
                  <td className="py-2.5 px-3">
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
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────────
export default function MasterPlan() {
  const { orders, masterPlanView, setMasterPlanView, addOrder, updateOrder, deleteOrder, loading, errors, canEdit } = useAppStore()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)

  const editable = canEdit()

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
          {editable && (
            <Button size="sm" onClick={() => { setEditing(null); setShowForm(true) }}>
              <Plus className="w-4 h-4" />New Order
            </Button>
          )}
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
            ? <GanttChart orders={filtered} onEdit={openEdit} canEdit={editable} />
            : <OrderTable orders={filtered} onEdit={openEdit} onDelete={handleDelete} canEdit={editable} />}
        </CardContent>
      </Card>

      <OrderForm open={showForm} onClose={() => setShowForm(false)} initial={editing} onSave={handleSave} />
    </div>
  )
}
