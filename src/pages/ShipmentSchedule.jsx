import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { format, differenceInDays } from 'date-fns'
import { CheckCircle2, Circle, Clock, Package, AlertTriangle, Ship } from 'lucide-react'
import { useAppStore } from '@/store/useStore'
import { updateMilestone } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { PageSpinner } from '@/components/ui/spinner'

const STATUS_CONFIG = {
  active:    { label: 'Active',    variant: 'info',    icon: Clock },
  completed: { label: 'Shipped',   variant: 'success', icon: CheckCircle2 },
  pending:   { label: 'Pending',   variant: 'warning', icon: Circle },
  delayed:   { label: 'Delayed',   variant: 'danger',  icon: AlertTriangle },
}

function MilestoneTracker({ milestones }) {
  return (
    <div className="flex items-center gap-0">
      {milestones.map((m, i) => (
        <div key={i} className="flex items-center">
          <div className="flex flex-col items-center">
            {m.done
              ? <CheckCircle2 className="w-4 h-4 text-green-500" />
              : new Date(m.date) < new Date()
              ? <AlertTriangle className="w-4 h-4 text-red-400" />
              : <Circle className="w-4 h-4 text-slate-300" />
            }
            <span className="text-xs text-slate-400 mt-0.5 whitespace-nowrap" style={{ fontSize: 9 }}>{m.name}</span>
          </div>
          {i < milestones.length - 1 && (
            <div className={`h-0.5 w-6 mx-0.5 mt-0 mb-4 ${m.done ? 'bg-green-400' : 'bg-slate-200'}`} />
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

export default function ShipmentSchedule() {
  const { t } = useTranslation()
  const { shipments, loading, fetchShipments } = useAppStore()
  const [selected, setSelected] = useState(null)
  const [statusFilter, setStatusFilter] = useState('all')

  if (loading.shipments && !shipments.length) return <PageSpinner />

  const handleToggleMilestone = async (milestoneId, currentDone) => {
    const url = import.meta.env.VITE_SUPABASE_URL || ''
    const isConfigured = url && !url.includes('placeholder') && !url.startsWith('<')
    if (isConfigured) {
      await updateMilestone(milestoneId, !currentDone)
      await fetchShipments()
    }
  }

  const filtered = shipments.filter(s =>
    statusFilter === 'all' || s.status === statusFilter
  )

  const kpis = {
    total: shipments.length,
    onTime: shipments.filter(s => s.status === 'active' || s.status === 'completed').length,
    delayed: shipments.filter(s => s.status === 'delayed').length,
    shipped: shipments.filter(s => s.status === 'completed').length,
    totalQty: shipments.reduce((s, o) => s + o.totalQty, 0),
    shippedQty: shipments.reduce((s, o) => s + o.shippedQty, 0),
  }

  return (
    <div className="space-y-5">
      {/* KPI tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPITile label="Total Orders" value={kpis.total} color="bg-slate-100 text-slate-800" />
        <KPITile label="On Track" value={kpis.onTime} sub={`${Math.round(kpis.onTime/kpis.total*100)}%`} color="bg-green-50 text-green-800" />
        <KPITile label="Delayed" value={kpis.delayed} color="bg-red-50 text-red-800" />
        <KPITile label="Total Qty Shipped" value={kpis.shippedQty.toLocaleString()} sub={`of ${kpis.totalQty.toLocaleString()} pcs`} color="bg-blue-50 text-blue-800" />
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2">
        {['all', 'active', 'pending', 'delayed', 'completed'].map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors border ${statusFilter === s ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
          >
            {s === 'all' ? 'All Orders' : s}
          </button>
        ))}
      </div>

      {/* Cards grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((shipment) => {
          const cfg = STATUS_CONFIG[shipment.status] || STATUS_CONFIG.pending
          const StatusIcon = cfg.icon
          const daysLeft = differenceInDays(new Date(shipment.shipDate), new Date())
          const shipPct = Math.round((shipment.shippedQty / shipment.totalQty) * 100)
          const isSelected = selected === shipment.id

          return (
            <Card
              key={shipment.id}
              className={`cursor-pointer transition-all hover:shadow-md ${isSelected ? 'ring-2 ring-blue-500' : ''}`}
              onClick={() => setSelected(isSelected ? null : shipment.id)}
            >
              <CardContent className="pt-5">
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">{shipment.orderNo}</span>
                      {shipment.requiresEmbroidery && (
                        <span className="text-xs bg-pink-100 text-pink-700 rounded px-1.5 py-0.5">Emb</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">{shipment.buyer} · {shipment.style}</p>
                  </div>
                  <Badge variant={cfg.variant}>
                    <StatusIcon className="w-3 h-3 mr-1" />
                    {cfg.label}
                  </Badge>
                </div>

                {/* Qty progress */}
                <div className="mb-3 space-y-1.5">
                  <div className="flex justify-between text-xs text-slate-600">
                    <span>{t('shipment.shipped')}: {shipment.shippedQty.toLocaleString()} pcs</span>
                    <span>{t('shipment.totalQty')}: {shipment.totalQty.toLocaleString()} pcs</span>
                  </div>
                  <Progress value={shipPct} className={shipment.status === 'delayed' ? '[&>*]:bg-red-500' : shipment.status === 'completed' ? '[&>*]:bg-green-500' : ''} />
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">{shipPct}% shipped</span>
                    <span className={`font-medium ${daysLeft < 0 ? 'text-red-600' : daysLeft < 7 ? 'text-amber-600' : 'text-slate-600'}`}>
                      <Ship className="w-3 h-3 inline mr-0.5" />
                      {format(new Date(shipment.shipDate), 'MMM dd, yyyy')}
                      {' '}
                      {daysLeft > 0 ? `(${daysLeft}d)` : daysLeft === 0 ? '(Today!)' : `(${Math.abs(daysLeft)}d late)`}
                    </span>
                  </div>
                </div>

                {/* Milestones */}
                {isSelected && (
                  <div className="border-t border-slate-100 pt-3 mt-3">
                    <p className="text-xs font-semibold text-slate-500 uppercase mb-2">{t('shipment.milestones')}</p>
                    <div className="overflow-auto">
                      <MilestoneTracker milestones={shipment.milestones} />
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-1.5 text-xs">
                      {shipment.milestones.map((m, i) => (
                        <button
                          key={i}
                          onClick={() => m.id && handleToggleMilestone(m.id, m.done)}
                          className={`flex items-center gap-1.5 p-1.5 rounded text-left w-full transition-colors ${m.done ? 'bg-green-50 text-green-700 hover:bg-green-100' : new Date(m.date) < new Date() ? 'bg-red-50 text-red-700 hover:bg-red-100' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
                        >
                          {m.done
                            ? <CheckCircle2 className="w-3 h-3 flex-shrink-0" />
                            : new Date(m.date) < new Date()
                            ? <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                            : <Circle className="w-3 h-3 flex-shrink-0" />
                          }
                          <span className="font-medium">{m.name}</span>
                          <span className="ml-auto opacity-70">{format(new Date(m.date), 'MMM d')}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
