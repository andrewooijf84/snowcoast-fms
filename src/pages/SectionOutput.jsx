import { useState, useMemo, useEffect, useCallback, Fragment } from 'react'
import { format } from 'date-fns'
import {
  ChevronDown, ChevronRight, X, Plus,
  Loader2, FileUp, CheckCircle2, Save, AlertCircle,
} from 'lucide-react'
import { useAppStore } from '@/store/useStore'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import OutputImportModal from '@/components/import/OutputImportModal'
import {
  fetchSectionOutputByDate,
  fetchSectionHeadcountByDate,
  fetchDailyLineOutputByDate,
  fetchOrderProgressAll,
  fetchLineCumulativeByOrder,
  upsertSectionOutputEntry,
  upsertSectionHeadcountEntry,
  upsertLineOutputEntry,
} from '@/lib/api'

// ── Constants ────────────────────────────────────────────────────────────────────
const CENTRALISED = ['cutting', 'embroidery', 'downFilling', 'template', 'finishing', 'packing']
const SECTION_LABELS = {
  cutting: 'Cutting', embroidery: 'Embroidery / Print', downFilling: 'Down Filling',
  template: 'Template', finishing: 'Finishing', packing: 'Packing',
  component: 'Component', assembly: 'Assembly',
}
const SECTION_COLORS = {
  cutting: '#3b82f6', embroidery: '#ec4899', downFilling: '#06b6d4',
  template: '#f59e0b', finishing: '#a855f7', packing: '#f97316',
  component: '#8b5cf6', assembly: '#22c55e',
}
const COMP_LINES = Array.from({ length: 20 }, (_, i) => `C-${String(i + 1).padStart(2, '0')}`)
const ASSY_LINES = Array.from({ length: 20 }, (_, i) => `A-${String(i + 1).padStart(2, '0')}`)
const FLOW_PILLS = ['cutting', 'embroidery', 'downFilling', 'template', 'component', 'assembly', 'finishing', 'packing']

// ── Helpers ──────────────────────────────────────────────────────────────────────
const sumBy = (arr, key) => arr.reduce((s, r) => s + (Number(r[key]) || 0), 0)
const lineHC = (rows) => rows.length > 0 ? Math.max(...rows.map(r => Number(r.workersPresent) || 0)) : 0

