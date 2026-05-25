import { useState, useEffect } from 'react'
import { Plus, X } from 'lucide-react'
import { FormModal, TextField, SelectField, TextareaField, CheckboxField } from '@/components/ui/form-modal'
import { LINES } from '@/data/mockData'

const COLORS = ['#3b82f6','#8b5cf6','#f59e0b','#22c55e','#ef4444','#ec4899','#06b6d4','#84cc16','#f97316','#6366f1']

const BLANK_PORTION = () => ({
  portionName: 'Full order',
  portionQty: '',
  materialArrivalDate: '',
  cutStartDate: '',
  embStartDate: '',
  sewStartDate: '',
  completionDate: '',
  exfactoryDate: '',
  notes: '',
  status: 'pending',
})

export const BLANK_ORDER = {
  orderNo: '', buyer: '', style: '', season: '', qty: '', smv: '',
  requiresEmbroidery: false,
  componentLine: 'C01', assemblyLine: 'A01',
  status: 'pending', progress: 0, color: '#3b82f6', notes: '',
  portions: [BLANK_PORTION()],
}

const fmtDate = (d) => d ? (d instanceof Date ? d.toISOString().split('T')[0] : String(d).slice(0, 10)) : ''

export function toEditForm(o) {
  return {
    ...o,
    portions: (o.portions && o.portions.length > 0)
      ? o.portions.map(p => ({
          ...p,
          portionQty: String(p.portionQty || ''),
          materialArrivalDate: fmtDate(p.materialArrivalDate),
          cutStartDate:        fmtDate(p.cutStartDate),
          embStartDate:        fmtDate(p.embStartDate),
          sewStartDate:        fmtDate(p.sewStartDate),
          completionDate:      fmtDate(p.completionDate),
          exfactoryDate:       fmtDate(p.exfactoryDate),
        }))
      : [BLANK_PORTION()],
  }
}

