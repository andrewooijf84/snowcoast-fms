import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import { useAppStore } from '@/store/useStore'
import { useDataInit } from '@/hooks/useDataInit'
import AppShell from '@/components/layout/AppShell'

const Login = lazy(() => import('@/pages/Login'))
const Dashboard = lazy(() => import('@/pages/Dashboard'))
const MasterPlan = lazy(() => import('@/pages/MasterPlan'))
const CapacityLoading = lazy(() => import('@/pages/CapacityLoading'))
const LineMap = lazy(() => import('@/pages/LineMap'))
const SectionOutput = lazy(() => import('@/pages/SectionOutput'))
const ShipmentSchedule = lazy(() => import('@/pages/ShipmentSchedule'))
const Settings = lazy(() => import('@/pages/Settings'))
const Reports = lazy(() => import('@/pages/Reports'))
const CustomerVisits = lazy(() => import('@/pages/CustomerVisits'))

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

function ProtectedRoute({ children }) {
  const { user } = useAppStore()
  if (!user) return <Navigate to="/login" replace />
  return <AppShell><Suspense fallback={<PageLoader />}>{children}</Suspense></AppShell>
}

function AppWithInit() {
  useDataInit()
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/master-plan" element={<ProtectedRoute><MasterPlan /></ProtectedRoute>} />
      <Route path="/capacity-loading" element={<ProtectedRoute><CapacityLoading /></ProtectedRoute>} />
      <Route path="/line-map" element={<ProtectedRoute><LineMap /></ProtectedRoute>} />
      <Route path="/section-output" element={<ProtectedRoute><SectionOutput /></ProtectedRoute>} />
      <Route path="/shipment-schedule" element={<ProtectedRoute><ShipmentSchedule /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
      <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
      <Route path="/customer-visits" element={<ProtectedRoute><CustomerVisits /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter basename="/snowcoast-fms">
      <Suspense fallback={<PageLoader />}>
        <AppWithInit />
      </Suspense>
    </BrowserRouter>
  )
}
