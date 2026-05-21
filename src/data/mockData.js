import { addDays, subDays, startOfWeek } from 'date-fns'

const today = new Date(2026, 4, 21) // May 21 2026

export const SECTIONS = [
  'cutting', 'embroidery', 'downFilling', 'template', 'component', 'assembly', 'packing'
]

export const LINES = Array.from({ length: 20 }, (_, i) => ({
  pairNo: i + 1,
  componentLine: `C${String(i + 1).padStart(2, '0')}`,
  assemblyLine: `A${String(i + 1).padStart(2, '0')}`,
}))

export const BUYERS = ['North Face', 'Columbia', 'Patagonia', 'Arc\'teryx', 'Marmot', 'Eddie Bauer']
export const STYLES = ['Jacket-001', 'Vest-002', 'Parka-003', 'Pullover-004', 'Anorak-005', 'Coat-006']

const statusColors = {
  active: '#3b82f6',
  completed: '#22c55e',
  pending: '#f59e0b',
  delayed: '#ef4444',
  onTrack: '#10b981',
}

export const mockOrders = [
  {
    id: 'ORD-001', orderNo: 'SC-2026-001', style: 'Jacket-001', buyer: 'North Face',
    qty: 5000, smv: 35.5, startDate: subDays(today, 14), endDate: addDays(today, 21),
    shipDate: addDays(today, 25), status: 'active', progress: 65,
    componentLine: 'C01', assemblyLine: 'A01', requiresEmbroidery: true,
    color: '#3b82f6',
  },
  {
    id: 'ORD-002', orderNo: 'SC-2026-002', style: 'Vest-002', buyer: 'Columbia',
    qty: 3200, smv: 22.0, startDate: subDays(today, 7), endDate: addDays(today, 14),
    shipDate: addDays(today, 18), status: 'active', progress: 40,
    componentLine: 'C02', assemblyLine: 'A02', requiresEmbroidery: false,
    color: '#8b5cf6',
  },
  {
    id: 'ORD-003', orderNo: 'SC-2026-003', style: 'Parka-003', buyer: 'Patagonia',
    qty: 7500, smv: 48.2, startDate: addDays(today, 3), endDate: addDays(today, 35),
    shipDate: addDays(today, 40), status: 'pending', progress: 0,
    componentLine: 'C03', assemblyLine: 'A03', requiresEmbroidery: true,
    color: '#f59e0b',
  },
  {
    id: 'ORD-004', orderNo: 'SC-2026-004', style: 'Pullover-004', buyer: 'Arc\'teryx',
    qty: 2800, smv: 18.5, startDate: subDays(today, 21), endDate: subDays(today, 3),
    shipDate: subDays(today, 1), status: 'completed', progress: 100,
    componentLine: 'C04', assemblyLine: 'A04', requiresEmbroidery: false,
    color: '#22c55e',
  },
  {
    id: 'ORD-005', orderNo: 'SC-2026-005', style: 'Anorak-005', buyer: 'Marmot',
    qty: 4100, smv: 29.0, startDate: subDays(today, 5), endDate: addDays(today, 18),
    shipDate: addDays(today, 22), status: 'delayed', progress: 20,
    componentLine: 'C05', assemblyLine: 'A05', requiresEmbroidery: false,
    color: '#ef4444',
  },
  {
    id: 'ORD-006', orderNo: 'SC-2026-006', style: 'Coat-006', buyer: 'Eddie Bauer',
    qty: 6200, smv: 55.0, startDate: addDays(today, 7), endDate: addDays(today, 45),
    shipDate: addDays(today, 50), status: 'pending', progress: 0,
    componentLine: 'C06', assemblyLine: 'A06', requiresEmbroidery: true,
    color: '#ec4899',
  },
  {
    id: 'ORD-007', orderNo: 'SC-2026-007', style: 'Jacket-001', buyer: 'North Face',
    qty: 3800, smv: 35.5, startDate: subDays(today, 10), endDate: addDays(today, 10),
    shipDate: addDays(today, 14), status: 'active', progress: 55,
    componentLine: 'C07', assemblyLine: 'A07', requiresEmbroidery: false,
    color: '#06b6d4',
  },
  {
    id: 'ORD-008', orderNo: 'SC-2026-008', style: 'Vest-002', buyer: 'Columbia',
    qty: 2500, smv: 22.0, startDate: addDays(today, 1), endDate: addDays(today, 20),
    shipDate: addDays(today, 24), status: 'pending', progress: 0,
    componentLine: 'C08', assemblyLine: 'A08', requiresEmbroidery: false,
    color: '#84cc16',
  },
]

