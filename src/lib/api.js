import { supabase } from './supabase'

// ── Helpers ───────────────────────────────────────────────────────────────────
const d = (v) => (v instanceof Date ? v.toISOString().split('T')[0] : v || null)

const minDate = (dates) => {
  const valid = dates.filter(Boolean).map(x => new Date(x))
  return valid.length ? new Date(Math.min(...valid.map(dt => dt.getTime()))) : null
}
const maxDate = (dates) => {
  const valid = dates.filter(Boolean).map(x => new Date(x))
  return valid.length ? new Date(Math.max(...valid.map(dt => dt.getTime()))) : null
}

// ── Portion transformers ──────────────────────────────────────────────────────
function toPortion(p) {
  return {
    id: p.id,
    orderId: p.order_id,
    portionName: p.portion_name,
    portionQty: p.portion_qty || 0,
    sortOrder: p.sort_order || 1,
    status: p.status || 'pending',
    notes: p.notes || '',
    materialArrivalDate: p.date_material_arrival ? new Date(p.date_material_arrival) : null,
    cutStartDate:  p.date_cut_start   ? new Date(p.date_cut_start)   : null,
    embStartDate:  p.date_emb_start   ? new Date(p.date_emb_start)   : null,
    sewStartDate:  p.date_sew_start   ? new Date(p.date_sew_start)   : null,
    completionDate: p.date_completion ? new Date(p.date_completion)  : null,
    exfactoryDate: p.date_exfactory   ? new Date(p.date_exfactory)   : null,
  }
}

function fromPortion(p, orderId, sortOrder) {
  return {
    order_id:              orderId,
    portion_name:          p.portionName || 'Full order',
    portion_qty:           Number(p.portionQty) || 0,
    sort_order:            sortOrder !== undefined ? sortOrder : (p.sortOrder || 1),
    date_material_arrival: d(p.materialArrivalDate),
    date_cut_start:        d(p.cutStartDate),
    date_emb_start:        d(p.embStartDate),
    date_sew_start:        d(p.sewStartDate),
    date_completion:       d(p.completionDate),
    date_exfactory:        d(p.exfactoryDate),
    status:                p.status || 'pending',
    notes:                 p.notes || '',
  }
}

// ── Order transformers ────────────────────────────────────────────────────────
function toOrder(row) {
  const portionRows = row.order_portions
  const portions = portionRows
    ? [...portionRows].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)).map(toPortion)
    : []

  // Derive aggregate dates from portions (fall back to legacy order columns)
  const sewStarts   = portions.map(p => p.sewStartDate).filter(Boolean)
  const exfactories = portions.map(p => p.exfactoryDate).filter(Boolean)
  const completions = portions.map(p => p.completionDate).filter(Boolean)
  const matArrivals = portions.map(p => p.materialArrivalDate).filter(Boolean)
  const cutStarts   = portions.map(p => p.cutStartDate).filter(Boolean)
  const embStarts   = portions.map(p => p.embStartDate).filter(Boolean)

  const shipDate         = maxDate(exfactories)  || (row.ship_date             ? new Date(row.ship_date)             : null)
  const completionDate   = maxDate(completions)  || (row.completion_date       ? new Date(row.completion_date)       : null)
  const materialArrivalDate = minDate(matArrivals) || (row.material_arrival_date ? new Date(row.material_arrival_date) : null)
  const cutStartDate     = minDate(cutStarts)    || (row.cut_start_date        ? new Date(row.cut_start_date)        : null)
  const sewStartDate     = minDate(sewStarts)    || (row.sew_start_date        ? new Date(row.sew_start_date)        : null)
  const embStartDate     = minDate(embStarts)    || (row.emb_start_date        ? new Date(row.emb_start_date)        : null)

  return {
    id: row.id,
    orderNo: row.order_no,
    style: row.style,
    buyer: row.buyer,
    qty: row.qty,
    smv: parseFloat(row.smv),
    startDate: row.start_date ? new Date(row.start_date) : cutStartDate,
    endDate:   row.end_date   ? new Date(row.end_date)   : completionDate,
    shipDate,
    status: row.status,
    progress: row.progress,
    componentLine: row.component_line,
    assemblyLine:  row.assembly_line,
    requiresEmbroidery: row.requires_embroidery,
    color: row.color || '#3b82f6',
    notes: row.notes || '',
    season: row.season || '',
    // Derived dates (for backward compat)
    materialArrivalDate,
    cutStartDate,
    embStartDate,
    sewStartDate,
    completionDate,
    // Gantt span
    earliestSewStart: minDate(sewStarts) || sewStartDate,
    latestExfactory:  maxDate(exfactories) || shipDate,
    // Portions
    portions,
  }
}

