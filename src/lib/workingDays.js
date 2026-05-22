// Vietnam factory calendar: Saturday = working, Sunday = off, public holidays = off

const HOLIDAYS = new Set([
  // 2026
  '2026-01-01',
  '2026-02-16','2026-02-17','2026-02-18','2026-02-19','2026-02-20', // Tet
  '2026-04-06', // Hung Kings Festival
  '2026-04-30', // Reunification Day
  '2026-05-01', // Labour Day
  '2026-09-02', // National Day
  // 2027
  '2027-01-01',
  '2027-02-05','2027-02-06','2027-02-07','2027-02-08','2027-02-09', // Tet
  '2027-04-26', // Hung Kings Festival
  '2027-04-30',
  '2027-05-01',
  '2027-09-02',
])

function toKey(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function isWorkingDay(date) {
  const d = new Date(date)
  if (isNaN(d.getTime())) return false
  if (d.getDay() === 0) return false // Sunday
  return !HOLIDAYS.has(toKey(d))
}

// Count working days from start to end (inclusive both ends)
export function countWorkingDays(start, end) {
  const s = new Date(start); s.setHours(0, 0, 0, 0)
  const e = new Date(end);   e.setHours(0, 0, 0, 0)
  if (isNaN(s.getTime()) || isNaN(e.getTime()) || s > e) return 0
  let n = 0
  const cur = new Date(s)
  while (cur <= e) {
    if (isWorkingDay(cur)) n++
    cur.setDate(cur.getDate() + 1)
  }
  return n
}

// Returns the date that is exactly numDays working days from startDate (startDate = day 1 if it is a working day).
export function addWorkingDays(startDate, numDays) {
  const d = new Date(startDate)
  d.setHours(0, 0, 0, 0)
  if (isNaN(d.getTime()) || numDays <= 0) return d
  let counted = 0
  while (counted < numDays) {
    if (isWorkingDay(d)) counted++
    if (counted < numDays) d.setDate(d.getDate() + 1)
  }
  return d
}

// Working days strictly between completion and ship (excludes completion day, includes ship day).
// Returns positive if ship > completion, 0 if same day, negative if ship < completion (critical).
export function shipmentGapWorkingDays(completionDate, shipDate) {
  if (!completionDate || !shipDate) return null
  const c = new Date(completionDate); c.setHours(0, 0, 0, 0)
  const s = new Date(shipDate);       s.setHours(0, 0, 0, 0)
  if (isNaN(c.getTime()) || isNaN(s.getTime())) return null
  if (s.getTime() === c.getTime()) return 0
  const cNext = new Date(c); cNext.setDate(cNext.getDate() + 1)
  const sNext = new Date(s); sNext.setDate(sNext.getDate() + 1)
  if (s > c) return countWorkingDays(cNext, s)
  return -countWorkingDays(sNext, c) // negative = overdue
}