// ── EffBadge ─────────────────────────────────────────────────────────────────────
function EffBadge({ pct }) {
  if (pct === null || pct === undefined) return <span className="text-slate-300 text-xs">—</span>
  const cls = pct >= 90
    ? 'text-green-700 bg-green-50 border-green-200'
    : pct >= 75
      ? 'text-blue-700 bg-blue-50 border-blue-200'
      : pct >= 60
        ? 'text-amber-700 bg-amber-50 border-amber-200'
        : 'text-red-700 bg-red-50 border-red-200'
  return <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${cls}`}>{pct}%</span>
}

// ── Summary Panel ────────────────────────────────────────────────────────────────
function SummaryPanel({ title, subtitle, target, actual, headcount, pcsPerHead, color }) {
  const pct = target > 0 ? Math.min(100, Math.round(actual / target * 100)) : 0
  return (
    <Card style={{ borderTop: `3px solid ${color}` }}>
      <CardContent className="pt-4 pb-3">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">{title}</p>
        {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-3">
          <div>
            <p className="text-xs text-slate-400">Target</p>
            <p className="text-xl font-bold" style={{ color }}>{target.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Actual</p>
            <p className="text-xl font-bold text-slate-800">{actual.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Headcount</p>
            <p className="text-sm font-semibold text-slate-700">{headcount || '—'}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Avg pcs/head</p>
            <p className="text-sm font-semibold text-slate-700">{pcsPerHead > 0 ? pcsPerHead.toFixed(1) : '—'}</p>
          </div>
        </div>
        <div className="mt-3">
          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
          </div>
          <p className="text-xs text-slate-400 mt-1">{pct}% of target</p>
        </div>
      </CardContent>
    </Card>
  )
}

// ── SMV Efficiency Box ────────────────────────────────────────────────────────────
function SMVBox({ dailyLineData, orders }) {
  const box = useMemo(() => {
    const assyRows = dailyLineData.filter(r => r.lineName?.startsWith('A-'))
    if (!assyRows.length) return null
    const orderMap = Object.fromEntries(orders.map(o => [o.id, o]))
    let loadingMins = 0, assemblyActual = 0
    const assyByOrder = {}
    assyRows.forEach(r => {
      const smv = orderMap[r.orderId]?.smv || 0
      loadingMins += (r.actualPcs || 0) * smv
      assemblyActual += r.actualPcs || 0
      if (!assyByOrder[r.lineName]) assyByOrder[r.lineName] = r.workersPresent || 0
    })
    const compByLine = {}
    dailyLineData.filter(r => r.lineName?.startsWith('C-')).forEach(r => {
      if (r.lineName) compByLine[r.lineName] = lineHC(dailyLineData.filter(x => x.lineName === r.lineName))
    })
    Object.keys(assyByOrder).forEach(ln => {
      assyByOrder[ln] = lineHC(dailyLineData.filter(x => x.lineName === ln))
    })
    const compHC = Object.values(compByLine).reduce((s, v) => s + v, 0)
    const assyHC = Object.values(assyByOrder).reduce((s, v) => s + v, 0)
    const totalHC = compHC + assyHC
    const capacityMins = totalHC * 8 * 60
    const weightedSMV = assemblyActual > 0 ? (loadingMins / assemblyActual).toFixed(2) : '—'
    const effPct = capacityMins > 0 ? Math.round(loadingMins / capacityMins * 100) : 0
    return { assemblyActual, weightedSMV, totalHC, loadingMins: Math.round(loadingMins), capacityMins, effPct }
  }, [dailyLineData, orders])

  if (!box) return null
  return (
    <Card className="border-indigo-100">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-indigo-700">⚡ SMV Efficiency (Auto-Calculated)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3 text-center">
          {[
            { label: 'Assembly Output', value: box.assemblyActual.toLocaleString() + ' pcs' },
            { label: 'Weighted SMV', value: box.weightedSMV },
            { label: 'Total HC (C+A)', value: box.totalHC },
            { label: 'Loading Mins', value: box.loadingMins.toLocaleString() },
            { label: 'Capacity Mins', value: box.capacityMins.toLocaleString() },
            { label: 'SMV Efficiency', value: `${box.effPct}%`, hi: true, pct: box.effPct },
          ].map(item => (
            <div key={item.label} className={`rounded-lg p-2.5 ${item.hi ? 'bg-indigo-50' : 'bg-slate-50'}`}>
              <p className="text-xs text-slate-400">{item.label}</p>
              <p className={`font-bold mt-1 ${item.hi
                ? (item.pct >= 85 ? 'text-green-700' : item.pct >= 70 ? 'text-amber-600' : 'text-red-600')
                : 'text-slate-700'}`}>{item.value}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// ── Flow Bar ─────────────────────────────────────────────────────────────────────
function FlowBar({ filter, onFilter, sectionOutput, dailyLineData }) {
  const hasC = (s) => sectionOutput.some(r => r.section === s)
  const hasLine = (prefix) => dailyLineData.some(r => r.lineName?.startsWith(prefix))
  return (
    <Card>
      <CardContent className="py-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-medium text-slate-400 mr-1">Section:</span>
          <button onClick={() => onFilter('all')}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${filter === 'all' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
            All
          </button>
          {FLOW_PILLS.map((pill, i) => {
            const isComp = pill === 'component', isAssy = pill === 'assembly'
            const hasData = isComp ? hasLine('C-') : isAssy ? hasLine('A-') : hasC(pill)
            const active = filter === pill
            const col = SECTION_COLORS[pill]
            return (
              <Fragment key={pill}>
                {i > 0 && <span className="text-slate-300 text-xs">→</span>}
                <button
                  onClick={() => onFilter(active ? 'all' : pill)}
                  className="px-3 py-1 rounded-full text-xs font-semibold border transition-all"
                  style={active
                    ? { background: col, color: '#fff', borderColor: col }
                    : hasData
                      ? { background: col + '22', color: col, borderColor: col + '44' }
                      : { background: '#f8fafc', color: '#94a3b8', borderColor: '#e2e8f0' }}
                >
                  {SECTION_LABELS[pill]}{hasData ? ' ✓' : ''}
                </button>
              </Fragment>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

// ── Cascade Table ─────────────────────────────────────────────────────────────────
function CascadeTable({ sectionFilter, soBySection, hcBySection, lineDataByLine, orders, orderProgress, lineCumulative, lineAllocations }) {
  const [expanded, setExpanded] = useState(new Set())
  const toggle = (key) => setExpanded(prev => {
    const s = new Set(prev); s.has(key) ? s.delete(key) : s.add(key); return s
  })

  const thCls = 'text-left py-2 px-3 text-xs font-semibold text-slate-500 uppercase whitespace-nowrap'
  const tdCls = 'py-2 px-3 text-sm'

  const compWithData = COMP_LINES.filter(l => lineDataByLine[l]?.length > 0)
  const assyWithData = ASSY_LINES.filter(l => lineDataByLine[l]?.length > 0)

  const showAll = !sectionFilter || sectionFilter === 'all'
  const showSection = (s) => showAll || sectionFilter === s
  const showComp = showAll || sectionFilter === 'component'
  const showAssy = showAll || sectionFilter === 'assembly'

  const getBalQty = (lineName, orderId) => {
    const pairNo = parseInt(lineName.split('-')[1])
    const alloc = lineAllocations.find(a => a.orderId === orderId && a.linePairNo === pairNo)
    if (!alloc) return null
    const cum = lineCumulative[`${lineName}_${orderId}`] || 0
    return Math.max(0, (alloc.allocatedQty || 0) - cum)
  }

  const renderCentralisedRows = () => CENTRALISED
    .filter(s => showSection(s))
    .map(section => {
      const rows = soBySection[section] || []
      const hc = hcBySection[section]
      const totalTarget = sumBy(rows, 'target')
      const totalActual = sumBy(rows, 'actual')
      const headcount = hc?.headcount ?? 0
      const effPct = hc?.efficiencyPct !== undefined && hc?.efficiencyPct !== null
        ? hc.efficiencyPct
        : (totalTarget > 0 ? Math.round(totalActual / totalTarget * 100) : null)
      const pcsPerHead = headcount > 0 ? (totalActual / headcount).toFixed(1) : null
      const isOpen = expanded.has(section)
      const col = SECTION_COLORS[section]
      const hasData = rows.length > 0

      return (
        <Fragment key={section}>
          <tr
            className={`border-b border-slate-100 cursor-pointer hover:bg-slate-50 transition-colors ${!hasData ? 'opacity-40' : ''}`}
            onClick={() => hasData && toggle(section)}
          >
            <td className={tdCls}>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: col }} />
                <span className="font-semibold text-slate-800">{SECTION_LABELS[section]}</span>
                {hasData && <span className="text-xs text-slate-400">({rows.length})</span>}
              </div>
            </td>
            <td className={tdCls + ' font-medium text-slate-700'}>{totalTarget > 0 ? totalTarget.toLocaleString() : '—'}</td>
            <td className={tdCls + ' font-bold text-slate-900'}>{totalActual > 0 ? totalActual.toLocaleString() : '—'}</td>
            <td className={tdCls}><EffBadge pct={effPct} /></td>
            <td className={tdCls + ' text-slate-600'}>{headcount || '—'}</td>
            <td className={tdCls + ' text-slate-500'}>{pcsPerHead || '—'}</td>
            <td className={tdCls + ' w-8'}>
              {hasData && (isOpen
                ? <ChevronDown className="w-4 h-4 text-slate-400" />
                : <ChevronRight className="w-4 h-4 text-slate-400" />)}
            </td>
          </tr>
          {isOpen && rows.map(row => (
            <tr key={row.id} className="border-b border-slate-100 bg-blue-50/30">
              <td className={tdCls + ' pl-9'}>
                <span className="text-xs font-semibold text-slate-700">{row.orderNo || '—'}</span>
                {row.style && <span className="text-xs text-slate-400 ml-1.5">{row.style}</span>}
              </td>
              <td className={tdCls + ' text-xs text-slate-500'}>{row.target.toLocaleString()}</td>
              <td className={tdCls + ' text-xs font-semibold text-slate-700'}>{row.actual.toLocaleString()}</td>
              <td className={tdCls}><EffBadge pct={row.efficiency} /></td>
              <td className={tdCls + ' text-slate-400 text-xs'}>—</td>
              <td className={tdCls + ' text-xs text-slate-400'}>
                WIP ↑{row.wipReceived} ↓{row.wipPassedOut}
              </td>
              <td />
            </tr>
          ))}
        </Fragment>
      )
    })

  const renderLineRows = (lines, prefix, lineColor) => (
    <>
      <tr className={prefix === 'C-' ? 'bg-purple-50' : 'bg-green-50'}>
        <td colSpan={7} className="py-2 px-3">
          <span className="text-xs font-bold uppercase tracking-wide" style={{ color: lineColor }}>
            ▪ {prefix === 'C-' ? 'Component Lines — C-01 to C-20' : 'Assembly Lines — A-01 to A-20'}
          </span>
          {lines.length > 0 && (
            <span className="ml-2 text-xs font-medium" style={{ color: lineColor + 'aa' }}>
              ({lines.length} line{lines.length !== 1 ? 's' : ''} with data today)
            </span>
          )}
        </td>
      </tr>
      {lines.map(lineName => {
        const rows = lineDataByLine[lineName] || []
        const totalTarget = sumBy(rows, 'targetPcs')
        const totalActual = sumBy(rows, 'actualPcs')
        const hc = lineHC(rows)
        const effPct = rows[0]?.efficiencyPct !== null && rows[0]?.efficiencyPct !== undefined
          ? rows[0].efficiencyPct
          : (totalTarget > 0 ? Math.round(totalActual / totalTarget * 100) : null)
        const pcsPerHead = hc > 0 ? (totalActual / hc).toFixed(1) : null
        const isOpen = expanded.has(lineName)

        return (
          <Fragment key={lineName}>
            <tr
              className="border-b border-slate-100 cursor-pointer hover:bg-slate-50 transition-colors"
              onClick={() => toggle(lineName)}
            >
              <td className={tdCls + ' pl-6'}>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: lineColor }} />
                  <span className="font-semibold text-slate-700">{lineName}</span>
                  <span className="text-xs text-slate-400">({rows.length} order{rows.length !== 1 ? 's' : ''})</span>
                </div>
              </td>
              <td className={tdCls + ' text-slate-700'}>{totalTarget.toLocaleString()}</td>
              <td className={tdCls + ' font-bold text-slate-900'}>{totalActual.toLocaleString()}</td>
              <td className={tdCls}><EffBadge pct={effPct} /></td>
              <td className={tdCls + ' text-slate-600'}>{hc || '—'}</td>
              <td className={tdCls + ' text-slate-500'}>{pcsPerHead || '—'}</td>
              <td className={tdCls + ' w-8'}>
                {isOpen
                  ? <ChevronDown className="w-4 h-4 text-slate-400" />
                  : <ChevronRight className="w-4 h-4 text-slate-400" />}
              </td>
            </tr>
            {isOpen && rows.map((row, ri) => {
              const isAssy = lineName.startsWith('A-')
              const balQty = isAssy && row.orderId ? getBalQty(lineName, row.orderId) : null
              const order = row.orderId ? orders.find(o => o.id === row.orderId) : null
              const cumActual = row.orderId ? (orderProgress[row.orderId] || 0) : 0
              const progPct = order?.qty > 0 ? Math.min(100, Math.round(cumActual / order.qty * 100)) : null

              return (
                <tr key={row.id || `${lineName}-${ri}`} className={`border-b border-slate-100 ${isAssy ? 'bg-green-50/30' : 'bg-purple-50/30'}`}>
                  <td className={tdCls + ' pl-12'}>
                    <span className="text-xs font-semibold text-slate-600">{row.orderNo || '—'}</span>
                    {isAssy && row.orderId && (() => {
                      const pairNo = parseInt(lineName.split('-')[1])
                      const alloc = lineAllocations.find(a => a.orderId === row.orderId && a.linePairNo === pairNo)
                      return alloc?.portionName ? (
                        <span className="text-xs text-blue-600 ml-1 font-medium">— {alloc.portionName}</span>
                      ) : null
                    })()}
                    {row.style && <span className="text-xs text-slate-400 ml-1.5">{row.style}</span>}
                  </td>
                  <td className={tdCls + ' text-xs text-slate-500'}>{row.targetPcs.toLocaleString()}</td>
                  <td className={tdCls + ' text-xs font-semibold text-slate-700'}>{row.actualPcs.toLocaleString()}</td>
                  <td colSpan={2} className={tdCls + ' text-xs text-slate-400'}>
                    WIP ↑{row.wipReceived} ↓{row.wipPassedOut}
                    {row.downtimeHours > 0 && (
                      <span className="ml-2 text-amber-600 font-medium">DT: {row.downtimeHours}h</span>
                    )}
                  </td>
                  <td className={tdCls + ' text-xs'}>
                    {isAssy ? (
                      balQty !== null ? (
                        <div className="space-y-1">
                          <p className={`font-semibold ${balQty === 0 ? 'text-green-600' : balQty < (order?.qty || 0) * 0.1 ? 'text-red-600' : 'text-amber-600'}`}>
                            {balQty.toLocaleString()} pcs left
                          </p>
                          {progPct !== null && (
                            <div className="flex items-center gap-1">
                              <div className="w-14 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                <div className={`h-full rounded-full ${progPct >= 75 ? 'bg-green-500' : progPct >= 40 ? 'bg-amber-500' : 'bg-red-500'}`}
                                  style={{ width: `${progPct}%` }} />
                              </div>
                              <span className="text-slate-400">{progPct}%</span>
                            </div>
                          )}
                        </div>
                      ) : <span className="text-slate-300">No alloc</span>
                    ) : (
                      <span className="text-slate-300">N/A</span>
                    )}
                  </td>
                  <td />
                </tr>
              )
            })}
          </Fragment>
        )
      })}
      {lines.length === 0 && (
        <tr>
          <td colSpan={7} className="py-3 px-9 text-xs text-slate-400 italic">
            No {prefix === 'C-' ? 'component' : 'assembly'} line data for this date
          </td>
        </tr>
      )}
    </>
  )

  return (
    <div className="overflow-auto">
      <table className="w-full text-sm border-collapse">
        <thead className="sticky top-0 bg-white z-10 shadow-sm">
          <tr className="border-b-2 border-slate-200">
            {['Section / Line', 'Target', 'Actual', 'Eff %', 'HC', 'Pcs/Head', ''].map(h => (
              <th key={h} className={thCls}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {renderCentralisedRows()}
          {showComp && renderLineRows(compWithData, 'C-', SECTION_COLORS.component)}
          {showAssy && renderLineRows(assyWithData, 'A-', SECTION_COLORS.assembly)}
        </tbody>
      </table>
    </div>
  )
}

// ── IE Input Drawer ───────────────────────────────────────────────────────────────
const BLANK_ROW = () => ({ orderId: '', target: '', actual: '', wipReceived: '', wipPassedOut: '', downtimeHours: '', remarks: '' })
const getBlankSection = (key) => {
  const isLine = key.startsWith('C-') || key.startsWith('A-')
  return {
    rows: [BLANK_ROW()],
    headcount: '', workersPresent: '', workingHours: '8', efficiency: '',
    _isLine: isLine,
  }
}

function IEInputDrawer({ open, onClose, selectedDate, sectionOutput, sectionHeadcount, dailyLineData, orders, onSaved }) {
  const [activePill, setActivePill] = useState('cutting')
  const [activeLine, setActiveLine] = useState('C-01')
  const [formData, setFormData] = useState({})
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState({ text: '', ok: true })

  // Pre-populate from existing data when drawer opens
  useEffect(() => {
    if (!open) return
    const data = {}
    CENTRALISED.forEach(section => {
      const rows = sectionOutput.filter(r => r.section === section)
      const hc = sectionHeadcount.find(h => h.section === section)
      data[section] = {
        rows: rows.length > 0
          ? rows.map(r => ({ orderId: r.orderId || '', target: String(r.target), actual: String(r.actual), wipReceived: String(r.wipReceived), wipPassedOut: String(r.wipPassedOut), downtimeHours: '', remarks: r.remarks }))
          : [BLANK_ROW()],
        headcount: String(hc?.headcount || ''),
        workersPresent: '',
        workingHours: String(hc?.workingHours || '8'),
        efficiency: String(hc?.efficiencyPct || ''),
        _isLine: false,
      }
    });
    [...COMP_LINES, ...ASSY_LINES].forEach(lineName => {
      const rows = dailyLineData.filter(r => r.lineName === lineName)
      if (rows.length > 0) {
        const first = rows[0]
        data[lineName] = {
          rows: rows.map(r => ({ orderId: r.orderId || '', target: String(r.targetPcs), actual: String(r.actualPcs), wipReceived: String(r.wipReceived), wipPassedOut: String(r.wipPassedOut), downtimeHours: String(r.downtimeHours), remarks: r.remarks })),
          headcount: '',
          workersPresent: String(first.workersPresent || ''),
          workingHours: String(first.workingHours || '8'),
          efficiency: String(first.efficiencyPct || ''),
          _isLine: true,
        }
      }
    })
    setFormData(data)
    setSaveMsg({ text: '', ok: true })
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  const activeKey = ['component', 'assembly'].includes(activePill) ? activeLine : activePill
  const sectionData = formData[activeKey] || getBlankSection(activeKey)
  const isLine = activeKey.startsWith('C-') || activeKey.startsWith('A-')

  const updateField = (field, value) => {
    setFormData(prev => {
      const cur = prev[activeKey] || getBlankSection(activeKey)
      return { ...prev, [activeKey]: { ...cur, [field]: value } }
    })
  }
  const updateRow = (idx, field, value) => {
    setFormData(prev => {
      const cur = prev[activeKey] || getBlankSection(activeKey)
      const rows = cur.rows.map((r, i) => i === idx ? { ...r, [field]: value } : r)
      return { ...prev, [activeKey]: { ...cur, rows } }
    })
  }
  const addRow = () => {
    setFormData(prev => {
      const cur = prev[activeKey] || getBlankSection(activeKey)
      return { ...prev, [activeKey]: { ...cur, rows: [...cur.rows, BLANK_ROW()] } }
    })
  }
  const removeRow = (idx) => {
    setFormData(prev => {
      const cur = prev[activeKey] || getBlankSection(activeKey)
      if (cur.rows.length <= 1) return prev
      return { ...prev, [activeKey]: { ...cur, rows: cur.rows.filter((_, i) => i !== idx) } }
    })
  }

  const saveSection = async (key, data) => {
    const keyIsLine = key.startsWith('C-') || key.startsWith('A-')
    const validRows = (data.rows || []).filter(r => r.orderId && (r.actual || r.target))
    if (validRows.length === 0 && !data.headcount && !data.workersPresent) return

    if (keyIsLine) {
      for (const row of validRows) {
        await upsertLineOutputEntry({
          date: selectedDate, lineName: key, orderId: row.orderId,
          targetPcs: Number(row.target) || 0, actualPcs: Number(row.actual) || 0,
          workersPresent: Number(data.workersPresent) || 0,
          workingHours: Number(data.workingHours) || null,
          efficiencyPct: Number(data.efficiency) || null,
          wipReceived: Number(row.wipReceived) || 0, wipPassedOut: Number(row.wipPassedOut) || 0,
          downtimeHours: Number(row.downtimeHours) || 0, remarks: row.remarks || '',
        })
      }
    } else {
      for (const row of validRows) {
        await upsertSectionOutputEntry({
          date: selectedDate, section: key, orderId: row.orderId,
          target: Number(row.target) || 0, actual: Number(row.actual) || 0,
          wipReceived: Number(row.wipReceived) || 0, wipPassedOut: Number(row.wipPassedOut) || 0,
          remarks: row.remarks || '',
        })
      }
      if (data.headcount) {
        await upsertSectionHeadcountEntry({
          date: selectedDate, section: key,
          headcount: Number(data.headcount),
          workingHours: Number(data.workingHours) || null,
          efficiencyPct: Number(data.efficiency) || null,
        })
      }
    }
  }

  const handleSaveAll = async () => {
    setSaving(true); setSaveMsg({ text: '', ok: true })
    try {
      for (const [key, data] of Object.entries(formData)) await saveSection(key, data)
      setSaveMsg({ text: '✓ Saved successfully!', ok: true })
      onSaved()
      setTimeout(() => setSaveMsg({ text: '', ok: true }), 3000)
    } catch (e) {
      setSaveMsg({ text: `Error: ${e.message}`, ok: false })
    } finally {
      setSaving(false)
    }
  }

  const handleMarkDoneNext = async () => {
    setSaving(true); setSaveMsg({ text: '', ok: true })
    try {
      const data = formData[activeKey] || getBlankSection(activeKey)
      await saveSection(activeKey, data)
      setSaveMsg({ text: `✓ ${SECTION_LABELS[activePill] || activeKey} saved!`, ok: true })
      onSaved()
      const idx = FLOW_PILLS.indexOf(activePill)
      if (idx < FLOW_PILLS.length - 1) {
        const next = FLOW_PILLS[idx + 1]
        setActivePill(next)
        if (next === 'component') setActiveLine('C-01')
        else if (next === 'assembly') setActiveLine('A-01')
      }
      setTimeout(() => setSaveMsg({ text: '', ok: true }), 2000)
    } catch (e) {
      setSaveMsg({ text: `Error: ${e.message}`, ok: false })
    } finally {
      setSaving(false)
    }
  }

  const activeOrders = useMemo(() => orders.filter(o => ['active', 'pending'].includes(o.status)), [orders])
  const totalTarget = sumBy(sectionData.rows, 'target')
  const totalActual = sumBy(sectionData.rows, 'actual')
  const hcNum = Number(isLine ? sectionData.workersPresent : sectionData.headcount) || 0
  const pcsPerHead = hcNum > 0 && totalActual > 0 ? (totalActual / hcNum).toFixed(1) : '—'
  const capacityMins = hcNum > 0 ? Math.round(hcNum * (Number(sectionData.workingHours) || 8) * 60) : 0

  const hasData = (key) => {
    const d = formData[key]
    return d && (d.rows?.some(r => r.actual || r.orderId) || d.headcount || d.workersPresent)
  }
  const filledSections = [...CENTRALISED, ...COMP_LINES, ...ASSY_LINES].filter(hasData).length
  const totalRows = [...CENTRALISED, ...COMP_LINES, ...ASSY_LINES]
    .reduce((s, k) => s + ((formData[k]?.rows || []).filter(r => r.actual).length), 0)

  const inp = 'border border-slate-200 rounded-md px-2 py-1 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500'

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/20" />
      <div className="absolute right-0 top-0 h-full bg-white shadow-2xl flex flex-col"
        style={{ width: 'min(720px, 100vw)' }}>

        {/* Header */}
        <div className="flex-shrink-0 border-b border-slate-200 px-6 py-4 bg-white">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="font-bold text-slate-800 text-base">✏ IE Daily Input / Nhập Sản Lượng Hàng Ngày</h2>
              <p className="text-xs text-slate-500 mt-0.5">Select section → fill data → Save all when done</p>
              <p className="text-sm font-semibold text-blue-700 mt-1.5">
                📅 {format(new Date(selectedDate), 'EEEE, MMMM d, yyyy')}
              </p>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 flex-shrink-0">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">

          {/* Section selector pills */}
          <div>
            <p className="text-xs font-semibold text-slate-500 mb-2">Select section or line:</p>
            <div className="flex flex-wrap gap-1.5">
              {FLOW_PILLS.map(pill => {
                const isSelected = activePill === pill
                const col = SECTION_COLORS[pill]
                const done = pill === 'component'
                  ? COMP_LINES.some(l => hasData(l))
                  : pill === 'assembly'
                    ? ASSY_LINES.some(l => hasData(l))
                    : hasData(pill)
                return (
                  <button
                    key={pill}
                    onClick={() => {
                      setActivePill(pill)
                      if (pill === 'component') setActiveLine('C-01')
                      else if (pill === 'assembly') setActiveLine('A-01')
                    }}
                    className="px-3 py-1.5 rounded-full text-xs font-semibold border transition-all"
                    style={isSelected
                      ? { background: col, color: '#fff', borderColor: col }
                      : { background: '#fff', color: '#64748b', borderColor: '#e2e8f0' }}
                  >
                    {SECTION_LABELS[pill]}
                    {done ? ' ✓' : ''}
                    {pill === 'component' && ` (${COMP_LINES.filter(hasData).length}/20)`}
                    {pill === 'assembly' && ` (${ASSY_LINES.filter(hasData).length}/20)`}
                  </button>
                )
              })}
            </div>

            {/* Line selector for component / assembly */}
            {['component', 'assembly'].includes(activePill) && (
              <div className="mt-3 flex items-center gap-2">
                <label className="text-xs font-medium text-slate-500 flex-shrink-0">Select line:</label>
                <select
                  value={activeLine}
                  onChange={e => setActiveLine(e.target.value)}
                  className="border border-slate-200 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {(activePill === 'component' ? COMP_LINES : ASSY_LINES).map(l => (
                    <option key={l} value={l}>{l}{hasData(l) ? ' ✓' : ''}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Form section header */}
          <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
            <span className="w-3 h-3 rounded-sm flex-shrink-0" style={{ background: SECTION_COLORS[activePill] }} />
            <span className="text-sm font-bold text-slate-800">
              {isLine ? `${SECTION_LABELS[activePill]} — ${activeKey}` : SECTION_LABELS[activePill]}
            </span>
          </div>

          {/* Order rows table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-1.5 px-2 font-semibold text-slate-500 min-w-[160px]">Style / Order ★</th>
                  <th className="text-left py-1.5 px-2 font-semibold text-slate-500 w-20">Target</th>
                  <th className="text-left py-1.5 px-2 font-semibold text-slate-500 w-20">Actual ★</th>
                  <th className="text-left py-1.5 px-2 font-semibold text-slate-500 w-16">WIP In</th>
                  <th className="text-left py-1.5 px-2 font-semibold text-slate-500 w-16">WIP Out</th>
                  {isLine && <th className="text-left py-1.5 px-2 font-semibold text-slate-500 w-14">DT hrs</th>}
                  <th className="text-left py-1.5 px-2 font-semibold text-slate-500">Remarks</th>
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody>
                {sectionData.rows.map((row, i) => {
                  const selOrder = activeOrders.find(o => o.id === row.orderId)
                  return (
                    <Fragment key={i}>
                      <tr className="border-b border-slate-100">
                        <td className="py-1.5 px-2">
                          <select value={row.orderId} onChange={e => updateRow(i, 'orderId', e.target.value)} className={inp}>
                            <option value="">— Select order —</option>
                            {activeOrders.map(o => (
                              <option key={o.id} value={o.id}>{o.orderNo} ({o.style || o.buyer})</option>
                            ))}
                          </select>
                          {selOrder && (
                            <p className="text-xs text-slate-400 mt-0.5 pl-1">
                              SMV: {selOrder.smv} · {selOrder.buyer}
                            </p>
                          )}
                        </td>
                        <td className="py-1.5 px-2">
                          <input type="number" min="0" value={row.target}
                            onChange={e => updateRow(i, 'target', e.target.value)}
                            className={inp} placeholder="0" />
                        </td>
                        <td className="py-1.5 px-2">
                          <input type="number" min="0" value={row.actual}
                            onChange={e => updateRow(i, 'actual', e.target.value)}
                            className={inp.replace('border-slate-200', 'border-blue-400')} placeholder="0" />
                        </td>
                        <td className="py-1.5 px-2">
                          <input type="number" min="0" value={row.wipReceived}
                            onChange={e => updateRow(i, 'wipReceived', e.target.value)}
                            className={inp} placeholder="0" />
                        </td>
                        <td className="py-1.5 px-2">
                          <input type="number" min="0" value={row.wipPassedOut}
                            onChange={e => updateRow(i, 'wipPassedOut', e.target.value)}
                            className={inp} placeholder="0" />
                        </td>
                        {isLine && (
                          <td className="py-1.5 px-2">
                            <input type="number" min="0" step="0.5" value={row.downtimeHours}
                              onChange={e => updateRow(i, 'downtimeHours', e.target.value)}
                              className={inp} placeholder="0" />
                          </td>
                        )}
                        <td className="py-1.5 px-2">
                          <input type="text" value={row.remarks}
                            onChange={e => updateRow(i, 'remarks', e.target.value)}
                            className={inp} placeholder="Remarks…" />
                        </td>
                        <td className="py-1.5 px-2">
                          {sectionData.rows.length > 1 && (
                            <button onClick={() => removeRow(i)}
                              className="p-1 rounded hover:bg-red-50 text-slate-300 hover:text-red-500">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    </Fragment>
                  )
                })}
                {/* Total row */}
                <tr className="border-t border-slate-200 bg-slate-50 font-semibold">
                  <td className="py-1.5 px-2 text-xs text-slate-500">Total</td>
                  <td className="py-1.5 px-2 text-xs">{totalTarget.toLocaleString()}</td>
                  <td className="py-1.5 px-2 text-xs text-blue-700 font-bold">{totalActual.toLocaleString()}</td>
                  <td colSpan={isLine ? 4 : 3} />
                  <td />
                </tr>
              </tbody>
            </table>
            <button onClick={addRow}
              className="mt-2 flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium">
              <Plus className="w-3.5 h-3.5" /> Add style / Thêm mã hàng
            </button>
          </div>

          {/* Section summary band */}
          <div className="rounded-xl p-4" style={{
            background: SECTION_COLORS[activePill] + '12',
            border: `1px solid ${SECTION_COLORS[activePill]}30`,
          }}>
            <p className="text-xs font-bold text-slate-600 mb-3">
              {isLine ? `${activeKey} Line Summary` : `${SECTION_LABELS[activePill]} Summary`}
            </p>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-semibold text-purple-700 block mb-1">
                  {isLine ? 'Workers Present ★' : 'Headcount ★'}
                </label>
                <input type="number" min="0"
                  value={isLine ? sectionData.workersPresent : sectionData.headcount}
                  onChange={e => updateField(isLine ? 'workersPresent' : 'headcount', e.target.value)}
                  className="border border-purple-200 rounded-md px-2 py-1.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-purple-400"
                  placeholder="0" />
              </div>
              <div>
                <label className="text-xs font-semibold text-blue-700 block mb-1">Working Hrs ★</label>
                <input type="number" min="0" step="0.5" max="24"
                  value={sectionData.workingHours}
                  onChange={e => updateField('workingHours', e.target.value)}
                  className="border border-blue-200 rounded-md px-2 py-1.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-400"
                  placeholder="8" />
              </div>
              <div>
                <label className="text-xs font-semibold block mb-1"
                  style={{ color: Number(sectionData.efficiency) >= 90 ? '#15803d' : Number(sectionData.efficiency) >= 70 ? '#d97706' : '#dc2626' }}>
                  Efficiency % ★
                </label>
                <input type="number" min="0" max="150"
                  value={sectionData.efficiency}
                  onChange={e => updateField('efficiency', e.target.value)}
                  className="border border-slate-200 rounded-md px-2 py-1.5 text-sm w-full focus:outline-none"
                  placeholder="0" />
              </div>
            </div>
            <div className="flex gap-3 mt-3">
              <span className="bg-white rounded-lg px-3 py-1.5 text-xs">
                <span className="text-slate-400">Pcs/head: </span>
                <span className="font-bold text-slate-800">{pcsPerHead}</span>
              </span>
              <span className="bg-white rounded-lg px-3 py-1.5 text-xs">
                <span className="text-slate-400">Capacity mins: </span>
                <span className="font-bold text-slate-800">{capacityMins.toLocaleString()}</span>
              </span>
            </div>
          </div>

          {/* Mark done & next */}
          <button
            onClick={handleMarkDoneNext}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm text-white transition-colors disabled:opacity-50"
            style={{ background: SECTION_COLORS[activePill] }}
          >
            <CheckCircle2 className="w-4 h-4" />
            ✓ Mark done &amp; next / Xong &amp; kế tiếp
          </button>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 border-t border-slate-200 px-6 py-3 bg-white flex items-center justify-between gap-3">
          <p className="text-xs text-slate-400">
            Filled: <strong className="text-slate-700">{filledSections}</strong> sections ·{' '}
            <strong className="text-slate-700">{totalRows}</strong> rows with data
          </p>
          <div className="flex items-center gap-2">
            {saveMsg.text && (
              <span className={`text-xs font-semibold ${saveMsg.ok ? 'text-green-600' : 'text-red-600'}`}>
                {saveMsg.text}
              </span>
            )}
            <Button variant="outline" size="sm" onClick={onClose} disabled={saving}>Cancel</Button>
            <Button size="sm" onClick={handleSaveAll} disabled={saving}
              className="bg-blue-600 hover:bg-blue-700 text-white">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? ' Saving…' : ' 💾 Save all'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────────
export default function SectionOutput() {
  const { orders, lineAllocations, getRole } = useAppStore()
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [sectionFilter, setSectionFilter] = useState('all')
  const [showDrawer, setShowDrawer] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [pageLoading, setPageLoading] = useState(false)
  const [pageError, setPageError] = useState('')

  // Page data (scoped to selectedDate)
  const [sectionOutput, setSectionOutput] = useState([])
  const [sectionHeadcount, setSectionHeadcount] = useState([])
  const [dailyLineData, setDailyLineData] = useState([])
  const [orderProgress, setOrderProgress] = useState({})
  const [lineCumulative, setLineCumulative] = useState({})

  const canImportOutput = ['admin', 'ie'].includes(getRole())
  const canInputIE = ['admin', 'ie'].includes(getRole())

  const loadData = useCallback(async (dateStr) => {
    setPageLoading(true); setPageError('')
    try {
      const [so, hc, ld, op, lc] = await Promise.all([
        fetchSectionOutputByDate(dateStr),
        fetchSectionHeadcountByDate(dateStr).catch(() => []),
        fetchDailyLineOutputByDate(dateStr).catch(() => []),
        fetchOrderProgressAll().catch(() => ({})),
        fetchLineCumulativeByOrder().catch(() => ({})),
      ])
      setSectionOutput(so); setSectionHeadcount(hc); setDailyLineData(ld)
      setOrderProgress(op); setLineCumulative(lc)
    } catch (e) {
      setPageError(e.message)
    } finally {
      setPageLoading(false)
    }
  }, [])

  useEffect(() => { loadData(selectedDate) }, [selectedDate, loadData])

  // ── Derived ──────────────────────────────────────────────────────────────────
  const soBySection = useMemo(() => {
    const map = {}
    sectionOutput.forEach(r => { if (!map[r.section]) map[r.section] = []; map[r.section].push(r) })
    return map
  }, [sectionOutput])

  const hcBySection = useMemo(() => {
    const map = {}
    sectionHeadcount.forEach(h => { map[h.section] = h })
    return map
  }, [sectionHeadcount])

  const lineDataByLine = useMemo(() => {
    const map = {}
    dailyLineData.forEach(r => {
      if (!r.lineName) return
      if (!map[r.lineName]) map[r.lineName] = []
      map[r.lineName].push(r)
    })
    return map
  }, [dailyLineData])

  // Summary panels
  const compPanel = useMemo(() => {
    const rows = dailyLineData.filter(r => r.lineName?.startsWith('C-'))
    const totalTarget = sumBy(rows, 'targetPcs')
    const totalActual = sumBy(rows, 'actualPcs')
    const lineMap = {}
    rows.forEach(r => { if (r.lineName) lineMap[r.lineName] = r.workersPresent || 0 })
    const totalHC = Object.values(lineMap).reduce((s, v) => s + v, 0)
    return { totalTarget, totalActual, totalHC, pcsPerHead: totalHC > 0 ? totalActual / totalHC : 0 }
  }, [dailyLineData])

  const assyPanel = useMemo(() => {
    const rows = dailyLineData.filter(r => r.lineName?.startsWith('A-'))
    const totalTarget = sumBy(rows, 'targetPcs')
    const totalActual = sumBy(rows, 'actualPcs')
    const lineMap = {}
    rows.forEach(r => { if (r.lineName) lineMap[r.lineName] = r.workersPresent || 0 })
    const totalHC = Object.values(lineMap).reduce((s, v) => s + v, 0)
    return { totalTarget, totalActual, totalHC, pcsPerHead: totalHC > 0 ? totalActual / totalHC : 0 }
  }, [dailyLineData])

  const totalSewing = useMemo(() => {
    const totalHC = compPanel.totalHC + assyPanel.totalHC
    return {
      target: assyPanel.totalTarget,
      actual: assyPanel.totalActual,
      totalHC,
      pcsPerHead: totalHC > 0 ? assyPanel.totalActual / totalHC : 0,
    }
  }, [compPanel, assyPanel])

  const hasAnyLineData = dailyLineData.some(r => r.lineName)

  return (
    <div className="space-y-5">

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-slate-600">Date:</label>
          <input
            type="date" value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="ml-auto flex gap-2">
          {canImportOutput && (
            <Button size="sm" variant="outline" onClick={() => setShowImport(true)}>
              <FileUp className="w-4 h-4 mr-1" />Import Output
            </Button>
          )}
          {canInputIE && (
            <Button size="sm" onClick={() => setShowDrawer(true)}
              className="bg-green-600 hover:bg-green-700 text-white gap-1">
              ✏ IE Daily Input
            </Button>
          )}
        </div>
      </div>

      {pageError && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-lg px-4 py-3 border border-red-100">
          <AlertCircle className="w-4 h-4 shrink-0" />{pageError}
        </div>
      )}

      {/* Three summary panels — only shown when line data exists */}
      {hasAnyLineData && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <SummaryPanel
            title="All Component Lines" subtitle="C-01 to C-20"
            target={compPanel.totalTarget} actual={compPanel.totalActual}
            headcount={compPanel.totalHC} pcsPerHead={compPanel.pcsPerHead}
            color={SECTION_COLORS.component}
          />
          <SummaryPanel
            title="All Assembly Lines" subtitle="A-01 to A-20"
            target={assyPanel.totalTarget} actual={assyPanel.totalActual}
            headcount={assyPanel.totalHC} pcsPerHead={assyPanel.pcsPerHead}
            color={SECTION_COLORS.assembly}
          />
          <SummaryPanel
            title="Total Sewing Output" subtitle="Follows assembly (finished garment)"
            target={totalSewing.target} actual={totalSewing.actual}
            headcount={totalSewing.totalHC} pcsPerHead={totalSewing.pcsPerHead}
            color="#6366f1"
          />
        </div>
      )}

      {/* SMV Efficiency box */}
      {hasAnyLineData && <SMVBox dailyLineData={dailyLineData} orders={orders} />}

      {/* Section flow bar */}
      <FlowBar
        filter={sectionFilter}
        onFilter={setSectionFilter}
        sectionOutput={sectionOutput}
        dailyLineData={dailyLineData}
      />

      {/* Loading */}
      {pageLoading && (
        <div className="flex items-center justify-center py-12 text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />Loading…
        </div>
      )}

      {/* Cascade table */}
      {!pageLoading && (
        <Card>
          <CascadeTable
            sectionFilter={sectionFilter}
            soBySection={soBySection}
            hcBySection={hcBySection}
            lineDataByLine={lineDataByLine}
            orders={orders}
            orderProgress={orderProgress}
            lineCumulative={lineCumulative}
            lineAllocations={lineAllocations}
          />
        </Card>
      )}

      {/* IE Input Drawer */}
      <IEInputDrawer
        open={showDrawer}
        onClose={() => setShowDrawer(false)}
        selectedDate={selectedDate}
        sectionOutput={sectionOutput}
        sectionHeadcount={sectionHeadcount}
        dailyLineData={dailyLineData}
        orders={orders}
        onSaved={() => loadData(selectedDate)}
      />

      {/* Import Modal */}
      <OutputImportModal
        open={showImport}
        onClose={() => setShowImport(false)}
        onImportDone={() => { setShowImport(false); loadData(selectedDate) }}
      />
    </div>
  )
}
