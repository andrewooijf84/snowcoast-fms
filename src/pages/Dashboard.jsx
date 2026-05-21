import { useTranslation } from 'react-i18next'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts'
import { TrendingUp, TrendingDown, Package, Layers, Percent, Truck } from 'lucide-react'
import { format } from 'date-fns'
import { useAppStore } from '@/store/useStore'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { PageSpinner } from '@/components/ui/spinner'

const STATUS_CONFIG = {
  active:    { label: 'Active',    variant: 'info',    bg: 'bg-blue-500' },
  completed: { label: 'Completed', variant: 'success', bg: 'bg-green-500' },
  pending:   { label: 'Pending',   variant: 'warning', bg: 'bg-amber-500' },
  delayed:   { label: 'Delayed',   variant: 'danger',  bg: 'bg-red-500' },
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
  const { kpis, weeklyOutput, orders, shipments, loading } = useAppStore()

  if (loading.orders && !orders.length) return <PageSpinner />

  const upcomingShipments = shipments
    .filter(s => s.status !== 'completed')
    .sort((a, b) => new Date(a.shipDate) - new Date(b.shipDate))
    .slice(0, 5)

  const statusDistribution = [
    { name: 'Active', value: orders.filter(o => o.status === 'active').length, color: '#3b82f6' },
    { name: 'Pending', value: orders.filter(o => o.status === 'pending').length, color: '#f59e0b' },
    { name: 'Completed', value: orders.filter(o => o.status === 'completed').length, color: '#22c55e' },
    { name: 'Delayed', value: orders.filter(o => o.status === 'delayed').length, color: '#ef4444' },
  ]

  return (
    <div className="space-y-6">
      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          icon={Package}
          label={t('dashboard.activeOrders')}
          value={kpis.activeOrders}
          color="bg-blue-500"
        />
        <KPICard
          icon={Layers}
          label={t('dashboard.linesRunning')}
          value={`${kpis.linesRunning}/40`}
          color="bg-purple-500"
        />
        <KPICard
          icon={Percent}
          label={t('dashboard.avgEfficiency')}
          value={`${kpis.avgEfficiency}%`}
          change="+2.1%"
          changePositive={true}
          color="bg-emerald-500"
        />
        <KPICard
          icon={Truck}
          label={t('dashboard.onTimeShipment')}
          value={`${kpis.onTimeShipment}%`}
          change="-0.8%"
          changePositive={false}
          color="bg-amber-500"
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Weekly Output */}
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
                <Bar dataKey="target" name="Target" fill="#e2e8f0" radius={[2, 2, 0, 0]} />
                <Bar dataKey="output" name="Output" fill="#3b82f6" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Order Status */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Order Status</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={statusDistribution} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={4} dataKey="value">
                  {statusDistribution.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-2 gap-1 mt-2">
              {statusDistribution.map((s) => (
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
        {/* Upcoming Shipments */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t('dashboard.upcomingShipments')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {upcomingShipments.map((s) => {
              const cfg = STATUS_CONFIG[s.status] || STATUS_CONFIG.pending
              const daysLeft = Math.ceil((new Date(s.shipDate) - new Date()) / (1000 * 86400))
              return (
                <div key={s.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{s.orderNo}</p>
                    <p className="text-xs text-slate-500">{s.buyer} · {s.style}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-slate-700">
                      {format(new Date(s.shipDate), 'MMM dd')}
                    </p>
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

        {/* Active Orders Progress */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Active Orders Progress</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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
                  <span>{order.qty.toLocaleString()} pcs · SMV {order.smv}</span>
                  <span>Ship: {format(new Date(order.shipDate), 'MMM dd')}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
