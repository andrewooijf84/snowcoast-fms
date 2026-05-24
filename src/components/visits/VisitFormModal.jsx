import { useState, useEffect } from 'react'
import { X, Plus, Trash2, Sun, Moon, Truck } from 'lucide-react'
import { createVisit, updateVisit } from '@/lib/visitsApi'

const PURPOSE_OPTIONS = [
  'Pre-production meeting',
  'Fabric and trim review',
  'Sample approval',
  'Production line audit',
  'Quality inspection',
  'Factory capability assessment',
  'Order negotiation',
  'CSR / compliance audit',
  'General factory visit',
  'Other',
]

function Section({ title, children }) {
  return (
    <div className="mb-6">
      <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-3 pb-2 border-b border-slate-200">
        {title}
      </h3>
      {children}
    </div>
  )
}

function FieldError({ msg }) {
  if (!msg) return null
  return <p className="text-xs text-red-500 mt-1">{msg}</p>
}

const EMPTY_VISITOR = () => ({ fullName: '', title: '' })
const EMPTY_ITIN = () => ({ time: '', description: '' })

export default function VisitFormModal({ visit, onClose, onSaved }) {
  // ── Form state ────────────────────────────────────────────────────────────
  const [form, setForm] = useState({
    companyName: '',
    visitDate: '',
    purpose: '',
    remarks: '',
    transportRequired: false,
    pickupLocation: '',
    pickupTime: '',
    dropoffLocation: '',
    dropoffTime: '',
    lunchRequired: false,
    lunchRestaurant: '',
    lunchAddress: '',
    dinnerRequired: false,
    dinnerRestaurant: '',
    dinnerAddress: '',
  })
  const [visitors, setVisitors] = useState([EMPTY_VISITOR()])
  const [itinerary, setItinerary] = useState([EMPTY_ITIN(), EMPTY_ITIN()])
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  // ── Pre-fill when editing ─────────────────────────────────────────────────
  useEffect(() => {
    if (visit) {
      setForm({
        companyName: visit.companyName || '',
        visitDate: visit.visitDate || '',
        purpose: visit.purpose || '',
        remarks: visit.remarks || '',
        transportRequired: visit.transportRequired || false,
        pickupLocation: visit.pickupLocation || '',
        pickupTime: visit.pickupTime || '',
        dropoffLocation: visit.dropoffLocation || '',
        dropoffTime: visit.dropoffTime || '',
        lunchRequired: visit.lunchRequired || false,
        lunchRestaurant: visit.lunchRestaurant || '',
        lunchAddress: visit.lunchAddress || '',
        dinnerRequired: visit.dinnerRequired || false,
        dinnerRestaurant: visit.dinnerRestaurant || '',
        dinnerAddress: visit.dinnerAddress || '',
      })
      setVisitors(
        visit.visitors?.length
          ? visit.visitors.map(v => ({ fullName: v.fullName, title: v.title }))
          : [EMPTY_VISITOR()]
      )
      setItinerary(
        visit.itinerary?.length
          ? visit.itinerary.map(i => ({ time: i.time, description: i.description }))
          : [EMPTY_ITIN(), EMPTY_ITIN()]
      )
    }
  }, [visit])

  // ── Helpers ────────────────────────────────────────────────────────────────
  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const addVisitor = () => setVisitors(vs => [...vs, EMPTY_VISITOR()])
  const removeVisitor = (i) => setVisitors(vs => vs.filter((_, idx) => idx !== i))
  const updateVisitorField = (i, key, val) =>
    setVisitors(vs => vs.map((v, idx) => idx === i ? { ...v, [key]: val } : v))

  const addItin = () => setItinerary(it => [...it, EMPTY_ITIN()])
  const removeItin = (i) => setItinerary(it => it.filter((_, idx) => idx !== i))
  const updateItinField = (i, key, val) =>
    setItinerary(it => it.map((item, idx) => idx === i ? { ...item, [key]: val } : item))

  // ── Validation ─────────────────────────────────────────────────────────────
  function validate() {
    const e = {}
    if (!form.companyName.trim()) e.companyName = 'Company name is required'
    if (!form.visitDate) e.visitDate = 'Visit date is required'
    if (!form.purpose) e.purpose = 'Purpose is required'

    const validVisitors = visitors.filter(v => v.fullName.trim() || v.title.trim())
    if (!validVisitors.length) {
      e.visitors = 'At least one visitor with name and title is required'
    } else {
      visitors.forEach((v, i) => {
        if (v.fullName.trim() && !v.title.trim()) e[`visitor_title_${i}`] = 'Title required'
        if (!v.fullName.trim() && v.title.trim()) e[`visitor_name_${i}`] = 'Name required'
      })
    }

    const validItin = itinerary.filter(item => item.time || item.description.trim())
    if (!validItin.length) {
      e.itinerary = 'At least one itinerary item with time and description is required'
    } else {
      itinerary.forEach((item, i) => {
        if (item.time && !item.description.trim()) e[`itin_desc_${i}`] = 'Description required'
        if (!item.time && item.description.trim()) e[`itin_time_${i}`] = 'Time required'
      })
    }

    return e
  }

  // ── Save ────────────────────────────────────────────────────────────────────
  async function handleSave() {
    const e = validate()
    setErrors(e)
    if (Object.keys(e).length) return

    setSaving(true)
    setSaveError('')
    try {
      const payload = {
        ...form,
        visitors: visitors.filter(v => v.fullName.trim() && v.title.trim()),
        itinerary: itinerary
          .filter(i => i.time && i.description.trim())
          .sort((a, b) => a.time.localeCompare(b.time)),
      }

      let saved
      if (visit) {
        saved = await updateVisit(visit.id, { ...payload, status: visit.status })
      } else {
        saved = await createVisit({ ...payload, status: 'upcoming' })
      }
      onSaved(saved)
    } catch (err) {
      setSaveError(err.message || 'Failed to save visit')
    } finally {
      setSaving(false)
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-full flex flex-col"
        style={{ maxWidth: 680, maxHeight: '90vh' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-blue-600 rounded-t-xl flex-shrink-0">
          <div>
            <p className="text-white font-semibold text-lg leading-tight">
              {visit ? 'Edit Customer Visit' : 'New Customer Visit'}
            </p>
            <p className="text-blue-100 text-sm">
              {visit ? 'Chỉnh Sửa Lịch Thăm' : 'Lịch Thăm Khách Hàng Mới'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-blue-100 transition-colors p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body — scrollable */}
        <div className="flex-1 overflow-y-auto px-6 py-5">

          {/* Section 1 — Visit Information */}
          <Section title="Visit Information / Thông Tin Lịch Thăm">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Customer Company <span className="text-red-500">★</span>
                </label>
                <input
                  type="text"
                  value={form.companyName}
                  onChange={e => setField('companyName', e.target.value)}
                  placeholder="Company / customer name"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <FieldError msg={errors.companyName} />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Visit Date <span className="text-red-500">★</span>
                </label>
                <input
                  type="date"
                  value={form.visitDate}
                  onChange={e => setField('visitDate', e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <FieldError msg={errors.visitDate} />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Purpose <span className="text-red-500">★</span>
                </label>
                <select
                  value={form.purpose}
                  onChange={e => setField('purpose', e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select purpose...</option>
                  {PURPOSE_OPTIONS.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
                <FieldError msg={errors.purpose} />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Remarks (optional)
                </label>
                <textarea
                  value={form.remarks}
                  onChange={e => setField('remarks', e.target.value)}
                  rows={3}
                  placeholder="Any special requirements, notes, or additional context..."
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
            </div>
          </Section>

          {/* Section 2 — Visitors */}
          <Section title="Visitors / Khách Tham Dự">
            {errors.visitors && (
              <p className="text-xs text-red-500 mb-2">{errors.visitors}</p>
            )}
            <div className="space-y-2">
              {visitors.map((v, i) => (
                <div key={i} className="flex gap-2 items-start">
                  <div className="flex-1">
                    <input
                      type="text"
                      value={v.fullName}
                      onChange={e => updateVisitorField(i, 'fullName', e.target.value)}
                      placeholder="Full name ★"
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <FieldError msg={errors[`visitor_name_${i}`]} />
                  </div>
                  <div className="flex-1">
                    <input
                      type="text"
                      value={v.title}
                      onChange={e => updateVisitorField(i, 'title', e.target.value)}
                      placeholder="Title / Position ★"
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <FieldError msg={errors[`visitor_title_${i}`]} />
                  </div>
                  <button
                    onClick={() => removeVisitor(i)}
                    disabled={visitors.length === 1}
                    className="mt-1.5 p-1.5 text-red-400 hover:text-red-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    title="Remove visitor"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
            <button
              onClick={addVisitor}
              className="mt-3 flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              <Plus className="w-4 h-4" />
              Add visitor
            </button>
          </Section>

          {/* Section 3 — Itinerary */}
          <Section title="Itinerary / Chương Trình Thăm">
            {errors.itinerary && (
              <p className="text-xs text-red-500 mb-2">{errors.itinerary}</p>
            )}
            <div className="space-y-2">
              {itinerary.map((item, i) => (
                <div key={i} className="flex gap-2 items-start">
                  <div className="w-36">
                    <input
                      type="time"
                      value={item.time}
                      onChange={e => updateItinField(i, 'time', e.target.value)}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <FieldError msg={errors[`itin_time_${i}`]} />
                  </div>
                  <div className="flex-1">
                    <input
                      type="text"
                      value={item.description}
                      onChange={e => updateItinField(i, 'description', e.target.value)}
                      placeholder="Activity description ★"
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <FieldError msg={errors[`itin_desc_${i}`]} />
                  </div>
                  <button
                    onClick={() => removeItin(i)}
                    disabled={itinerary.length === 1}
                    className="mt-1.5 p-1.5 text-red-400 hover:text-red-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    title="Remove item"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
            <button
              onClick={addItin}
              className="mt-3 flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              <Plus className="w-4 h-4" />
              Add item
            </button>
            <p className="text-xs text-slate-400 mt-2">
              💡 Tip: Include meal times here so they appear on the printed schedule.
            </p>
          </Section>

          {/* Section 4 — Transportation */}
          <Section title="Transportation / Đưa Đón">
            <div className="flex items-center gap-6 mb-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="transport"
                  checked={!form.transportRequired}
                  onChange={() => setField('transportRequired', false)}
                  className="text-blue-600"
                />
                <span className="text-sm text-slate-700">No transport needed</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="transport"
                  checked={form.transportRequired}
                  onChange={() => setField('transportRequired', true)}
                  className="text-blue-600"
                />
                <span className="text-sm text-slate-700 flex items-center gap-1.5">
                  <Truck className="w-4 h-4 text-orange-500" />
                  Arrange transportation
                </span>
              </label>
            </div>

            {form.transportRequired && (
              <div className="grid grid-cols-2 gap-4 p-4 bg-orange-50 rounded-lg border border-orange-200">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Pick-up Location</label>
                  <input
                    type="text"
                    value={form.pickupLocation}
                    onChange={e => setField('pickupLocation', e.target.value)}
                    placeholder="Pick-up address"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Pick-up Time</label>
                  <input
                    type="time"
                    value={form.pickupTime}
                    onChange={e => setField('pickupTime', e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Drop-off Location</label>
                  <input
                    type="text"
                    value={form.dropoffLocation}
                    onChange={e => setField('dropoffLocation', e.target.value)}
                    placeholder="Drop-off address"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Drop-off Time</label>
                  <input
                    type="time"
                    value={form.dropoffTime}
                    onChange={e => setField('dropoffTime', e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            )}
          </Section>

          {/* Section 5 — Meals */}
          <Section title="Meals / Ăn Uống">
            <p className="text-xs text-slate-500 mb-3">Select one or both meals to arrange</p>
            <div className="space-y-4">
              {/* Lunch */}
              <div>
                <label className="flex items-center gap-2 cursor-pointer mb-2">
                  <input
                    type="checkbox"
                    checked={form.lunchRequired}
                    onChange={e => setField('lunchRequired', e.target.checked)}
                    className="rounded text-blue-600 w-4 h-4"
                  />
                  <Sun className="w-4 h-4 text-amber-500" />
                  <span className="text-sm font-medium text-slate-700">Lunch / Bữa Trưa</span>
                </label>
                {form.lunchRequired && (
                  <div className="grid grid-cols-2 gap-3 p-4 bg-amber-50 rounded-lg border border-amber-200 ml-6">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Restaurant name</label>
                      <input
                        type="text"
                        value={form.lunchRestaurant}
                        onChange={e => setField('lunchRestaurant', e.target.value)}
                        placeholder="Restaurant name"
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Restaurant address</label>
                      <input
                        type="text"
                        value={form.lunchAddress}
                        onChange={e => setField('lunchAddress', e.target.value)}
                        placeholder="Address"
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                    <p className="col-span-2 text-xs text-amber-600">
                      💡 Add meal time in itinerary above so it appears on the printed schedule.
                    </p>
                  </div>
                )}
              </div>

              {/* Dinner */}
              <div>
                <label className="flex items-center gap-2 cursor-pointer mb-2">
                  <input
                    type="checkbox"
                    checked={form.dinnerRequired}
                    onChange={e => setField('dinnerRequired', e.target.checked)}
                    className="rounded text-blue-600 w-4 h-4"
                  />
                  <Moon className="w-4 h-4 text-purple-500" />
                  <span className="text-sm font-medium text-slate-700">Dinner / Bữa Tối</span>
                </label>
                {form.dinnerRequired && (
                  <div className="grid grid-cols-2 gap-3 p-4 bg-purple-50 rounded-lg border border-purple-200 ml-6">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Restaurant name</label>
                      <input
                        type="text"
                        value={form.dinnerRestaurant}
                        onChange={e => setField('dinnerRestaurant', e.target.value)}
                        placeholder="Restaurant name"
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Restaurant address</label>
                      <input
                        type="text"
                        value={form.dinnerAddress}
                        onChange={e => setField('dinnerAddress', e.target.value)}
                        placeholder="Address"
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                    <p className="col-span-2 text-xs text-purple-600">
                      💡 Add meal time in itinerary above so it appears on the printed schedule.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </Section>

          {/* Save error */}
          {saveError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 mb-4">
              {saveError}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50 rounded-b-xl flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              <>💾 Save visit / Lưu lịch thăm</>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
