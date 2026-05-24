import { jsPDF } from 'jspdf'
import { format } from 'date-fns'

function formatTime(t) {
  if (!t) return ''
  return t.slice(0, 5) // HH:MM
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  try {
    const [y, m, d] = dateStr.split('-')
    return format(new Date(Number(y), Number(m) - 1, Number(d)), 'dd MMMM yyyy')
  } catch {
    return dateStr
  }
}

export function printVisitPdf(visit) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })

  const pageW = 210
  const margin = 18
  const contentW = pageW - margin * 2
  let y = 20

  // ── Header background ───────────────────────────────────────────────────
  doc.setFillColor(30, 64, 175) // blue-800
  doc.rect(0, 0, pageW, 40, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text('Snow Coast', margin, 15)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text('CUSTOMER VISIT SCHEDULE', margin, 23)

  // Date badge on right
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  const dateText = formatDate(visit.visitDate)
  doc.text(dateText, pageW - margin, 18, { align: 'right' })

  y = 50

  // ── Company + Purpose ───────────────────────────────────────────────────
  doc.setTextColor(30, 41, 59) // slate-800
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text(visit.companyName, margin, y)
  y += 7

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100, 116, 139) // slate-500
  doc.text(`Purpose: ${visit.purpose}`, margin, y)
  y += 12

  // ── Horizontal rule ─────────────────────────────────────────────────────
  doc.setDrawColor(226, 232, 240)
  doc.line(margin, y, pageW - margin, y)
  y += 8

  // ── Visitors ────────────────────────────────────────────────────────────
  if (visit.visitors?.length) {
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(30, 41, 59)
    doc.text('VISITORS', margin, y)
    y += 5

    // Table header
    doc.setFillColor(248, 250, 252)
    doc.rect(margin, y, contentW, 6, 'F')
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(100, 116, 139)
    doc.text('#', margin + 2, y + 4)
    doc.text('Name', margin + 12, y + 4)
    doc.text('Title / Position', margin + 90, y + 4)
    y += 6

    doc.setFont('helvetica', 'normal')
    doc.setTextColor(30, 41, 59)
    visit.visitors.forEach((v, i) => {
      if (i % 2 === 0) {
        doc.setFillColor(249, 250, 251)
        doc.rect(margin, y, contentW, 6, 'F')
      }
      doc.setFontSize(9)
      doc.text(String(i + 1), margin + 2, y + 4)
      doc.text(v.fullName || '', margin + 12, y + 4)
      doc.text(v.title || '', margin + 90, y + 4)
      y += 6
    })
    y += 6
  }

  // ── Itinerary ────────────────────────────────────────────────────────────
  if (visit.itinerary?.length) {
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(30, 41, 59)
    doc.text('ITINERARY', margin, y)
    y += 5

    // Table header
    doc.setFillColor(219, 234, 254) // blue-100
    doc.rect(margin, y, contentW, 6, 'F')
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(30, 64, 175)
    doc.text('TIME', margin + 2, y + 4)
    doc.text('ACTIVITY', margin + 22, y + 4)
    y += 6

    doc.setTextColor(30, 41, 59)
    visit.itinerary.forEach((item, i) => {
      if (i % 2 === 0) {
        doc.setFillColor(248, 250, 252)
        doc.rect(margin, y, contentW, 7, 'F')
      }
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.text(formatTime(item.time), margin + 2, y + 5)
      doc.setFont('helvetica', 'normal')
      const lines = doc.splitTextToSize(item.description || '', contentW - 25)
      doc.text(lines, margin + 22, y + 5)
      const rowH = Math.max(7, lines.length * 5)
      y += rowH
    })
    y += 6
  }

  // ── Transport ────────────────────────────────────────────────────────────
  if (visit.transportRequired) {
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(30, 41, 59)
    doc.text('TRANSPORTATION', margin, y)
    y += 5

    doc.setFillColor(255, 237, 213) // orange-100
    doc.rect(margin, y, contentW, 16, 'F')
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(30, 41, 59)
    doc.text(`Pick-up: ${visit.pickupLocation || '—'} at ${formatTime(visit.pickupTime) || '—'}`, margin + 4, y + 6)
    doc.text(`Drop-off: ${visit.dropoffLocation || '—'} at ${formatTime(visit.dropoffTime) || '—'}`, margin + 4, y + 12)
    y += 22
  }

  // ── Meals ────────────────────────────────────────────────────────────────
  const hasMeals = visit.lunchRequired || visit.dinnerRequired
  if (hasMeals) {
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(30, 41, 59)
    doc.text('MEALS', margin, y)
    y += 5

    if (visit.lunchRequired) {
      doc.setFillColor(254, 252, 232) // yellow-50
      doc.rect(margin, y, contentW, 14, 'F')
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(120, 83, 8) // amber-800
      doc.text('☀ Lunch', margin + 4, y + 6)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(30, 41, 59)
      doc.text(`${visit.lunchRestaurant || '—'}  •  ${visit.lunchAddress || '—'}`, margin + 4, y + 11)
      y += 16
    }

    if (visit.dinnerRequired) {
      doc.setFillColor(245, 243, 255) // purple-50
      doc.rect(margin, y, contentW, 14, 'F')
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(91, 33, 182) // purple-800
      doc.text('★ Dinner', margin + 4, y + 6)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(30, 41, 59)
      doc.text(`${visit.dinnerRestaurant || '—'}  •  ${visit.dinnerAddress || '—'}`, margin + 4, y + 11)
      y += 16
    }
  }

  // ── Remarks ──────────────────────────────────────────────────────────────
  if (visit.remarks?.trim()) {
    y += 2
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(30, 41, 59)
    doc.text('REMARKS', margin, y)
    y += 5
    doc.setFontSize(9)
    doc.setFont('helvetica', 'italic')
    doc.setTextColor(100, 116, 139)
    const remarksLines = doc.splitTextToSize(visit.remarks, contentW)
    doc.text(remarksLines, margin, y)
    y += remarksLines.length * 5 + 4
  }

  // ── Footer ────────────────────────────────────────────────────────────────
  const footerY = 285
  doc.setDrawColor(226, 232, 240)
  doc.line(margin, footerY, pageW - margin, footerY)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(148, 163, 184) // slate-400
  const today = format(new Date(), 'dd MMM yyyy')
  doc.text('Snow Coast — Confidential', margin, footerY + 5)
  doc.text(`Prepared ${today}`, pageW - margin, footerY + 5, { align: 'right' })

  // ── Save ──────────────────────────────────────────────────────────────────
  const safeCompany = (visit.companyName || 'Visit').replace(/[^a-zA-Z0-9]/g, '_')
  const safeDate = (visit.visitDate || '').replace(/-/g, '')
  doc.save(`Visit_${safeCompany}_${safeDate}.pdf`)
}
