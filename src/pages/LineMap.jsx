import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  format, addDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  eachDayOfInterval, eachWeekOfInterval, isWeekend, differenceInDays, isSameMonth
} from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useAppStore } from '@/store/useStore'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { LINES } from '@/data/mockData'

const VIEW_OPTIONS = ['day', 'week', 'month']

function getTimeAxis(view, anchorDate) {
  if (view === 'day') {
    return eachDayOfInterval({ start: addDays(anchorDate, -3), end: addDays(anchorDate, 10) })
  }
  if (view === 'week') {
    const start = startOfWeek(anchorDate, { weekStartsOn: 1 })
    return eachDayOfInterval({ start, end: addDays(start, 41) })
  }
  // month
  return eachDayOfInterval({ start: startOfMonth(anchorDate), end: endOfMonth(anchorDate) })
}

const PAIR_COLORS = [
  '#3b82f6','#8b5cf6','#f59e0b','#22c55e','#ef4444','#ec4899',
  '#06b6d4','#84cc16','#f97316','#6366f1','#14b8a6','#a855f7',
  '#0ea5e9','#d946ef','#10b981','#f43f5e','#3b82f6','#8b5cf6',
  '#f59e0b','#22c55e',
]

export default function LineMap() {
  const { t } = useTranslation()
  const { orders, lineMapView, setLineMapView } = useAppStore()
  const [anchorDate, setAnchorDate] = useState(new Date(2026, 4, 21))
  const [showType, setShowType] = useState('both') // 'both' | 'component' | 'assembly'

  const days = useMemo(() => getTimeAxis(lineMapView, anchorDate), [lineMapView, anchorDate])

  const colWidth = lineMapView === 'month' ? 24 : lineMapView === 'week' ? 28 : 48

  const navigate = (dir) => {
    const delta = lineMapView === 'day' ? 1 : lineMapView === 'week' ? 7 : 30
    setAnchorDate(d => addDays(d, dir * delta))
  }

  // Build assignments: which orders are on each line pair, for each day
  const getOrdersForLine = (lineType, lineCode) => {
    return orders.filter(o =>
      lineType === 'component' ? o.componentLine === lineCode : o.assemblyLine === lineCode
    )
  }

  const getBarStyle = (order, lineType) => {
    const start = new Date(order.startDate)
    const end = new Date(order.endDate)
    const timeStart = days[0]
    const timeEnd = days[days.length - 1]
    const clampedStart = start < timeStart ? timeStart : start
    const clampedEnd = end > timeEnd ? timeEnd : end
    if (clampedStart > timeEnd || clampedEnd < timeStart) return null
    const left = differenceInDays(clampedStart, timeStart) * colWidth
    const width = Math.max((differenceInDays(clampedEnd, clampedStart) + 1) * colWidth, colWidth)
    const color = lineType === 'component'
      ? PAIR_COLORS[(LINES.findIndex(l => l.componentLine === order.componentLine)) % PAIR_COLORS.length]
      : PAIR_COLORS[(LINES.findIndex(l => l.assemblyLine === order.assemblyLine)) % PAIR_COLORS.length]
    return { left, width, color }
  }

  const displayLines = LINES.slice(0, 10) // Show first 10 pairs for demo

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 border border-slate-200 rounded-lg overflow-hidden">
          {VIEW_OPTIONS.map(v => (
            <button
              key={v}
              onClick={() => setLineMapView(v)}
              className={`px-3 py-1.5 text-sm font-medium capitalize transition-colors ${lineMapView === v ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
            >
              {t(`lineMap.${v}View`)}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" onClick={() => navigate(-1)}><ChevronLeft className="w-4 h-4" /></Button>
          <span className="text-sm font-medium text-slate-700 px-2 min-w-[120px] text-center">
            {lineMapView === 'day'
              ? format(anchorDate, 'MMM dd, yyyy')
              : lineMapView === 'week'
              ? `${format(days[0], 'MMM dd')} – ${format(days[days.length - 1], 'MMM dd')}`
              : format(anchorDate, 'MMMM yyyy')}
          </span>
          <Button variant="outline" size="icon" onClick={() => navigate(1)}><ChevronRight className="w-4 h-4" /></Button>
        </div>

        <div className="ml-auto flex items-center gap-1 border border-slate-200 rounded-lg overflow-hidden">
          {[['both', 'All'], ['component', 'Component'], ['assembly', 'Assembly']].map(([v, l]) => (
            <button
              key={v}
              onClick={() => setShowType(v)}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${showType === v ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Gantt */}
      <Card>
        <CardContent className="pt-4 overflow-auto">
          <div className="min-w-max">
            {/* Day header */}
            <div className="flex border-b border-slate-200 pb-1 mb-1">
              <div className="w-32 flex-shrink-0" />
              <div className="w-16 flex-shrink-0 text-xs font-semibold text-slate-500 uppercase mr-1">Type</div>
              <div className="flex">
                {days.map((day) => (
                  <div
                    key={day.toISOString()}
                    style={{ width: colWidth }}
                    className={`text-center flex-shrink-0 ${isWeekend(day) ? 'bg-slate-50' : ''} ${format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd') ? 'bg-blue-50' : ''}`}
                  >
                    <div className={`text-xs font-medium ${isWeekend(day) ? 'text-slate-300' : format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd') ? 'text-blue-600 font-bold' : 'text-slate-500'}`}>
                      {lineMapView === 'month' ? format(day, 'd') : format(day, 'EEE d')}
                    </div>
                    {lineMapView !== 'month' && (
                      <div className="text-xs text-slate-300">{format(day, 'MMM')}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Line rows */}
            {displayLines.map((linePair) => {
              const showComp = showType === 'both' || showType === 'component'
              const showAss = showType === 'both' || showType === 'assembly'
              const compOrders = getOrdersForLine('component', linePair.componentLine)
              const assOrders = getOrdersForLine('assembly', linePair.assemblyLine)

              return (
                <div key={linePair.pairNo} className="border-b border-slate-100">
                  {/* Pair label */}
                  <div className="flex items-center py-0.5">
                    <div className="w-32 flex-shrink-0 py-2 pr-2">
                      <p className="text-xs font-bold text-slate-700">Line {String(linePair.pairNo).padStart(2, '0')}</p>
                    </div>
                    <div className="flex-1 space-y-0.5">
                      {/* Component row */}
                      {showComp && (
                        <div className="flex items-center">
                          <div className="w-16 flex-shrink-0 text-xs font-medium text-slate-500 bg-blue-50 rounded px-1 py-0.5 mr-1 text-center">
                            {linePair.componentLine}
                          </div>
                          <div className="relative flex" style={{ height: 28 }}>
                            {days.map((day) => (
                              <div
                                key={day.toISOString()}
                                style={{ width: colWidth }}
                                className={`h-7 flex-shrink-0 border-r border-slate-50 ${isWeekend(day) ? 'bg-slate-50/50' : ''}`}
                              />
                            ))}
                            {compOrders.map(order => {
                              const bar = getBarStyle(order, 'component')
                              if (!bar) return null
                              return (
                                <div
                                  key={order.id}
                                  className="gantt-bar absolute top-0.5 rounded flex items-center px-1.5 overflow-hidden"
                                  style={{ left: bar.left, width: bar.width - 2, height: 24, background: bar.color }}
                                  title={`${order.orderNo} · ${order.buyer} · ${order.qty.toLocaleString()} pcs`}
                                >
                                  <span className="text-white text-xs truncate font-medium">{order.orderNo}</span>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}

                      {/* Assembly row */}
                      {showAss && (
                        <div className="flex items-center">
                          <div className="w-16 flex-shrink-0 text-xs font-medium text-slate-500 bg-purple-50 rounded px-1 py-0.5 mr-1 text-center">
                            {linePair.assemblyLine}
                          </div>
                          <div className="relative flex" style={{ height: 28 }}>
                            {days.map((day) => (
                              <div
                                key={day.toISOString()}
                                style={{ width: colWidth }}
                                className={`h-7 flex-shrink-0 border-r border-slate-50 ${isWeekend(day) ? 'bg-slate-50/50' : ''}`}
                              />
                            ))}
                            {assOrders.map(order => {
                              const bar = getBarStyle(order, 'assembly')
                              if (!bar) return null
                              return (
                                <div
                                  key={order.id}
                                  className="gantt-bar absolute top-0.5 rounded flex items-center px-1.5 overflow-hidden"
                                  style={{ left: bar.left, width: bar.width - 2, height: 24, background: bar.color, opacity: 0.8 }}
                                  title={`${order.orderNo} · ${order.buyer} · ${order.qty.toLocaleString()} pcs`}
                                >
                                  <span className="text-white text-xs truncate font-medium">{order.orderNo}</span>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Legend */}
          <div className="flex gap-4 mt-4 pt-4 border-t border-slate-100 text-xs text-slate-500 flex-wrap">
            {orders.map(o => (
              <div key={o.id} className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm" style={{ background: o.color }} />
                <span>{o.orderNo}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