function fromOrder(o) {
  const portions = o.portions || []
  const gMin = (fn) => minDate(portions.map(fn).filter(Boolean))
  const gMax = (fn) => maxDate(portions.map(fn).filter(Boolean))

  const shipDate       = gMax(p => p.exfactoryDate)       || o.shipDate
  const completionDate = gMax(p => p.completionDate)      || o.completionDate
  const cutStartDate   = gMin(p => p.cutStartDate)        || o.cutStartDate
  const sewStartDate   = gMin(p => p.sewStartDate)        || o.sewStartDate
  const matDate        = gMin(p => p.materialArrivalDate) || o.materialArrivalDate
  const embDate        = gMin(p => p.embStartDate)        || o.embStartDate

  return {
    order_no:              o.orderNo,
    style:                 o.style || null,
    buyer:                 o.buyer,
    qty:                   Number(o.qty) || 0,
    smv:                   Number(o.smv) || null,
    start_date:            d(o.startDate   || cutStartDate),
    end_date:              d(o.endDate     || completionDate),
    ship_date:             d(shipDate),
    status:                o.status || 'pending',
    progress:              Number(o.progress) || 0,
    component_line:        o.componentLine,
    assembly_line:         o.assemblyLine,
    requires_embroidery:   !!o.requiresEmbroidery,
    color:                 o.color || '#3b82f6',
    notes:                 o.notes || '',
    season:                o.season || '',
    // Legacy date columns (kept for backward compat, derived from portions)
    material_arrival_date: d(matDate),
    cut_start_date:        d(cutStartDate),
    emb_start_date:        o.requiresEmbroidery ? d(embDate) : null,
    sew_start_date:        d(sewStartDate),
    completion_date:       d(completionDate),
  }
}

// ── Orders ────────────────────────────────────────────────────────────────────
export async function fetchOrders() {
  const { data, error } = await supabase
    .from('orders')
    .select('*, order_portions(*)')
    .order('order_no')
  if (error) throw error
  return data.map(toOrder)
}

export async function fetchPortionsByOrder(orderId) {
  const { data, error } = await supabase
    .from('order_portions')
    .select('id, portion_name, portion_qty, sort_order, status, notes')
    .eq('order_id', orderId)
    .order('sort_order')
  if (error) throw error
  return (data || []).map(p => ({
    id: p.id,
    portionName: p.portion_name,
    portionQty: p.portion_qty || 0,
    sortOrder: p.sort_order || 1,
    status: p.status || 'pending',
    notes: p.notes || '',
  }))
}

async function createPortionsForOrder(orderId, portions) {
  const rows = portions.map((p, i) => fromPortion(p, orderId, i + 1))
  const { data, error } = await supabase.from('order_portions').insert(rows).select()
  if (error) throw error
  return (data || []).map(toPortion)
}

