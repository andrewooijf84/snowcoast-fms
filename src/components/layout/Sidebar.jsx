import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  LayoutDashboard, CalendarDays, Gauge, Map, BarChart3,
  Truck, Settings, ChevronLeft, ChevronRight, Snowflake, FileText
} from 'lucide-react'
import { useAppStore } from '@/store/useStore'
import { cn } from '@/lib/utils'

const navItems = [
  { key: 'dashboard', icon: LayoutDashboard, to: '/' },
  { key: 'masterPlan', icon: CalendarDays, to: '/master-plan' },
  { key: 'capacityLoading', icon: Gauge, to: '/capacity-loading' },
  { key: 'lineMap', icon: Map, to: '/line-map' },
  { key: 'sectionOutput', icon: BarChart3, to: '/section-output' },
  { key: 'shipmentSchedule', icon: Truck, to: '/shipment-schedule' },
  { key: 'reports', icon: FileText, to: '/reports' },
]

export default function Sidebar() {
  const { t } = useTranslation()
  const { sidebarOpen, toggleSidebar } = useAppStore()

  return (
    <aside
      className={cn(
        'relative flex flex-col bg-slate-900 text-white transition-all duration-300 ease-in-out h-screen sticky top-0',
        sidebarOpen ? 'w-60' : 'w-16'
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-slate-700">
        <div className="flex-shrink-0 w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
          <Snowflake className="w-5 h-5 text-white" />
        </div>
        {sidebarOpen && (
          <div className="overflow-hidden">
            <p className="text-sm font-bold text-white leading-tight truncate">Snow Coast</p>
            <p className="text-xs text-slate-400 truncate">FMS</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 space-y-1 px-2 overflow-y-auto">
        {navItems.map(({ key, icon: Icon, to }) => (
          <NavLink
            key={key}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors group',
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              )
            }
          >
            <Icon className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span className="truncate">{t(`nav.${key}`)}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Settings */}
      <div className="px-2 py-4 border-t border-slate-700 space-y-1">
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
              isActive ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'
            )
          }
        >
          <Settings className="w-5 h-5 flex-shrink-0" />
          {sidebarOpen && <span>{t('nav.settings')}</span>}
        </NavLink>
      </div>

      {/* Toggle button */}
      <button
        onClick={toggleSidebar}
        className="absolute -right-3 top-20 bg-white border border-slate-200 rounded-full p-0.5 shadow-md hover:bg-slate-50 z-10"
      >
        {sidebarOpen
          ? <ChevronLeft className="w-4 h-4 text-slate-600" />
          : <ChevronRight className="w-4 h-4 text-slate-600" />
        }
      </button>
    </aside>
  )
}
