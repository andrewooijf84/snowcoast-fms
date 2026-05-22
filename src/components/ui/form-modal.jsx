import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './dialog'
import { Button } from './button'
import { Label } from './label'
import { InlineError } from './spinner'

const fieldCls = 'flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-400'
const textareaCls = 'w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none'

export function FieldRow({ label, span, children }) {
  return (
    <div className={span === 2 ? 'col-span-2' : ''}>
      {label && <Label className="text-xs mb-1 block text-slate-600">{label}</Label>}
      {children}
    </div>
  )
}

export function TextField({ label, value, onChange, span, required, placeholder, type = 'text', step, min, max, disabled }) {
  return (
    <FieldRow label={label} span={span}>
      <input
        type={type} step={step} min={min} max={max}
        value={value ?? ''} onChange={e => onChange(e.target.value)}
        placeholder={placeholder} required={required} disabled={disabled}
        className={fieldCls}
      />
    </FieldRow>
  )
}

export function SelectField({ label, value, onChange, options, span, placeholder }) {
  return (
    <FieldRow label={label} span={span}>
      <select value={value ?? ''} onChange={e => onChange(e.target.value)} className={fieldCls}>
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </FieldRow>
  )
}

export function TextareaField({ label, value, onChange, span, rows = 2, placeholder }) {
  return (
    <FieldRow label={label} span={span}>
      <textarea
        value={value ?? ''} onChange={e => onChange(e.target.value)}
        rows={rows} placeholder={placeholder}
        className={textareaCls}
      />
    </FieldRow>
  )
}

export function CheckboxField({ label, checked, onChange, span }) {
  return (
    <FieldRow span={span}>
      <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer select-none">
        <input type="checkbox" checked={!!checked} onChange={e => onChange(e.target.checked)}
          className="w-4 h-4 rounded border-slate-300 accent-blue-600" />
        {label}
      </label>
    </FieldRow>
  )
}

export function FormModal({ open, onClose, title, onSave, saving, error, children, wide }) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className={`${wide ? 'max-w-2xl' : 'max-w-lg'} max-h-[90vh] overflow-y-auto`}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 py-1">
          {children}
        </div>
        {error && <InlineError message={error} />}
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={onSave} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
