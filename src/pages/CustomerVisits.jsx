import { useState, useEffect, useCallback } from 'react'
import { format, differenceInDays, parseISO } from 'date-fns'
import {
  CalendarDays, Users, Bus, UtensilsCrossed,
  ChevronDown, Pencil, Printer, CheckCircle2, XCircle,
  Plus, Sun, Moon, Truck, MapPin, Clock
} from 'lucide-react'
import { useAppStore } from '@/store/useStore'
import {
  fetchVisits, fetchVisitCompanies, updateVisitStatus
} from '@/lib/visitsApi'
import { printVisitPdf } from '@/lib/visitPdf'
import VisitFormModal from '@/components/visits/VisitFormModal'

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDateBadge(dateStr) {
  if (!dateStr) return { day: '—', dow: '' }
  const [y, m, d] = dateStr.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  return {
    day: format(dt, 'dd MMM'),
    dow: format(dt, 'EEE'),
  }
}

function daysUntil(dateStr) {
  if (!dateStr) return null
  const [y, m, d] = dateStr.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return differenceInDays(dt, today)
}

function urgencyColor(days) {
  if (days === null) return { bg: 'bg-slate-500', text: 'text-white', badge: 'bg-slate-100 text-slate-600' }
  if (days < 0) return { bg: 'bg-slate-500', text: 'text-white', badge: 'bg-slate-100 text-slate-600' }
  if (days <= 3) return { bg: 'bg-red-500', text: 'text-white', badge: 'bg-red-100 text-red-700' }
  if (days <= 7) return { bg: 'bg-amber-500', text: 'text-white', badge: 'bg-amber-100 text-amber-700' }
  return { bg: 'bg-blue-500', text: 'text-white', badge: 'bg-blue-100 text-blue-700' }
}

function formatTime(t) {
  if (!t) return ''
  return t.slice(0, 5)
}