// Capacity loading data (weekly, 12 weeks)
export const mockCapacityData = Array.from({ length: 12 }, (_, i) => {
  const weekStart = addDays(startOfWeek(today), i * 7 - 14)
  const capacity = 45000 + Math.random() * 5000
  const loaded = capacity * (0.6 + Math.random() * 0.35)
  return {
    week: `W${String(i + 1).padStart(2, '0')}`,
    weekLabel: `W${i + 1}`,
    weekStart,
    capacityPcs: Math.round(capacity / 35),
    loadedPcs: Math.round(loaded / 35),
    capacityMins: Math.round(capacity),
    loadedMins: Math.round(loaded),
    loadingPct: Math.round((loaded / capacity) * 100),
  }
})

// Section output data
const sectionKeys = ['cutting', 'embroidery', 'downFilling', 'template', 'component', 'assembly', 'packing']
export const mockSectionOutput = sectionKeys.map(section => ({
  section,
  daily: Array.from({ length: 7 }, (_, i) => {
    const target = 1200 + Math.random() * 300
    const actual = target * (0.85 + Math.random() * 0.25)
    return {
      date: subDays(today, 6 - i),
      target: Math.round(target),
      actual: Math.round(actual),
      efficiency: Math.round((actual / target) * 100),
    }
  }),
  weekly: Array.from({ length: 8 }, (_, i) => {
    const target = 8000 + Math.random() * 2000
    const actual = target * (0.85 + Math.random() * 0.2)
    return {
      week: `W${i + 1}`,
      target: Math.round(target),
      actual: Math.round(actual),
      efficiency: Math.round((actual / target) * 100),
    }
  }),
  monthly: Array.from({ length: 6 }, (_, i) => {
    const target = 32000 + Math.random() * 8000
    const actual = target * (0.88 + Math.random() * 0.15)
    const months = ['Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May']
    return {
      month: months[i],
      target: Math.round(target),
      actual: Math.round(actual),
      efficiency: Math.round((actual / target) * 100),
    }
  }),
}))

// Shipment milestones
export const mockShipments = mockOrders.map(order => ({
  ...order,
  totalQty: order.qty,
  shippedQty: order.status === 'completed' ? order.qty : Math.round(order.qty * order.progress / 100 * 0.6),
  milestones: [
    { name: 'Fabric In', date: subDays(order.startDate, 7), done: true },
    { name: 'Cut Complete', date: addDays(order.startDate, 5), done: order.progress > 20 },
    { name: 'Sewing Start', date: addDays(order.startDate, 7), done: order.progress > 30 },
    { name: 'Sewing Complete', date: subDays(order.endDate, 5), done: order.progress === 100 },
    { name: 'QC Pass', date: subDays(order.endDate, 3), done: order.progress === 100 },
    { name: 'Ship Ready', date: subDays(order.shipDate, 2), done: order.status === 'completed' },
    { name: 'Shipped', date: order.shipDate, done: order.status === 'completed' },
  ],
}))

// Dashboard KPIs
export const mockKPIs = {
  activeOrders: mockOrders.filter(o => o.status === 'active').length,
  linesRunning: 34,
  avgEfficiency: 87.3,
  onTimeShipment: 91.2,
  weeklyOutput: 48200,
  weeklyOutputChange: 3.4,
  capacityUtilization: 78.5,
}

// Dashboard weekly output chart
export const mockWeeklyOutput = Array.from({ length: 8 }, (_, i) => ({
  week: `W${i + 1}`,
  output: Math.round(40000 + Math.random() * 15000),
  target: 50000,
}))
