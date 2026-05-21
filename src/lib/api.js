import { supabase } from './supabase'

// ── Transformers (DB snake_case → app camelCase) ──────────────────────────────

function toOrder(row) {
  return {
    id: row.id,
    orderNo: row.order_no,
    style: row.style,
    buyer: row.buyer,
    qty: row.qty,
    smv: parseFloat(row.smv),
    startDate: new Date(row.start_date),
    endDate: new Date(row.end_date),
    shipDate: new Date(row.ship_date),
    status: row.status,
    progress: row.progress,
    componentLine: row.component_line,
    assemblyLine: row.assembly_line,
    requiresEmbroidery: row.requires_embroidery,
    color: row.color || '#3b82f6',
    notes: row.notes || '',
  }
}

function fromOrder(order) {
  return {
    order_no: order.orderNo,
    style: order.style,
    buyer: order.buyer,
    qty: order.qty,
    smv: order.smv,
    start_date: order.startDate instanceof Date ? order.startDate.toISOString().split('T')[0] : order.startDate,
    end_date: order.endDate instanceof Date ? order.endDate.toISOString().split('T')[0] : order.endDate,
    ship_date: order.shipDate instanceof Date ? order.shipDate.toISOString().split('T')[0] : order.shipDate,
    status: order.status,
    progress: order.progress,
    component_line: order.componentLine,
    assembly_line: order.assemblyLine,
    requires_embroidery: order.requiresEmbroidery || false,
    color: order.color || '#3b82f6',
    notes: order.notes || '',
  }
}

// ── Orders ────────────────────────────────────────────────────────────────────

export async function fetchOrders() {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .order('ship_date', { ascending: true })
  if (error) throw error
  return data.map(toOrder)
}

export async function createOrder(order) {
  const { data, error } = await supabase
    .from('orders')
    .insert(fromOrder(order))
    .select()
    .single()
  if (error) throw error
  return toOrder(data)
}

export async function updateOrder(id, updates) {
  const dbUpdates = {}
  const map = {
    orderNo: 'order_no', style: 'style', buyer: 'buyer', qty: 'qty', smv: 'smv',
    startDate: 'start_date', endDate: 'end_date', shipDate: 'ship_date',
    status: 'status', progress: 'progress', componentLine: 'component_line',
    assemblyLine: 'assembly_line', requiresEmbroidery: 'requires_embroidery',
    color: 'color', notes: 'notes',
  }
  for (const [key, dbKey] of Object.entries(map)) {
    if (updates[key] !== undefined) {
      let val = updates[key]
      if ((key === 'startDate' || key === 'endDate' || key === 'shipDate') && val instanceof Date) {
        val = val.toISOString().split('T')[0]
      }
      dbUpdates[dbKey] = val
    }
  }
  const { data, error } = await supabase
    .from('orders').update(dbUpdates).eq('id', id).select().single()
  if (error) throw error
  return toOrder(data)
}

export async function deleteOrder(id) {
  const { error } = await supabase.from('orders').delete().eq('id', id)
  if (error) throw error
}

// ── Capacity Data ─────────────────────────────────────────────────────────────

export async function fetchCapacityData() {
  const { data, error } = await supabase
    .from('capacity_data')
    .select('*')
    .order('week_start', { ascending: true })
  if (error) throw error
  return data.map(row => ({
    id: row.id,
    week: row.week_label,
    weekLabel: row.week_label,
    weekStart: new Date(row.week_start),
    capacityPcs: row.capacity_pcs,
    loadedPcs: row.loaded_pcs,
    capacityMins: row.capacity_mins,
    loadedMins: row.loaded_mins,
    loadingPct: row.loading_pct,
  }))
}

// ── Section Output ────────────────────────────────────────────────────────────

