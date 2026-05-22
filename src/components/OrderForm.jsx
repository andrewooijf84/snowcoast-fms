import { useState, useEffect } from 'react'
import { FormModal, TextField, SelectField, TextareaField, CheckboxField } from '@/components/ui/form-modal'
import { LINES } from '@/data/mockData'

const COLORS = ['#3b82f6','#8b5cf6','#f59e0b','#22c55e','#ef4444','#ec4899','#06b6d4','#84cc16','#f97316','#6366f1']

export const BLANK_ORDER = {
  orderNo: '', buyer: '', style: '', season: '', qty: '', smv: '',
  requiresEmbroidery: false,
  materialArrivalDate: '', cutStartDate: '', embStartDate: '',
  sewStartDate: '', completionDate: '', shipDate: '',
  componentLine: 'C01', assemblyLine: 'A01',
  status: 'pending', progress: 0, color: '#3b82f6', notes: '',
}

export function toEditForm(o) {
  const fmt = (d) => d ? (d instanceof Date ? d.toISOString().split('T')[0] : String(d).slice(0, 10)) : ''
  return {
    ...o,
    materialArrivalDate: fmt(o.materialArrivalDate),
    cutStartDate:        fmt(o.cutStartDate),
    embStartDate:        fmt(o.embStartDate),
    sewStartDate:        fmt(o.sewStartDate),
    completionDate:      fmt(o.completionDate),
    shipDate:            fmt(o.shipDate),
  }
}

export default function OrderForm({ open, onClose, initial, onSave }) {
  const [f, setF] = useState(initial || BLANK_ORDER)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const set = (k, v) => setF(p => ({ ...p, [k]: v }))

  useEffect(() => {
    if (open) { setF(initial || BLANK_ORDER); setErr('') }
  }, [open])

  const handleSave = async () => {
    if (!f.orderNo || !f.buyer) {
      setErr('Order No and Customer are required.'); return
    }
    setSaving(true); setErr('')
    try {
      await onSave({
        ...f,
        qty: Number(f.qty) || 0,
        smv: Number(f.smv) || 0,
        progress: Number(f.progress) || 0,
        materialArrivalDate: f.materialArrivalDate ? new Date(f.materialArrivalDate) : null,
        cutStartDate:  f.cutStartDate  ? new Date(f.cutStartDate)  : null,
        embStartDate:  f.embStartDate  ? new Date(f.embStartDate)  : null,
        sewStartDate:  f.sewStartDate  ? new Date(f.sewStartDate)  : null,
        completionDate: f.completionDate ? new Date(f.completionDate) : null,
        shipDate: f.shipDate ? new Date(f.shipDate) : null,
        startDate: f.cutStartDate ? new Date(f.cutStartDate) : null,
        endDate: f.completionDate ? new Date(f.completionDate) : null,
      })
      onClose()
    } catch (e) { setErr(e.message) }
    finally { setSaving(false) }
  }

  const lineOpts = LINES.map(l => ({ value: l.componentLine, label: l.componentLine }))
  const asmOpts  = LINES.map(l => ({ value: l.assemblyLine,  label: l.assemblyLine }))

  return (
    <FormModal open={open} onClose={onClose} title={initial?.id ? 'Edit Order' : 'New Order'}
      onSave={handleSave} saving={saving} error={err} wide>
      <TextField label="Order Number *" value={f.orderNo} onChange={v => set('orderNo', v)} span={2} placeholder="SC-2026-001" />
      <TextField label="Customer *" value={f.buyer} onChange={v => set('buyer', v)} placeholder="e.g. North Face" />
      <TextField label="Style Code"   value={f.style}  onChange={v => set('style', v)}  placeholder="e.g. Jacket-001" />
      <TextField label="Season"       value={f.season} onChange={v => set('season', v)} placeholder="e.g. AW2026" />
      <TextField label="Order Qty"    value={f.qty}    onChange={v => set('qty', v)}    type="number" min="0" />
      <TextField label="SMV"          value={f.smv}    onChange={v => set('smv', v)}    type="number" step="0.1" min="0" />
      <CheckboxField label="Requires Embroidery / Print" checked={f.requiresEmbroidery}
        onChange={v => set('requiresEmbroidery', v)} span={2} />

      <div className="col-span-2 pt-1 border-t border-slate-100">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Planning Dates</p>
      </div>
      <TextField label="Material Arrival" value={f.materialArrivalDate} onChange={v => set('materialArrivalDate', v)} type="date" />
      <TextField label="Cut Start"        value={f.cutStartDate}        onChange={v => set('cutStartDate', v)}        type="date" />
      {f.requiresEmbroidery && (
        <TextField label="Embroidery Start" value={f.embStartDate} onChange={v => set('embStartDate', v)} type="date" />
      )}
      <TextField label="Sew Start"       value={f.sewStartDate}   onChange={v => set('sewStartDate', v)}   type="date" />
      <TextField label="Completion Date" value={f.completionDate} onChange={v => set('completionDate', v)} type="date" />
      <TextField label="Ex-Factory Date" value={f.shipDate}       onChange={v => set('shipDate', v)}       type="date" />

      <div className="col-span-2 pt-1 border-t border-slate-100">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Line Assignment</p>
      </div>
      <SelectField label="Component Line" value={f.componentLine} onChange={v => set('componentLine', v)} options={lineOpts} />
      <SelectField label="Assembly Line"  value={f.assemblyLine}  onChange={v => set('assemblyLine', v)}  options={asmOpts} />
      <SelectField label="Status" value={f.status} onChange={v => set('status', v)}
        options={['pending','active','completed','delayed'].map(s => ({ value: s, label: s.charAt(0).toUpperCase() + s.slice(1) }))} />
      <TextField label="Progress %" value={f.progress} onChange={v => set('progress', v)} type="number" min="0" max="100" />

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
      <TextareaField label="Notes" value={f.notes} onChange={v => set('notes', v)} span={2} />
    </FormModal>
  )
}
