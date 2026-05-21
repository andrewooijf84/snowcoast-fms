import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import Topbar from './Topbar'

const pageTitles = {
  '/': 'nav.dashboard',
  '/master-plan': 'nav.masterPlan',
  '/capacity-loading': 'nav.capacityLoading',
  '/line-map': 'nav.lineMap',
  '/section-output': 'nav.sectionOutput',
  '/shipment-schedule': 'nav.shipmentSchedule',
  '/settings': 'nav.settings',
}

export default function AppShell({ children }) {
  const { t } = useTranslation()
  const location = useLocation()
  const titleKey = pageTitles[location.pathname] || 'app.name'

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar title={t(titleKey)} />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
