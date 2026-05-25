import { useState, useMemo } from 'react'
import {
  format, addDays, startOfWeek, startOfMonth, endOfMonth,
  eachDayOfInterval, isWeekend, differenceInDays,
} from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useAppStore } from '@/store/useStore'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { LINES } from '@/data/mockData'
import { countWorkingDays } from '@/lib/workingDays'

function getAxisDays(view, anchor) {
  if (view === 'day')   return eachDayOfInterval({ start: addDays(anchor, -2), end: addDays(anchor, 11) })
  if (view === 'week')  return eachDayOfInterval({ start: startOfWeek(anchor, { weekStartsOn: 1 }), end: addDays(startOfWeek(anchor, { weekStartsOn: 1 }), 41) })
  return eachDayOfInterval({ start: startOfMonth(anchor), end: endOfMonth(anchor) })
}

const COL = { day: 48, week: 28, month: 24 }

export default function LineMap() {
  const { lineAllocations, lineMapView, setLineMapView } = useAppStore()
  const [anchor, setAnchor] = useState(new Date())
  const [showType, setShowType] = useState('both')

  const days    = useMemo(() => getAxisDays(lineMapView, anchor), [lineMapView, anchor])
  const colW    = COL[lineMapView]
  const timeS   = days[0]
  const timeE   = days[days.length - 1]
  const todayStr = format(new Date(), 'yyyy-MM-dd')

  const navigate = (dir) => {
    const d = { day: 1, week: 7, month: 30 }[lineMapView]
    setAnchor(a => addDays(a, dir * d))
  }

  const getBar = (alloc) => {
    const s = new Date(alloc.startDate)
    const e = new Date(alloc.endDate)
    if (s > timeE || e < timeS) return null
    const cs = s < timeS ? timeS : s
    const ce = e > timeE ? timeE : e
    const left  = differenceInDays(cs, timeS) * colW
    const width = Math.max((differenceInDays(ce, cs) + 1) * colW, colW)
    return { left, width }
  }

  const getAvgPcsDay = (alloc) => {
    if (!alloc.allocatedQty || !alloc.startDate || !alloc.endDate) return null
    const wd = countWorkingDays(new Date(alloc.startDate), new Date(alloc.endDate))
    return wd > 0 ? Math.round(alloc.allocatedQty / wd) : null
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex border border-slate-200 rounded-lg overflow-hidden">
          {[['day','Day'],['week','Week'],['month','Month']].map(([v,l]) => (
            <button key={v} onClick={() => setLineMapView(v)}
              className={`px-3 py-1.5 text-sm font-medium transition-colors ${lineMapView === v ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}>
              {l}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" onClick={() => navigate(-1)}><ChevronLeft className="w-4 h-4" /></Button>
          <span className="text-sm font-medium px-2 min-w-[130px] text-center">
            {lineMapView === 'month'
              ? format(anchor, 'MMMM yyyy')
              : `${format(days[0], 'MMM d')} – ${format(days[days.length-1], 'MMM d')}`}
          </span>
          <Button variant="outline" size="icon" onClick={() => navigate(1)}><ChevronRight className="w-4 h-4" /></Button>
        </div>
        <div className="ml-auto flex border border-slate-200 rounded-lg overflow-hidden">
          {[['both','All'],['component','Comp'],['assembly','Asm']].map(([v,l]) => (
            <button key={v} onClick={() => setShowType(v)}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${showType === v ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Gantt */}
      <Card>
        <CardContent className="pt-4 overflow-auto">
          {lineAllocations.length === 0 && (
            <div className="text-center py-16 text-slate-400 text-sm">
              No line allocations yet — add them in Capacity Loading
            </div>
          )}
          {lineAllocations.length > 0 && (
            <div className="min-w-max">
              {/* Day header */}
              <div className="flex border-b border-slate-200 pb-1 mb-0.5">
                <div className="w-28 flex-shrink-0" />
                <div className="w-14 flex-shrink-0 mr-1" />
                <div className="flex">
                  {days.map(day => (
                    <div key={day.toISOString()} style={{ width: colW }}
                      className={`text-center flex-shrink-0 ${isWeekend(day) ? 'bg-slate-50' : ''} ${format(day,'yyyy-MM-dd') === todayStr ? 'bg-blue-50' : ''}`}>
                      <div className={`text-xs font-medium ${isWeekend(day) ? 'text-slate-300' : format(day,'yyyy-MM-dd') === todayStr ? 'text-blue-600 font-bold' : 'text-slate-400'}`}>
                        {lineMapView === 'month' ? format(day,'d') : format(day,'EEE d')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Rows */}
              {LINES.map(linePair => {
                const allocs = lineAllocations.filter(a => a.linePairNo === linePair.pairNo)
                const hasData = allocs.some(a => getBar(a) !== null)
                if (lineAllocations.length > 0 && !hasData) return null

                return (
                  <div key={linePair.pairNo} className="border-b border-slate-100">
                    {/* Component row */}
                    {(showType === 'both' || showType === 'component') && (
                      <div className="flex items-center py-0.5">
                        <div className="w-28 flex-shrink-0 py-1">
                          <p className="text-xs font-bold text-slate-700">Line {String(linePair.pairNo).padStart(2,'0')}</p>
                        </div>
                        <div className="w-14 flex-shrink-0 mr-1">
                          <span className="text-xs font-medium text-slate-500 bg-blue-50 rounded px-1.5 py-0.5">{linePair.componentLine}</span>
                        </div>
                        <div className="relative flex" style={{ height: 28 }}>
                          {days.map(day => (
                            <div key={day.toISOString()} style={{ width: colW }}
                              className={`h-7 flex-shrink-0 border-r border-slate-50 ${isWeekend(day) ? 'bg-slate-50/60' : ''}`} />
                          ))}
                          {allocs.map(a => {
                            const b = getBar(a)
                            if (!b) return null
                            const avg = getAvgPcsDay(a)
                            const wd = a.startDate && a.endDate ? countWorkingDays(new Date(a.startDate), new Date(a.endDate)) : 0
                            return (
                              <div key={a.id} className="gantt-bar absolute top-0.5 rounded flex items-center px-1.5 overflow-hidden"
                                style={{ left: b.left, width: b.width - 2, height: 24, background: a.color }}
                                title={`${a.orderNo}${a.portionName ? ' — ' + a.portionName : ''} · ${a.portionName ? 'Portion: ' + (a.portionQty || '').toLocaleString() + ' pcs · ' : ''}Alloc: ${a.allocatedQty.toLocaleString()} pcs · ${wd} working days · ${avg ? avg.toLocaleString() + ' pcs/day' : a.targetDailyPcs + '/day target'}`}>
                                <span className="text-white text-xs font-medium truncate">
                                  {a.orderNo}{avg ? ` · ${avg.toLocaleString()} pcs/d` : ''}
                                </span>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {/* Assembly row */}
                    {(showType === 'both' || showType === 'assembly') && (
                      <div className="flex items-center py-0.5">
                        {showType === 'assembly' && (
                          <div className="w-28 flex-shrink-0 py-1">
                            <p className="text-xs font-bold text-slate-700">Line {String(linePair.pairNo).padStart(2,'0')}</p>
                          </div>
                        )}
                        {showType === 'both' && <div className="w-28 flex-shrink-0" />}
                        <div className="w-14 flex-shrink-0 mr-1">
                          <span className="text-xs font-medium text-slate-500 bg-purple-50 rounded px-1.5 py-0.5">{linePair.assemblyLine}</span>
                        </div>
                        <div className="relative flex" style={{ height: 28 }}>
                          {days.map(day => (
                            <div key={day.toISOString()} style={{ width: colW }}
                              className={`h-7 flex-shrink-0 border-r border-slate-50 ${isWeekend(day) ? 'bg-slate-50/60' : ''}`} />
                          ))}
                          {allocs.map(a => {
                            const b = getBar(a)
                            if (!b) return null
                            const avg = getAvgPcsDay(a)
                            return (
                              <div key={a.id} className="gantt-bar absolute top-0.5 rounded flex items-center px-1.5 overflow-hidden"
                                style={{ left: b.left, width: b.width - 2, height: 24, background: a.color, opacity: 0.75 }}
                                title={`${a.orderNo} · Assembly · ${avg ? avg.toLocaleString() + ' pcs/day (planned)' : ''}`}>
                                <span className="text-white text-xs font-medium truncate">{a.orderNo}</span>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}

              {/* Legend */}
              <div className="flex gap-3 mt-3 pt-3 border-t border-slate-100 flex-wrap">
                {[...new Map(lineAllocations.map(a => [a.orderNo, a])).values()].map(a => (
                  <div key={a.orderNo} className="flex items-center gap-1.5 text-xs text-slate-500">
                    <span className="w-3 h-3 rounded-sm" style={{ background: a.color }} />
                    {a.orderNo}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Allocation detail table */}
      {lineAllocations.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Allocation Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    {['Order','Portion','Line','Start','End','Alloc Qty','Working Days','Avg Output/Day (Planned)'].map(h => (
                      <th key={h} className="text-left py-2 px-3 text-xs font-semibold text-slate-500 uppercase whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {lineAllocations.map(a => {
                    const wd = countWorkingDays(new Date(a.startDate), new Date(a.endDate))
                    const avg = wd > 0 && a.allocatedQty > 0 ? Math.round(a.allocatedQty / wd) : 0
                    return (
                      <tr key={a.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="py-2 px-3">
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full" style={{ background: a.color }} />
                            <span className="font-semibold">{a.orderNo}</span>
                          </div>
                        </td>
                        <td className="py-2 px-3">
                          {a.portionName
                            ? <span className="text-xs bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-medium">{a.portionName}</span>
                            : <span className="text-xs text-slate-300">—</span>}
                        </td>
                        <td className="py-2 px-3">Line {String(a.linePairNo).padStart(2,'0')}</td>
                        <td className="py-2 px-3 text-slate-600 whitespace-nowrap">{format(new Date(a.startDate),'MMM dd')}</td>
                        <td className="py-2 px-3 text-slate-600 whitespace-nowrap">{format(new Date(a.endDate),'MMM dd')}</td>
                        <td className="py-2 px-3 font-medium">{a.allocatedQty.toLocaleString()}</td>
                        <td className="py-2 px-3 text-slate-600">{wd} days</td>
                        <td className="py-2 px-3">
                          {avg > 0
                            ? <span className="font-semibold text-blue-700">{avg.toLocaleString()} pcs/day</span>
                            : <span className="text-slate-400">—</span>}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
