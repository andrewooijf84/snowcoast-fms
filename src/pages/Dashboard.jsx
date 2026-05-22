import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts'
import { TrendingUp, TrendingDown, Package, Layers, Percent, Truck, AlertTriangle, AlertCircle, CheckCircle2 } from 'lucide-react'
import { format, subDays, getISOWeek } from 'date-fns'
import { useAppStore } from '@/store/useStore'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { PageSpinner } from '@/components/ui/spinner'
import { shipmentGapWorkingDays, countWorkingDays } from '@/lib/workingDays'

const STATUS_CONFIG = {
  active:    { label: 'Active',    variant: 'info',    bg: 'bg-blue-500' },
  completed: { label: 'Completed', variant: 'success', bg: 'bg-green-500' },
  pending:   { label: 'Pending',   variant: 'warning', bg: 'bg-amber-500' },
  delayed:   { label: 'Delayed',   variant: 'danger',  bg: 'bg-red-500' },
}

const SEVERITY_CONFIG = {
  critical: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', icon: AlertTriangle, label: 'Critical' },
  warning:  { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', icon: AlertTriangle, label: 'Warning' },
  tight:    { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-700', icon: AlertCircle, label: 'Tight' },
}

function AlertRow({ alert }) {
  const cfg = SEVERITY_CONFIG[alert.severity]
  const Icon = cfg.icon
  return (
    <div className={`flex items-start gap-2.5 px-3 py-2.5 rounded-lg border ${cfg.bg} ${cfg.border}`}>
      <Icon className={`w-3.5 h-3.5 ${cfg.text} mt-0.5 flex-shrink-0`} />
      <div className="min-w-0">
        <span className={`text-xs font-bold ${cfg.text}`}>{alert.title}</span>
        <span className={`ml-2 text-xs ${cfg.text}`}>{alert.message}</span>
      </div>
    </div>
  )
}

function KPICard({ icon: Icon, label, value, change, changePositive, color }) {
  const { t } = useTranslation()
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">{label}</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>
            {change !== undefined && (
              <div className={`flex items-center gap-1 mt-1 text-xs font-medium ${changePositive ? 'text-green-600' : 'text-red-600'}`}>
                {changePositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                <span>{change}</span>
                <span className="text-slate-400">{t('dashboard.vsLastWeek')}</span>
              </div>
            )}
          </div>
          <div className={`w-10 h-10 ${color} rounded-xl flex items-center justify-center`}>
            <Icon className="w-5 h-5 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function Dashboard() {
  const { t } = useTranslation()
  const { orders, shipments, sectionOutputRows, lineAllocations, loading } = useAppStore()

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1)

  const kpis = useMemo(() => {
    const activeOrders = orders.filter(o => o.status === 'active').length
    const linesRunning = new Set(
      lineAllocations
        .filter(a => new Date(a.startDate) <= today && new Date(a.endDate) >= today)
        .map(a => a.linePairNo)
    ).size
    const recentRows = sectionOutputRows.filter(r => r.periodDate && new Date(r.periodDate) >= subDays(today, 7))
    const avgEfficiency = recentRows.length
      ? Math.round(recentRows.reduce((s, r) => s + r.efficiency, 0) / recentRows.length)
      : 0
    const weeklyOutput = recentRows.reduce((s, r) => s + r.actual, 0)
    const nonPending = shipments.filter(s => s.status !== 'pending')
    const onTimeShipment = nonPending.length
      ? Math.round((nonPending.filter(s => s.status !== 'delayed').length / nonPending.length) * 100)
      : 100
    return { activeOrders, linesRunning, avgEfficiency, onTimeShipment, weeklyOutput }
  }, [orders, lineAllocations, sectionOutputRows, shipments])

  const weeklyOutput = useMemo(() => {
    const byWeek = {}
    sectionOutputRows.forEach(r => {
      if (!r.periodDate) return
      const wk = `W${getISOWeek(new Date(r.periodDate))}`
      if (!byWeek[wk]) byWeek[wk] = { week: wk, output: 0, target: 0 }
      byWeek[wk].output += r.actual
      byWeek[wk].target += r.target
    })
    const weeks = Object.values(byWeek).slice(-8)
    return weeks.length ? weeks : Array.from({ length: 8 }, (_, i) => ({ week: `W${i + 1}`, output: 0, target: 0 }))
  }, [sectionOutputRows])

  // ── Compute all alerts ─────────────────────────────────────────────────────
  const alerts = useMemo(() => {
    const list = []

    // 1. Shipment gap alerts
    orders.filter(o => o.status !== 'completed' && o.completionDate && o.shipDate).forEach(o => {
      const gap = shipmentGapWorkingDays(o.completionDate, o.shipDate)
      if (gap === null) return
      if (gap < 0) {
        list.push({
          id: `ship-crit-${o.id}`, severity: 'critical', type: 'shipment',
          title: o.orderNo,
          message: `Completion date exceeds shipment date — immediate action required. (${Math.abs(gap)} working day(s) overdue)`,
        })
      } else if (gap <= 5) {
        list.push({
          id: `ship-warn-${o.id}`, severity: 'warning', type: 'shipment',
          title: o.orderNo,
          message: `Only ${gap} working day${gap !== 1 ? 's' : ''} between sewing completion and shipment date.`,
        })
      }
    })

    // 2. Production risk alerts (per order + section)
    const SECTIONS = ['cutting','embroidery','downFilling','template','component','assembly','packing']
    orders.filter(o => o.status === 'active' || o.status === 'delayed').forEach(o => {
      if (!o.completionDate || !o.qty) return
      const balDays = countWorkingDays(tomorrow, new Date(o.completionDate))
      SECTIONS.forEach(section => {
        const sRows = sectionOutputRows.filter(r => r.orderId === o.id && r.section === section)
        if (!sRows.length) return
        const cumActual = sRows.reduce((s, r) => s + r.actual, 0)
        const balQty = o.qty - cumActual
        if (balQty <= 0) return
        const sorted = [...sRows].sort((a, b) => {
          const da = a.periodDate ? new Date(a.periodDate) : new Date(0)
          const db = b.periodDate ? new Date(b.periodDate) : new Date(0)
          return db - da
        })
        const avgDaily = sorted.slice(0, 3).reduce((s, r) => s + r.actual, 0) / (Math.min(sorted.length, 3) || 1)
        if (avgDaily <= 0) return
        const daysNeeded = Math.ceil(balQty / avgDaily)
        const sectionLabel = { cutting:'Cutting',embroidery:'Embroidery',downFilling:'Down Filling',template:'Template',component:'Component',assembly:'Assembly',packing:'Packing' }[section]
        if (daysNeeded > balDays) {
          list.push({
            id: `prod-crit-${o.id}-${section}`, severity: 'critical', type: 'production',
            title: `${o.orderNo} — ${sectionLabel}`,
            message: `⚠ Overdue risk: need ${daysNeeded} days but only ${balDays} working days left. Behind by ${daysNeeded - balDays} day(s).`,
          })
        } else if (daysNeeded > balDays - 2) {
          list.push({
            id: `prod-tight-${o.id}-${section}`, severity: 'tight', type: 'production',
            title: `${o.orderNo} — ${sectionLabel}`,
            message: `⚡ Tight: estimated to finish on last working day. No buffer remaining.`,
          })
        }
      })
    })

    // Sort: critical → warning → tight
    const order = { critical: 0, warning: 1, tight: 2 }
    return list.sort((a, b) => order[a.severity] - order[b.severity])
  }, [orders, sectionOutputRows])

  if (loading.orders && !orders.length) return <PageSpinner />

  const upcomingShipments = shipments
    .filter(s => s.status !== 'completed')
    .sort((a, b) => new Date(a.shipDate) - new Date(b.shipDate))
    .slice(0, 5)

  const statusDistribution = [
    { name: 'Active',    value: orders.filter(o => o.status === 'active').length,    color: '#3b82f6' },
    { name: 'Pending',   value: orders.filter(o => o.status === 'pending').length,   color: '#f59e0b' },
    { name: 'Completed', value: orders.filter(o => o.status === 'completed').length, color: '#22c55e' },
    { name: 'Delayed',   value: orders.filter(o => o.status === 'delayed').length,   color: '#ef4444' },
  ]

  const criticalCount = alerts.filter(a => a.severity === 'critical').length
  const warningCount  = alerts.filter(a => a.severity === 'warning').length
  const tightCount    = alerts.filter(a => a.severity === 'tight').length

  return (
    <div className="space-y-6">

      {/* ── Alerts & Risk Panel ─────────────────────────────────────── */}
      {alerts.length > 0 && (
        <Card className="border-red-100">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              <CardTitle className="text-base text-slate-800">Alerts &amp; Risk</CardTitle>
              <div className="flex gap-1.5 ml-2">
                {criticalCount > 0 && <Badge variant="danger">{criticalCount} Critical</Badge>}
                {warningCount  > 0 && <Badge variant="warning">{warningCount} Warning</Badge>}
                {tightCount    > 0 && <Badge variant="secondary">{tightCount} Tight</Badge>}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {alerts.map(a => <AlertRow key={a.id} alert={a} />)}
          </CardContent>
        </Card>
      )}

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard icon={Package} label={t('dashboard.activeOrders')} value={kpis.activeOrders} color="bg-blue-500" />
        <KPICard icon={Layers} label={t('dashboard.linesRunning')} value={`${kpis.linesRunning}/20`} color="bg-purple-500" />
        <KPICard icon={Percent} label={t('dashboard.avgEfficiency')} value={`${kpis.avgEfficiency}%`} color="bg-emerald-500" />
        <KPICard icon={Truck} label={t('dashboard.onTimeShipment')} value={`${kpis.onTimeShipment}%`} color="bg-amber-500" />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">{t('dashboard.weeklyOutput')}</CardTitle>
              <Badge variant="info">{t('dashboard.thisWeek')}: {kpis.weeklyOutput.toLocaleString()} pcs</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={weeklyOutput} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="week" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v) => v.toLocaleString()} />
                <Legend />
                <Bar dataKey="target" name="Target" fill="#e2e8f0" radius={[2,2,0,0]} />
                <Bar dataKey="output" name="Output" fill="#3b82f6" radius={[2,2,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Order Status</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={statusDistribution} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={4} dataKey="value">
                  {statusDistribution.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-2 gap-1 mt-2">
              {statusDistribution.map(s => (
                <div key={s.name} className="flex items-center gap-1.5 text-xs text-slate-600">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: s.color }} />
                  {s.name}: <span className="font-semibold">{s.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t('dashboard.upcomingShipments')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {upcomingShipments.length === 0 && (
              <p className="text-sm text-slate-400 text-center py-4">No upcoming shipments</p>
            )}
            {upcomingShipments.map(s => {
              const cfg = STATUS_CONFIG[s.status] || STATUS_CONFIG.pending
              const daysLeft = s.shipDate ? Math.ceil((new Date(s.shipDate) - new Date()) / (1000 * 86400)) : 0
              return (
                <div key={s.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{s.orderNo}</p>
                    <p className="text-xs text-slate-500">{s.buyer} · {s.style}</p>
                  </div>
                  <div className="text-right">
                    {s.shipDate && (
                      <p className="text-sm font-medium text-slate-700">{format(new Date(s.shipDate), 'MMM dd')}</p>
                    )}
                    <p className={`text-xs font-medium ${daysLeft < 7 ? 'text-red-600' : 'text-slate-500'}`}>
                      {daysLeft > 0 ? `${daysLeft}d left` : 'Overdue'}
                    </p>
                  </div>
                  <Badge variant={cfg.variant} className="ml-3">{cfg.label}</Badge>
                </div>
              )
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Active Orders Progress</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {orders.filter(o => o.status === 'active' || o.status === 'delayed').length === 0 && (
              <p className="text-sm text-slate-400 text-center py-4">No active orders</p>
            )}
            {orders.filter(o => o.status === 'active' || o.status === 'delayed').map(order => (
              <div key={order.id} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-medium text-slate-800">{order.orderNo}</span>
                    <span className="text-xs text-slate-500 ml-2">{order.buyer}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-700">{order.progress}%</span>
                    <Badge variant={STATUS_CONFIG[order.status]?.variant}>{STATUS_CONFIG[order.status]?.label}</Badge>
                  </div>
                </div>
                <Progress value={order.progress} className={order.status === 'delayed' ? '[&>*]:bg-red-500' : ''} />
                <div className="flex justify-between text-xs text-slate-400">
                  <span>{order.qty?.toLocaleString()} pcs · SMV {order.smv}</span>
                  {order.shipDate && <span>Ship: {format(new Date(order.shipDate), 'MMM dd')}</span>}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
