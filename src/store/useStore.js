import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  fetchOrders, createOrder, updateOrder as apiUpdate, deleteOrder as apiDelete,
  fetchLineAllocations, createLineAllocation, deleteLineAllocation, updateLineAllocation as apiUpdateAlloc,
  fetchSectionOutputRows, createSectionOutputEntry, deleteSectionOutputEntry,
  fetchShipments, updateMilestoneRecord,
  fetchDailyLineOutput, createDailyLineOutput, deleteDailyLineOutput,
} from '../lib/api'
import { LINES } from '../data/mockData'

const isSupabase = () => {
  const url = import.meta.env.VITE_SUPABASE_URL || ''
  return url && !url.includes('placeholder') && !url.startsWith('<')
}

export const useAppStore = create(
  persist(
    (set, get) => ({
      // ── Auth ────────────────────────────────────────────────────────────
      user: null,
      setUser: (u) => set({ user: u }),
      logout: () => set({ user: null }),
      getRole: () => {
        const u = get().user
        return u?.role || u?.user_metadata?.role || 'viewer'
      },
      canEdit: () => ['admin', 'planning'].includes(get().getRole()),

      // ── Language / UI ───────────────────────────────────────────────────
      language: 'en',
      setLanguage: (lang) => { localStorage.setItem('fms-lang', lang); set({ language: lang }) },
      sidebarOpen: true,
      toggleSidebar: () => set(s => ({ sidebarOpen: !s.sidebarOpen })),
      masterPlanView: 'gantt',
      setMasterPlanView: (v) => set({ masterPlanView: v }),
      lineMapView: 'week',
      setLineMapView: (v) => set({ lineMapView: v }),
      sectionOutputPeriod: 'daily',
      setSectionOutputPeriod: (v) => set({ sectionOutputPeriod: v }),

      // ── Loading / Error ─────────────────────────────────────────────────
      loading: {},
      errors: {},
      _setLoading: (k, v) => set(s => ({ loading: { ...s.loading, [k]: v } })),
      _setError: (k, v) => set(s => ({ errors: { ...s.errors, [k]: v } })),

      // ── Data ────────────────────────────────────────────────────────────
      orders: [],
      lineAllocations: [],
      sectionOutputRows: [],
      shipments: [],
      dailyLineOutput: [],

      // ── Fetch ────────────────────────────────────────────────────────────
      fetchOrders: async () => {
        const s = get()
        s._setLoading('orders', true); s._setError('orders', null)
        try {
          const data = await fetchOrders()
          set({ orders: data })
        } catch (e) { s._setError('orders', e.message) }
        finally { s._setLoading('orders', false) }
      },

      fetchLineAllocations: async () => {
        const s = get()
        s._setLoading('allocations', true)
        try { set({ lineAllocations: await fetchLineAllocations() }) }
        catch (e) { s._setError('allocations', e.message) }
        finally { s._setLoading('allocations', false) }
      },

      fetchSectionOutput: async () => {
        const s = get()
        s._setLoading('sections', true)
        try { set({ sectionOutputRows: await fetchSectionOutputRows() }) }
        catch (e) { s._setError('sections', e.message) }
        finally { s._setLoading('sections', false) }
      },

      fetchShipments: async () => {
        const s = get()
        s._setLoading('shipments', true)
        try { set({ shipments: await fetchShipments() }) }
        catch (e) { s._setError('shipments', e.message) }
        finally { s._setLoading('shipments', false) }
      },

      fetchDailyOutput: async () => {
        const s = get()
        s._setLoading('daily', true)
        try { set({ dailyLineOutput: await fetchDailyLineOutput() }) }
        catch (e) { s._setError('daily', e.message) }
        finally { s._setLoading('daily', false) }
      },

      fetchAll: async () => {
        const s = get()
        await Promise.all([
          s.fetchOrders(),
          s.fetchLineAllocations(),
          s.fetchSectionOutput(),
          s.fetchShipments(),
          s.fetchDailyOutput(),
        ])
      },

      // ── Orders CRUD ──────────────────────────────────────────────────────
      addOrder: async (order) => {
        const saved = await createOrder(order)
        set(s => ({ orders: [...s.orders, saved] }))
        await get().fetchShipments()
        return saved
      },
      updateOrder: async (id, updates) => {
        const saved = await apiUpdate(id, updates)
        set(s => ({ orders: s.orders.map(o => o.id === id ? saved : o) }))
        await get().fetchShipments()
      },
      deleteOrder: async (id) => {
        await apiDelete(id)
        set(s => ({ orders: s.orders.filter(o => o.id !== id) }))
      },

      // ── Line Allocations CRUD ────────────────────────────────────────────
      addLineAllocation: async (alloc) => {
        const saved = await createLineAllocation(alloc)
        set(s => ({ lineAllocations: [...s.lineAllocations, saved] }))
        return saved
      },
      updateLineAllocation: async (id, updates) => {
        const saved = await apiUpdateAlloc(id, updates)
        set(s => ({ lineAllocations: s.lineAllocations.map(a => a.id === id ? saved : a) }))
        return saved
      },
      removeLineAllocation: async (id) => {
        await deleteLineAllocation(id)
        set(s => ({ lineAllocations: s.lineAllocations.filter(a => a.id !== id) }))
      },

      // ── Section Output CRUD ──────────────────────────────────────────────
      addSectionOutput: async (entry) => {
        await createSectionOutputEntry(entry)
        await get().fetchSectionOutput()
      },
      removeSectionOutput: async (id) => {
        await deleteSectionOutputEntry(id)
        set(s => ({ sectionOutputRows: s.sectionOutputRows.filter(r => r.id !== id) }))
      },

      // ── Milestone update ─────────────────────────────────────────────────
      updateMilestone: async (id, updates) => {
        await updateMilestoneRecord(id, updates)
        await get().fetchShipments()
      },

      // ── Daily Line Output CRUD ───────────────────────────────────────────
      addDailyOutput: async (entry) => {
        await createDailyLineOutput(entry)
        await get().fetchDailyOutput()
      },
      removeDailyOutput: async (id) => {
        await deleteDailyLineOutput(id)
        set(s => ({ dailyLineOutput: s.dailyLineOutput.filter(r => r.id !== id) }))
      },
    }),
    {
      name: 'fms-v2',
      partialize: s => ({ language: s.language, sidebarOpen: s.sidebarOpen, masterPlanView: s.masterPlanView }),
    }
  )
)
