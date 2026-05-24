import { supabase } from './supabase'

// ── Customer Visits ───────────────────────────────────────────────────────────

export async function fetchVisits(filters = {}) {
  let query = supabase
    .from('customer_visits')
    .select(`
      *,
      visit_visitors(id, full_name, title, sort_order),
      visit_itinerary(id, item_time, item_description, sort_order)
    `)
    .order('visit_date', { ascending: true })

  if (filters.status) {
    if (filters.status === 'upcoming') {
      query = query.in('status', ['upcoming'])
    } else if (filters.status === 'past') {
      query = query.in('status', ['completed', 'cancelled'])
    }
    // 'all' = no filter
  }

  if (filters.month) {
    // filters.month = 'YYYY-MM'
    const start = `${filters.month}-01`
    const end = new Date(filters.month.split('-')[0], parseInt(filters.month.split('-')[1]), 0)
      .toISOString().split('T')[0]
    query = query.gte('visit_date', start).lte('visit_date', end)
  }

  if (filters.company) {
    query = query.eq('company_name', filters.company)
  }

  const { data, error } = await query
  if (error) throw error

  return data.map(toVisit)
}

export async function fetchVisitCompanies() {
  const { data, error } = await supabase
    .from('customer_visits')
    .select('company_name')
    .order('company_name')
  if (error) throw error
  const unique = [...new Set(data.map(r => r.company_name))]
  return unique
}

export async function createVisit(visit) {
  // Insert main visit
  const { data, error } = await supabase
    .from('customer_visits')
    .insert(fromVisit(visit))
    .select()
    .single()
  if (error) throw error

  const visitId = data.id

  // Insert visitors
  if (visit.visitors?.length) {
    const visitorRows = visit.visitors.map((v, i) => ({
      visit_id: visitId,
      full_name: v.fullName,
      title: v.title,
      sort_order: i,
    }))
    const { error: ve } = await supabase.from('visit_visitors').insert(visitorRows)
    if (ve) throw ve
  }

  // Insert itinerary
  if (visit.itinerary?.length) {
    const itinRows = visit.itinerary.map((item, i) => ({
      visit_id: visitId,
      item_time: item.time,
      item_description: item.description,
      sort_order: i,
    }))
    const { error: ie } = await supabase.from('visit_itinerary').insert(itinRows)
    if (ie) throw ie
  }

  // Re-fetch full visit
  return fetchVisitById(visitId)
}

export async function updateVisit(id, visit) {
  // Update main record
  const { error } = await supabase
    .from('customer_visits')
    .update(fromVisit(visit))
    .eq('id', id)
  if (error) throw error

  // Replace visitors
  await supabase.from('visit_visitors').delete().eq('visit_id', id)
  if (visit.visitors?.length) {
    const visitorRows = visit.visitors.map((v, i) => ({
      visit_id: id,
      full_name: v.fullName,
      title: v.title,
      sort_order: i,
    }))
    const { error: ve } = await supabase.from('visit_visitors').insert(visitorRows)
    if (ve) throw ve
  }

  // Replace itinerary
  await supabase.from('visit_itinerary').delete().eq('visit_id', id)
  if (visit.itinerary?.length) {
    const itinRows = visit.itinerary.map((item, i) => ({
      visit_id: id,
      item_time: item.time,
      item_description: item.description,
      sort_order: i,
    }))
    const { error: ie } = await supabase.from('visit_itinerary').insert(itinRows)
    if (ie) throw ie
  }

  return fetchVisitById(id)
}

export async function updateVisitStatus(id, status) {
  const { error } = await supabase
    .from('customer_visits')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

export async function deleteVisit(id) {
  const { error } = await supabase.from('customer_visits').delete().eq('id', id)
  if (error) throw error
}

async function fetchVisitById(id) {
  const { data, error } = await supabase
    .from('customer_visits')
    .select(`
      *,
      visit_visitors(id, full_name, title, sort_order),
      visit_itinerary(id, item_time, item_description, sort_order)
    `)
    .eq('id', id)
    .single()
  if (error) throw error
  return toVisit(data)
}

// ── Transformers ───────────────────────────────────────────────────────────────

function toVisit(row) {
  return {
    id: row.id,
    companyName: row.company_name,
    visitDate: row.visit_date,
    purpose: row.purpose,
    remarks: row.remarks || '',
    transportRequired: row.transport_required || false,
    pickupLocation: row.pickup_location || '',
    pickupTime: row.pickup_time || '',
    dropoffLocation: row.dropoff_location || '',
    dropoffTime: row.dropoff_time || '',
    lunchRequired: row.lunch_required || false,
    lunchRestaurant: row.lunch_restaurant || '',
    lunchAddress: row.lunch_address || '',
    dinnerRequired: row.dinner_required || false,
    dinnerRestaurant: row.dinner_restaurant || '',
    dinnerAddress: row.dinner_address || '',
    status: row.status || 'upcoming',
    createdAt: row.created_at,
    visitors: (row.visit_visitors || [])
      .sort((a, b) => a.sort_order - b.sort_order)
      .map(v => ({ id: v.id, fullName: v.full_name, title: v.title })),
    itinerary: (row.visit_itinerary || [])
      .sort((a, b) => a.sort_order - b.sort_order)
      .map(item => ({ id: item.id, time: item.item_time, description: item.item_description })),
  }
}

function fromVisit(v) {
  return {
    company_name: v.companyName,
    visit_date: v.visitDate,
    purpose: v.purpose,
    remarks: v.remarks || null,
    transport_required: v.transportRequired || false,
    pickup_location: v.transportRequired ? (v.pickupLocation || null) : null,
    pickup_time: v.transportRequired ? (v.pickupTime || null) : null,
    dropoff_location: v.transportRequired ? (v.dropoffLocation || null) : null,
    dropoff_time: v.transportRequired ? (v.dropoffTime || null) : null,
    lunch_required: v.lunchRequired || false,
    lunch_restaurant: v.lunchRequired ? (v.lunchRestaurant || null) : null,
    lunch_address: v.lunchRequired ? (v.lunchAddress || null) : null,
    dinner_required: v.dinnerRequired || false,
    dinner_restaurant: v.dinnerRequired ? (v.dinnerRestaurant || null) : null,
    dinner_address: v.dinnerRequired ? (v.dinnerAddress || null) : null,
    status: v.status || 'upcoming',
    updated_at: new Date().toISOString(),
  }
}
