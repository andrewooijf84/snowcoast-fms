import { useState, useCallback } from 'react'
import { format } from 'date-fns'
import { Printer, FileText, ClipboardList, Truck, BarChart3, Loader2, ChevronDown, CheckCircle2, Circle } from 'lucide-react'
import { useAppStore } from '@/store/useStore'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  fetchSectionOutputByDate,
  fetchSectionHeadcountByDate,
  fetchDailyLineOutputByDate,
  fetchOrderProgressAll,
} from '@/lib/api'
import { shipmentGapWorkingDays } from '@/lib/workingDays'

// ── Constants ────────────────────────────────────────────────────────────────────
const CENTRALISED = ['cutting', 'embroidery', 'downFilling', 'template', 'finishing', 'packing']
const SECTION_LABELS = {
  cutting: 'Cutting', embroidery: 'Embroidery / Print', downFilling: 'Down Filling',
  template: 'Template', finishing: 'Finishing', packing: 'Packing',
}
const SECTION_COLORS_HEX = {
  cutting: '#3b82f6', embroidery: '#ec4899', downFilling: '#06b6d4',
  template: '#f59e0b', finishing: '#a855f7', packing: '#f97316',
}
const COMP_LINES = Array.from({ length: 20 }, (_, i) => `C-${String(i + 1).padStart(2, '0')}`)
const ASSY_LINES = Array.from({ length: 20 }, (_, i) => `A-${String(i + 1).padStart(2, '0')}`)
const sumBy = (arr, key) => arr.reduce((s, r) => s + (Number(r[key]) || 0), 0)
const lineHC = (rows) => rows.length > 0 ? Math.max(...rows.map(r => Number(r.workersPresent) || 0)) : 0
const pctColor = (p) => p >= 75 ? '#15803d' : p >= 40 ? '#92400e' : '#991b1b'
const pctBg = (p) => p >= 75 ? '#dcfce7' : p >= 40 ? '#fef3c7' : '#fee2e2'
const effColor = (p) => p >= 90 ? '#15803d' : p >= 75 ? '#1d4ed8' : p >= 60 ? '#92400e' : '#991b1b'
const effBg = (p) => p >= 90 ? '#dcfce7' : p >= 75 ? '#dbeafe' : p >= 60 ? '#fef3c7' : '#fee2e2'
const STATUS_MAP = {
  active: { label: 'Active', bg: '#dbeafe', color: '#1d4ed8' },
  completed: { label: 'Completed', bg: '#dcfce7', color: '#15803d' },
  pending: { label: 'Pending', bg: '#fef3c7', color: '#92400e' },
  delayed: { label: 'Delayed', bg: '#fee2e2', color: '#991b1b' },
}

// ── Shared print CSS ──────────────────────────────────────────────────────────────
const PRINT_CSS = `
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; font-size: 10pt; color: #1e293b; background: white; }
.page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 18px; padding-bottom: 12px; border-bottom: 2.5px solid #1e293b; }
.co-name { font-size: 16pt; font-weight: 800; color: #1e293b; letter-spacing: -0.5px; }
.co-sub { font-size: 8.5pt; color: #64748b; margin-top: 1px; text-transform: uppercase; letter-spacing: 1px; }
.rpt-title { font-size: 12pt; font-weight: 700; color: #0f172a; margin-top: 6px; }
.rpt-meta { text-align: right; font-size: 8.5pt; color: #64748b; line-height: 1.6; }
table { width: 100%; border-collapse: collapse; margin-top: 8px; }
thead tr { background: #f1f5f9; }
th { text-align: left; padding: 5px 8px; font-size: 7pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #475569; border-bottom: 2px solid #cbd5e1; white-space: nowrap; }
td { padding: 4.5px 8px; font-size: 8.5pt; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
tr:last-child td { border-bottom: none; }
.group-row td { background: #1e293b; color: white; font-size: 7.5pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; padding: 4px 8px; }
.sub-row td { background: #fafbff; padding-left: 24px; font-size: 8pt; color: #475569; }
.badge { display: inline-block; padding: 1px 7px; border-radius: 9999px; font-size: 7.5pt; font-weight: 700; line-height: 1.5; }
.summary-grid { display: grid; gap: 10px; margin-bottom: 14px; }
.summary-grid-3 { grid-template-columns: repeat(3, 1fr); }
.summary-grid-4 { grid-template-columns: repeat(4, 1fr); }
.summary-box { border: 1.5px solid #e2e8f0; border-radius: 8px; padding: 10px 12px; }
.summary-box .label { font-size: 7.5pt; text-transform: uppercase; color: #64748b; font-weight: 600; letter-spacing: 0.05em; }
.summary-box .value { font-size: 20pt; font-weight: 800; margin-top: 3px; }
.summary-box .sub { font-size: 7.5pt; color: #94a3b8; margin-top: 2px; }
.prog-bar { height: 5px; background: #e2e8f0; border-radius: 3px; overflow: hidden; margin-top: 5px; }
.prog-fill { height: 100%; border-radius: 3px; }
.section-title { font-size: 9pt; font-weight: 700; color: #1e293b; margin: 14px 0 4px; padding-bottom: 3px; border-bottom: 1.5px solid #e2e8f0; }
.milestone-row { display: inline-flex; align-items: center; gap: 2px; font-size: 7.5pt; }
.ms-done { color: #16a34a; font-weight: 700; }
.ms-late { color: #dc2626; font-weight: 700; }
.ms-pending { color: #94a3b8; }
.footer { margin-top: 20px; padding-top: 8px; border-top: 1px solid #e2e8f0; font-size: 7.5pt; color: #94a3b8; display: flex; justify-content: space-between; }
@page { margin: 12mm 14mm; }
@media print { body { print-color-adjust: exact; -webkit-print-color-adjust: exact; } }
`