export async function fetchSectionOutput() {
  const { data, error } = await supabase
    .from('section_output')
    .select('*')
    .order('period_date', { ascending: true })
  if (error) throw error

  const sections = ['cutting', 'embroidery', 'downFilling', 'template', 'component', 'assembly', 'packing']
  return sections.map(section => {
    const rows = data.filter(r => r.section === section)
    return {
      section,
      daily: rows.filter(r => r.period_type === 'daily').map(r => ({
        date: new Date(r.period_date),
        target: r.target, actual: r.actual, efficiency: r.efficiency,
      })),
      weekly: rows.filter(r => r.period_type === 'weekly').map(r => ({
        week: r.period_label, target: r.target, actual: r.actual, efficiency: r.efficiency,
      })),
      monthly: rows.filter(r => r.period_type === 'monthly').map(r => ({
        month: r.period_label, target: r.target, actual: r.actual, efficiency: r.efficiency,
      })),
    }
  })
}

// ── Shipments (orders + milestones) ──────────────────────────────────────────

export async function fetchShipments() {
  const { data, error } = await supabase
    .from('orders')
    .select(`*, shipment_milestones (id, name, milestone_date, done, sort_order)`)
    .order('ship_date', { ascending: true })
  if (error) throw error

  return data.map(row => ({
    ...toOrder(row),
    totalQty: row.qty,
    shippedQty: row.status === 'completed'
      ? row.qty
      : Math.round(row.qty * row.progress / 100 * 0.6),
    milestones: (row.shipment_milestones || [])
      .sort((a, b) => a.sort_order - b.sort_order)
      .map(m => ({
        id: m.id,
        name: m.name,
        date: new Date(m.milestone_date),
        done: m.done,
      })),
  }))
}

export async function updateMilestone(id, done) {
  const { error } = await supabase
    .from('shipment_milestones').update({ done }).eq('id', id)
  if (error) throw error
}

// ── Seed helper (populates DB with mock data on first run) ────────────────────

export async function seedFromMock(mockOrders, mockCapacity, mockSectionOutput) {
  // Seed orders
  const { error: ordersErr } = await supabase
    .from('orders')
    .upsert(mockOrders.map(o => ({ ...fromOrder(o), id: o.id })), { onConflict: 'id' })
  if (ordersErr) throw ordersErr

  // Seed milestones
  const milestones = mockOrders.flatMap(o =>
    (o.milestones || []).map((m, i) => ({
      order_id: o.id,
      name: m.name,
      milestone_date: m.date instanceof Date ? m.date.toISOString().split('T')[0] : m.date,
      done: m.done,
      sort_order: i,
    }))
  )
  if (milestones.length) {
    const { error: msErr } = await supabase.from('shipment_milestones').upsert(milestones, { onConflict: 'id' })
    if (msErr) throw msErr
  }

  // Seed capacity
  const { error: capErr } = await supabase
    .from('capacity_data')
    .upsert(mockCapacity.map(c => ({
      id: c.id,
      week_label: c.weekLabel,
      week_start: c.weekStart instanceof Date ? c.weekStart.toISOString().split('T')[0] : c.weekStart,
      capacity_pcs: c.capacityPcs,
      loaded_pcs: c.loadedPcs,
      capacity_mins: c.capacityMins,
      loaded_mins: c.loadedMins,
      loading_pct: c.loadingPct,
    })), { onConflict: 'id' })
  if (capErr) throw capErr

  // Seed section output
  const sectionRows = mockSectionOutput.flatMap(s =>
    [
      ...s.daily.map(d => ({
        section: s.section, period_type: 'daily',
        period_label: d.date instanceof Date ? d.date.toISOString().split('T')[0] : String(d.date),
        period_date: d.date instanceof Date ? d.date.toISOString().split('T')[0] : d.date,
        target: d.target, actual: d.actual, efficiency: d.efficiency,
      })),
      ...s.weekly.map(d => ({
        section: s.section, period_type: 'weekly',
        period_label: d.week, period_date: null,
        target: d.target, actual: d.actual, efficiency: d.efficiency,
      })),
      ...s.monthly.map(d => ({
        section: s.section, period_type: 'monthly',
        period_label: d.month, period_date: null,
        target: d.target, actual: d.actual, efficiency: d.efficiency,
      })),
    ]
  )
  const { error: soErr } = await supabase.from('section_output').insert(sectionRows)
  if (soErr && soErr.code !== '23505') throw soErr // ignore duplicate key
}
