import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  fetchOrders, createOrder, updateOrder as apiUpdateOrder, deleteOrder as apiDeleteOrder,
  fetchCapacityData, fetchSectionOutput, fetchShipments, seedFromMock,
} from '../lib/api'
import {
  mockOrders, mockCapacityData, mockSectionOutput, mockShipments,
  mockKPIs, mockWeeklyOutput,
} from '../data/mockData'

function computeKPIs(orders) {
  return {
    activeOrders: orders.filter(o => o.status === 'active').length,
    linesRunning: orders.filter(o => o.status === 'active').length * 2 || 34,
    avgEfficiency: 87.3,
    onTimeShipment: 91.2,
    weeklyOutput: 48200,
    weeklyOutputChange: 3.4,
    capacityUtilization: 78.5,
  }
}

const isSupabaseConfigured = () =>
  !!(import.meta.env.VITE_SUPABASE_URL &&
     !import.meta.env.VITE_SUPABASE_URL.includes('placeholder') &&
     !import.meta.env.VITE_SUPABASE_URL.startsWith('<'))

export const useAppStore = create(
  persist(
    (set, get) => ({
      // ── Auth ────────────────────────────────────────────────────────────────
      user: null,
      setUser: (user) => set({ user }),
      logout: () => set({ user: null }),

      // ── Language ────────────────────────────────────────────────────────────
      language: 'en',
      setLanguage: (lang) => {
        localStorage.setItem('fms-lang', lang)
        set({ language: lang })
      },

      // ── UI ──────────────────────────────────────────────────────────────────
      sidebarOpen: true,
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),

      selectedDate: new Date(),
      setSelectedDate: (date) => set({ selectedDate: date }),

      lineMapView: 'week',
      setLineMapView: (view) => set({ lineMapView: view }),

      sectionOutputPeriod: 'daily',
      setSectionOutputPeriod: (period) => set({ sectionOutputPeriod: period }),

      masterPlanView: 'gantt',
      setMasterPlanView: (view) => set({ masterPlanView: view }),

      // ── Loading / Error ─────────────────────────────────────────────────────
      loading: { orders: false, capacity: false, sections: false, shipments: false },
      error: { orders: null, capacity: null, sections: null, shipments: null },
      dataSeeded: false,

      setLoading: (key, val) => set(s => ({ loading: { ...s.loading, [key]: val } })),
      setError: (key, val) => set(s => ({ error: { ...s.error, [key]: val } })),

      // ── Data ────────────────────────────────────────────────────────────────
      orders: [],
      capacityData: [],
      sectionOutput: [],
      shipments: [],
      kpis: mockKPIs,
      weeklyOutput: mockWeeklyOutput,

      // ── Fetch actions ───────────────────────────────────────────────────────
      fetchOrders: async () => {
        const store = get()
        if (!isSupabaseConfigured()) {
          set({ orders: mockOrders, kpis: computeKPIs(mockOrders) })
          return
        }
        store.setLoading('orders', true)
        store.setError('orders', null)
        try {
          const data = await fetchOrders()
          if (data.length === 0 && !store.dataSeeded) {
            // Auto-seed on first run
            await store.seedDemoData()
            return
          }
          set({ orders: data, kpis: computeKPIs(data) })
        } catch (err) {
          console.error('fetchOrders:', err)
          store.setError('orders', err.message)
          set({ orders: mockOrders, kpis: computeKPIs(mockOrders) })
        } finally {
          store.setLoading('orders', false)
        }
      },

      fetchCapacity: async () => {
        const store = get()
        if (!isSupabaseConfigured()) {
          set({ capacityData: mockCapacityData })
          return
        }
        store.setLoading('capacity', true)
        try {
          const data = await fetchCapacityData()
          set({ capacityData: data.length ? data : mockCapacityData })
        } catch (err) {
          console.error('fetchCapacity:', err)
          set({ capacityData: mockCapacityData })
        } finally {
          store.setLoading('capacity', false)
        }
      },

      fetchSections: async () => {
        const store = get()
        if (!isSupabaseConfigured()) {
          set({ sectionOutput: mockSectionOutput })
          return
        }
        store.setLoading('sections', true)
        try {
          const data = await fetchSectionOutput()
          const hasData = data.some(s => s.daily.length || s.weekly.length || s.monthly.length)
          set({ sectionOutput: hasData ? data : mockSectionOutput })
        } catch (err) {
          console.error('fetchSections:', err)
          set({ sectionOutput: mockSectionOutput })
        } finally {
          store.setLoading('sections', false)
        }
      },

      fetchShipments: async () => {
        const store = get()
        if (!isSupabaseConfigured()) {
          set({ shipments: mockShipments })
          return
        }
        store.setLoading('shipments', true)
        try {
          const data = await fetchShipments()
          set({ shipments: data.length ? data : mockShipments })
        } catch (err) {
          console.error('fetchShipments:', err)
          set({ shipments: mockShipments })
        } finally {
          store.setLoading('shipments', false)
        }
      },

      fetchAll: async () => {
        const store = get()
        await Promise.all([
          store.fetchOrders(),
          store.fetchCapacity(),
          store.fetchSections(),
          store.fetchShipments(),
        ])
      },

      // ── Seed demo data into Supabase ────────────────────────────────────────
      seedDemoData: async () => {
        const store = get()
        try {
          const ordersWithMilestones = mockShipments.map(s => ({
            ...s, milestones: s.milestones,
          }))
          await seedFromMock(ordersWithMilestones, mockCapacityData, mockSectionOutput)
          set({ dataSeeded: true })
          await store.fetchAll()
        } catch (err) {
          console.error('seedDemoData:', err)
          // Fall back silently to mock data
          set({ orders: mockOrders, capacityData: mockCapacityData, sectionOutput: mockSectionOutput, shipments: mockShipments })
        }
      },

      // ── CRUD: Orders ────────────────────────────────────────────────────────
      addOrder: async (order) => {
        if (!isSupabaseConfigured()) {
          set(s => ({ orders: [...s.orders, order] }))
          return order
        }
        try {
          const saved = await createOrder(order)
          set(s => ({ orders: [...s.orders, saved] }))
          return saved
        } catch (err) {
          console.error('addOrder:', err)
          throw err
        }
      },

      updateOrder: async (id, updates) => {
        if (!isSupabaseConfigured()) {
          set(s => ({ orders: s.orders.map(o => o.id === id ? { ...o, ...updates } : o) }))
          return
        }
        try {
          const saved = await apiUpdateOrder(id, updates)
          set(s => ({ orders: s.orders.map(o => o.id === id ? saved : o) }))
        } catch (err) {
          console.error('updateOrder:', err)
          throw err
        }
      },

      deleteOrder: async (id) => {
        if (!isSupabaseConfigured()) {
          set(s => ({ orders: s.orders.filter(o => o.id !== id) }))
          return
        }
        try {
          await apiDeleteOrder(id)
          set(s => ({ orders: s.orders.filter(o => o.id !== id) }))
        } catch (err) {
          console.error('deleteOrder:', err)
          throw err
        }
      },
    }),
    {
      name: 'fms-storage',
      partialize: (s) => ({ language: s.language, sidebarOpen: s.sidebarOpen, dataSeeded: s.dataSeeded }),
    }
  )
)