async function syncPortions(orderId, portions, requiresEmbroidery) {
  const { data: existing } = await supabase
    .from('order_portions').select('id').eq('order_id', orderId)
  const existingIds = new Set((existing || []).map(p => p.id))
  const keepIds = new Set(portions.filter(p => p.id).map(p => p.id))

  // Delete removed portions (cascade deletes their milestones)
  const toDelete = [...existingIds].filter(id => !keepIds.has(id))
  if (toDelete.length) {
    await supabase.from('order_portions').delete().in('id', toDelete)
  }

  for (let i = 0; i < portions.length; i++) {
    const p = portions[i]
    const pData = fromPortion(p, orderId, i + 1)
    if (p.id) {
      await supabase.from('order_portions').update(pData).eq('id', p.id)
    } else {
      const { data } = await supabase.from('order_portions').insert(pData).select().single()
      if (data) {
        await createMilestonesForPortion(data.id, orderId, toPortion(data), requiresEmbroidery)
      }
    }
  }
}

export async function createOrder(order) {
  const dbRow = fromOrder(order)
  const { data, error } = await supabase.from('orders').insert(dbRow).select().single()
  if (error) throw error
  const saved = toOrder(data)

  // Use provided portions or create default "Full order" portion
  const portions = (order.portions && order.portions.length > 0)
    ? order.portions
    : [{
        portionName:          'Full order',
        portionQty:           order.qty || 0,
        materialArrivalDate:  order.materialArrivalDate,
        cutStartDate:         order.cutStartDate,
        embStartDate:         order.embStartDate,
        sewStartDate:         order.sewStartDate,
        completionDate:       order.completionDate,
        exfactoryDate:        order.shipDate,
        notes: '', status: 'pending',
      }]

  const createdPortions = await createPortionsForOrder(saved.id, portions)
  for (const p of createdPortions) {
    await createMilestonesForPortion(p.id, saved.id, p, order.requiresEmbroidery)
  }

  return { ...saved, portions: createdPortions }
}

export async function updateOrder(id, updates) {
  const dbRow = fromOrder(updates)
  const { data, error } = await supabase.from('orders').update(dbRow).eq('id', id).select().single()
  if (error) throw error

  if (updates.portions !== undefined) {
    await syncPortions(id, updates.portions, updates.requiresEmbroidery)
  }

  const { data: fullData, error: e2 } = await supabase
    .from('orders').select('*, order_portions(*)').eq('id', id).single()
  if (e2) throw e2
  return toOrder(fullData)
}

export async function deleteOrder(id) {
  const { error } = await supabase.from('orders').delete().eq('id', id)
  if (error) throw error
}

// Create milestones for a portion
async function createMilestonesForPortion(portionId, orderId, portion, requiresEmbroidery) {
  const milestones = [
    { name: 'Material Arrival', date: portion.materialArrivalDate, sort_order: 0 },
    { name: 'Cut Start',        date: portion.cutStartDate,        sort_order: 1 },
    requiresEmbroidery ? { name: 'Embroidery Start', date: portion.embStartDate, sort_order: 2 } : null,
    { name: 'Sew Start',        date: portion.sewStartDate,        sort_order: 3 },
    { name: 'Completion',       date: portion.completionDate,      sort_order: 4 },
    { name: 'Ex-Factory',       date: portion.exfactoryDate,       sort_order: 5 },
  ].filter(Boolean)

  const rows = milestones.filter(m => m.date).map(m => ({
    order_id:       orderId,
    portion_id:     portionId,
    name:           m.name,
    milestone_date: d(m.date),
    done:           false,
    status:         'pending',
    sort_order:     m.sort_order,
  }))

  if (rows.length) {
    const { error } = await supabase.from('shipment_milestones').insert(rows)
    if (error) console.warn('milestone insert:', error.message)
  }
}

