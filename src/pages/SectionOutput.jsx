import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, LineChart, Line
} from 'recharts'
import { format } from 'date-fns'
import { useAppStore } from '@/store/useStore'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PageSpinner } from '@/components/ui/spinner'

const SECTION_COLORS = {
  cutting:     { bg: 'bg-blue-500',   text: 'text-blue-700',   light: 'bg-blue-50',   bar: '#3b82f6' },
  embroidery:  { bg: 'bg-pink-500',   text: 'text-pink-700',   light: 'bg-pink-50',   bar: '#ec4899' },
  downFilling: { bg: 'bg-cyan-500',   text: 'text-cyan-700',   light: 'bg-cyan-50',   bar: '#06b6d4' },
  template:    { bg: 'bg-amber-500',  text: 'text-amber-700',  light: 'bg-amber-50',  bar: '#f59e0b' },
  component:   { bg: 'bg-purple-500', text: 'text-purple-700', light: 'bg-purple-50', bar: '#8b5cf6' },
  assembly:    { bg: 'bg-green-500',  text: 'text-green-700',  light: 'bg-green-50',  bar: '#22c55e' },
  packing:     { bg: 'bg-orange-500', text: 'text-orange-700', light: 'bg-orange-50', bar: '#f97316' },
}

function EfficiencyBadge({ pct }) {
  if (pct >= 100) return <Badge variant="success">{pct}%</Badge>
  if (pct >= 90)  return <Badge variant="info">{pct}%</Badge>
  if (pct >= 80)  return <Badge variant="warning">{pct}%</Badge>
  return <Badge variant="danger">{pct}%</Badge>
}

function SectionCard({ sectionData, period }) {
  const { t } = useTranslation()
  const sectionKey = sectionData.section
  const colors = SECTION_COLORS[sectionKey] || SECTION_COLORS.cutting
  const data = sectionData[period]

  const formatXKey = (entry) => {
    if (period === 'daily') return format(new Date(entry.date), 'EEE')
    if (period === 'weekly') return entry.week
    return entry.month
  }

  const chartData = data.map(d => ({
    label: period === 'daily' ? format(new Date(d.date), 'EEE') : (d.week || d.month),
    [t('sectionOutput.target')]: d.target,
    [t('sectionOutput.actual')]: d.actual,
  }))

  const latestData = data[data.length - 1] || {}
  const avgEff = Math.round(data.reduce((s, d) => s + d.efficiency, 0) / data.length)
  const totalActual = data.reduce((s, d) => s + d.actual, 0)
  const totalTarget = data.reduce((s, d) => s + d.target, 0)

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-sm ${colors.bg}`} />
            <CardTitle className="text-sm">{t(`sectionOutput.sections.${sectionKey}`)}</CardTitle>
          </div>
          <EfficiencyBadge pct={avgEff} />
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={140}>
          <BarChart data={chartData} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="label" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip formatter={(v) => v.toLocaleString()} />
            <Bar dataKey={t('sectionOutput.target')} fill="#e2e8f0" radius={[1, 1, 0, 0]} />
            <Bar dataKey={t('sectionOutput.actual')} fill={colors.bar} radius={[1, 1, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>

        <div className={`flex justify-between text-xs mt-2 p-2 rounded-lg ${colors.light}`}>
          <div>
            <p className="text-slate-500">{t('sectionOutput.target')}</p>
            <p className={`font-bold ${colors.text}`}>{totalTarget.toLocaleString()}</p>
          </div>
          <div className="text-center">
            <p className="text-slate-500">{t('sectionOutput.actual')}</p>
            <p className={`font-bold ${colors.text}`}>{totalActual.toLocaleString()}</p>
          </div>
          <div className="text-right">
            <p className="text-slate-500">{t('sectionOutput.variance')}</p>
            <p className={`font-bold ${totalActual >= totalTarget ? 'text-green-600' : 'text-red-600'}`}>
              {totalActual >= totalTarget ? '+' : ''}{(totalActual - totalTarget).toLocaleString()}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function SectionOutput() {
  const { t } = useTranslation()
  const { sectionOutput, sectionOutputPeriod, setSectionOutputPeriod, loading } = useAppStore()
  if (loading.sections && !sectionOutput.length) return <PageSpinner />

  const summaryData = sectionOutput.map(s => {
    const data = s[sectionOutputPeriod]
    const latestEff = data[data.length - 1]?.efficiency || 0
    const totalActual = data.reduce((sum, d) => sum + d.actual, 0)
    const totalTarget = data.reduce((sum, d) => sum + d.target, 0)
    return { section: s.section, efficiency: latestEff, totalActual, totalTarget }
  })

  // Combined trend chart
  const periodOptions = [
    { value: 'daily', label: t('sectionOutput.daily') },
    { value: 'weekly', label: t('sectionOutput.weekly') },
    { value: 'monthly', label: t('sectionOutput.monthly') },
  ]

  return (
    <div className="space-y-5">
      {/* Period selector + summary */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-1 border border-slate-200 rounded-lg overflow-hidden">
          {periodOptions.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setSectionOutputPeriod(value)}
              className={`px-4 py-1.5 text-sm font-medium transition-colors ${sectionOutputPeriod === value ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex gap-2 flex-wrap">
          {summaryData.map(({ section, efficiency }) => (
            <div key={section} className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2.5 py-1">
              <div className={`w-2 h-2 rounded-sm ${SECTION_COLORS[section]?.bg}`} />
              <span className="text-xs text-slate-600">{t(`sectionOutput.sections.${section}`)}</span>
              <span className={`text-xs font-bold ml-1 ${efficiency >= 95 ? 'text-green-600' : efficiency >= 85 ? 'text-amber-600' : 'text-red-600'}`}>
                {efficiency}%
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Section cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
        {sectionOutput.map((sectionData) => (
          <SectionCard key={sectionData.section} sectionData={sectionData} period={sectionOutputPeriod} />
        ))}
      </div>

      {/* Summary table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Summary — All Sections</CardTitle>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500 uppercase">Section</th>
                <th className="text-right py-2 px-3 text-xs font-semibold text-slate-500 uppercase">{t('sectionOutput.target')}</th>
                <th className="text-right py-2 px-3 text-xs font-semibold text-slate-500 uppercase">{t('sectionOutput.actual')}</th>
                <th className="text-right py-2 px-3 text-xs font-semibold text-slate-500 uppercase">{t('sectionOutput.variance')}</th>
                <th className="text-right py-2 px-3 text-xs font-semibold text-slate-500 uppercase">{t('sectionOutput.efficiency')}</th>
              </tr>
            </thead>
            <tbody>
              {summaryData.map(({ section, efficiency, totalActual, totalTarget }) => {
                const variance = totalActual - totalTarget
                const colors = SECTION_COLORS[section]
                return (
                  <tr key={section} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-sm ${colors?.bg}`} />
                        <span className="font-medium text-slate-800">{t(`sectionOutput.sections.${section}`)}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-700">{totalTarget.toLocaleString()}</td>
                    <td className="py-2.5 px-3 text-right font-semibold">{totalActual.toLocaleString()}</td>
                    <td className={`py-2.5 px-3 text-right font-medium ${variance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {variance >= 0 ? '+' : ''}{variance.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-right"><EfficiencyBadge pct={efficiency} /></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}
