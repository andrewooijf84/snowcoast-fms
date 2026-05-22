import { supabase } from './supabase'

// ── Helpers ───────────────────────────────────────────────────────────────────
const d = (v) => (v instanceof Date ? v.toISOString().split('T')[0] : v || null)

// ── Order transformers ────────────────────────────────────────────────────────
function toOrder(row) {
  return {
    id: row.id,
    orderNo: row.order_no,
    style: row.style,
    buyer: row.buyer,
    qty: row.qty,
    smv: parseFloat(row.smv),
    startDate: row.start_date ? new Date(row.start_date) : null,
    endDate: row.end_date ? new Date(row.end_date) : null,
    shipDate: row.ship_date ? new Date(row.ship_date) : null,
    status: row.status,
    progress: row.progress,
    componentLine: row.component_line,
    assemblyLine: row.assembly_line,
    requiresEmbroidery: row.requires_embroidery,
    color: row.color || '#3b82f6',
    notes: row.notes || '',
    season: row.season || '',
    materialArrivalDate: row.material_arrival_date ? new Date(row.material_arrival_date) : null,
    cutStartDate: row.cut_start_date ? new Date(row.cut_start_date) : null,
    embStartDate: row.emb_start_date ? new Date(row.emb_start_date) : null,
    sewStartDate: row.sew_start_date ? new Date(row.sew_start_date) : null,
    completionDate: row.completion_date ? new Date(row.completion_date) : null,
  }
}

function fromOrder(o) {
  return {
    order_no: o.orderNo,
    style: o.style || null,
    buyer: o.buyer,
    qty: Number(o.qty) || 0,
    smv: Number(o.smv) || null,
    start_date: d(o.startDate || o.cutStartDate),
    end_date: d(o.endDate || o.completionDate),
    ship_date: d(o.shipDate),
    status: o.status || 'pending',
    progress: Number(o.progress) || 0,
    component_line: o.componentLine,
    assembly_line: o.assemblyLine,
    requires_embroidery: !!o.requiresEmbroidery,
    color: o.color || '#3b82f6',
    notes: o.notes || '',
    season: o.season || '',
    material_arrival_date: d(o.materialArrivalDate),
    cut_start_date: d(o.cutStartDate),
    emb_start_date: o.requiresEmbroidery ? d(o.embStartDate) : null,
    sew_start_date: d(o.sewStartDate),
    completion_date: d(o.completionDate),
  }
}

// ── Orders ────────────────────────────────────────────────────────────────────
export async function fetchOrders() {
  const { data, error } = await supabase.from('orders').select('*').order('ship_date')
  if (error) throw error
  return data.map(toOrder)
}

export async function createOrder(order) {
  const { data, error } = await supabase.from('orders').insert(fromOrder(order)).select().single()
  if (error) throw error
  const saved = toOrder(data)
  await createMilestonesForOrder(saved.id, order)
  return saved
}

export async function updateOrder(id, updates) {
  const current = { ...updates }
  const dbRow = fromOrder(current)
  const { data, error } = await supabase.from('orders').update(dbRow).eq('id', id).select().single()
  if (error) throw error
  return toOrder(data)
}

export async function deleteOrder(id) {
  const { error } = await supabase.from('orders').delete().eq('id', id)
  if (error) throw error
}