// ── Line Allocations ──────────────────────────────────────────────────────────
export async function fetchLineAllocations() {
  const { data, error } = await supabase
    .from('line_allocations')
    .select(`
      *,
      orders(id, order_no, buyer, style, smv, color, requires_embroidery, qty),
      order_portions(id, portion_name, portion_qty)
    `)
    .order('start_date')
  if (error) throw error
  return data.map(row => ({
    id:             row.id,
    orderId:        row.order_id,
    portionId:      row.portion_id || null,
    linePairNo:     row.line_pair_no,
    startDate:      new Date(row.start_date),
    endDate:        new Date(row.end_date),
    allocatedQty:   row.allocated_qty,
    targetDailyPcs: row.target_daily_pcs,
    notes:          row.notes || '',
    order:          row.orders ? toOrder({ ...row.orders, order_portions: [] }) : null,
    orderNo:        row.orders?.order_no || '',
    color:          row.orders?.color   || '#3b82f6',
    smv:            row.orders?.smv     || 0,
    portionName:    row.order_portions?.portion_name || null,
    portionQty:     row.order_portions?.portion_qty  || null,
  }))
}

export async function createLineAllocation(alloc) {
  const { data, error } = await supabase.from('line_allocations').insert({
    order_id:         alloc.orderId,
    portion_id:       alloc.portionId || null,
    line_pair_no:     Number(alloc.linePairNo),
    start_date:       d(alloc.startDate),
    end_date:         d(alloc.endDate),
    allocated_qty:    Number(alloc.allocatedQty),
    target_daily_pcs: Number(alloc.targetDailyPcs),
    notes:            alloc.notes || '',
  })
  .select(`*, orders(id, order_no, buyer, style, smv, color, qty), order_portions(id, portion_name, portion_qty)`)
  .single()
  if (error) throw error
  return {
    id: data.id, orderId: data.order_id, portionId: data.portion_id || null,
    linePairNo: data.line_pair_no,
    startDate: new Date(data.start_date), endDate: new Date(data.end_date),
    allocatedQty: data.allocated_qty, targetDailyPcs: data.target_daily_pcs,
    notes: data.notes,
    order: data.orders ? toOrder({ ...data.orders, order_portions: [] }) : null,
    orderNo: data.orders?.order_no || '', color: data.orders?.color || '#3b82f6',
    portionName: data.order_portions?.portion_name || null,
    portionQty:  data.order_portions?.portion_qty  || null,
  }
}

export async function deleteLineAllocation(id) {
  const { error } = await supabase.from('line_allocations').delete().eq('id', id)
  if (error) throw error
}

export async function updateLineAllocation(id, updates) {
  const payload = {}
  if (updates.startDate      !== undefined) payload.start_date        = d(updates.startDate)
  if (updates.endDate        !== undefined) payload.end_date          = d(updates.endDate)
  if (updates.allocatedQty   !== undefined) payload.allocated_qty     = Number(updates.allocatedQty)
  if (updates.targetDailyPcs !== undefined) payload.target_daily_pcs  = Number(updates.targetDailyPcs)
  if (updates.notes          !== undefined) payload.notes             = updates.notes
  if (updates.portionId      !== undefined) payload.portion_id        = updates.portionId || null
  const { data, error } = await supabase
    .from('line_allocations').update(payload).eq('id', id)
    .select(`*, orders(id, order_no, buyer, style, smv, color, qty), order_portions(id, portion_name, portion_qty)`)
    .single()
  if (error) throw error
  return {
    id: data.id, orderId: data.order_id, portionId: data.portion_id || null,
    linePairNo: data.line_pair_no,
    startDate: new Date(data.start_date), endDate: new Date(data.end_date),
    allocatedQty: data.allocated_qty, targetDailyPcs: data.target_daily_pcs,
    notes: data.notes || '',
    order: data.orders ? toOrder({ ...data.orders, order_portions: [] }) : null,
    orderNo: data.orders?.order_no || '', color: data.orders?.color || '#3b82f6',
    portionName: data.order_portions?.portion_name || null,
    portionQty:  data.order_portions?.portion_qty  || null,
  }
}

// ── Section Output ────────────────────────────────────────────────────────────
export async function fetchSectionOutputRows() {
  const { data, error } = await supabase
    .from('section_output')
    .select(`*, orders(id, order_no, buyer, requires_embroidery)`)
    .order('period_date', { ascending: false })
  if (error) throw error
  return data.map(row => ({
    id: row.id,
    section: row.section,
    periodType: row.period_type,
    periodDate: row.period_date ? new Date(row.period_date) : null,
    periodLabel: row.period_label,
    orderId: row.order_id,
    orderNo: row.orders?.order_no || '',
    target: row.target,
    actual: row.actual,
    efficiency: row.efficiency,
    wipReceived: row.wip_received || 0,
    wipPassedOut: row.wip_passed_out || 0,
    remarks: row.remarks || '',
  }))
}

