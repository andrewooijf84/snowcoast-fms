import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine
} from 'recharts'
import { Calculator } from 'lucide-react'
import { useAppStore } from '@/store/useStore'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PageSpinner } from '@/components/ui/spinner'
import { cn } from '@/lib/utils'

function LoadingBadge({ pct }) {
  if (pct >= 100) return <Badge variant="danger">{pct}%</Badge>
  if (pct >= 85) return <Badge variant="warning">{pct}%</Badge>
  if (pct >= 60) return <Badge variant="success">{pct}%</Badge>
  return <Badge variant="secondary">{pct}%</Badge>
}

export default function CapacityLoading() {
  const { t } = useTranslation()
  const { capacityData, loading } = useAppStore()
  if (loading.capacity && !capacityData.length) return <PageSpinner />

  // SMV Calculator state
  const [smvInputs, setSmvInputs] = useState({
    operators: 25,
    workingDays: 5,
    hoursPerDay: 8,
    efficiency: 85,
  })
  const [orderSmv, setOrderSmv] = useState(35.5)
  const [orderQty, setOrderQty] = useState(5000)

  const calcResult = useMemo(() => {
    const { operators, workingDays, hoursPerDay, efficiency } = smvInputs
    const totalMins = operators * workingDays * hoursPerDay * 60 * (efficiency / 100)
    const requiredMins = orderSmv * orderQty
    const days = Math.ceil(requiredMins / (operators * hoursPerDay * 60 * (efficiency / 100)))
    const loadingPct = Math.round((requiredMins / totalMins) * 100)
    return { totalMins: Math.round(totalMins), requiredMins: Math.round(requiredMins), days, loadingPct }
  }, [smvInputs, orderSmv, orderQty])

  const chartData = capacityData.map(w => ({
    week: w.weekLabel,
    'Capacity (pcs)': w.capacityPcs,
    'Loaded (pcs)': w.loadedPcs,
    'Available (pcs)': w.capacityPcs - w.loadedPcs,
  }))

  const chartDataMins = capacityData.map(w => ({
    week: w.weekLabel,
    'Capacity (min)': Math.round(w.capacityMins / 1000),
    'Loaded (min)': Math.round(w.loadedMins / 1000),
  }))

  const inputClass = "w-full h-9 px-3 rounded-md border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* SMV Calculator */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Calculator className="w-5 h-5 text-blue-600" />
              {t('capacity.smvCalculator')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {[
                { key: 'operators', label: t('capacity.operators') },
                { key: 'workingDays', label: t('capacity.workingDays') },
                { key: 'hoursPerDay', label: 'Hours/Day' },
                { key: 'efficiency', label: t('capacity.efficiency') },
              ].map(({ key, label }) => (
                <div key={key} className="space-y-1">
                  <label className="text-xs font-medium text-slate-600">{label}</label>
                  <input
                    type="number"
                    value={smvInputs[key]}
                    onChange={e => setSmvInputs(p => ({ ...p, [key]: +e.target.value }))}
                    className={inputClass}
                  />
                </div>
              ))}
            </div>

            <div className="border-t border-slate-100 pt-3 space-y-2">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600">Order SMV</label>
                <input type="number" step="0.1" value={orderSmv} onChange={e => setOrderSmv(+e.target.value)} className={inputClass} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600">Order Qty (pcs)</label>
                <input type="number" value={orderQty} onChange={e => setOrderQty(+e.target.value)} className={inputClass} />
              </div>
            </div>

            {/* Results */}
            <div className="bg-slate-50 rounded-xl p-4 space-y-3 border border-slate-200">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Results</p>
              {[
                { label: 'Available Minutes', value: calcResult.totalMins.toLocaleString() },
                { label: 'Required Minutes', value: calcResult.requiredMins.toLocaleString() },
                { label: 'Days Required', value: calcResult.days },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between items-center">
                  <span className="text-xs text-slate-600">{label}</span>
                  <span className="text-sm font-bold text-slate-900">{value}</span>
                </div>
              ))}
              <div className="flex justify-between items-center border-t border-slate-200 pt-2">
                <span className="text-xs font-semibold text-slate-700">{t('capacity.loadingPercent')}</span>
                <LoadingBadge pct={calcResult.loadingPct} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Charts */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{t('capacity.loadingByPieces')}</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={chartData} margin={{ top: 5, right: 5, left: -15, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v) => v.toLocaleString()} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="Capacity (pcs)" fill="#e2e8f0" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="Loaded (pcs)" fill="#3b82f6" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{t('capacity.loadingByMinutes')} (×1000 min)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={chartDataMins} margin={{ top: 5, right: 5, left: -15, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <ReferenceLine y={45} stroke="#ef4444" strokeDasharray="4 4" label={{ value: '100%', fill: '#ef4444', fontSize: 10 }} />
                  <Bar dataKey="Capacity (min)" fill="#e2e8f0" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="Loaded (min)" fill="#8b5cf6" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Loading Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Weekly Capacity Loading Table</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  {['Week', 'Capacity (pcs)', 'Loaded (pcs)', 'Available (pcs)', 'Capacity (min)', 'Loaded (min)', 'Loading %'].map(h => (
                    <th key={h} className="text-left py-2.5 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {capacityData.map((row, i) => (
                  <tr key={i} className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${row.loadingPct >= 100 ? 'bg-red-50' : row.loadingPct >= 85 ? 'bg-amber-50' : ''}`}>
                    <td className="py-2.5 px-3 font-semibold text-slate-800">{row.weekLabel}</td>
                    <td className="py-2.5 px-3">{row.capacityPcs.toLocaleString()}</td>
                    <td className="py-2.5 px-3 font-medium text-blue-700">{row.loadedPcs.toLocaleString()}</td>
                    <td className="py-2.5 px-3 text-slate-600">{(row.capacityPcs - row.loadedPcs).toLocaleString()}</td>
                    <td className="py-2.5 px-3">{row.capacityMins.toLocaleString()}</td>
                    <td className="py-2.5 px-3 font-medium text-purple-700">{row.loadedMins.toLocaleString()}</td>
                    <td className="py-2.5 px-3"><LoadingBadge pct={row.loadingPct} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