// ── Print utility ─────────────────────────────────────────────────────────────────
function wrapHTML(title, bodyHtml, landscape = true) {
  const now = format(new Date(), 'dd/MM/yyyy HH:mm')
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${title}</title>
<style>${PRINT_CSS}${landscape ? '@page{size:A4 landscape}' : '@page{size:A4 portrait}'}</style>
</head><body>
<div class="page-header">
  <div>
    <div class="co-name">❄ Snow Coast</div>
    <div class="co-sub">Factory Management System</div>
    <div class="rpt-title">${title}</div>
  </div>
  <div class="rpt-meta">Generated: ${now}</div>
</div>
${bodyHtml}
<div class="footer"><span>Snow Coast FMS — Confidential</span><span>Printed: ${now}</span></div>
</body></html>`
}

function openPrint(html) {
  const win = window.open('', '_blank', 'width=1150,height=800')
  if (!win) { alert('Please allow pop-ups for this site to enable printing.'); return }
  win.document.write(html)
  win.document.close()
  win.focus()
  setTimeout(() => { win.print() }, 600)
}

// ── HTML generators ───────────────────────────────────────────────────────────────

function genDailyOutputHTML(date, sectionOutput, sectionHeadcount, lineData, orders) {
  const dateLabel = format(new Date(date), 'EEEE, MMMM d, yyyy')
  const soBySection = {}
  sectionOutput.forEach(r => { if (!soBySection[r.section]) soBySection[r.section] = []; soBySection[r.section].push(r) })
  const hcBySection = {}
  sectionHeadcount.forEach(h => { hcBySection[h.section] = h })
  const lineByName = {}
  lineData.forEach(r => { if (!r.lineName) return; if (!lineByName[r.lineName]) lineByName[r.lineName] = []; lineByName[r.lineName].push(r) })
  const orderMap = Object.fromEntries(orders.map(o => [o.id, o]))

  const compRows = lineData.filter(r => r.lineName?.startsWith('C-'))
  const assyRows = lineData.filter(r => r.lineName?.startsWith('A-'))
  const compHCByLine = {}; compRows.forEach(r => { if (r.lineName) compHCByLine[r.lineName] = lineHC(compRows.filter(x => x.lineName === r.lineName)) })
  const assyHCByLine = {}; assyRows.forEach(r => { if (r.lineName) assyHCByLine[r.lineName] = lineHC(assyRows.filter(x => x.lineName === r.lineName)) })
  const compTarget = sumBy(compRows, 'targetPcs'), compActual = sumBy(compRows, 'actualPcs')
  const assyTarget = sumBy(assyRows, 'targetPcs'), assyActual = sumBy(assyRows, 'actualPcs')
  const compHC = Object.values(compHCByLine).reduce((s, v) => s + v, 0)
  const assyHC = Object.values(assyHCByLine).reduce((s, v) => s + v, 0)
  const totalHC = compHC + assyHC
  let loadingMins = 0
  assyRows.forEach(r => { loadingMins += (r.actualPcs || 0) * (orderMap[r.orderId]?.smv || 0) })
  const capacityMins = totalHC * 8 * 60
  const smvEff = capacityMins > 0 ? Math.round(loadingMins / capacityMins * 100) : 0

  // Summary boxes
  const summaryHtml = `
<div class="summary-grid summary-grid-3">
  <div class="summary-box" style="border-color:#8b5cf6">
    <div class="label">Component Lines (C-01→C-20)</div>
    <div class="value" style="color:#7c3aed">${compActual.toLocaleString()}</div>
    <div class="sub">Target: ${compTarget.toLocaleString()} pcs · HC: ${compHC} · ${compHC > 0 ? (compActual / compHC).toFixed(1) : '—'} pcs/head</div>
    <div class="prog-bar"><div class="prog-fill" style="width:${compTarget > 0 ? Math.min(100, Math.round(compActual / compTarget * 100)) : 0}%;background:#8b5cf6"></div></div>
  </div>
  <div class="summary-box" style="border-color:#22c55e">
    <div class="label">Assembly Lines (A-01→A-20)</div>
    <div class="value" style="color:#16a34a">${assyActual.toLocaleString()}</div>
    <div class="sub">Target: ${assyTarget.toLocaleString()} pcs · HC: ${assyHC} · ${assyHC > 0 ? (assyActual / assyHC).toFixed(1) : '—'} pcs/head</div>
    <div class="prog-bar"><div class="prog-fill" style="width:${assyTarget > 0 ? Math.min(100, Math.round(assyActual / assyTarget * 100)) : 0}%;background:#22c55e"></div></div>
  </div>
  <div class="summary-box" style="border-color:#6366f1">
    <div class="label">SMV Efficiency (Auto-Calc)</div>
    <div class="value" style="color:${effColor(smvEff)}">${smvEff}%</div>
    <div class="sub">Loading: ${Math.round(loadingMins).toLocaleString()} / Capacity: ${capacityMins.toLocaleString()} mins · HC: ${totalHC}</div>
    <div class="prog-bar"><div class="prog-fill" style="width:${Math.min(100, smvEff)}%;background:${effColor(smvEff)}"></div></div>
  </div>
</div>`

  // Centralised sections table
  const centralRows = CENTRALISED.map(section => {
    const rows = soBySection[section] || []
    if (!rows.length) return ''
    const hc = hcBySection[section]
    const tot = rows.reduce((s, r) => ({ target: s.target + r.target, actual: s.actual + r.actual }), { target: 0, actual: 0 })
    const eff = hc?.efficiencyPct ?? (tot.target > 0 ? Math.round(tot.actual / tot.target * 100) : null)
    const headcount = hc?.headcount || 0
    const pph = headcount > 0 ? (tot.actual / headcount).toFixed(1) : '—'
    const subRows = rows.map(r => `
      <tr class="sub-row">
        <td style="padding-left:24px">${r.orderNo || '—'} ${r.style ? `<span style="color:#94a3b8">${r.style}</span>` : ''}</td>
        <td>${r.target.toLocaleString()}</td><td><strong>${r.actual.toLocaleString()}</strong></td>
        <td>—</td><td>—</td>
        <td>↑${r.wipReceived} ↓${r.wipPassedOut}</td>
        <td>${r.remarks || ''}</td>
      </tr>`).join('')
    return `
      <tr style="background:${SECTION_COLORS_HEX[section]}15">
        <td><span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${SECTION_COLORS_HEX[section]};margin-right:6px;vertical-align:middle"></span><strong>${SECTION_LABELS[section]}</strong></td>
        <td>${tot.target.toLocaleString()}</td>
        <td><strong>${tot.actual.toLocaleString()}</strong></td>
        <td>${eff !== null ? `<span class="badge" style="background:${effBg(eff)};color:${effColor(eff)}">${eff}%</span>` : '—'}</td>
        <td>${headcount || '—'}</td>
        <td>${pph}</td>
        <td></td>
      </tr>${subRows}`
  }).join('')

  // Line tables helper
  const buildLineTable = (lines, lineByNameMap, label) => {
    const lineRows = lines.filter(l => lineByNameMap[l]?.length > 0).map(lineName => {
      const rows = lineByNameMap[lineName] || []
      const tot = { target: sumBy(rows, 'targetPcs'), actual: sumBy(rows, 'actualPcs') }
      const hc = lineHC(rows)
      const eff = rows[0]?.efficiencyPct ?? (tot.target > 0 ? Math.round(tot.actual / tot.target * 100) : null)
      const pph = hc > 0 ? (tot.actual / hc).toFixed(1) : '—'
      const subRows = rows.map(r => `
        <tr class="sub-row">
          <td style="padding-left:24px">${r.orderNo || '—'} ${r.style ? `<span style="color:#94a3b8">${r.style}</span>` : ''}</td>
          <td>${r.targetPcs.toLocaleString()}</td><td><strong>${r.actualPcs.toLocaleString()}</strong></td>
          <td>—</td><td>—</td>
          <td>↑${r.wipReceived} ↓${r.wipPassedOut}${r.downtimeHours > 0 ? ` DT:${r.downtimeHours}h` : ''}</td>
          <td>${r.remarks || ''}</td>
        </tr>`).join('')
      return `
        <tr>
          <td style="padding-left:14px"><strong>${lineName}</strong></td>
          <td>${tot.target.toLocaleString()}</td>
          <td><strong>${tot.actual.toLocaleString()}</strong></td>
          <td>${eff !== null ? `<span class="badge" style="background:${effBg(eff)};color:${effColor(eff)}">${eff}%</span>` : '—'}</td>
          <td>${hc || '—'}</td><td>${pph}</td><td></td>
        </tr>${subRows}`
    }).join('')
    if (!lineRows) return ''
    return `<div class="section-title">${label}</div>
    <table>
      <thead><tr><th>Line</th><th>Target</th><th>Actual</th><th>Eff %</th><th>HC</th><th>Pcs/Head</th><th>Remarks</th></tr></thead>
      <tbody>${lineRows}</tbody>
    </table>`
  }

  return wrapHTML(`Daily Production Report — ${dateLabel}`, `
    <div style="font-size:9pt;color:#64748b;margin-bottom:14px">Production date: <strong style="color:#1e293b">${dateLabel}</strong></div>
    ${summaryHtml}
    ${centralRows ? `<div class="section-title">Centralised Sections</div>
    <table>
      <thead><tr><th>Section</th><th>Target</th><th>Actual</th><th>Eff %</th><th>HC</th><th>Pcs/Head</th><th>Remarks</th></tr></thead>
      <tbody>${centralRows}</tbody>
    </table>` : ''}
    ${buildLineTable(COMP_LINES, lineByName, 'Component Lines — C-01 to C-20')}
    ${buildLineTable(ASSY_LINES, lineByName, 'Assembly Lines — A-01 to A-20')}
  `, true)
}

function genMasterPlanHTML(orders, orderProgress) {
  const counts = { active: 0, pending: 0, completed: 0, delayed: 0 }
  orders.forEach(o => { if (counts[o.status] !== undefined) counts[o.status]++ })

  const summaryHtml = `
<div class="summary-grid summary-grid-4">
  <div class="summary-box" style="border-color:#3b82f6">
    <div class="label">Active</div>
    <div class="value" style="color:#2563eb">${counts.active}</div>
  </div>
  <div class="summary-box" style="border-color:#f59e0b">
    <div class="label">Pending</div>
    <div class="value" style="color:#d97706">${counts.pending}</div>
  </div>
  <div class="summary-box" style="border-color:#22c55e">
    <div class="label">Completed</div>
    <div class="value" style="color:#16a34a">${counts.completed}</div>
  </div>
  <div class="summary-box" style="border-color:#ef4444">
    <div class="label">Delayed</div>
    <div class="value" style="color:#dc2626">${counts.delayed}</div>
  </div>
</div>`

  const rows = orders.map(o => {
    const st = STATUS_MAP[o.status] || STATUS_MAP.pending
    const cumActual = orderProgress[o.id] || 0
    const pct = o.qty > 0 ? Math.min(100, Math.round(cumActual / o.qty * 100)) : (o.progress || 0)
    const hasRealProg = cumActual > 0
    const gap = o.completionDate && o.shipDate ? shipmentGapWorkingDays(o.completionDate, o.shipDate) : null
    const gapWarn = gap !== null && gap < 0 ? `<span style="color:#dc2626;font-size:7.5pt">⚠ ${Math.abs(gap)}d overdue</span>` : gap !== null && gap <= 5 ? `<span style="color:#d97706;font-size:7.5pt">⚠ ${gap}d gap</span>` : ''
    return `<tr>
      <td><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${o.color || '#94a3b8'};margin-right:6px;vertical-align:middle"></span><strong>${o.orderNo}</strong>${o.requiresEmbroidery ? ' <span style="font-size:7pt;background:#fce7f3;color:#9d174d;padding:1px 4px;border-radius:3px">Emb</span>' : ''}</td>
      <td>${o.buyer || '—'}</td>
      <td>${o.style || '—'}</td>
      <td>${o.season || '—'}</td>
      <td style="text-align:right"><strong>${o.qty?.toLocaleString() || '—'}</strong></td>
      <td style="text-align:center">${o.smv || '—'}</td>
      <td>${o.completionDate ? format(new Date(o.completionDate), 'dd MMM yy') : '—'}</td>
      <td>${o.shipDate ? format(new Date(o.shipDate), 'dd MMM yy') : '—'} ${gapWarn}</td>
      <td style="font-size:8pt">${o.componentLine || '—'} / ${o.assemblyLine || '—'}</td>
      <td style="min-width:100px">
        <div class="prog-bar"><div class="prog-fill" style="width:${pct}%;background:${pctColor(pct)}"></div></div>
        <span style="font-size:7.5pt;color:${pctColor(pct)};font-weight:700">${pct}%</span>
        ${hasRealProg ? `<span style="font-size:7pt;color:#94a3b8"> · ${cumActual.toLocaleString()} pcs</span>` : ''}
      </td>
      <td><span class="badge" style="background:${st.bg};color:${st.color}">${st.label}</span></td>
    </tr>`
  }).join('')

  return wrapHTML('Production Master Plan', `
    ${summaryHtml}
    <table>
      <thead><tr><th>Order No</th><th>Customer</th><th>Style</th><th>Season</th><th>Qty</th><th>SMV</th><th>Completion</th><th>Ex-Factory</th><th>Lines</th><th>Output Progress</th><th>Status</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`, true)
}

function genShipmentHTML(shipments) {
  const upcoming = shipments.filter(s => s.status !== 'completed').sort((a, b) => new Date(a.shipDate) - new Date(b.shipDate))
  const shipped = shipments.filter(s => s.status === 'completed')
  const daysLeft = (s) => s.shipDate ? Math.ceil((new Date(s.shipDate) - new Date()) / 86400000) : null

  const renderShipmentRows = (list) => list.map(s => {
    const st = STATUS_MAP[s.status] || STATUS_MAP.pending
    const dl = daysLeft(s)
    const gap = s.completionDate && s.shipDate ? shipmentGapWorkingDays(s.completionDate, s.shipDate) : null
    const msHtml = (s.milestones || []).map(m => {
      const cls = m.done ? 'ms-done' : m.date && new Date(m.date) < new Date() ? 'ms-late' : 'ms-pending'
      const sym = m.done ? '✓' : m.date && new Date(m.date) < new Date() ? '✗' : '○'
      return `<span class="${cls}" title="${m.name}">${sym} ${m.name.replace('Material Arrival','Mat').replace('Embroidery Start','Emb').replace('Completion','Comp').replace('Ex-Factory','Ship')}</span>`
    }).join(' &nbsp;·&nbsp; ')
    return `<tr>
      <td><strong>${s.orderNo}</strong></td>
      <td>${s.buyer || '—'}</td>
      <td>${s.style || '—'}</td>
      <td style="text-align:right">${s.totalQty?.toLocaleString() || '—'}</td>
      <td>${s.completionDate ? format(new Date(s.completionDate), 'dd MMM') : '—'} ${gap !== null && gap < 0 ? '<span style="color:#dc2626;font-size:7pt">⚠</span>' : gap !== null && gap <= 5 ? '<span style="color:#d97706;font-size:7pt">⚠</span>' : ''}</td>
      <td>${s.shipDate ? format(new Date(s.shipDate), 'dd MMM yy') : '—'}${dl !== null ? ` <span style="font-size:7pt;color:${dl < 0 ? '#dc2626' : dl <= 7 ? '#d97706' : '#94a3b8'}">(${dl < 0 ? `${Math.abs(dl)}d late` : `${dl}d`})</span>` : ''}</td>
      <td style="font-size:7.5pt">${msHtml}</td>
      <td><span class="badge" style="background:${st.bg};color:${st.color}">${st.label}</span></td>
    </tr>`
  }).join('')

  return wrapHTML('Shipment Schedule', `
<div class="summary-grid summary-grid-4">
  <div class="summary-box" style="border-color:#3b82f6">
    <div class="label">Total Orders</div>
    <div class="value" style="color:#2563eb">${shipments.length}</div>
  </div>
  <div class="summary-box" style="border-color:#f59e0b">
    <div class="label">Upcoming</div>
    <div class="value" style="color:#d97706">${upcoming.length}</div>
  </div>
  <div class="summary-box" style="border-color:#ef4444">
    <div class="label">Critical (&lt;7d)</div>
    <div class="value" style="color:#dc2626">${upcoming.filter(s => (daysLeft(s) || 999) <= 7).length}</div>
  </div>
  <div class="summary-box" style="border-color:#22c55e">
    <div class="label">Shipped</div>
    <div class="value" style="color:#16a34a">${shipped.length}</div>
  </div>
</div>
${upcoming.length ? `<div class="section-title">Upcoming Shipments</div>
<table>
  <thead><tr><th>Order</th><th>Customer</th><th>Style</th><th>Qty</th><th>Completion</th><th>Ex-Factory</th><th>Milestones</th><th>Status</th></tr></thead>
  <tbody>${renderShipmentRows(upcoming)}</tbody>
</table>` : ''}
${shipped.length ? `<div class="section-title">Completed Shipments</div>
<table>
  <thead><tr><th>Order</th><th>Customer</th><th>Style</th><th>Qty</th><th>Completion</th><th>Ex-Factory</th><th>Milestones</th><th>Status</th></tr></thead>
  <tbody>${renderShipmentRows(shipped)}</tbody>
</table>` : ''}`, true)
}

function genCapacityHTML(orders, lineAllocations, orderProgress) {
  // Group allocations by line pair
  const byLine = {}
  lineAllocations.forEach(a => {
    if (!byLine[a.linePairNo]) byLine[a.linePairNo] = []
    byLine[a.linePairNo].push(a)
  })

  const activeOrders = orders.filter(o => o.status !== 'completed')
  const rows = Object.entries(byLine).sort((a, b) => Number(a[0]) - Number(b[0])).map(([pairNo, allocs]) => {
    return allocs.map((a, i) => {
      const o = orders.find(x => x.id === a.orderId)
      const cum = o ? (orderProgress[o.id] || 0) : 0
      const pct = a.allocatedQty > 0 ? Math.min(100, Math.round(cum / a.allocatedQty * 100)) : 0
      const st = o ? STATUS_MAP[o.status] : null
      return `<tr>
        ${i === 0 ? `<td rowspan="${allocs.length}" style="font-weight:700;background:#f8fafc;text-align:center">LP-${String(pairNo).padStart(2,'0')}<br/><span style="font-size:7.5pt;color:#64748b;font-weight:400">C${String(pairNo).padStart(2,'0')}/A${String(pairNo).padStart(2,'0')}</span></td>` : ''}
        <td>${o?.orderNo || '—'} ${o?.requiresEmbroidery ? '<span style="font-size:7pt;background:#fce7f3;color:#9d174d;padding:1px 4px;border-radius:3px">Emb</span>' : ''}</td>
        <td>${o?.buyer || '—'}</td>
        <td>${a.startDate ? format(new Date(a.startDate), 'dd MMM') : '—'}</td>
        <td>${a.endDate ? format(new Date(a.endDate), 'dd MMM') : '—'}</td>
        <td style="text-align:right">${a.allocatedQty?.toLocaleString() || '—'}</td>
        <td style="text-align:right">${a.targetDailyPcs?.toLocaleString() || '—'}</td>
        <td style="min-width:90px">
          <div class="prog-bar"><div class="prog-fill" style="width:${pct}%;background:${pctColor(pct)}"></div></div>
          <span style="font-size:7.5pt;color:${pctColor(pct)};font-weight:700">${pct}% · ${cum.toLocaleString()} pcs</span>
        </td>
        <td>${st ? `<span class="badge" style="background:${st.bg};color:${st.color}">${st.label}</span>` : '—'}</td>
      </tr>`
    }).join('')
  }).join('')

  return wrapHTML('Line Capacity & Allocation Report', `
<div class="summary-grid summary-grid-3">
  <div class="summary-box" style="border-color:#3b82f6">
    <div class="label">Active Orders</div>
    <div class="value" style="color:#2563eb">${activeOrders.length}</div>
    <div class="sub">In production or pending start</div>
  </div>
  <div class="summary-box" style="border-color:#8b5cf6">
    <div class="label">Lines Allocated</div>
    <div class="value" style="color:#7c3aed">${Object.keys(byLine).length}</div>
    <div class="sub">Of 20 line pairs</div>
  </div>
  <div class="summary-box" style="border-color:#22c55e">
    <div class="label">Total Allocations</div>
    <div class="value" style="color:#16a34a">${lineAllocations.length}</div>
    <div class="sub">Across all lines</div>
  </div>
</div>
<table>
  <thead><tr><th>Line Pair</th><th>Order</th><th>Customer</th><th>Start</th><th>End</th><th>Allocated Qty</th><th>Target/Day</th><th>Output Progress</th><th>Status</th></tr></thead>
  <tbody>${rows || '<tr><td colspan="9" style="text-align:center;color:#94a3b8;padding:20px">No allocations</td></tr>'}</tbody>
</table>`, true)
}

// ── Report type config ─────────────────────────────────────────────────────────────
const REPORT_TYPES = [
  { id: 'daily-output',  label: 'Daily Production', icon: BarChart3,    desc: 'Section & line output for a specific date', needsDate: true },
  { id: 'master-plan',   label: 'Master Plan',       icon: ClipboardList, desc: 'All orders with progress and shipment dates', needsDate: false },
  { id: 'shipment',      label: 'Shipment Schedule', icon: Truck,        desc: 'Upcoming shipments with milestone status', needsDate: false },
  { id: 'capacity',      label: 'Line Capacity',     icon: FileText,     desc: 'Line allocations and output progress', needsDate: false },
]

// ── Screen preview components ─────────────────────────────────────────────────────

function PreviewDailyOutput({ date, sectionOutput, sectionHeadcount, lineData, orders }) {
  const soBySection = {}
  sectionOutput.forEach(r => { if (!soBySection[r.section]) soBySection[r.section] = []; soBySection[r.section].push(r) })
  const hcBySection = {}
  sectionHeadcount.forEach(h => { hcBySection[h.section] = h })
  const lineByName = {}
  lineData.forEach(r => { if (!r.lineName) return; if (!lineByName[r.lineName]) lineByName[r.lineName] = []; lineByName[r.lineName].push(r) })

  const compRows = lineData.filter(r => r.lineName?.startsWith('C-'))
  const assyRows = lineData.filter(r => r.lineName?.startsWith('A-'))
  const compActual = sumBy(compRows, 'actualPcs'), compTarget = sumBy(compRows, 'targetPcs')
  const assyActual = sumBy(assyRows, 'actualPcs'), assyTarget = sumBy(assyRows, 'targetPcs')
  const compHC = [...new Set(compRows.map(r => r.lineName))].reduce((s, l) => s + lineHC(compRows.filter(r => r.lineName === l)), 0)
  const assyHC = [...new Set(assyRows.map(r => r.lineName))].reduce((s, l) => s + lineHC(assyRows.filter(r => r.lineName === l)), 0)
  const orderMap = Object.fromEntries(orders.map(o => [o.id, o]))
  let loadingMins = 0
  assyRows.forEach(r => { loadingMins += (r.actualPcs || 0) * (orderMap[r.orderId]?.smv || 0) })
  const capacityMins = (compHC + assyHC) * 8 * 60
  const smvEff = capacityMins > 0 ? Math.round(loadingMins / capacityMins * 100) : 0

  const thCls = 'text-left py-1.5 px-2 text-xs font-semibold text-slate-500 uppercase bg-slate-50 whitespace-nowrap'
  const tdCls = 'py-1.5 px-2 text-xs border-b border-slate-100'

  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-400 font-medium">{format(new Date(date), 'EEEE, MMMM d, yyyy')}</p>

      {/* Summary panels */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Component Lines', value: compActual, target: compTarget, hc: compHC, color: '#8b5cf6' },
          { label: 'Assembly Lines', value: assyActual, target: assyTarget, hc: assyHC, color: '#22c55e' },
          { label: 'SMV Efficiency', value: `${smvEff}%`, isBig: true, color: smvEff >= 85 ? '#16a34a' : smvEff >= 70 ? '#d97706' : '#dc2626' },
        ].map(item => (
          <div key={item.label} className="border border-slate-200 rounded-lg p-3">
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide">{item.label}</p>
            <p className="text-2xl font-bold mt-1" style={{ color: item.color }}>
              {item.isBig ? item.value : item.value.toLocaleString()}
            </p>
            {!item.isBig && (
              <p className="text-xs text-slate-400 mt-0.5">Target: {item.target.toLocaleString()} · HC: {item.hc}</p>
            )}
          </div>
        ))}
      </div>

      {/* Centralised sections */}
      {CENTRALISED.some(s => soBySection[s]?.length > 0) && (
        <div>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Centralised Sections</p>
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead><tr>
                {['Section','Target','Actual','Eff%','HC','Pcs/Head'].map(h => <th key={h} className={thCls}>{h}</th>)}
              </tr></thead>
              <tbody>
                {CENTRALISED.filter(s => soBySection[s]?.length > 0).map(section => {
                  const rows = soBySection[section] || []
                  const hc = hcBySection[section]
                  const tot = { target: sumBy(rows, 'target'), actual: sumBy(rows, 'actual') }
                  const eff = hc?.efficiencyPct ?? (tot.target > 0 ? Math.round(tot.actual / tot.target * 100) : null)
                  const headcount = hc?.headcount || 0
                  return (
                    <tr key={section}>
                      <td className={tdCls}>
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-sm" style={{ background: SECTION_COLORS_HEX[section] }} />
                          <span className="font-medium">{SECTION_LABELS[section]}</span>
                        </div>
                      </td>
                      <td className={tdCls}>{tot.target.toLocaleString()}</td>
                      <td className={tdCls + ' font-bold'}>{tot.actual.toLocaleString()}</td>
                      <td className={tdCls}>{eff !== null ? <span className="font-semibold" style={{ color: effColor(eff) }}>{eff}%</span> : '—'}</td>
                      <td className={tdCls}>{headcount || '—'}</td>
                      <td className={tdCls}>{headcount > 0 ? (tot.actual / headcount).toFixed(1) : '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Line data preview */}
      {lineData.length > 0 && (
        <div>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Lines with Data Today</p>
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead><tr>
                {['Line','Order(s)','Target','Actual','Eff%','HC'].map(h => <th key={h} className={thCls}>{h}</th>)}
              </tr></thead>
              <tbody>
                {[...COMP_LINES, ...ASSY_LINES].filter(l => lineByName[l]?.length > 0).map(lineName => {
                  const rows = lineByName[lineName] || []
                  const tot = { target: sumBy(rows, 'targetPcs'), actual: sumBy(rows, 'actualPcs') }
                  const hc = lineHC(rows)
                  const eff = rows[0]?.efficiencyPct ?? (tot.target > 0 ? Math.round(tot.actual / tot.target * 100) : null)
                  const isAssy = lineName.startsWith('A-')
                  return (
                    <tr key={lineName}>
                      <td className={tdCls}>
                        <span className="font-bold" style={{ color: isAssy ? '#22c55e' : '#8b5cf6' }}>{lineName}</span>
                      </td>
                      <td className={tdCls + ' text-slate-500'}>{rows.map(r => r.orderNo).filter(Boolean).join(', ') || '—'}</td>
                      <td className={tdCls}>{tot.target.toLocaleString()}</td>
                      <td className={tdCls + ' font-bold'}>{tot.actual.toLocaleString()}</td>
                      <td className={tdCls}>{eff !== null ? <span className="font-semibold" style={{ color: effColor(eff) }}>{eff}%</span> : '—'}</td>
                      <td className={tdCls}>{hc || '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {sectionOutput.length === 0 && lineData.length === 0 && (
        <div className="text-center py-12 text-slate-400 text-sm border border-dashed border-slate-200 rounded-xl">
          No data for {format(new Date(date), 'MMM d, yyyy')} — use the IE Daily Input drawer to record output
        </div>
      )}
    </div>
  )
}

function PreviewMasterPlan({ orders, orderProgress }) {
  const thCls = 'text-left py-1.5 px-2 text-xs font-semibold text-slate-500 uppercase bg-slate-50 whitespace-nowrap'
  const tdCls = 'py-1.5 px-2 text-xs border-b border-slate-100'
  const counts = { active: 0, pending: 0, completed: 0, delayed: 0 }
  orders.forEach(o => { if (counts[o.status] !== undefined) counts[o.status]++ })
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Active', value: counts.active, color: '#2563eb' },
          { label: 'Pending', value: counts.pending, color: '#d97706' },
          { label: 'Completed', value: counts.completed, color: '#16a34a' },
          { label: 'Delayed', value: counts.delayed, color: '#dc2626' },
        ].map(item => (
          <div key={item.label} className="border border-slate-200 rounded-lg p-3 text-center">
            <p className="text-xs text-slate-400 font-medium">{item.label}</p>
            <p className="text-3xl font-bold mt-1" style={{ color: item.color }}>{item.value}</p>
          </div>
        ))}
      </div>
      <div className="border border-slate-200 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead><tr>
            {['Order','Customer','Style','Qty','SMV','Completion','Ex-Factory','Lines','Progress','Status'].map(h => <th key={h} className={thCls}>{h}</th>)}
          </tr></thead>
          <tbody>
            {orders.map(o => {
              const st = STATUS_MAP[o.status] || STATUS_MAP.pending
              const cum = orderProgress[o.id] || 0
              const pct = o.qty > 0 ? Math.min(100, Math.round((cum || o.qty * o.progress / 100) / o.qty * 100)) : (o.progress || 0)
              const gap = o.completionDate && o.shipDate ? shipmentGapWorkingDays(o.completionDate, o.shipDate) : null
              return (
                <tr key={o.id}>
                  <td className={tdCls}>
                    <div className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: o.color }} />
                      <span className="font-semibold">{o.orderNo}</span>
                    </div>
                  </td>
                  <td className={tdCls}>{o.buyer}</td>
                  <td className={tdCls + ' text-slate-500'}>{o.style}</td>
                  <td className={tdCls + ' font-medium'}>{o.qty?.toLocaleString()}</td>
                  <td className={tdCls + ' text-center'}>{o.smv || '—'}</td>
                  <td className={tdCls}>{o.completionDate ? format(new Date(o.completionDate), 'dd MMM') : '—'}</td>
                  <td className={tdCls}>
                    <span className={gap !== null && gap < 0 ? 'text-red-600 font-medium' : ''}>
                      {o.shipDate ? format(new Date(o.shipDate), 'dd MMM yy') : '—'}
                    </span>
                    {gap !== null && gap < 0 && <span className="ml-1 text-red-500">⚠</span>}
                  </td>
                  <td className={tdCls + ' text-slate-500'}>{o.componentLine}/{o.assemblyLine}</td>
                  <td className={tdCls + ' min-w-[80px]'}>
                    <Progress value={pct} className="h-1.5 mb-0.5" />
                    <span className="font-semibold" style={{ color: pctColor(pct) }}>{pct}%</span>
                  </td>
                  <td className={tdCls}>
                    <span className="text-xs font-semibold px-1.5 py-0.5 rounded-full" style={{ background: st.bg, color: st.color }}>{st.label}</span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function PreviewShipment({ shipments }) {
  const thCls = 'text-left py-1.5 px-2 text-xs font-semibold text-slate-500 uppercase bg-slate-50 whitespace-nowrap'
  const tdCls = 'py-1.5 px-2 text-xs border-b border-slate-100'
  const upcoming = shipments.filter(s => s.status !== 'completed').sort((a, b) => new Date(a.shipDate) - new Date(b.shipDate))
  const daysLeft = (s) => s.shipDate ? Math.ceil((new Date(s.shipDate) - new Date()) / 86400000) : null
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Total Orders', value: shipments.length, color: '#2563eb' },
          { label: 'Upcoming', value: upcoming.length, color: '#d97706' },
          { label: 'Critical ≤7d', value: upcoming.filter(s => (daysLeft(s) || 999) <= 7).length, color: '#dc2626' },
          { label: 'Shipped', value: shipments.filter(s => s.status === 'completed').length, color: '#16a34a' },
        ].map(item => (
          <div key={item.label} className="border border-slate-200 rounded-lg p-3 text-center">
            <p className="text-xs text-slate-400 font-medium">{item.label}</p>
            <p className="text-3xl font-bold mt-1" style={{ color: item.color }}>{item.value}</p>
          </div>
        ))}
      </div>
      <div className="border border-slate-200 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead><tr>
            {['Order','Customer','Style','Qty','Completion','Ex-Factory','Days Left','Milestones','Status'].map(h => <th key={h} className={thCls}>{h}</th>)}
          </tr></thead>
          <tbody>
            {upcoming.map(s => {
              const st = STATUS_MAP[s.status] || STATUS_MAP.pending
              const dl = daysLeft(s)
              const gap = s.completionDate && s.shipDate ? shipmentGapWorkingDays(s.completionDate, s.shipDate) : null
              return (
                <tr key={s.id}>
                  <td className={tdCls + ' font-semibold'}>{s.orderNo}</td>
                  <td className={tdCls}>{s.buyer}</td>
                  <td className={tdCls + ' text-slate-500'}>{s.style}</td>
                  <td className={tdCls}>{s.totalQty?.toLocaleString()}</td>
                  <td className={tdCls}>
                    {s.completionDate ? format(new Date(s.completionDate), 'dd MMM') : '—'}
                    {gap !== null && gap < 0 && <span className="ml-1 text-red-500 text-xs">⚠</span>}
                  </td>
                  <td className={tdCls}>
                    <span className={dl !== null && dl < 0 ? 'text-red-600 font-bold' : dl !== null && dl <= 7 ? 'text-amber-600 font-medium' : ''}>
                      {s.shipDate ? format(new Date(s.shipDate), 'dd MMM yy') : '—'}
                    </span>
                  </td>
                  <td className={tdCls}>
                    <span className={`font-semibold ${dl === null ? 'text-slate-400' : dl < 0 ? 'text-red-600' : dl <= 7 ? 'text-amber-600' : 'text-slate-600'}`}>
                      {dl === null ? '—' : dl < 0 ? `${Math.abs(dl)}d late` : `${dl}d`}
                    </span>
                  </td>
                  <td className={tdCls}>
                    <div className="flex items-center gap-0.5 flex-wrap">
                      {(s.milestones || []).map((m, i) => (
                        <span key={i} title={m.name + (m.date ? ' · ' + format(new Date(m.date), 'dd MMM') : '')}
                          className={`text-xs ${m.done ? 'text-green-600' : m.date && new Date(m.date) < new Date() ? 'text-red-500' : 'text-slate-300'}`}>
                          {m.done ? <CheckCircle2 className="w-3.5 h-3.5 inline" /> : <Circle className="w-3.5 h-3.5 inline" />}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className={tdCls}>
                    <span className="text-xs font-semibold px-1.5 py-0.5 rounded-full" style={{ background: st.bg, color: st.color }}>{st.label}</span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function PreviewCapacity({ orders, lineAllocations, orderProgress }) {
  const thCls = 'text-left py-1.5 px-2 text-xs font-semibold text-slate-500 uppercase bg-slate-50 whitespace-nowrap'
  const tdCls = 'py-1.5 px-2 text-xs border-b border-slate-100'
  const byLine = {}
  lineAllocations.forEach(a => { if (!byLine[a.linePairNo]) byLine[a.linePairNo] = []; byLine[a.linePairNo].push(a) })
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Active Orders', value: orders.filter(o => ['active','pending'].includes(o.status)).length, color: '#2563eb' },
          { label: 'Lines Allocated', value: Object.keys(byLine).length, color: '#7c3aed' },
          { label: 'Total Allocations', value: lineAllocations.length, color: '#16a34a' },
        ].map(item => (
          <div key={item.label} className="border border-slate-200 rounded-lg p-3 text-center">
            <p className="text-xs text-slate-400 font-medium">{item.label}</p>
            <p className="text-3xl font-bold mt-1" style={{ color: item.color }}>{item.value}</p>
          </div>
        ))}
      </div>
      <div className="border border-slate-200 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead><tr>
            {['Line Pair','Order','Customer','Start','End','Alloc Qty','Target/Day','Progress','Status'].map(h => <th key={h} className={thCls}>{h}</th>)}
          </tr></thead>
          <tbody>
            {Object.entries(byLine).sort((a,b) => Number(a[0])-Number(b[0])).flatMap(([pairNo, allocs]) =>
              allocs.map((a, i) => {
                const o = orders.find(x => x.id === a.orderId)
                const cum = o ? (orderProgress[o.id] || 0) : 0
                const pct = a.allocatedQty > 0 ? Math.min(100, Math.round(cum / a.allocatedQty * 100)) : 0
                const st = o ? STATUS_MAP[o.status] : null
                return (
                  <tr key={a.id}>
                    {i === 0 && (
                      <td className={tdCls + ' font-bold text-center'} rowSpan={allocs.length}
                        style={{ background: '#f8fafc' }}>
                        LP-{String(pairNo).padStart(2,'0')}
                        <div className="text-slate-400 font-normal text-xs">C{String(pairNo).padStart(2,'0')}/A{String(pairNo).padStart(2,'0')}</div>
                      </td>
                    )}
                    <td className={tdCls + ' font-semibold'}>{o?.orderNo || '—'}</td>
                    <td className={tdCls}>{o?.buyer || '—'}</td>
                    <td className={tdCls}>{a.startDate ? format(new Date(a.startDate), 'dd MMM') : '—'}</td>
                    <td className={tdCls}>{a.endDate ? format(new Date(a.endDate), 'dd MMM') : '—'}</td>
                    <td className={tdCls + ' text-right font-medium'}>{a.allocatedQty?.toLocaleString()}</td>
                    <td className={tdCls + ' text-right'}>{a.targetDailyPcs?.toLocaleString()}</td>
                    <td className={tdCls + ' min-w-[90px]'}>
                      <Progress value={pct} className="h-1.5 mb-0.5" />
                      <span className="font-semibold" style={{ color: pctColor(pct) }}>{pct}% · {cum.toLocaleString()} pcs</span>
                    </td>
                    <td className={tdCls}>
                      {st && <span className="text-xs font-semibold px-1.5 py-0.5 rounded-full" style={{ background: st.bg, color: st.color }}>{st.label}</span>}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────────
export default function Reports() {
  const { orders, shipments, lineAllocations } = useAppStore()
  const [reportType, setReportType] = useState('daily-output')
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [loading, setLoading] = useState(false)
  const [orderProgress, setOrderProgress] = useState({})
  const [dailyData, setDailyData] = useState({ sectionOutput: [], sectionHeadcount: [], lineData: [] })
  const [dataLoaded, setDataLoaded] = useState(false)

  const currentType = REPORT_TYPES.find(t => t.id === reportType)

  const loadData = useCallback(async (date) => {
    setLoading(true)
    try {
      const [so, hc, ld, op] = await Promise.all([
        fetchSectionOutputByDate(date).catch(() => []),
        fetchSectionHeadcountByDate(date).catch(() => []),
        fetchDailyLineOutputByDate(date).catch(() => []),
        fetchOrderProgressAll().catch(() => ({})),
      ])
      setDailyData({ sectionOutput: so, sectionHeadcount: hc, lineData: ld })
      setOrderProgress(op)
      setDataLoaded(true)
    } finally {
      setLoading(false)
    }
  }, [])

  // Load on mount
  useState(() => { loadData(selectedDate) })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const handleDateChange = (d) => { setSelectedDate(d); setDataLoaded(false); loadData(d) }

  const handlePrint = () => {
    let html = ''
    if (reportType === 'daily-output') {
      html = genDailyOutputHTML(selectedDate, dailyData.sectionOutput, dailyData.sectionHeadcount, dailyData.lineData, orders)
    } else if (reportType === 'master-plan') {
      html = genMasterPlanHTML(orders, orderProgress)
    } else if (reportType === 'shipment') {
      html = genShipmentHTML(shipments)
    } else if (reportType === 'capacity') {
      html = genCapacityHTML(orders, lineAllocations, orderProgress)
    }
    if (html) openPrint(html)
  }

  const renderPreview = () => {
    if (loading) return (
      <div className="flex items-center justify-center py-20 text-slate-400">
        <Loader2 className="w-6 h-6 animate-spin mr-2" />Loading data…
      </div>
    )
    if (reportType === 'daily-output') return <PreviewDailyOutput date={selectedDate} {...dailyData} orders={orders} />
    if (reportType === 'master-plan') return <PreviewMasterPlan orders={orders} orderProgress={orderProgress} />
    if (reportType === 'shipment') return <PreviewShipment shipments={shipments} />
    if (reportType === 'capacity') return <PreviewCapacity orders={orders} lineAllocations={lineAllocations} orderProgress={orderProgress} />
    return null
  }

  return (
    <div className="space-y-5">

      {/* Report type selector */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {REPORT_TYPES.map(rt => {
          const Icon = rt.icon
          const isActive = reportType === rt.id
          return (
            <button
              key={rt.id}
              onClick={() => setReportType(rt.id)}
              className={`text-left p-4 rounded-xl border-2 transition-all ${
                isActive
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <Icon className={`w-5 h-5 mb-2 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
              <p className={`text-sm font-semibold ${isActive ? 'text-blue-700' : 'text-slate-700'}`}>{rt.label}</p>
              <p className="text-xs text-slate-400 mt-0.5 leading-tight">{rt.desc}</p>
            </button>
          )
        })}
      </div>

      {/* Controls + Print button */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
          <currentType.icon className="w-4 h-4 text-blue-600" />
          {currentType.label}
        </div>
        {currentType.needsDate && (
          <div className="flex items-center gap-2">
            <label className="text-sm text-slate-500">Date:</label>
            <input
              type="date" value={selectedDate}
              onChange={e => handleDateChange(e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}
        <div className="ml-auto flex items-center gap-2">
          {loading && <Loader2 className="w-4 h-4 animate-spin text-slate-400" />}
          <Button onClick={handlePrint} disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
            <Printer className="w-4 h-4" />
            Print / Export PDF
          </Button>
        </div>
      </div>

      {/* Preview card */}
      <Card>
        <CardHeader className="pb-2 flex-row items-center justify-between">
          <CardTitle className="text-sm text-slate-600">Preview — {currentType.label}</CardTitle>
          <p className="text-xs text-slate-400">Click "Print / Export PDF" to open print dialog → Save as PDF</p>
        </CardHeader>
        <CardContent className="pt-2">
          {renderPreview()}
        </CardContent>
      </Card>
    </div>
  )
}