export async function createSectionOutputEntry(entry) {
  const efficiency = entry.target > 0 ? Math.round((entry.actual / entry.target) * 100) : 0
  const { data, error } = await supabase.from('section_output').insert({
    section: entry.section,
    period_type: 'daily',
    period_label: d(entry.date),
    period_date: d(entry.date),
    order_id: entry.orderId || null,
    target: Number(entry.target),
    actual: Number(entry.actual),
    efficiency,
    wip_received: Number(entry.wipReceived) || 0,
    wip_passed_out: Number(entry.wipPassedOut) || 0,
    remarks: entry.remarks || '',
  }).select().single()
  if (error) throw error
  return data
}

export async function deleteSectionOutputEntry(id) {
  const { error } = await supabase.from('section_output').delete().eq('id', id)
  if (error) throw error
}

// ── Shipment Milestones ───────────────────────────────────────────────────────
export async function fetchShipments() {
  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      order_portions(
        id, portion_name, portion_qty, sort_order, status, notes,
        date_material_arrival, date_cut_start, date_emb_start,
        date_sew_start, date_completion, date_exfactory
      ),
      shipment_milestones(
        id, name, milestone_date, actual_date, done, status,
        qty_shipped, remarks, sort_order, portion_id
      )
    `)
    .order('ship_date')
  if (error) throw error

  return data.map(row => {
    const portions = [...(row.order_portions || [])]
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
    const allMilestones = row.shipment_milestones || []

    const mapMs = m => ({
      id: m.id,
      name: m.name,
      date: m.milestone_date ? new Date(m.milestone_date) : null,
      actualDate: m.actual_date ? new Date(m.actual_date) : null,
      done: m.done,
      status: m.status || 'pending',
      qtyShipped: m.qty_shipped || 0,
      remarks: m.remarks || '',
    })

    const portionsWithMs = portions.map(p => ({
      ...toPortion(p),
      milestones: allMilestones
        .filter(m => m.portion_id === p.id)
        .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
        .map(mapMs),
    }))

    // Legacy milestones (no portion_id) → attach to first portion
    const legacyMs = allMilestones
      .filter(m => !m.portion_id)
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
      .map(mapMs)

    if (legacyMs.length > 0 && portionsWithMs.length > 0) {
      portionsWithMs[0].milestones = [...legacyMs, ...portionsWithMs[0].milestones]
    }

    // Pre-migration fallback: no portions at all
    if (portionsWithMs.length === 0 && legacyMs.length > 0) {
      portionsWithMs.push({
        id: null,
        orderId: row.id,
        portionName: 'Full order',
        portionQty: row.qty,
        sortOrder: 1,
        status: 'pending',
        notes: '',
        materialArrivalDate: row.material_arrival_date ? new Date(row.material_arrival_date) : null,
        cutStartDate: row.cut_start_date ? new Date(row.cut_start_date) : null,
        embStartDate: row.emb_start_date ? new Date(row.emb_start_date) : null,
        sewStartDate: row.sew_start_date ? new Date(row.sew_start_date) : null,
        completionDate: row.completion_date ? new Date(row.completion_date) : null,
        exfactoryDate: row.ship_date ? new Date(row.ship_date) : null,
        milestones: legacyMs,
      })
    }

    const shippedQty = portionsWithMs.reduce((sum, p) => {
      const ef = p.milestones.find(m => m.name === 'Ex-Factory')
      return sum + (ef?.qtyShipped || 0)
    }, 0)

    const order = toOrder(row)

    return {
      ...order,
      portions: portionsWithMs,
      totalQty: row.qty,
      shippedQty,
      milestones: portionsWithMs.flatMap(p => p.milestones), // backward compat flat list
    }
  })
}

export async function updateMilestoneRecord(id, updates) {
  const payload = {}
  if (updates.actualDate  !== undefined) payload.actual_date  = d(updates.actualDate)
  if (updates.done        !== undefined) payload.done         = updates.done
  if (updates.status      !== undefined) payload.status       = updates.status
  if (updates.qtyShipped  !== undefined) payload.qty_shipped  = Number(updates.qtyShipped)
  if (updates.remarks     !== undefined) payload.remarks      = updates.remarks
  const { error } = await supabase.from('shipment_milestones').update(payload).eq('id', id)
  if (error) throw error
}

// ── Daily Line Output ─────────────────────────────────────────────────────────
export async function fetchDailyLineOutput() {
  const { data, error } = await supabase
    .from('daily_line_output')
    .select(`*, orders(id, order_no, buyer, color)`)
    .order('date', { ascending: false })
    .limit(200)
  if (error) throw error
  return data.map(row => ({
    id: row.id,
    date: new Date(row.date),
    linePairNo: row.line_pair_no,
    orderId: row.order_id,
    orderNo: row.orders?.order_no || '',
    buyer: row.orders?.buyer || '',
    color: row.orders?.color || '#3b82f6',
    targetPcs: row.target_pcs,
    actualPcs: row.actual_pcs,
    efficiency: row.target_pcs > 0 ? Math.round((row.actual_pcs / row.target_pcs) * 100) : 0,
    workersPresent: row.workers_present || 0,
    downtimeHours: row.downtime_hours || 0,
    downtimeReason: row.downtime_reason || '',
    remarks: row.remarks || '',
  }))
}

export async function createDailyLineOutput(entry) {
  const { data, error } = await supabase.from('daily_line_output').insert({
    date: d(entry.date),
    line_pair_no: Number(entry.linePairNo),
    order_id: entry.orderId || null,
    target_pcs: Number(entry.targetPcs),
    actual_pcs: Number(entry.actualPcs),
    workers_present: Number(entry.workersPresent) || 0,
    downtime_hours: Number(entry.downtimeHours) || 0,
    downtime_reason: entry.downtimeReason || '',
    remarks: entry.remarks || '',
  }).select().single()
  if (error) throw error
  return data
}

export async function deleteDailyLineOutput(id) {
  const { error } = await supabase.from('daily_line_output').delete().eq('id', id)
  if (error) throw error
}

export async function updateDailyLineOutput(id, entry) {
  const { error } = await supabase.from('daily_line_output').update({
    target_pcs: Number(entry.targetPcs),
    actual_pcs: Number(entry.actualPcs),
    workers_present: Number(entry.workersPresent) || 0,
    downtime_hours: Number(entry.downtimeHours) || 0,
    downtime_reason: entry.downtimeReason || '',
    remarks: entry.remarks || '',
  }).eq('id', id)
  if (error) throw error
}

export async function updateSectionOutputEntry(id, entry) {
  const efficiency = entry.targetPcs > 0 ? Math.round((entry.actualPcs / entry.targetPcs) * 100) : 0
  const { error } = await supabase.from('section_output').update({
    target: Number(entry.targetPcs),
    actual: Number(entry.actualPcs),
    efficiency,
    wip_received: Number(entry.wipReceived) || 0,
    wip_passed_out: Number(entry.wipPassedOut) || 0,
    remarks: entry.remarks || '',
  }).eq('id', id)
  if (error) throw error
}

// ── Import helpers ─────────────────────────────────────────────────────────────

export async function fetchExistingOrderNos(nos) {
  if (!nos.length) return []
  const { data, error } = await supabase.from('orders').select('id, order_no').in('order_no', nos)
  if (error) throw error
  return data
}

export async function fetchOrderNoMap() {
  const { data, error } = await supabase.from('orders').select('id, order_no')
  if (error) throw error
  return Object.fromEntries(data.map(r => [r.order_no, r.id]))
}

export async function fetchExistingDailyOutput(dates) {
  if (!dates.length) return []
  const { data, error } = await supabase
    .from('daily_line_output')
    .select('id, date, line_pair_no, order_id')
    .in('date', dates)
  if (error) throw error
  return data
}

export async function fetchExistingSectionOutput(dates) {
  if (!dates.length) return []
  const { data, error } = await supabase
    .from('section_output')
    .select('id, period_date, section, order_id')
    .in('period_date', dates)
  if (error) throw error
  return data
}

// ── Section Output page — date-scoped queries ─────────────────────────────────

export async function fetchSectionOutputByDate(dateStr) {
  const { data, error } = await supabase
    .from('section_output')
    .select('*, orders(id, order_no, buyer, style, smv, qty, completion_date)')
    .eq('period_date', dateStr)
  if (error) throw error
  return data.map(row => ({
    id: row.id,
    section: row.section,
    orderId: row.order_id,
    orderNo: row.orders?.order_no || '',
    style: row.orders?.style || '',
    buyer: row.orders?.buyer || '',
    target: row.target || 0,
    actual: row.actual || 0,
    efficiency: row.efficiency || 0,
    wipReceived: row.wip_received || 0,
    wipPassedOut: row.wip_passed_out || 0,
    remarks: row.remarks || '',
  }))
}

export async function fetchSectionHeadcountByDate(dateStr) {
  const { data, error } = await supabase
    .from('section_headcount')
    .select('*')
    .eq('output_date', dateStr)
  if (error) throw error
  return data.map(row => ({
    id: row.id,
    section: row.section,
    headcount: row.headcount || 0,
    workingHours: row.working_hours || null,
    efficiencyPct: row.efficiency_pct || null,
  }))
}

export async function fetchDailyLineOutputByDate(dateStr) {
  const { data, error } = await supabase
    .from('daily_line_output')
    .select('*, orders(id, order_no, buyer, style, smv, qty, completion_date)')
    .eq('date', dateStr)
  if (error) throw error
  return data
    .filter(row => row.line_name)
    .map(row => ({
      id: row.id,
      date: dateStr,
      lineName: row.line_name,
      linePairNo: row.line_pair_no,
      orderId: row.order_id,
      orderNo: row.orders?.order_no || '',
      style: row.orders?.style || '',
      buyer: row.orders?.buyer || '',
      smv: parseFloat(row.orders?.smv) || 0,
      orderQty: row.orders?.qty || 0,
      targetPcs: row.target_pcs || 0,
      actualPcs: row.actual_pcs || 0,
      workersPresent: row.workers_present || 0,
      workingHours: row.working_hours || null,
      efficiencyPct: row.efficiency_pct !== null && row.efficiency_pct !== undefined
        ? row.efficiency_pct
        : (row.target_pcs > 0 ? Math.round(row.actual_pcs / row.target_pcs * 100) : 0),
      downtimeHours: row.downtime_hours || 0,
      downtimeReason: row.downtime_reason || '',
      wipReceived: row.wip_received || 0,
      wipPassedOut: row.wip_passed_out || 0,
      remarks: row.remarks || '',
    }))
}

export async function fetchOrderProgressAll() {
  const { data, error } = await supabase
    .from('daily_line_output')
    .select('order_id, actual_pcs')
  if (error) throw error
  const progress = {}
  data.forEach(row => {
    if (!row.order_id) return
    progress[row.order_id] = (progress[row.order_id] || 0) + (row.actual_pcs || 0)
  })
  return progress
}

export async function fetchLineCumulativeByOrder() {
  const { data, error } = await supabase
    .from('daily_line_output')
    .select('order_id, line_name, actual_pcs')
  if (error) throw error
  const result = {}
  data.forEach(row => {
    if (!row.order_id || !row.line_name) return
    const key = `${row.line_name}_${row.order_id}`
    result[key] = (result[key] || 0) + (row.actual_pcs || 0)
  })
  return result
}

// ── Clear All Data ─────────────────────────────────────────────────────────────
export async function clearAllData() {
  const tables = [
    'visit_itinerary',
    'visit_visitors',
    'customer_visits',
    'section_headcount',
    'section_output',
    'daily_line_output',
    'shipment_milestones',
    'line_allocations',
    'order_portions',
    'orders',
  ]
  for (const table of tables) {
    const { error } = await supabase.from(table).delete().not('id', 'is', null)
    if (error) throw new Error(`Failed to clear ${table}: ${error.message}`)
  }
}

// ── Upsert helpers ─────────────────────────────────────────────────────────────

export async function upsertSectionOutputEntry(entry) {
  const efficiency = entry.target > 0 ? Math.round((entry.actual / entry.target) * 100) : 0
  const payload = {
    period_date: entry.date, period_type: 'daily', period_label: entry.date,
    section: entry.section, order_id: entry.orderId || null,
    target: Number(entry.target) || 0, actual: Number(entry.actual) || 0, efficiency,
    wip_received: Number(entry.wipReceived) || 0,
    wip_passed_out: Number(entry.wipPassedOut) || 0,
    remarks: entry.remarks || '',
  }
  const { error } = await supabase.from('section_output').insert(payload)
  if (error) {
    if (error.code === '23505') {
      let q = supabase.from('section_output').update({
        target: payload.target, actual: payload.actual, efficiency,
        wip_received: payload.wip_received, wip_passed_out: payload.wip_passed_out,
        remarks: payload.remarks,
      }).eq('period_date', entry.date).eq('section', entry.section)
      q = entry.orderId ? q.eq('order_id', entry.orderId) : q.is('order_id', null)
      const { error: e2 } = await q
      if (e2) throw e2
    } else throw error
  }
}

export async function upsertSectionHeadcountEntry(entry) {
  const { error } = await supabase.from('section_headcount').upsert({
    output_date: entry.date,
    section: entry.section,
    headcount: Number(entry.headcount) || 0,
    working_hours: Number(entry.workingHours) || null,
    efficiency_pct: Number(entry.efficiencyPct) || null,
  }, { onConflict: 'output_date,section' })
  if (error) throw error
}

export async function upsertLineOutputEntry(entry) {
  const linePairNo = entry.lineName ? parseInt(entry.lineName.split('-')[1]) : null
  const payload = {
    date: entry.date, line_name: entry.lineName, line_pair_no: linePairNo,
    order_id: entry.orderId || null,
    target_pcs: Number(entry.targetPcs) || 0,
    actual_pcs: Number(entry.actualPcs) || 0,
    workers_present: Number(entry.workersPresent) || 0,
    working_hours: Number(entry.workingHours) || null,
    efficiency_pct: Number(entry.efficiencyPct) || null,
    downtime_hours: Number(entry.downtimeHours) || 0,
    downtime_reason: entry.downtimeReason || '',
    wip_received: Number(entry.wipReceived) || 0,
    wip_passed_out: Number(entry.wipPassedOut) || 0,
    remarks: entry.remarks || '',
  }
  const { error } = await supabase.from('daily_line_output').insert(payload)
  if (error) {
    if (error.code === '23505') {
      let q = supabase.from('daily_line_output').update({
        target_pcs: payload.target_pcs, actual_pcs: payload.actual_pcs,
        workers_present: payload.workers_present, working_hours: payload.working_hours,
        efficiency_pct: payload.efficiency_pct, downtime_hours: payload.downtime_hours,
        downtime_reason: payload.downtime_reason, wip_received: payload.wip_received,
        wip_passed_out: payload.wip_passed_out, remarks: payload.remarks,
      }).eq('date', entry.date).eq('line_name', entry.lineName)
      q = entry.orderId ? q.eq('order_id', entry.orderId) : q.is('order_id', null)
      const { error: e2 } = await q
      if (e2) throw e2
    } else throw error
  }
}