export default function OrderForm({ open, onClose, initial, onSave }) {
  const [f, setF] = useState(initial || BLANK_ORDER)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const set = (k, v) => setF(p => ({ ...p, [k]: v }))

  useEffect(() => {
    if (open) {
      setF(initial || BLANK_ORDER)
      setErr('')
    }
  }, [open])

  // ── Portion helpers ───────────────────────────────────────────────────────
  const addPortion = () => {
    const blank = BLANK_PORTION()
    blank.portionName = `Portion ${f.portions.length + 1}`
    setF(p => ({ ...p, portions: [...p.portions, blank] }))
  }

  const removePortion = (idx) => {
    if (f.portions.length <= 1) return
    setF(p => ({ ...p, portions: p.portions.filter((_, i) => i !== idx) }))
  }

  const updatePortion = (idx, key, val) => {
    setF(p => {
      const portions = p.portions.map((port, i) => i === idx ? { ...port, [key]: val } : port)
      return { ...p, portions }
    })
  }

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!f.orderNo || !f.buyer) {
      setErr('Order No and Customer are required.')
      return
    }
    if (!f.portions || f.portions.length === 0) {
      setErr('At least one portion is required.')
      return
    }
    for (let i = 0; i < f.portions.length; i++) {
      if (!f.portions[i].portionName) {
        setErr(`Portion ${i + 1} name is required.`)
        return
      }
    }

    setSaving(true); setErr('')
    try {
      const portions = f.portions.map(p => ({
        ...p,
        portionQty:          Number(p.portionQty) || 0,
        materialArrivalDate: p.materialArrivalDate ? new Date(p.materialArrivalDate) : null,
        cutStartDate:        p.cutStartDate        ? new Date(p.cutStartDate)        : null,
        embStartDate:        p.embStartDate        ? new Date(p.embStartDate)        : null,
        sewStartDate:        p.sewStartDate        ? new Date(p.sewStartDate)        : null,
        completionDate:      p.completionDate      ? new Date(p.completionDate)      : null,
        exfactoryDate:       p.exfactoryDate       ? new Date(p.exfactoryDate)       : null,
      }))

      // Derive order-level dates from portions for backward compat
      const firstPortion = portions[0] || {}
      await onSave({
        ...f,
        qty:               Number(f.qty) || 0,
        smv:               Number(f.smv) || 0,
        progress:          Number(f.progress) || 0,
        portions,
        // Legacy fields derived from first/aggregate portion
        materialArrivalDate: firstPortion.materialArrivalDate,
        cutStartDate:        firstPortion.cutStartDate,
        embStartDate:        firstPortion.embStartDate,
        sewStartDate:        firstPortion.sewStartDate,
        completionDate:      firstPortion.completionDate,
        shipDate:            firstPortion.exfactoryDate,
        startDate:           firstPortion.cutStartDate,
        endDate:             firstPortion.completionDate,
      })
      onClose()
    } catch (e) { setErr(e.message) }
    finally { setSaving(false) }
  }

  const lineOpts = LINES.map(l => ({ value: l.componentLine, label: l.componentLine }))
  const asmOpts  = LINES.map(l => ({ value: l.assemblyLine,  label: l.assemblyLine }))

  const totalPortionQty = (f.portions || []).reduce((s, p) => s + (Number(p.portionQty) || 0), 0)
  const orderQty = Number(f.qty) || 0
  const qtyMatch = totalPortionQty === orderQty && orderQty > 0

  return (
    <FormModal open={open} onClose={onClose}
      title={initial?.id ? 'Edit Order' : 'New Order'}
      onSave={handleSave} saving={saving} error={err} wide>

      {/* ── Order info ── */}
      <TextField label="Order Number *" value={f.orderNo} onChange={v => set('orderNo', v)} span={2} placeholder="SC-2026-001" />
      <TextField label="Customer *" value={f.buyer}  onChange={v => set('buyer', v)}  placeholder="e.g. North Face" />
      <TextField label="Style Code"  value={f.style}  onChange={v => set('style', v)}  placeholder="e.g. Jacket-001" />
      <TextField label="Season"      value={f.season} onChange={v => set('season', v)} placeholder="e.g. AW2026" />
      <TextField label="Order Qty"   value={f.qty}    onChange={v => set('qty', v)}    type="number" min="0" />
      <TextField label="SMV"         value={f.smv}    onChange={v => set('smv', v)}    type="number" step="0.1" min="0" />
      <CheckboxField label="Requires Embroidery / Print" checked={f.requiresEmbroidery}
        onChange={v => set('requiresEmbroidery', v)} span={2} />

      {/* ── Line assignment ── */}
      <div className="col-span-2 pt-1 border-t border-slate-100">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Line Assignment</p>
      </div>
      <SelectField label="Component Line" value={f.componentLine} onChange={v => set('componentLine', v)} options={lineOpts} />
      <SelectField label="Assembly Line"  value={f.assemblyLine}  onChange={v => set('assemblyLine', v)}  options={asmOpts} />
      <SelectField label="Status" value={f.status} onChange={v => set('status', v)}
        options={['pending','active','completed','delayed'].map(s => ({ value: s, label: s.charAt(0).toUpperCase() + s.slice(1) }))} />
      <TextField label="Progress %" value={f.progress} onChange={v => set('progress', v)} type="number" min="0" max="100" />

      {/* ── Bar colour ── */}
      <div className="col-span-2">
        <p className="text-xs font-medium text-slate-600 mb-1.5">Bar Colour</p>
        <div className="flex gap-2 flex-wrap">
          {COLORS.map(c => (
            <button key={c} type="button" onClick={() => set('color', c)}
              className={`w-7 h-7 rounded-full border-2 transition-transform ${f.color === c ? 'border-slate-700 scale-110' : 'border-transparent'}`}
              style={{ background: c }} />
          ))}
        </div>
      </div>
      <TextareaField label="Order Notes" value={f.notes} onChange={v => set('notes', v)} span={2} />

      {/* ── Delivery Portions ── */}
      <div className="col-span-2 pt-2 border-t border-slate-100">
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="text-sm font-semibold text-slate-700">Delivery Portions / Các đợt giao hàng</p>
            <p className="text-xs text-slate-400 mt-0.5">
              Split this order into delivery portions. Each portion can have its own dates and line assignments.
            </p>
          </div>
          <button type="button" onClick={addPortion}
            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium whitespace-nowrap ml-3 mt-0.5">
            <Plus className="w-3.5 h-3.5" />Add Portion
          </button>
        </div>

        <div className="space-y-3">
          {(f.portions || []).map((portion, idx) => (
            <div key={idx} className="p-3 border border-slate-200 rounded-lg bg-slate-50/50">
              {/* Portion header */}
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                  Portion {idx + 1}
                </span>
                {f.portions.length > 1 && (
                  <button type="button" onClick={() => removePortion(idx)}
                    className="text-slate-300 hover:text-red-500 transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Portion fields */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-1">Portion Name *</p>
                  <input type="text" value={portion.portionName}
                    onChange={e => updatePortion(idx, 'portionName', e.target.value)}
                    placeholder="e.g. 1st delivery"
                    className="flex h-8 w-full rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-1">Portion Qty *</p>
                  <input type="number" min="0" value={portion.portionQty}
                    onChange={e => updatePortion(idx, 'portionQty', e.target.value)}
                    className="flex h-8 w-full rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                {[
                  ['materialArrivalDate', 'Material Arrival'],
                  ['cutStartDate',        'Cut Start'],
                  ...(f.requiresEmbroidery ? [['embStartDate', 'Emb/Print Start']] : []),
                  ['sewStartDate',        'Sew Start'],
                  ['completionDate',      'Completion'],
                  ['exfactoryDate',       'Ex-Factory'],
                ].map(([key, label]) => (
                  <div key={key}>
                    <p className="text-xs font-medium text-slate-500 mb-1">{label}</p>
                    <input type="date" value={portion[key] || ''}
                      onChange={e => updatePortion(idx, key, e.target.value)}
                      className="flex h-8 w-full rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                ))}
                <div className="col-span-2">
                  <p className="text-xs font-medium text-slate-500 mb-1">Notes</p>
                  <input type="text" value={portion.notes || ''}
                    onChange={e => updatePortion(idx, 'notes', e.target.value)}
                    placeholder="Optional notes for this portion"
                    className="flex h-8 w-full rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Total qty indicator */}
        <div className={`mt-3 flex items-center gap-2 text-xs rounded-lg px-3 py-2 ${
          qtyMatch ? 'bg-green-50 text-green-700 border border-green-200'
                   : 'bg-amber-50 text-amber-700 border border-amber-200'
        }`}>
          <span className="font-bold">{qtyMatch ? '✓' : '⚠'}</span>
          <span>
            Total portion qty: <strong>{totalPortionQty.toLocaleString()}</strong>
            {' / '}Order qty: <strong>{orderQty.toLocaleString()}</strong>
            {!qtyMatch && orderQty > 0 && (
              <span className="ml-1">— Portions total does not match order quantity</span>
            )}
          </span>
        </div>
      </div>
    </FormModal>
  )
}
