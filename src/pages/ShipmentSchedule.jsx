import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { format, differenceInDays } from 'date-fns'
import { CheckCircle2, Circle, Clock, Package, AlertTriangle, Ship, Pencil } from 'lucide-react'
import { useAppStore } from '@/store/useStore'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { PageSpinner } from '@/components/ui/spinner'
import OrderForm, { toEditForm } from '@/components/OrderForm'
import { shipmentGapWorkingDays } from '@/lib/workingDays'

const STATUS_CONFIG = {
  active:    { label: 'Active',  variant: 'info',    icon: Clock },
  completed: { label: 'Shipped', variant: 'success', icon: CheckCircle2 },
  pending:   { label: 'Pending', variant: 'warning', icon: Circle },
  delayed:   { label: 'Delayed', variant: 'danger',  icon: AlertTriangle },
}

const PORTION_STATUS_COLORS = {
  'pending':       'bg-slate-100 text-slate-600',
  'in-production': 'bg-blue-50 text-blue-700',
  'completed':     'bg-green-50 text-green-700',
  'shipped':       'bg-purple-50 text-purple-700',
  'cancelled':     'bg-red-50 text-red-500',
}

function MilestoneTracker({ milestones }) {
  return (
    <div className="flex items-center gap-0 flex-wrap">
      {milestones.map((m, i) => (
        <div key={i} className="flex items-center">
          <div className="flex flex-col items-center">
            {m.done
              ? <CheckCircle2 className="w-4 h-4 text-green-500" />
              : m.date && new Date(m.date) < new Date()
              ? <AlertTriangle className="w-4 h-4 text-red-400" />
              : <Circle className="w-4 h-4 text-slate-300" />
            }
            <span className="text-xs text-slate-400 mt-0.5 whitespace-nowrap" style={{ fontSize: 9 }}>{m.name}</span>
          </div>
          {i < milestones.length - 1 && (
            <div className={`h-0.5 w-5 mx-0.5 mt-0 mb-4 ${m.done ? 'bg-green-400' : 'bg-slate-200'}`} />
          )}
        </div>
      ))}
    </div>
  )
}

function KPITile({ label, value, sub, color }) {
  return (
    <div className={`rounded-xl p-4 ${color}`}>
      <p className="text-xs font-medium opacity-70">{label}</p>
      <p className="text-2xl font-bold mt-0.5">{value}</p>
      {sub && <p className="text-xs opacity-70 mt-0.5">{sub}</p>}
    </div>
  )
}

function ShipmentGapBadge({ order }) {
  const completionDate = order.completionDate
  const shipDate = order.shipDate || order.latestExfactory
  if (!completionDate || !shipDate) return null
  const gap = shipmentGapWorkingDays(completionDate, shipDate)
  if (gap === null) return null
  if (gap < 0) {
    return (
      <div className="flex items-center gap-1.5 mt-2 px-2 py-1.5 rounded-lg bg-red-50 border border-red-200">
        <AlertTriangle className="w-3.5 h-3.5 text-red-600 flex-shrink-0" />
        <span className="text-xs text-red-700 font-medium">
          Critical: Completion date exceeds shipment date — immediate action required.
        </span>
      </div>
    )
  }
  if (gap <= 5) {
    return (
      <div className="flex items-center gap-1.5 mt-2 px-2 py-1.5 rounded-lg bg-amber-50 border border-amber-200">
        <AlertTriangle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
        <span className="text-xs text-amber-700 font-medium">
          Warning: Only {gap} working day{gap !== 1 ? 's' : ''} between sewing completion and shipment date.
        </span>
      </div>
    )
  }
  return null
}

