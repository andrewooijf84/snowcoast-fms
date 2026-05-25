import{t as e}from"./format-DgSuwo5u.js";import{t}from"./circle-check-CAauq1xP.js";import{t as n}from"./circle-ColHpNj9.js";import{t as r}from"./loader-circle-jNw-Tupg.js";import{t as i}from"./printer-BXqQMt5o.js";import{B as a,L as o,_ as s,at as c,f as l,h as u,j as d,nt as f,o as p,t as m,u as h,v as g,z as _}from"./index-aA0irJ-z.js";import{i as v,n as y,r as b,t as x}from"./card-CIcwcXkD.js";import"./badge-C1BbsAw6.js";import{r as S}from"./workingDays-BAytrTqX.js";import{t as C}from"./progress-zpeLExgU.js";var w=s(`clipboard-list`,[[`rect`,{width:`8`,height:`4`,x:`8`,y:`2`,rx:`1`,ry:`1`,key:`tgr4d6`}],[`path`,{d:`M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2`,key:`116196`}],[`path`,{d:`M12 11h4`,key:`1jrz19`}],[`path`,{d:`M12 16h4`,key:`n85exb`}],[`path`,{d:`M8 11h.01`,key:`1dfujw`}],[`path`,{d:`M8 16h.01`,key:`18s6g9`}]]),T=c(f(),1),E=p(),D=[`cutting`,`embroidery`,`downFilling`,`template`,`finishing`,`packing`],O={cutting:`Cutting`,embroidery:`Embroidery / Print`,downFilling:`Down Filling`,template:`Template`,finishing:`Finishing`,packing:`Packing`},k={cutting:`#3b82f6`,embroidery:`#ec4899`,downFilling:`#06b6d4`,template:`#f59e0b`,finishing:`#a855f7`,packing:`#f97316`},A=Array.from({length:20},(e,t)=>`C-${String(t+1).padStart(2,`0`)}`),j=Array.from({length:20},(e,t)=>`A-${String(t+1).padStart(2,`0`)}`),M=(e,t)=>e.reduce((e,n)=>e+(Number(n[t])||0),0),N=e=>e.length>0?Math.max(...e.map(e=>Number(e.workersPresent)||0)):0,P=e=>e>=75?`#15803d`:e>=40?`#92400e`:`#991b1b`,F=e=>e>=90?`#15803d`:e>=75?`#1d4ed8`:e>=60?`#92400e`:`#991b1b`,I=e=>e>=90?`#dcfce7`:e>=75?`#dbeafe`:e>=60?`#fef3c7`:`#fee2e2`,L={active:{label:`Active`,bg:`#dbeafe`,color:`#1d4ed8`},completed:{label:`Completed`,bg:`#dcfce7`,color:`#15803d`},pending:{label:`Pending`,bg:`#fef3c7`,color:`#92400e`},delayed:{label:`Delayed`,bg:`#fee2e2`,color:`#991b1b`}},R=`
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
`;function z(t,n,r=!0){let i=e(new Date,`dd/MM/yyyy HH:mm`);return`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${t}</title>
<style>${R}${r?`@page{size:A4 landscape}`:`@page{size:A4 portrait}`}</style>
</head><body>
<div class="page-header">
  <div>
    <div class="co-name">❄ Snow Coast</div>
    <div class="co-sub">Factory Management System</div>
    <div class="rpt-title">${t}</div>
  </div>
  <div class="rpt-meta">Generated: ${i}</div>
</div>
${n}
<div class="footer"><span>Snow Coast FMS — Confidential</span><span>Printed: ${i}</span></div>
</body></html>`}function B(e){let t=window.open(``,`_blank`,`width=1150,height=800`);if(!t){alert(`Please allow pop-ups for this site to enable printing.`);return}t.document.write(e),t.document.close(),t.focus(),setTimeout(()=>{t.print()},600)}function V(t,n,r,i,a){let o=e(new Date(t),`EEEE, MMMM d, yyyy`),s={};n.forEach(e=>{s[e.section]||(s[e.section]=[]),s[e.section].push(e)});let c={};r.forEach(e=>{c[e.section]=e});let l={};i.forEach(e=>{e.lineName&&(l[e.lineName]||(l[e.lineName]=[]),l[e.lineName].push(e))});let u=Object.fromEntries(a.map(e=>[e.id,e])),d=i.filter(e=>e.lineName?.startsWith(`C-`)),f=i.filter(e=>e.lineName?.startsWith(`A-`)),p={};d.forEach(e=>{e.lineName&&(p[e.lineName]=N(d.filter(t=>t.lineName===e.lineName)))});let m={};f.forEach(e=>{e.lineName&&(m[e.lineName]=N(f.filter(t=>t.lineName===e.lineName)))});let h=M(d,`targetPcs`),g=M(d,`actualPcs`),_=M(f,`targetPcs`),v=M(f,`actualPcs`),y=Object.values(p).reduce((e,t)=>e+t,0),b=Object.values(m).reduce((e,t)=>e+t,0),x=y+b,S=0;f.forEach(e=>{S+=(e.actualPcs||0)*(u[e.orderId]?.smv||0)});let C=x*8*60,w=C>0?Math.round(S/C*100):0,T=`
<div class="summary-grid summary-grid-3">
  <div class="summary-box" style="border-color:#8b5cf6">
    <div class="label">Component Lines (C-01→C-20)</div>
    <div class="value" style="color:#7c3aed">${g.toLocaleString()}</div>
    <div class="sub">Target: ${h.toLocaleString()} pcs · HC: ${y} · ${y>0?(g/y).toFixed(1):`—`} pcs/head</div>
    <div class="prog-bar"><div class="prog-fill" style="width:${h>0?Math.min(100,Math.round(g/h*100)):0}%;background:#8b5cf6"></div></div>
  </div>
  <div class="summary-box" style="border-color:#22c55e">
    <div class="label">Assembly Lines (A-01→A-20)</div>
    <div class="value" style="color:#16a34a">${v.toLocaleString()}</div>
    <div class="sub">Target: ${_.toLocaleString()} pcs · HC: ${b} · ${b>0?(v/b).toFixed(1):`—`} pcs/head</div>
    <div class="prog-bar"><div class="prog-fill" style="width:${_>0?Math.min(100,Math.round(v/_*100)):0}%;background:#22c55e"></div></div>
  </div>
  <div class="summary-box" style="border-color:#6366f1">
    <div class="label">SMV Efficiency (Auto-Calc)</div>
    <div class="value" style="color:${F(w)}">${w}%</div>
    <div class="sub">Loading: ${Math.round(S).toLocaleString()} / Capacity: ${C.toLocaleString()} mins · HC: ${x}</div>
    <div class="prog-bar"><div class="prog-fill" style="width:${Math.min(100,w)}%;background:${F(w)}"></div></div>
  </div>
</div>`,E=D.map(e=>{let t=s[e]||[];if(!t.length)return``;let n=c[e],r=t.reduce((e,t)=>({target:e.target+t.target,actual:e.actual+t.actual}),{target:0,actual:0}),i=n?.efficiencyPct??(r.target>0?Math.round(r.actual/r.target*100):null),a=n?.headcount||0,o=a>0?(r.actual/a).toFixed(1):`—`,l=t.map(e=>`
      <tr class="sub-row">
        <td style="padding-left:24px">${e.orderNo||`—`} ${e.style?`<span style="color:#94a3b8">${e.style}</span>`:``}</td>
        <td>${e.target.toLocaleString()}</td><td><strong>${e.actual.toLocaleString()}</strong></td>
        <td>—</td><td>—</td>
        <td>↑${e.wipReceived} ↓${e.wipPassedOut}</td>
        <td>${e.remarks||``}</td>
      </tr>`).join(``);return`
      <tr style="background:${k[e]}15">
        <td><span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${k[e]};margin-right:6px;vertical-align:middle"></span><strong>${O[e]}</strong></td>
        <td>${r.target.toLocaleString()}</td>
        <td><strong>${r.actual.toLocaleString()}</strong></td>
        <td>${i===null?`—`:`<span class="badge" style="background:${I(i)};color:${F(i)}">${i}%</span>`}</td>
        <td>${a||`—`}</td>
        <td>${o}</td>
        <td></td>
      </tr>${l}`}).join(``),P=(e,t,n)=>{let r=e.filter(e=>t[e]?.length>0).map(e=>{let n=t[e]||[],r={target:M(n,`targetPcs`),actual:M(n,`actualPcs`)},i=N(n),a=n[0]?.efficiencyPct??(r.target>0?Math.round(r.actual/r.target*100):null),o=i>0?(r.actual/i).toFixed(1):`—`,s=n.map(e=>`
        <tr class="sub-row">
          <td style="padding-left:24px">${e.orderNo||`—`} ${e.style?`<span style="color:#94a3b8">${e.style}</span>`:``}</td>
          <td>${e.targetPcs.toLocaleString()}</td><td><strong>${e.actualPcs.toLocaleString()}</strong></td>
          <td>—</td><td>—</td>
          <td>↑${e.wipReceived} ↓${e.wipPassedOut}${e.downtimeHours>0?` DT:${e.downtimeHours}h`:``}</td>
          <td>${e.remarks||``}</td>
        </tr>`).join(``);return`
        <tr>
          <td style="padding-left:14px"><strong>${e}</strong></td>
          <td>${r.target.toLocaleString()}</td>
          <td><strong>${r.actual.toLocaleString()}</strong></td>
          <td>${a===null?`—`:`<span class="badge" style="background:${I(a)};color:${F(a)}">${a}%</span>`}</td>
          <td>${i||`—`}</td><td>${o}</td><td></td>
        </tr>${s}`}).join(``);return r?`<div class="section-title">${n}</div>
    <table>
      <thead><tr><th>Line</th><th>Target</th><th>Actual</th><th>Eff %</th><th>HC</th><th>Pcs/Head</th><th>Remarks</th></tr></thead>
      <tbody>${r}</tbody>
    </table>`:``};return z(`Daily Production Report — ${o}`,`
    <div style="font-size:9pt;color:#64748b;margin-bottom:14px">Production date: <strong style="color:#1e293b">${o}</strong></div>
    ${T}
    ${E?`<div class="section-title">Centralised Sections</div>
    <table>
      <thead><tr><th>Section</th><th>Target</th><th>Actual</th><th>Eff %</th><th>HC</th><th>Pcs/Head</th><th>Remarks</th></tr></thead>
      <tbody>${E}</tbody>
    </table>`:``}
    ${P(A,l,`Component Lines — C-01 to C-20`)}
    ${P(j,l,`Assembly Lines — A-01 to A-20`)}
  `,!0)}function H(t,n){let r={active:0,pending:0,completed:0,delayed:0};return t.forEach(e=>{r[e.status]!==void 0&&r[e.status]++}),z(`Production Master Plan`,`
    ${`
<div class="summary-grid summary-grid-4">
  <div class="summary-box" style="border-color:#3b82f6">
    <div class="label">Active</div>
    <div class="value" style="color:#2563eb">${r.active}</div>
  </div>
  <div class="summary-box" style="border-color:#f59e0b">
    <div class="label">Pending</div>
    <div class="value" style="color:#d97706">${r.pending}</div>
  </div>
  <div class="summary-box" style="border-color:#22c55e">
    <div class="label">Completed</div>
    <div class="value" style="color:#16a34a">${r.completed}</div>
  </div>
  <div class="summary-box" style="border-color:#ef4444">
    <div class="label">Delayed</div>
    <div class="value" style="color:#dc2626">${r.delayed}</div>
  </div>
</div>`}
    <table>
      <thead><tr><th>Order No</th><th>Customer</th><th>Style</th><th>Season</th><th>Qty</th><th>SMV</th><th>Completion</th><th>Ex-Factory</th><th>Lines</th><th>Output Progress</th><th>Status</th></tr></thead>
      <tbody>${t.map(t=>{let r=L[t.status]||L.pending,i=n[t.id]||0,a=t.qty>0?Math.min(100,Math.round(i/t.qty*100)):t.progress||0,o=i>0,s=t.completionDate&&t.shipDate?S(t.completionDate,t.shipDate):null,c=s!==null&&s<0?`<span style="color:#dc2626;font-size:7.5pt">⚠ ${Math.abs(s)}d overdue</span>`:s!==null&&s<=5?`<span style="color:#d97706;font-size:7.5pt">⚠ ${s}d gap</span>`:``;return`<tr>
      <td><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${t.color||`#94a3b8`};margin-right:6px;vertical-align:middle"></span><strong>${t.orderNo}</strong>${t.requiresEmbroidery?` <span style="font-size:7pt;background:#fce7f3;color:#9d174d;padding:1px 4px;border-radius:3px">Emb</span>`:``}</td>
      <td>${t.buyer||`—`}</td>
      <td>${t.style||`—`}</td>
      <td>${t.season||`—`}</td>
      <td style="text-align:right"><strong>${t.qty?.toLocaleString()||`—`}</strong></td>
      <td style="text-align:center">${t.smv||`—`}</td>
      <td>${t.completionDate?e(new Date(t.completionDate),`dd MMM yy`):`—`}</td>
      <td>${t.shipDate?e(new Date(t.shipDate),`dd MMM yy`):`—`} ${c}</td>
      <td style="font-size:8pt">${t.componentLine||`—`} / ${t.assemblyLine||`—`}</td>
      <td style="min-width:100px">
        <div class="prog-bar"><div class="prog-fill" style="width:${a}%;background:${P(a)}"></div></div>
        <span style="font-size:7.5pt;color:${P(a)};font-weight:700">${a}%</span>
        ${o?`<span style="font-size:7pt;color:#94a3b8"> · ${i.toLocaleString()} pcs</span>`:``}
      </td>
      <td><span class="badge" style="background:${r.bg};color:${r.color}">${r.label}</span></td>
    </tr>`}).join(``)}</tbody>
    </table>`,!0)}function U(t){let n=t.filter(e=>e.status!==`completed`).sort((e,t)=>new Date(e.shipDate)-new Date(t.shipDate)),r=t.filter(e=>e.status===`completed`),i=e=>e.shipDate?Math.ceil((new Date(e.shipDate)-new Date)/864e5):null,a=t=>t.map(t=>{let n=L[t.status]||L.pending,r=i(t),a=t.completionDate&&t.shipDate?S(t.completionDate,t.shipDate):null,o=(t.milestones||[]).map(e=>{let t=e.done?`ms-done`:e.date&&new Date(e.date)<new Date?`ms-late`:`ms-pending`,n=e.done?`✓`:e.date&&new Date(e.date)<new Date?`✗`:`○`;return`<span class="${t}" title="${e.name}">${n} ${e.name.replace(`Material Arrival`,`Mat`).replace(`Embroidery Start`,`Emb`).replace(`Completion`,`Comp`).replace(`Ex-Factory`,`Ship`)}</span>`}).join(` &nbsp;·&nbsp; `);return`<tr>
      <td><strong>${t.orderNo}</strong></td>
      <td>${t.buyer||`—`}</td>
      <td>${t.style||`—`}</td>
      <td style="text-align:right">${t.totalQty?.toLocaleString()||`—`}</td>
      <td>${t.completionDate?e(new Date(t.completionDate),`dd MMM`):`—`} ${a!==null&&a<0?`<span style="color:#dc2626;font-size:7pt">⚠</span>`:a!==null&&a<=5?`<span style="color:#d97706;font-size:7pt">⚠</span>`:``}</td>
      <td>${t.shipDate?e(new Date(t.shipDate),`dd MMM yy`):`—`}${r===null?``:` <span style="font-size:7pt;color:${r<0?`#dc2626`:r<=7?`#d97706`:`#94a3b8`}">(${r<0?`${Math.abs(r)}d late`:`${r}d`})</span>`}</td>
      <td style="font-size:7.5pt">${o}</td>
      <td><span class="badge" style="background:${n.bg};color:${n.color}">${n.label}</span></td>
    </tr>`}).join(``);return z(`Shipment Schedule`,`
<div class="summary-grid summary-grid-4">
  <div class="summary-box" style="border-color:#3b82f6">
    <div class="label">Total Orders</div>
    <div class="value" style="color:#2563eb">${t.length}</div>
  </div>
  <div class="summary-box" style="border-color:#f59e0b">
    <div class="label">Upcoming</div>
    <div class="value" style="color:#d97706">${n.length}</div>
  </div>
  <div class="summary-box" style="border-color:#ef4444">
    <div class="label">Critical (&lt;7d)</div>
    <div class="value" style="color:#dc2626">${n.filter(e=>(i(e)||999)<=7).length}</div>
  </div>
  <div class="summary-box" style="border-color:#22c55e">
    <div class="label">Shipped</div>
    <div class="value" style="color:#16a34a">${r.length}</div>
  </div>
</div>
${n.length?`<div class="section-title">Upcoming Shipments</div>
<table>
  <thead><tr><th>Order</th><th>Customer</th><th>Style</th><th>Qty</th><th>Completion</th><th>Ex-Factory</th><th>Milestones</th><th>Status</th></tr></thead>
  <tbody>${a(n)}</tbody>
</table>`:``}
${r.length?`<div class="section-title">Completed Shipments</div>
<table>
  <thead><tr><th>Order</th><th>Customer</th><th>Style</th><th>Qty</th><th>Completion</th><th>Ex-Factory</th><th>Milestones</th><th>Status</th></tr></thead>
  <tbody>${a(r)}</tbody>
</table>`:``}`,!0)}function W(t,n,r){let i={};n.forEach(e=>{i[e.linePairNo]||(i[e.linePairNo]=[]),i[e.linePairNo].push(e)});let a=t.filter(e=>e.status!==`completed`),o=Object.entries(i).sort((e,t)=>Number(e[0])-Number(t[0])).map(([n,i])=>i.map((a,o)=>{let s=t.find(e=>e.id===a.orderId),c=s&&r[s.id]||0,l=a.allocatedQty>0?Math.min(100,Math.round(c/a.allocatedQty*100)):0,u=s?L[s.status]:null;return`<tr>
        ${o===0?`<td rowspan="${i.length}" style="font-weight:700;background:#f8fafc;text-align:center">LP-${String(n).padStart(2,`0`)}<br/><span style="font-size:7.5pt;color:#64748b;font-weight:400">C${String(n).padStart(2,`0`)}/A${String(n).padStart(2,`0`)}</span></td>`:``}
        <td>${s?.orderNo||`—`} ${s?.requiresEmbroidery?`<span style="font-size:7pt;background:#fce7f3;color:#9d174d;padding:1px 4px;border-radius:3px">Emb</span>`:``}</td>
        <td>${s?.buyer||`—`}</td>
        <td>${a.startDate?e(new Date(a.startDate),`dd MMM`):`—`}</td>
        <td>${a.endDate?e(new Date(a.endDate),`dd MMM`):`—`}</td>
        <td style="text-align:right">${a.allocatedQty?.toLocaleString()||`—`}</td>
        <td style="text-align:right">${a.targetDailyPcs?.toLocaleString()||`—`}</td>
        <td style="min-width:90px">
          <div class="prog-bar"><div class="prog-fill" style="width:${l}%;background:${P(l)}"></div></div>
          <span style="font-size:7.5pt;color:${P(l)};font-weight:700">${l}% · ${c.toLocaleString()} pcs</span>
        </td>
        <td>${u?`<span class="badge" style="background:${u.bg};color:${u.color}">${u.label}</span>`:`—`}</td>
      </tr>`}).join(``)).join(``);return z(`Line Capacity & Allocation Report`,`
<div class="summary-grid summary-grid-3">
  <div class="summary-box" style="border-color:#3b82f6">
    <div class="label">Active Orders</div>
    <div class="value" style="color:#2563eb">${a.length}</div>
    <div class="sub">In production or pending start</div>
  </div>
  <div class="summary-box" style="border-color:#8b5cf6">
    <div class="label">Lines Allocated</div>
    <div class="value" style="color:#7c3aed">${Object.keys(i).length}</div>
    <div class="sub">Of 20 line pairs</div>
  </div>
  <div class="summary-box" style="border-color:#22c55e">
    <div class="label">Total Allocations</div>
    <div class="value" style="color:#16a34a">${n.length}</div>
    <div class="sub">Across all lines</div>
  </div>
</div>
<table>
  <thead><tr><th>Line Pair</th><th>Order</th><th>Customer</th><th>Start</th><th>End</th><th>Allocated Qty</th><th>Target/Day</th><th>Output Progress</th><th>Status</th></tr></thead>
  <tbody>${o||`<tr><td colspan="9" style="text-align:center;color:#94a3b8;padding:20px">No allocations</td></tr>`}</tbody>
</table>`,!0)}var G=[{id:`daily-output`,label:`Daily Production`,icon:u,desc:`Section & line output for a specific date`,needsDate:!0},{id:`master-plan`,label:`Master Plan`,icon:w,desc:`All orders with progress and shipment dates`,needsDate:!1},{id:`shipment`,label:`Shipment Schedule`,icon:h,desc:`Upcoming shipments with milestone status`,needsDate:!1},{id:`capacity`,label:`Line Capacity`,icon:l,desc:`Line allocations and output progress`,needsDate:!1}];function K({date:t,sectionOutput:n,sectionHeadcount:r,lineData:i,orders:a}){let o={};n.forEach(e=>{o[e.section]||(o[e.section]=[]),o[e.section].push(e)});let s={};r.forEach(e=>{s[e.section]=e});let c={};i.forEach(e=>{e.lineName&&(c[e.lineName]||(c[e.lineName]=[]),c[e.lineName].push(e))});let l=i.filter(e=>e.lineName?.startsWith(`C-`)),u=i.filter(e=>e.lineName?.startsWith(`A-`)),d=M(l,`actualPcs`),f=M(l,`targetPcs`),p=M(u,`actualPcs`),m=M(u,`targetPcs`),h=[...new Set(l.map(e=>e.lineName))].reduce((e,t)=>e+N(l.filter(e=>e.lineName===t)),0),g=[...new Set(u.map(e=>e.lineName))].reduce((e,t)=>e+N(u.filter(e=>e.lineName===t)),0),_=Object.fromEntries(a.map(e=>[e.id,e])),v=0;u.forEach(e=>{v+=(e.actualPcs||0)*(_[e.orderId]?.smv||0)});let y=(h+g)*8*60,b=y>0?Math.round(v/y*100):0,x=`text-left py-1.5 px-2 text-xs font-semibold text-slate-500 uppercase bg-slate-50 whitespace-nowrap`,S=`py-1.5 px-2 text-xs border-b border-slate-100`;return(0,E.jsxs)(`div`,{className:`space-y-4`,children:[(0,E.jsx)(`p`,{className:`text-xs text-slate-400 font-medium`,children:e(new Date(t),`EEEE, MMMM d, yyyy`)}),(0,E.jsx)(`div`,{className:`grid grid-cols-3 gap-3`,children:[{label:`Component Lines`,value:d,target:f,hc:h,color:`#8b5cf6`},{label:`Assembly Lines`,value:p,target:m,hc:g,color:`#22c55e`},{label:`SMV Efficiency`,value:`${b}%`,isBig:!0,color:b>=85?`#16a34a`:b>=70?`#d97706`:`#dc2626`}].map(e=>(0,E.jsxs)(`div`,{className:`border border-slate-200 rounded-lg p-3`,children:[(0,E.jsx)(`p`,{className:`text-xs text-slate-400 font-semibold uppercase tracking-wide`,children:e.label}),(0,E.jsx)(`p`,{className:`text-2xl font-bold mt-1`,style:{color:e.color},children:e.isBig?e.value:e.value.toLocaleString()}),!e.isBig&&(0,E.jsxs)(`p`,{className:`text-xs text-slate-400 mt-0.5`,children:[`Target: `,e.target.toLocaleString(),` · HC: `,e.hc]})]},e.label))}),D.some(e=>o[e]?.length>0)&&(0,E.jsxs)(`div`,{children:[(0,E.jsx)(`p`,{className:`text-xs font-bold text-slate-500 uppercase tracking-wide mb-2`,children:`Centralised Sections`}),(0,E.jsx)(`div`,{className:`border border-slate-200 rounded-lg overflow-hidden`,children:(0,E.jsxs)(`table`,{className:`w-full`,children:[(0,E.jsx)(`thead`,{children:(0,E.jsx)(`tr`,{children:[`Section`,`Target`,`Actual`,`Eff%`,`HC`,`Pcs/Head`].map(e=>(0,E.jsx)(`th`,{className:x,children:e},e))})}),(0,E.jsx)(`tbody`,{children:D.filter(e=>o[e]?.length>0).map(e=>{let t=o[e]||[],n=s[e],r={target:M(t,`target`),actual:M(t,`actual`)},i=n?.efficiencyPct??(r.target>0?Math.round(r.actual/r.target*100):null),a=n?.headcount||0;return(0,E.jsxs)(`tr`,{children:[(0,E.jsx)(`td`,{className:S,children:(0,E.jsxs)(`div`,{className:`flex items-center gap-1.5`,children:[(0,E.jsx)(`span`,{className:`w-2 h-2 rounded-sm`,style:{background:k[e]}}),(0,E.jsx)(`span`,{className:`font-medium`,children:O[e]})]})}),(0,E.jsx)(`td`,{className:S,children:r.target.toLocaleString()}),(0,E.jsx)(`td`,{className:`py-1.5 px-2 text-xs border-b border-slate-100 font-bold`,children:r.actual.toLocaleString()}),(0,E.jsx)(`td`,{className:S,children:i===null?`—`:(0,E.jsxs)(`span`,{className:`font-semibold`,style:{color:F(i)},children:[i,`%`]})}),(0,E.jsx)(`td`,{className:S,children:a||`—`}),(0,E.jsx)(`td`,{className:S,children:a>0?(r.actual/a).toFixed(1):`—`})]},e)})})]})})]}),i.length>0&&(0,E.jsxs)(`div`,{children:[(0,E.jsx)(`p`,{className:`text-xs font-bold text-slate-500 uppercase tracking-wide mb-2`,children:`Lines with Data Today`}),(0,E.jsx)(`div`,{className:`border border-slate-200 rounded-lg overflow-hidden`,children:(0,E.jsxs)(`table`,{className:`w-full`,children:[(0,E.jsx)(`thead`,{children:(0,E.jsx)(`tr`,{children:[`Line`,`Order(s)`,`Target`,`Actual`,`Eff%`,`HC`].map(e=>(0,E.jsx)(`th`,{className:x,children:e},e))})}),(0,E.jsx)(`tbody`,{children:[...A,...j].filter(e=>c[e]?.length>0).map(e=>{let t=c[e]||[],n={target:M(t,`targetPcs`),actual:M(t,`actualPcs`)},r=N(t),i=t[0]?.efficiencyPct??(n.target>0?Math.round(n.actual/n.target*100):null);return(0,E.jsxs)(`tr`,{children:[(0,E.jsx)(`td`,{className:S,children:(0,E.jsx)(`span`,{className:`font-bold`,style:{color:e.startsWith(`A-`)?`#22c55e`:`#8b5cf6`},children:e})}),(0,E.jsx)(`td`,{className:`py-1.5 px-2 text-xs border-b border-slate-100 text-slate-500`,children:t.map(e=>e.orderNo).filter(Boolean).join(`, `)||`—`}),(0,E.jsx)(`td`,{className:S,children:n.target.toLocaleString()}),(0,E.jsx)(`td`,{className:`py-1.5 px-2 text-xs border-b border-slate-100 font-bold`,children:n.actual.toLocaleString()}),(0,E.jsx)(`td`,{className:S,children:i===null?`—`:(0,E.jsxs)(`span`,{className:`font-semibold`,style:{color:F(i)},children:[i,`%`]})}),(0,E.jsx)(`td`,{className:S,children:r||`—`})]},e)})})]})})]}),n.length===0&&i.length===0&&(0,E.jsxs)(`div`,{className:`text-center py-12 text-slate-400 text-sm border border-dashed border-slate-200 rounded-xl`,children:[`No data for `,e(new Date(t),`MMM d, yyyy`),` — use the IE Daily Input drawer to record output`]})]})}function q({orders:t,orderProgress:n}){let r=`py-1.5 px-2 text-xs border-b border-slate-100`,i={active:0,pending:0,completed:0,delayed:0};return t.forEach(e=>{i[e.status]!==void 0&&i[e.status]++}),(0,E.jsxs)(`div`,{className:`space-y-4`,children:[(0,E.jsx)(`div`,{className:`grid grid-cols-4 gap-3`,children:[{label:`Active`,value:i.active,color:`#2563eb`},{label:`Pending`,value:i.pending,color:`#d97706`},{label:`Completed`,value:i.completed,color:`#16a34a`},{label:`Delayed`,value:i.delayed,color:`#dc2626`}].map(e=>(0,E.jsxs)(`div`,{className:`border border-slate-200 rounded-lg p-3 text-center`,children:[(0,E.jsx)(`p`,{className:`text-xs text-slate-400 font-medium`,children:e.label}),(0,E.jsx)(`p`,{className:`text-3xl font-bold mt-1`,style:{color:e.color},children:e.value})]},e.label))}),(0,E.jsx)(`div`,{className:`border border-slate-200 rounded-lg overflow-hidden`,children:(0,E.jsxs)(`table`,{className:`w-full`,children:[(0,E.jsx)(`thead`,{children:(0,E.jsx)(`tr`,{children:[`Order`,`Customer`,`Style`,`Qty`,`SMV`,`Completion`,`Ex-Factory`,`Lines`,`Progress`,`Status`].map(e=>(0,E.jsx)(`th`,{className:`text-left py-1.5 px-2 text-xs font-semibold text-slate-500 uppercase bg-slate-50 whitespace-nowrap`,children:e},e))})}),(0,E.jsx)(`tbody`,{children:t.map(t=>{let i=L[t.status]||L.pending,a=n[t.id]||0,o=t.qty>0?Math.min(100,Math.round((a||t.qty*t.progress/100)/t.qty*100)):t.progress||0,s=t.completionDate&&t.shipDate?S(t.completionDate,t.shipDate):null;return(0,E.jsxs)(`tr`,{children:[(0,E.jsx)(`td`,{className:r,children:(0,E.jsxs)(`div`,{className:`flex items-center gap-1`,children:[(0,E.jsx)(`span`,{className:`w-2 h-2 rounded-full flex-shrink-0`,style:{background:t.color}}),(0,E.jsx)(`span`,{className:`font-semibold`,children:t.orderNo})]})}),(0,E.jsx)(`td`,{className:r,children:t.buyer}),(0,E.jsx)(`td`,{className:`py-1.5 px-2 text-xs border-b border-slate-100 text-slate-500`,children:t.style}),(0,E.jsx)(`td`,{className:`py-1.5 px-2 text-xs border-b border-slate-100 font-medium`,children:t.qty?.toLocaleString()}),(0,E.jsx)(`td`,{className:`py-1.5 px-2 text-xs border-b border-slate-100 text-center`,children:t.smv||`—`}),(0,E.jsx)(`td`,{className:r,children:t.completionDate?e(new Date(t.completionDate),`dd MMM`):`—`}),(0,E.jsxs)(`td`,{className:r,children:[(0,E.jsx)(`span`,{className:s!==null&&s<0?`text-red-600 font-medium`:``,children:t.shipDate?e(new Date(t.shipDate),`dd MMM yy`):`—`}),s!==null&&s<0&&(0,E.jsx)(`span`,{className:`ml-1 text-red-500`,children:`⚠`})]}),(0,E.jsxs)(`td`,{className:`py-1.5 px-2 text-xs border-b border-slate-100 text-slate-500`,children:[t.componentLine,`/`,t.assemblyLine]}),(0,E.jsxs)(`td`,{className:`py-1.5 px-2 text-xs border-b border-slate-100 min-w-[80px]`,children:[(0,E.jsx)(C,{value:o,className:`h-1.5 mb-0.5`}),(0,E.jsxs)(`span`,{className:`font-semibold`,style:{color:P(o)},children:[o,`%`]})]}),(0,E.jsx)(`td`,{className:r,children:(0,E.jsx)(`span`,{className:`text-xs font-semibold px-1.5 py-0.5 rounded-full`,style:{background:i.bg,color:i.color},children:i.label})})]},t.id)})})]})})]})}function J({shipments:r}){let i=`py-1.5 px-2 text-xs border-b border-slate-100`,a=r.filter(e=>e.status!==`completed`).sort((e,t)=>new Date(e.shipDate)-new Date(t.shipDate)),o=e=>e.shipDate?Math.ceil((new Date(e.shipDate)-new Date)/864e5):null;return(0,E.jsxs)(`div`,{className:`space-y-4`,children:[(0,E.jsx)(`div`,{className:`grid grid-cols-4 gap-3`,children:[{label:`Total Orders`,value:r.length,color:`#2563eb`},{label:`Upcoming`,value:a.length,color:`#d97706`},{label:`Critical ≤7d`,value:a.filter(e=>(o(e)||999)<=7).length,color:`#dc2626`},{label:`Shipped`,value:r.filter(e=>e.status===`completed`).length,color:`#16a34a`}].map(e=>(0,E.jsxs)(`div`,{className:`border border-slate-200 rounded-lg p-3 text-center`,children:[(0,E.jsx)(`p`,{className:`text-xs text-slate-400 font-medium`,children:e.label}),(0,E.jsx)(`p`,{className:`text-3xl font-bold mt-1`,style:{color:e.color},children:e.value})]},e.label))}),(0,E.jsx)(`div`,{className:`border border-slate-200 rounded-lg overflow-hidden`,children:(0,E.jsxs)(`table`,{className:`w-full`,children:[(0,E.jsx)(`thead`,{children:(0,E.jsx)(`tr`,{children:[`Order`,`Customer`,`Style`,`Qty`,`Completion`,`Ex-Factory`,`Days Left`,`Milestones`,`Status`].map(e=>(0,E.jsx)(`th`,{className:`text-left py-1.5 px-2 text-xs font-semibold text-slate-500 uppercase bg-slate-50 whitespace-nowrap`,children:e},e))})}),(0,E.jsx)(`tbody`,{children:a.map(r=>{let a=L[r.status]||L.pending,s=o(r),c=r.completionDate&&r.shipDate?S(r.completionDate,r.shipDate):null;return(0,E.jsxs)(`tr`,{children:[(0,E.jsx)(`td`,{className:`py-1.5 px-2 text-xs border-b border-slate-100 font-semibold`,children:r.orderNo}),(0,E.jsx)(`td`,{className:i,children:r.buyer}),(0,E.jsx)(`td`,{className:`py-1.5 px-2 text-xs border-b border-slate-100 text-slate-500`,children:r.style}),(0,E.jsx)(`td`,{className:i,children:r.totalQty?.toLocaleString()}),(0,E.jsxs)(`td`,{className:i,children:[r.completionDate?e(new Date(r.completionDate),`dd MMM`):`—`,c!==null&&c<0&&(0,E.jsx)(`span`,{className:`ml-1 text-red-500 text-xs`,children:`⚠`})]}),(0,E.jsx)(`td`,{className:i,children:(0,E.jsx)(`span`,{className:s!==null&&s<0?`text-red-600 font-bold`:s!==null&&s<=7?`text-amber-600 font-medium`:``,children:r.shipDate?e(new Date(r.shipDate),`dd MMM yy`):`—`})}),(0,E.jsx)(`td`,{className:i,children:(0,E.jsx)(`span`,{className:`font-semibold ${s===null?`text-slate-400`:s<0?`text-red-600`:s<=7?`text-amber-600`:`text-slate-600`}`,children:s===null?`—`:s<0?`${Math.abs(s)}d late`:`${s}d`})}),(0,E.jsx)(`td`,{className:i,children:(0,E.jsx)(`div`,{className:`flex items-center gap-0.5 flex-wrap`,children:(r.milestones||[]).map((r,i)=>(0,E.jsx)(`span`,{title:r.name+(r.date?` · `+e(new Date(r.date),`dd MMM`):``),className:`text-xs ${r.done?`text-green-600`:r.date&&new Date(r.date)<new Date?`text-red-500`:`text-slate-300`}`,children:r.done?(0,E.jsx)(t,{className:`w-3.5 h-3.5 inline`}):(0,E.jsx)(n,{className:`w-3.5 h-3.5 inline`})},i))})}),(0,E.jsx)(`td`,{className:i,children:(0,E.jsx)(`span`,{className:`text-xs font-semibold px-1.5 py-0.5 rounded-full`,style:{background:a.bg,color:a.color},children:a.label})})]},r.id)})})]})})]})}function Y({orders:t,lineAllocations:n,orderProgress:r}){let i=`py-1.5 px-2 text-xs border-b border-slate-100`,a={};return n.forEach(e=>{a[e.linePairNo]||(a[e.linePairNo]=[]),a[e.linePairNo].push(e)}),(0,E.jsxs)(`div`,{className:`space-y-4`,children:[(0,E.jsx)(`div`,{className:`grid grid-cols-3 gap-3`,children:[{label:`Active Orders`,value:t.filter(e=>[`active`,`pending`].includes(e.status)).length,color:`#2563eb`},{label:`Lines Allocated`,value:Object.keys(a).length,color:`#7c3aed`},{label:`Total Allocations`,value:n.length,color:`#16a34a`}].map(e=>(0,E.jsxs)(`div`,{className:`border border-slate-200 rounded-lg p-3 text-center`,children:[(0,E.jsx)(`p`,{className:`text-xs text-slate-400 font-medium`,children:e.label}),(0,E.jsx)(`p`,{className:`text-3xl font-bold mt-1`,style:{color:e.color},children:e.value})]},e.label))}),(0,E.jsx)(`div`,{className:`border border-slate-200 rounded-lg overflow-hidden`,children:(0,E.jsxs)(`table`,{className:`w-full`,children:[(0,E.jsx)(`thead`,{children:(0,E.jsx)(`tr`,{children:[`Line Pair`,`Order`,`Customer`,`Start`,`End`,`Alloc Qty`,`Target/Day`,`Progress`,`Status`].map(e=>(0,E.jsx)(`th`,{className:`text-left py-1.5 px-2 text-xs font-semibold text-slate-500 uppercase bg-slate-50 whitespace-nowrap`,children:e},e))})}),(0,E.jsx)(`tbody`,{children:Object.entries(a).sort((e,t)=>Number(e[0])-Number(t[0])).flatMap(([n,a])=>a.map((o,s)=>{let c=t.find(e=>e.id===o.orderId),l=c&&r[c.id]||0,u=o.allocatedQty>0?Math.min(100,Math.round(l/o.allocatedQty*100)):0,d=c?L[c.status]:null;return(0,E.jsxs)(`tr`,{children:[s===0&&(0,E.jsxs)(`td`,{className:`py-1.5 px-2 text-xs border-b border-slate-100 font-bold text-center`,rowSpan:a.length,style:{background:`#f8fafc`},children:[`LP-`,String(n).padStart(2,`0`),(0,E.jsxs)(`div`,{className:`text-slate-400 font-normal text-xs`,children:[`C`,String(n).padStart(2,`0`),`/A`,String(n).padStart(2,`0`)]})]}),(0,E.jsx)(`td`,{className:`py-1.5 px-2 text-xs border-b border-slate-100 font-semibold`,children:c?.orderNo||`—`}),(0,E.jsx)(`td`,{className:i,children:c?.buyer||`—`}),(0,E.jsx)(`td`,{className:i,children:o.startDate?e(new Date(o.startDate),`dd MMM`):`—`}),(0,E.jsx)(`td`,{className:i,children:o.endDate?e(new Date(o.endDate),`dd MMM`):`—`}),(0,E.jsx)(`td`,{className:`py-1.5 px-2 text-xs border-b border-slate-100 text-right font-medium`,children:o.allocatedQty?.toLocaleString()}),(0,E.jsx)(`td`,{className:`py-1.5 px-2 text-xs border-b border-slate-100 text-right`,children:o.targetDailyPcs?.toLocaleString()}),(0,E.jsxs)(`td`,{className:`py-1.5 px-2 text-xs border-b border-slate-100 min-w-[90px]`,children:[(0,E.jsx)(C,{value:u,className:`h-1.5 mb-0.5`}),(0,E.jsxs)(`span`,{className:`font-semibold`,style:{color:P(u)},children:[u,`% · `,l.toLocaleString(),` pcs`]})]}),(0,E.jsx)(`td`,{className:i,children:d&&(0,E.jsx)(`span`,{className:`text-xs font-semibold px-1.5 py-0.5 rounded-full`,style:{background:d.bg,color:d.color},children:d.label})})]},o.id)}))})]})})]})}function X(){let{orders:t,shipments:n,lineAllocations:s}=g(),[c,l]=(0,T.useState)(`daily-output`),[u,f]=(0,T.useState)(e(new Date,`yyyy-MM-dd`)),[p,h]=(0,T.useState)(!1),[S,C]=(0,T.useState)({}),[w,D]=(0,T.useState)({sectionOutput:[],sectionHeadcount:[],lineData:[]}),[O,k]=(0,T.useState)(!1),A=G.find(e=>e.id===c),j=(0,T.useCallback)(async e=>{h(!0);try{let[t,n,r,i]=await Promise.all([a(e).catch(()=>[]),_(e).catch(()=>[]),d(e).catch(()=>[]),o().catch(()=>({}))]);D({sectionOutput:t,sectionHeadcount:n,lineData:r}),C(i),k(!0)}finally{h(!1)}},[]);(0,T.useState)(()=>{j(u)});let M=e=>{f(e),k(!1),j(e)};return(0,E.jsxs)(`div`,{className:`space-y-5`,children:[(0,E.jsx)(`div`,{className:`grid grid-cols-2 lg:grid-cols-4 gap-3`,children:G.map(e=>{let t=e.icon,n=c===e.id;return(0,E.jsxs)(`button`,{onClick:()=>l(e.id),className:`text-left p-4 rounded-xl border-2 transition-all ${n?`border-blue-500 bg-blue-50`:`border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50`}`,children:[(0,E.jsx)(t,{className:`w-5 h-5 mb-2 ${n?`text-blue-600`:`text-slate-400`}`}),(0,E.jsx)(`p`,{className:`text-sm font-semibold ${n?`text-blue-700`:`text-slate-700`}`,children:e.label}),(0,E.jsx)(`p`,{className:`text-xs text-slate-400 mt-0.5 leading-tight`,children:e.desc})]},e.id)})}),(0,E.jsxs)(`div`,{className:`flex flex-wrap items-center gap-3`,children:[(0,E.jsxs)(`div`,{className:`flex items-center gap-2 text-sm font-semibold text-slate-700`,children:[(0,E.jsx)(A.icon,{className:`w-4 h-4 text-blue-600`}),A.label]}),A.needsDate&&(0,E.jsxs)(`div`,{className:`flex items-center gap-2`,children:[(0,E.jsx)(`label`,{className:`text-sm text-slate-500`,children:`Date:`}),(0,E.jsx)(`input`,{type:`date`,value:u,onChange:e=>M(e.target.value),className:`border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500`})]}),(0,E.jsxs)(`div`,{className:`ml-auto flex items-center gap-2`,children:[p&&(0,E.jsx)(r,{className:`w-4 h-4 animate-spin text-slate-400`}),(0,E.jsxs)(m,{onClick:()=>{let e=``;c===`daily-output`?e=V(u,w.sectionOutput,w.sectionHeadcount,w.lineData,t):c===`master-plan`?e=H(t,S):c===`shipment`?e=U(n):c===`capacity`&&(e=W(t,s,S)),e&&B(e)},disabled:p,className:`bg-blue-600 hover:bg-blue-700 text-white gap-2`,children:[(0,E.jsx)(i,{className:`w-4 h-4`}),`Print / Export PDF`]})]})]}),(0,E.jsxs)(x,{children:[(0,E.jsxs)(b,{className:`pb-2 flex-row items-center justify-between`,children:[(0,E.jsxs)(v,{className:`text-sm text-slate-600`,children:[`Preview — `,A.label]}),(0,E.jsx)(`p`,{className:`text-xs text-slate-400`,children:`Click "Print / Export PDF" to open print dialog → Save as PDF`})]}),(0,E.jsx)(y,{className:`pt-2`,children:p?(0,E.jsxs)(`div`,{className:`flex items-center justify-center py-20 text-slate-400`,children:[(0,E.jsx)(r,{className:`w-6 h-6 animate-spin mr-2`}),`Loading data…`]}):c===`daily-output`?(0,E.jsx)(K,{date:u,...w,orders:t}):c===`master-plan`?(0,E.jsx)(q,{orders:t,orderProgress:S}):c===`shipment`?(0,E.jsx)(J,{shipments:n}):c===`capacity`?(0,E.jsx)(Y,{orders:t,lineAllocations:s,orderProgress:S}):null})]})]})}export{X as default};