// Auto-create milestones when order is saved
async function createMilestonesForOrder(orderId, order) {
  const milestones = [
    { name: 'Material Arrival', date: order.materialArrivalDate, sort_order: 0 },
    { name: 'Cut Start', date: order.cutStartDate, sort_order: 1 },
    order.requiresEmbroidery ? { name: 'Embroidery Start', date: order.embStartDate, sort_order: 2 } : null,
    { name: 'Sew Start', date: order.sewStartDate, sort_order: 3 },
    { name: 'Completion', date: order.completionDate, sort_order: 4 },
    { name: 'Ex-Factory', date: order.shipDate, sort_order: 5 },
  ].filter(Boolean)

  const rows = milestones
    .filter(m => m.date)
    .map(m => ({
      order_id: orderId,
      name: m.name,
      milestone_date: d(m.date),
      done: false,
      status: 'pending',
      sort_order: m.sort_order,
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
    .select(`*, orders(id, order_no, buyer, style, smv, color, requires_embroidery, qty)`)
    .order('start_date')
  if (error) throw error
  return data.map(row => ({
    id: row.id,
    orderId: row.order_id,
    linePairNo: row.line_pair_no,
    startDate: new Date(row.start_date),
    endDate: new Date(row.end_date),
    allocatedQty: row.allocated_qty,
    targetDailyPcs: row.target_daily_pcs,
    notes: row.notes || '',
    order: row.orders ? toOrder(row.orders) : null,
    // convenience
    orderNo: row.orders?.order_no || '',
    color: row.orders?.color || '#3b82f6',
    smv: row.orders?.smv || 0,
  }))
}

export async function createLineAllocation(alloc) {
  const { data, error } = await supabase.from('line_allocations').insert({
    order_id: alloc.orderId,
    line_pair_no: Number(alloc.linePairNo),
    start_date: d(alloc.startDate),
    end_date: d(alloc.endDate),
    allocated_qty: Number(alloc.allocatedQty),
    target_daily_pcs: Number(alloc.targetDailyPcs),
    notes: alloc.notes || '',
  }).select(`*, orders(id, order_no, buyer, style, smv, color, qty)`).single()
  if (error) throw error
  return {
    id: data.id, orderId: data.order_id, linePairNo: data.line_pair_no,
    startDate: new Date(data.start_date), endDate: new Date(data.end_date),
    allocatedQty: data.allocated_qty, targetDailyPcs: data.target_daily_pcs,
    notes: data.notes, order: data.orders ? toOrder(data.orders) : null,
    orderNo: data.orders?.order_no || '', color: data.orders?.color || '#3b82f6',
  }
}

export async function deleteLineAllocation(id) {
  const { error } = await supabase.from('line_allocations').delete().eq('id', id)
  if (error) throw error
}

export async function updateLineAllocation(id, updates) {
  const payload = {}
  if (updates.startDate    !== undefined) payload.start_date       = d(updates.startDate)
  if (updates.endDate      !== undefined) payload.end_date         = d(updates.endDate)
  if (updates.allocatedQty !== undefined) payload.allocated_qty    = Number(updates.allocatedQty)
  if (updates.targetDailyPcs !== undefined) payload.target_daily_pcs = Number(updates.targetDailyPcs)
  if (updates.notes        !== undefined) payload.notes            = updates.notes
  const { data, error } = await supabase
    .from('line_allocations')
    .update(payload)
    .eq('id', id)
    .select(`*, orders(id, order_no, buyer, style, smv, color, qty)`)
    .single()
  if (error) throw error
  return {
    id: data.id, orderId: data.order_id, linePairNo: data.line_pair_no,
    startDate: new Date(data.start_date), endDate: new Date(data.end_date),
    allocatedQty: data.allocated_qty, targetDailyPcs: data.target_daily_pcs,
    notes: data.notes || '', order: data.orders ? toOrder(data.orders) : null,
    orderNo: data.orders?.order_no || '', color: data.orders?.color || '#3b82f6',
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
    .select(`*, shipment_milestones(id, name, milestone_date, actual_date, done, status, qty_shipped, remarks, sort_order)`)
    .order('ship_date')
  if (error) throw error
  return data.map(row => ({
    ...toOrder(row),
    totalQty: row.qty,
    shippedQty: (row.shipment_milestones || []).find(m => m.name === 'Ex-Factory')?.qty_shipped || 0,
    milestones: (row.shipment_milestones || [])
      .sort((a, b) => a.sort_order - b.sort_order)
      .map(m => ({
        id: m.id,
        name: m.name,
        date: m.milestone_date ? new Date(m.milestone_date) : null,
        actualDate: m.actual_date ? new Date(m.actual_date) : null,
        done: m.done,
        status: m.status || 'pending',
        qtyShipped: m.qty_shipped || 0,
        remarks: m.remarks || '',
      })),
  }))
}

export async function updateMilestoneRecord(id, updates) {
  const payload = {}
  if (updates.actualDate !== undefined) payload.actual_date = d(updates.actualDate)
  if (updates.done !== undefined) payload.done = updates.done
  if (updates.status !== undefined) payload.status = updates.status
  if (updates.qtyShipped !== undefined) payload.qty_shipped = Number(updates.qtyShipped)
  if (updates.remarks !== undefined) payload.remarks = updates.remarks
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