// ── Per-portion milestone track ────────────────────────────────────────────────
function PortionTrack({ portion, onToggleMilestone, isExpanded }) {
  const { portionName, portionQty, status, milestones = [], exfactoryDate } = portion
  const shippedQty = milestones.find(m => m.name === 'Ex-Factory')?.qtyShipped || 0
  const daysLeft = exfactoryDate ? differenceInDays(new Date(exfactoryDate), new Date()) : null
  const statusCls = PORTION_STATUS_COLORS[status] || PORTION_STATUS_COLORS.pending

  return (
    <div className="border border-slate-100 rounded-lg p-3 bg-slate-50/50">
      {/* Portion header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-700">{portionName}</span>
          <span className="text-xs text-slate-400">— {portionQty.toLocaleString()} pcs</span>
          <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${statusCls}`}>{status}</span>
        </div>
        {exfactoryDate && (
          <span className={`text-xs font-medium flex items-center gap-1 ${
            daysLeft !== null && daysLeft < 0 ? 'text-red-600' : daysLeft !== null && daysLeft < 7 ? 'text-amber-600' : 'text-slate-500'
          }`}>
            <Ship className="w-3 h-3" />
            {format(new Date(exfactoryDate), 'MMM dd')}
            {daysLeft !== null && (
              <span className="ml-0.5">
                {daysLeft > 0 ? `(${daysLeft}d)` : daysLeft === 0 ? '(Today)' : `(${Math.abs(daysLeft)}d late)`}
              </span>
            )}
          </span>
        )}
      </div>

      {/* Milestone tracker */}
      {milestones.length > 0 ? (
        <>
          <div className="overflow-auto pb-1">
            <MilestoneTracker milestones={milestones} />
          </div>
          {isExpanded && (
            <div className="mt-2 grid grid-cols-2 gap-1 text-xs">
              {milestones.map((m, i) => (
                <button key={i}
                  onClick={() => m.id && onToggleMilestone(m.id, m.done)}
                  className={`flex items-center gap-1.5 p-1.5 rounded text-left w-full transition-colors ${
                    m.done ? 'bg-green-50 text-green-700 hover:bg-green-100'
                    : m.date && new Date(m.date) < new Date() ? 'bg-red-50 text-red-700 hover:bg-red-100'
                    : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-100'
                  }`}>
                  {m.done
                    ? <CheckCircle2 className="w-3 h-3 flex-shrink-0" />
                    : m.date && new Date(m.date) < new Date()
                    ? <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                    : <Circle className="w-3 h-3 flex-shrink-0" />
                  }
                  <span className="font-medium truncate">{m.name}</span>
                  {m.date && <span className="ml-auto opacity-70 flex-shrink-0">{format(new Date(m.date), 'MMM d')}</span>}
                </button>
              ))}
            </div>
          )}
          {/* Shipped qty */}
          {shippedQty > 0 && (
            <p className="mt-1 text-xs text-slate-400">
              Shipped: <span className="font-semibold text-green-600">{shippedQty.toLocaleString()} pcs</span>
              {portionQty > 0 && <span className="ml-1">({Math.round(shippedQty / portionQty * 100)}%)</span>}
            </p>
          )}
        </>
      ) : (
        <p className="text-xs text-slate-300 italic">No milestones</p>
      )}
    </div>
  )
}

