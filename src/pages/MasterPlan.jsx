import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { format, differenceInDays, startOfMonth, endOfMonth, eachDayOfInterval, isWeekend } from 'date-fns'
import { Plus, BarChart2, Table2, ChevronLeft, ChevronRight, Trash2, Pencil } from 'lucide-react'
import { useAppStore } from '@/store/useStore'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PageSpinner, InlineError } from '@/components/ui/spinner'
import { LINES, BUYERS } from '@/data/mockData'

const ORDER_COLORS = ['#3b82f6','#8b5cf6','#f59e0b','#22c55e','#ef4444','#ec4899','#06b6d4','#84cc16','#f97316','#6366f1']

const EMPTY_ORDER = {
  orderNo: '', style: '', buyer: '', qty: 0, smv: 0,
  startDate: '', endDate: '', shipDate: '',
  componentLine: 'C01', assemblyLine: 'A01',
  status: 'pending', progress: 0,
  requiresEmbroidery: false, color: '#3b82f6',
}

function OrderFormModal({ open, onClose, initial, onSave }) {
  const { t } = useTranslation()
  const [form, setForm] = useState(initial || EMPTY_ORDER)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async () => {
    if (!form.orderNo || !form.buyer || !form.startDate || !form.shipDate) {
      setErr('Order No, Buyer, Start Date and Ship Date are required.')
      return
    }
    setSaving(true)
    setErr('')
    try {
      await onSave({
        ...form,
        qty: Number(form.qty),
        smv: Number(form.smv),
        startDate: new Date(form.startDate),
        endDate: new Date(form.endDate || form.shipDate),
        shipDate: new Date(form.shipDate),
      })
      onClose()
    } catch (e) {
      setErr(e.message)
    } finally {
      setSaving(false)
    }
  }

  const inputCls = 'flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial ? 'Edit Order' : t('masterPlan.addOrder')}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 py-2">
          {[
            { label: t('masterPlan.orderNo'), key: 'orderNo', type: 'text', span: 2 },
            { label: t('masterPlan.buyer'), key: 'buyer', type: 'text' },
            { label: t('masterPlan.style'), key: 'style', type: 'text' },
            { label: t('masterPlan.qty'), key: 'qty', type: 'number' },
            { label: t('masterPlan.smv'), key: 'smv', type: 'number', step: '0.1' },
            { label: t('masterPlan.startDate'), key: 'startDate', type: 'date' },
            { label: t('masterPlan.endDate'), key: 'endDate', type: 'date' },
            { label: t('masterPlan.shipDate'), key: 'shipDate', type: 'date', span: 2 },
          ].map(({ label, key, type, step, span }) => (
            <div key={key} className={span === 2 ? 'col-span-2' : ''}>
              <Label className="text-xs mb-1">{label}</Label>
              <input
                type={type}
                step={step}
                value={form[key]}
                onChange={e => set(key, e.target.value)}
                className={inputCls}
              />
            </div>
          ))}

          <div>
            <Label className="text-xs mb-1">Component Line</Label>
            <select value={form.componentLine} onChange={e => set('componentLine', e.target.value)} className={inputCls}>
              {LINES.map(l => <option key={l.componentLine} value={l.componentLine}>{l.componentLine}</option>)}
            </select>
          </div>
          <div>
            <Label className="text-xs mb-1">Assembly Line</Label>
            <select value={form.assemblyLine} onChange={e => set('assemblyLine', e.target.value)} className={inputCls}>
              {LINES.map(l => <option key={l.assemblyLine} value={l.assemblyLine}>{l.assemblyLine}</option>)}
            </select>
          </div>

          <div>
            <Label className="text-xs mb-1">{t('masterPlan.status')}</Label>
            <select value={form.status} onChange={e => set('status', e.target.value)} className={inputCls}>
              {['pending','active','completed','delayed'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <Label className="text-xs mb-1">{t('masterPlan.progress')} %</Label>
            <input type="number" min="0" max="100" value={form.progress} onChange={e => set('progress', e.target.value)} className={inputCls} />
          </div>

          <div className="col-span-2 flex items-center gap-2">
            <input type="checkbox" id="emb" checked={form.requiresEmbroidery} onChange={e => set('requiresEmbroidery', e.target.checked)} />
            <Label htmlFor="emb" className="text-xs cursor-pointer">Requires Embroidery/Print</Label>
          </div>

          <div className="col-span-2">
            <Label className="text-xs mb-1">Bar Color</Label>
            <div className="flex gap-2 flex-wrap">
              {ORDER_COLORS.map(c => (
                <button key={c} onClick={() => set('color', c)}
                  className={`w-7 h-7 rounded-full border-2 transition-all ${form.color === c ? 'border-slate-700 scale-110' : 'border-transparent'}`}
                  style={{ background: c }}
                />
              ))}
            </div>
          </div>
        </div>

        {err && <InlineError message={err} />}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{t('common.cancel')}</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : t('common.save')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

const STATUS_CONFIG = {
  active:    { label: 'Active',    variant: 'info' },
  completed: { label: 'Completed', variant: 'success' },
  pending:   { label: 'Pending',   variant: 'warning' },
  delayed:   { label: 'Delayed',   variant: 'danger' },
}

function GanttChart({ orders }) {
  const [viewDate, setViewDate] = useState(new Date(2026, 4, 1))

  const days = useMemo(() => {
    const start = startOfMonth(viewDate)
    const end = endOfMonth(viewDate)
    return eachDayOfInterval({ start, end })
  }, [viewDate])

  const prevMonth = () => setViewDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))
  const nextMonth = () => setViewDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))

  const monthStart = startOfMonth(viewDate)
  const monthEnd = endOfMonth(viewDate)
  const dayWidth = 28

  const getBarStyle = (order) => {
    const oStart = new Date(order.startDate)
    const oEnd = new Date(order.endDate)
    const clampedStart = oStart < monthStart ? monthStart : oStart
    const clampedEnd = oEnd > monthEnd ? monthEnd : oEnd
    if (clampedStart > monthEnd || clampedEnd < monthStart) return null
    const left = differenceInDays(clampedStart, monthStart) * dayWidth
    const width = (differenceInDays(clampedEnd, clampedStart) + 1) * dayWidth
    return { left, width }
  }

  return (
    <div className="overflow-auto">
      {/* Header controls */}
      <div className="flex items-center gap-3 mb-4">
        <Button variant="outline" size="icon" onClick={prevMonth}><ChevronLeft className="w-4 h-4" /></Button>
        <span className="text-sm font-semibold text-slate-700 min-w-[100px] text-center">
          {format(viewDate, 'MMMM yyyy')}
        </span>
        <Button variant="outline" size="icon" onClick={nextMonth}><ChevronRight className="w-4 h-4" /></Button>
      </div>

      <div className="min-w-max">
        {/* Day headers */}
        <div className="flex">
          <div className="w-64 flex-shrink-0 text-xs font-semibold text-slate-500 pb-2 pr-4">ORDER</div>
          <div className="flex">
            {days.map((day) => (
              <div
                key={day.toISOString()}
                style={{ width: dayWidth }}
                className={`text-center text-xs pb-2 flex-shrink-0 ${
                  isWeekend(day) ? 'text-slate-300' : 'text-slate-500'
                } ${format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd') ? 'font-bold text-blue-600' : ''}`}
              >
                <div className="font-medium">{format(day, 'd')}</div>
                <div className="text-slate-400">{format(day, 'EEE').charAt(0)}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Rows */}
        {orders.map((order) => {
          const barStyle = getBarStyle(order)
          return (
            <div key={order.id} className="flex items-center border-t border-slate-100 hover:bg-slate-50">
              {/* Row label */}
              <div className="w-64 flex-shrink-0 py-2.5 pr-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: order.color }} />
                  <div>
                    <p className="text-xs font-semibold text-slate-800">{order.orderNo}</p>
                    <p className="text-xs text-slate-400">{order.buyer} · {order.componentLine}/{order.assemblyLine}</p>
                  </div>
                </div>
              </div>

              {/* Timeline */}
              <div className="relative flex" style={{ height: 36 }}>
                {/* Weekend shading */}
                {days.map((day) => (
                  <div
                    key={day.toISOString()}
                    style={{ width: dayWidth }}
                    className={`h-9 flex-shrink-0 border-r border-slate-50 ${isWeekend(day) ? 'bg-slate-50' : ''}`}
                  />
                ))}
                {/* Gantt bar */}
                {barStyle && (
                  <div
                    className="gantt-bar absolute top-1 rounded-md flex items-center px-2 shadow-sm"
                    style={{
                      left: barStyle.left,
                      width: barStyle.width,
                      background: order.color,
                      height: 26,
                      opacity: order.status === 'completed' ? 0.7 : 1,
                    }}
                    title={`${order.orderNo}: ${order.qty.toLocaleString()} pcs`}
                  >
                    <span className="text-white text-xs font-medium truncate">
                      {order.qty.toLocaleString()}p
                    </span>
                  </div>
                )}
                {/* Ship date marker */}
                {(() => {
                  const ship = new Date(order.shipDate)
                  if (ship >= monthStart && ship <= monthEnd) {
                    const left = differenceInDays(ship, monthStart) * dayWidth + dayWidth / 2
                    return (
                      <div
                        className="absolute top-0 bottom-0 w-0.5 bg-red-400 opacity-70"
                        style={{ left }}
                        title={`Ship: ${format(ship, 'MMM dd')}`}
                      />
                    )
                  }
                })()}
              </div>
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-4 pt-4 border-t border-slate-100 text-xs text-slate-500">
        <div className="flex items-center gap-1.5"><div className="w-6 h-2 bg-red-400 rounded-full opacity-70" /><span>Ship Date</span></div>
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-slate-100 border border-slate-200 rounded" /><span>Weekend</span></div>
      </div>
    </div>
  )
}

function OrderTable({ orders, onEdit, onDelete }) {
  const { t } = useTranslation()
  return (
    <div className="overflow-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200">
            {['orderNo', 'buyer', 'style', 'qty', 'smv', 'startDate', 'endDate', 'shipDate', 'line', 'progress', 'status'].map(col => (
              <th key={col} className="text-left py-3 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">
                {t(`masterPlan.${col}`)}
              </th>
            ))}
            <th className="py-3 px-3 text-xs font-semibold text-slate-500 uppercase">{t('common.actions')}</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => {
            const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending
            return (
              <tr key={order.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                <td className="py-3 px-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ background: order.color }} />
                    <span className="font-semibold text-slate-800">{order.orderNo}</span>
                  </div>
                </td>
                <td className="py-3 px-3 text-slate-700">{order.buyer}</td>
                <td className="py-3 px-3 text-slate-600">{order.style}</td>
                <td className="py-3 px-3 font-medium">{order.qty.toLocaleString()}</td>
                <td className="py-3 px-3">{order.smv}</td>
                <td className="py-3 px-3 text-slate-600 whitespace-nowrap">{format(new Date(order.startDate), 'MMM dd')}</td>
                <td className="py-3 px-3 text-slate-600 whitespace-nowrap">{format(new Date(order.endDate), 'MMM dd')}</td>
                <td className="py-3 px-3 whitespace-nowrap">
                  <span className={`font-medium ${differenceInDays(new Date(order.shipDate), new Date()) < 7 && order.status !== 'completed' ? 'text-red-600' : 'text-slate-700'}`}>
                    {format(new Date(order.shipDate), 'MMM dd')}
                  </span>
                </td>
                <td className="py-3 px-3 text-xs">
                  <span className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">{order.componentLine}</span>
                  {' '}<span className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">{order.assemblyLine}</span>
                </td>
                <td className="py-3 px-3 min-w-[100px]">
                  <div className="flex items-center gap-2">
                    <Progress value={order.progress} className="flex-1 h-1.5" />
                    <span className="text-xs text-slate-500">{order.progress}%</span>
                  </div>
                </td>
                <td className="py-3 px-3">
                  <Badge variant={cfg.variant}>{cfg.label}</Badge>
                </td>
                <td className="py-3 px-3">
                  <div className="flex gap-1">
                    <button onClick={() => onEdit(order)} className="p-1.5 rounded hover:bg-slate-100 text-slate-500 hover:text-blue-600">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => onDelete(order.id)} className="p-1.5 rounded hover:bg-red-50 text-slate-500 hover:text-red-600">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export default function MasterPlan() {
  const { t } = useTranslation()
  const { orders, masterPlanView, setMasterPlanView, addOrder, updateOrder, deleteOrder, loading, error } = useAppStore()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showModal, setShowModal] = useState(false)
  const [editingOrder, setEditingOrder] = useState(null)

  const filtered = useMemo(() => orders.filter(o => {
    const matchSearch = !search || o.orderNo.toLowerCase().includes(search.toLowerCase()) || o.buyer.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'all' || o.status === statusFilter
    return matchSearch && matchStatus
  }), [orders, search, statusFilter])

  const handleSave = async (formData) => {
    if (editingOrder) {
      await updateOrder(editingOrder.id, formData)
    } else {
      const color = ORDER_COLORS[orders.length % ORDER_COLORS.length]
      await addOrder({ ...formData, color })
    }
  }

  const handleEdit = (order) => {
    setEditingOrder({
      ...order,
      startDate: order.startDate instanceof Date ? order.startDate.toISOString().split('T')[0] : order.startDate,
      endDate: order.endDate instanceof Date ? order.endDate.toISOString().split('T')[0] : order.endDate,
      shipDate: order.shipDate instanceof Date ? order.shipDate.toISOString().split('T')[0] : order.shipDate,
    })
    setShowModal(true)
  }

  const handleDelete = async (id) => {
    if (window.confirm('Delete this order?')) await deleteOrder(id)
  }

  if (loading.orders && !orders.length) return <PageSpinner />

  return (
    <div className="space-y-4">
      <InlineError message={error.orders} />

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder={t('common.search') + '...'}
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="h-9 px-3 rounded-md border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-56"
        />
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="h-9 px-3 rounded-md border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">{t('common.all')} Status</option>
          <option value="active">Active</option>
          <option value="pending">Pending</option>
          <option value="completed">Completed</option>
          <option value="delayed">Delayed</option>
        </select>

        <div className="ml-auto flex items-center gap-2">
          <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden">
            <button
              onClick={() => setMasterPlanView('gantt')}
              className={`px-3 py-1.5 text-sm flex items-center gap-1.5 transition-colors ${masterPlanView === 'gantt' ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
            >
              <BarChart2 className="w-4 h-4" />{t('masterPlan.ganttView')}
            </button>
            <button
              onClick={() => setMasterPlanView('table')}
              className={`px-3 py-1.5 text-sm flex items-center gap-1.5 transition-colors ${masterPlanView === 'table' ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
            >
              <Table2 className="w-4 h-4" />{t('masterPlan.tableView')}
            </button>
          </div>
          <Button size="sm" onClick={() => { setEditingOrder(null); setShowModal(true) }}>
            <Plus className="w-4 h-4" />{t('masterPlan.addOrder')}
          </Button>
        </div>
      </div>

      {/* Summary badges */}
      <div className="flex gap-2 flex-wrap">
        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
          const count = orders.filter(o => o.status === key).length
          return <Badge key={key} variant={cfg.variant}>{cfg.label}: {count}</Badge>
        })}
        <Badge variant="secondary">Total: {orders.length} orders</Badge>
      </div>

      {/* Main content */}
      <Card>
        <CardContent className="pt-6">
          {masterPlanView === 'gantt'
            ? <GanttChart orders={filtered} />
            : <OrderTable orders={filtered} onEdit={handleEdit} onDelete={handleDelete} />
          }
        </CardContent>
      </Card>

      <OrderFormModal
        open={showModal}
        onClose={() => setShowModal(false)}
        initial={editingOrder}
        onSave={handleSave}
      />
    </div>
  )
}
