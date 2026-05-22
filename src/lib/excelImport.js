import * as XLSX from 'xlsx'

export const SECTION_MAP = {
  'assembly': 'assembly', 'Assembly': 'assembly',
  'component': 'component', 'Component': 'component',
  'cutting': 'cutting', 'Cutting': 'cutting',
  'down filling': 'down_filling', 'Down Filling': 'down_filling',
  'embroidery/print': 'embroidery_print', 'Embroidery/Print': 'embroidery_print',
  'packing': 'packing', 'Packing': 'packing',
  'template': 'template', 'Template': 'template',
}

export function excelDateToString(val) {
  if (val === null || val === undefined || val === '') return null
  if (typeof val === 'string' && val.match(/^\d{4}-\d{2}-\d{2}$/)) return val
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return null
    const y = val.getFullYear()
    const m = String(val.getMonth() + 1).padStart(2, '0')
    const d = String(val.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }
  if (typeof val === 'number') {
    const date = new Date(Math.round((val - 25569) * 86400 * 1000))
    return excelDateToString(date)
  }
  return null
}

export function parseLPNumber(val) {
  if (!val) return null
  const m = String(val).trim().toUpperCase().match(/^LP-?(\d{1,2})$/)
  if (!m) return null
  const n = parseInt(m[1], 10)
  return n >= 1 && n <= 20 ? n : null
}

export function readSheetRows(wb, sheetName) {
  const ws = wb.Sheets[sheetName]
  if (!ws) return null
  // header: 1 returns raw array-of-arrays; raw: true keeps numbers/dates unformatted
  return XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, raw: true })
}

export function downloadExcelReport(rows, filename) {
  if (!rows.length) return
  const ws = XLSX.utils.json_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Error Report')
  XLSX.writeFile(wb, filename)
}