function SummaryCard({ label, value, sub, colorClass, icon: Icon }) {
  return (
    <div className={`rounded-xl p-4 ${colorClass} flex items-start gap-3`}>
      <div className="rounded-lg bg-white/20 p-2 flex-shrink-0">
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div>
        <p className="text-xs font-medium text-white/80">{label}</p>
        <p className="text-2xl font-bold text-white mt-0.5">{value}</p>
        {sub && <p className="text-xs text-white/70 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

// ── Visit Card ────────────────────────────────────────────────────────────────

function VisitCard({ visit, canEdit, onEdit, onRefresh }) {
  const [open, setOpen] = useState(false)
  const [confirming, setConfirming] = useState(null) // 'cancel' | 'complete'
  const [busy, setBusy] = useState(false)

  const days = daysUntil(visit.visitDate)
  const colors = urgencyColor(days)
  const dateBadge = formatDateBadge(visit.visitDate)

  async function handleStatus(newStatus) {
    setBusy(true)
    try {
      await updateVisitStatus(visit.id, newStatus)
      setConfirming(null)
      await onRefresh()
    } catch (e) {
      console.error(e)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Card Header */}
      <button
        className="w-full text-left flex items-center gap-4 p-4 hover:bg-slate-50 transition-colors"
        onClick={() => setOpen(o => !o)}
      >
        {/* Date badge */}
        <div className={`flex-shrink-0 flex flex-col items-center justify-center rounded-xl w-16 h-16 ${colors.bg} ${colors.text}`}>
          <span className="text-lg font-bold leading-tight">{dateBadge.day.split(' ')[0]}</span>
          <span className="text-xs font-medium opacity-90">{dateBadge.day.split(' ')[1]}</span>
          <span className="text-xs opacity-75">{dateBadge.dow}</span>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-800 text-base truncate">{visit.companyName}</p>
          <p className="text-sm text-slate-500 truncate">
            {visit.purpose} · {visit.visitors?.length || 0} visitor{visit.visitors?.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Badges */}
        <div className="flex items-center gap-1.5 flex-shrink-0 flex-wrap justify-end">
          {visit.status === 'upcoming' && days !== null && days >= 0 && (
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${colors.badge}`}>
              {days === 0 ? 'Today' : `${days}d`}
            </span>
          )}
          {visit.status === 'completed' && (
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">Completed</span>
          )}
          {visit.status === 'cancelled' && (
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">Cancelled</span>
          )}
          {visit.transportRequired && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">🚌 Transport</span>
          )}
          {visit.lunchRequired && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">☀ Lunch</span>
          )}
          {visit.dinnerRequired && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">★ Dinner</span>
          )}
          <ChevronDown
            className={`w-4 h-4 text-slate-400 transition-transform ml-1 ${open ? 'rotate-180' : ''}`}
          />
        </div>
      </button>

      {/* Card Body */}
      {open && (
        <div className="border-t border-slate-100 p-4">
          <div className="grid grid-cols-2 gap-4 mb-4">
            {/* Visitors */}
            <div className="bg-slate-50 rounded-lg p-3">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" /> Visitors
              </p>
              {visit.visitors?.length ? (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-slate-400">
                      <th className="text-left pb-1 w-6">#</th>
                      <th className="text-left pb-1">Name</th>
                      <th className="text-left pb-1">Title</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visit.visitors.map((v, i) => (
                      <tr key={i} className="border-t border-slate-100">
                        <td className="py-1 text-slate-400 text-xs">{i + 1}</td>
                        <td className="py-1 font-medium text-slate-700">{v.fullName}</td>
                        <td className="py-1 text-slate-500">{v.title}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-xs text-slate-400">No visitors listed</p>
              )}
            </div>

            {/* Transportation */}
            <div className="bg-slate-50 rounded-lg p-3">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5" /> Transportation
              </p>
              {visit.transportRequired ? (
                <div className="space-y-1.5 text-sm">
                  <div className="flex items-start gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-green-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="text-xs text-slate-400">Pick-up</span>
                      <p className="text-slate-700">{visit.pickupLocation || '—'}</p>
                      {visit.pickupTime && (
                        <p className="text-xs text-slate-500 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {formatTime(visit.pickupTime)}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-red-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="text-xs text-slate-400">Drop-off</span>
                      <p className="text-slate-700">{visit.dropoffLocation || '—'}</p>
                      {visit.dropoffTime && (
                        <p className="text-xs text-slate-500 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {formatTime(visit.dropoffTime)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <span className="text-xs bg-slate-200 text-slate-500 px-2 py-1 rounded-full">Not required</span>
              )}
            </div>

            {/* Meals */}
            <div className="bg-slate-50 rounded-lg p-3">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <UtensilsCrossed className="w-3.5 h-3.5" /> Meals
              </p>
              {(visit.lunchRequired || visit.dinnerRequired) ? (
                <div className="space-y-2 text-sm">
                  {visit.lunchRequired && (
                    <div className="flex items-start gap-2">
                      <Sun className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-slate-700">{visit.lunchRestaurant || '—'}</p>
                        <p className="text-xs text-slate-500">{visit.lunchAddress || ''}</p>
                      </div>
                    </div>
                  )}
                  {visit.dinnerRequired && (
                    <div className="flex items-start gap-2">
                      <Moon className="w-4 h-4 text-purple-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-slate-700">{visit.dinnerRestaurant || '—'}</p>
                        <p className="text-xs text-slate-500">{visit.dinnerAddress || ''}</p>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <span className="text-xs bg-slate-200 text-slate-500 px-2 py-1 rounded-full">Not required</span>
              )}
            </div>

            {/* Purpose & Remarks */}
            <div className="bg-slate-50 rounded-lg p-3">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                Purpose & Remarks
              </p>
              <p className="text-sm font-medium text-slate-700 mb-1">{visit.purpose}</p>
              {visit.remarks && (
                <p className="text-xs text-slate-500 leading-relaxed">{visit.remarks}</p>
              )}
            </div>
          </div>

          {/* Itinerary — full width */}
          {visit.itinerary?.length > 0 && (
            <div className="bg-slate-50 rounded-lg p-3 mb-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                <CalendarDays className="w-3.5 h-3.5" /> Itinerary
              </p>
              <div className="relative pl-4">
                {visit.itinerary.map((item, i) => (
                  <div key={i} className="flex gap-3 mb-2 relative">
                    {/* Connector line */}
                    {i < visit.itinerary.length - 1 && (
                      <div className="absolute left-[-8px] top-5 w-0.5 h-full bg-slate-200" />
                    )}
                    {/* Dot */}
                    <div className="absolute left-[-12px] top-1.5 w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
                    <span className="text-xs font-mono font-semibold text-blue-600 w-12 flex-shrink-0 pt-0.5">
                      {formatTime(item.time)}
                    </span>
                    <span className="text-sm text-slate-700">{item.description}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action buttons */}
          {canEdit && (
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => onEdit(visit)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <Pencil className="w-3.5 h-3.5" />
                Edit visit
              </button>

              <button
                onClick={() => printVisitPdf(visit)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <Printer className="w-3.5 h-3.5" />
                Print itinerary
              </button>

              {visit.status === 'upcoming' && (
                <>
                  {confirming === 'complete' ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-600">Mark as completed?</span>
                      <button
                        onClick={() => handleStatus('completed')}
                        disabled={busy}
                        className="px-3 py-1.5 text-xs font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-60"
                      >
                        Confirm
                      </button>
                      <button
                        onClick={() => setConfirming(null)}
                        className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirming('complete')}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Mark completed
                    </button>
                  )}

                  {confirming === 'cancel' ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-600">Cancel this visit?</span>
                      <button
                        onClick={() => handleStatus('cancelled')}
                        disabled={busy}
                        className="px-3 py-1.5 text-xs font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-60"
                      >
                        Yes, cancel
                      </button>
                      <button
                        onClick={() => setConfirming(null)}
                        className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirming('cancel')}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      Cancel visit
                    </button>
                  )}
                </>
              )}
            </div>
          )}

          {/* Print button for non-editors */}
          {!canEdit && (
            <button
              onClick={() => printVisitPdf(visit)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              Print itinerary
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

const CURRENT_MONTH = format(new Date(), 'yyyy-MM')

export default function CustomerVisits() {
  const { getRole, canEdit } = useAppStore()
  const role = getRole()
  const userCanEdit = canEdit()

  const [visits, setVisits] = useState([])
  const [companies, setCompanies] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [viewFilter, setViewFilter] = useState('upcoming') // upcoming | all | past
  const [monthFilter, setMonthFilter] = useState(CURRENT_MONTH)
  const [companyFilter, setCompanyFilter] = useState('')

  const [showForm, setShowForm] = useState(false)
  const [editingVisit, setEditingVisit] = useState(null)
  const [toast, setToast] = useState('')

  // Build month options (current month ± 6 months)
  const monthOptions = (() => {
    const opts = []
    const now = new Date()
    for (let i = -3; i <= 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1)
      const val = format(d, 'yyyy-MM')
      const label = format(d, 'MMMM yyyy')
      opts.push({ val, label })
    }
    return opts
  })()

  const loadVisits = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const filters = {}
      if (viewFilter !== 'all') filters.status = viewFilter
      // Month filter only applies to 'all' view (upcoming already shows by date)
      if (viewFilter === 'all') filters.month = monthFilter
      if (companyFilter) filters.company = companyFilter

      const data = await fetchVisits(filters)
      setVisits(data)
    } catch (e) {
      setError(e.message || 'Failed to load visits')
    } finally {
      setLoading(false)
    }
  }, [viewFilter, monthFilter, companyFilter])

  const loadCompanies = useCallback(async () => {
    try {
      const data = await fetchVisitCompanies()
      setCompanies(data)
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => { loadVisits() }, [loadVisits])
  useEffect(() => { loadCompanies() }, [loadCompanies])

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  function handleNewVisit() {
    setEditingVisit(null)
    setShowForm(true)
  }

  function handleEditVisit(visit) {
    setEditingVisit(visit)
    setShowForm(true)
  }

  async function handleSaved(saved) {
    setShowForm(false)
    setEditingVisit(null)
    showToast('Visit saved successfully')
    await loadVisits()
    await loadCompanies()
  }

  // ── Summary stats (from upcoming visits) ──────────────────────────────────
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const upcomingVisits = visits.filter(v => {
    if (v.status !== 'upcoming') return false
    const [y, m, d] = v.visitDate.split('-').map(Number)
    return new Date(y, m - 1, d) >= today
  })

  const totalVisitors = upcomingVisits.reduce((sum, v) => sum + (v.visitors?.length || 0), 0)
  const transportCount = upcomingVisits.filter(v => v.transportRequired).length
  const mealsCount = upcomingVisits.filter(v => v.lunchRequired || v.dinnerRequired).length

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Customer Visits</h1>
          <p className="text-sm text-slate-500">Lịch Thăm Khách Hàng</p>
        </div>
        {userCanEdit && (
          <button
            onClick={handleNewVisit}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Visit
          </button>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <SummaryCard
          label="Upcoming Visits"
          value={upcomingVisits.length}
          sub="scheduled"
          colorClass="bg-blue-600"
          icon={CalendarDays}
        />
        <SummaryCard
          label="Total Visitors"
          value={totalVisitors}
          sub="across upcoming visits"
          colorClass="bg-indigo-600"
          icon={Users}
        />
        <SummaryCard
          label="Transport Arranged"
          value={transportCount}
          sub="upcoming visits"
          colorClass="bg-orange-500"
          icon={Bus}
        />
        <SummaryCard
          label="Meals Arranged"
          value={mealsCount}
          sub="upcoming visits"
          colorClass="bg-amber-500"
          icon={UtensilsCrossed}
        />
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        {/* View toggle */}
        <div className="flex rounded-lg border border-slate-200 overflow-hidden bg-white">
          {[
            { id: 'upcoming', label: 'Upcoming' },
            { id: 'all', label: 'All visits' },
            { id: 'past', label: 'Past' },
          ].map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setViewFilter(id)}
              className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                viewFilter === id
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Month filter (only shown for 'all' view) */}
        {viewFilter === 'all' && (
          <select
            value={monthFilter}
            onChange={e => setMonthFilter(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            {monthOptions.map(o => (
              <option key={o.val} value={o.val}>{o.label}</option>
            ))}
          </select>
        )}

        {/* Company filter */}
        {companies.length > 0 && (
          <select
            value={companyFilter}
            onChange={e => setCompanyFilter(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="">All companies</option>
            {companies.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <p className="text-red-700 font-medium">{error}</p>
          <button
            onClick={loadVisits}
            className="mt-3 text-sm text-red-600 underline hover:no-underline"
          >
            Try again
          </button>
        </div>
      ) : visits.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <CalendarDays className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">No visits found</p>
          <p className="text-sm text-slate-400 mt-1">
            {viewFilter === 'upcoming'
              ? 'No upcoming visits scheduled.'
              : 'No visits match your current filters.'}
          </p>
          {userCanEdit && (
            <button
              onClick={handleNewVisit}
              className="mt-4 flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 mx-auto"
            >
              <Plus className="w-4 h-4" />
              Schedule a visit
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {visits.map(visit => (
            <VisitCard
              key={visit.id}
              visit={visit}
              canEdit={userCanEdit}
              onEdit={handleEditVisit}
              onRefresh={loadVisits}
            />
          ))}
        </div>
      )}

      {/* Modal */}
      {showForm && (
        <VisitFormModal
          visit={editingVisit}
          onClose={() => { setShowForm(false); setEditingVisit(null) }}
          onSaved={handleSaved}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-800 text-white text-sm px-4 py-2.5 rounded-lg shadow-lg flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-green-400" />
          {toast}
        </div>
      )}
    </div>
  )
}