export default function ShipmentSchedule() {
  const { t } = useTranslation()
  const { shipments, loading, updateMilestone, updateOrder, canEdit } = useAppStore()
  const [selected, setSelected] = useState(null)
  const [statusFilter, setStatusFilter] = useState('all')
  const [editingOrder, setEditingOrder] = useState(null)
  const [showEditForm, setShowEditForm] = useState(false)

  const editable = canEdit()

  if (loading.shipments && !shipments.length) return <PageSpinner />

  const handleToggleMilestone = async (milestoneId, currentDone) => {
    await updateMilestone(milestoneId, { done: !currentDone })
  }

  const openEdit = (shipment) => {
    setEditingOrder(toEditForm(shipment))
    setShowEditForm(true)
  }

  const handleSaveOrder = async (data) => {
    if (editingOrder?.id) await updateOrder(editingOrder.id, data)
  }

  const filtered = shipments.filter(s =>
    statusFilter === 'all' || s.status === statusFilter
  )

  const kpis = {
    total: shipments.length,
    onTime: shipments.filter(s => s.status === 'active' || s.status === 'completed').length,
    delayed: shipments.filter(s => s.status === 'delayed').length,
    shipped: shipments.filter(s => s.status === 'completed').length,
    totalQty: shipments.reduce((s, o) => s + (o.totalQty || 0), 0),
    shippedQty: shipments.reduce((s, o) => s + (o.shippedQty || 0), 0),
  }

  return (
    <div className="space-y-5">
      {/* KPI tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPITile label="Total Orders" value={kpis.total} color="bg-slate-100 text-slate-800" />
        <KPITile label="On Track" value={kpis.onTime}
          sub={kpis.total ? `${Math.round(kpis.onTime / kpis.total * 100)}%` : '0%'}
          color="bg-green-50 text-green-800" />
        <KPITile label="Delayed" value={kpis.delayed} color="bg-red-50 text-red-800" />
        <KPITile label="Total Qty Shipped" value={kpis.shippedQty.toLocaleString()}
          sub={`of ${kpis.totalQty.toLocaleString()} pcs`} color="bg-blue-50 text-blue-800" />
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2 flex-wrap">
        {['all', 'active', 'pending', 'delayed', 'completed'].map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors border ${statusFilter === s ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>
            {s === 'all' ? 'All Orders' : s}
          </button>
        ))}
      </div>

      {/* Cards grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((shipment) => {
          const cfg = STATUS_CONFIG[shipment.status] || STATUS_CONFIG.pending
          const StatusIcon = cfg.icon
          const shipPct = shipment.totalQty ? Math.round((shipment.shippedQty / shipment.totalQty) * 100) : 0
          const isSelected = selected === shipment.id
          const portions = shipment.portions || []

          return (
            <Card key={shipment.id}
              className={`transition-all hover:shadow-md ${isSelected ? 'ring-2 ring-blue-500' : ''}`}>
              <CardContent className="pt-5">
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div
                    className="flex-1 cursor-pointer"
                    onClick={() => setSelected(isSelected ? null : shipment.id)}>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-slate-900">{shipment.orderNo}</span>
                      {shipment.requiresEmbroidery && (
                        <span className="text-xs bg-pink-100 text-pink-700 rounded px-1.5 py-0.5">Emb</span>
                      )}
                      {portions.length > 1 && (
                        <span className="text-xs bg-blue-50 text-blue-600 rounded px-1.5 py-0.5">{portions.length} portions</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">{shipment.buyer} · {shipment.style}</p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                    <Badge variant={cfg.variant}>
                      <StatusIcon className="w-3 h-3 mr-1" />
                      {cfg.label}
                    </Badge>
                    {editable && (
                      <button onClick={() => openEdit(shipment)}
                        className="p-1.5 rounded hover:bg-slate-100 text-slate-400 hover:text-blue-600">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Shipment gap warning */}
                <ShipmentGapBadge order={shipment} />

                {/* Overall qty progress */}
                <div className="mt-3 mb-3 space-y-1.5">
                  <div className="flex justify-between text-xs text-slate-600">
                    <span>Total shipped: {(shipment.shippedQty || 0).toLocaleString()} pcs</span>
                    <span>Total: {(shipment.totalQty || 0).toLocaleString()} pcs</span>
                  </div>
                  <Progress value={shipPct} className={
                    shipment.status === 'delayed' ? '[&>*]:bg-red-500'
                    : shipment.status === 'completed' ? '[&>*]:bg-green-500' : ''
                  } />
                  <div className="text-xs text-slate-400">{shipPct}% shipped</div>
                </div>

                {/* Per-portion tracks */}
                {portions.length > 0 && (
                  <div className="space-y-2">
                    {portions.map((portion, pi) => (
                      <PortionTrack
                        key={portion.id || pi}
                        portion={portion}
                        onToggleMilestone={handleToggleMilestone}
                        isExpanded={isSelected}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      <OrderForm
        open={showEditForm}
        onClose={() => setShowEditForm(false)}
        initial={editingOrder}
        onSave={handleSaveOrder}
      />
    </div>
  )
}
