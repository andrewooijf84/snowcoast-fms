import { useTranslation } from 'react-i18next'
import { Bell, User, LogOut } from 'lucide-react'
import { useAppStore } from '@/store/useStore'
import { Button } from '@/components/ui/button'
import { useNavigate } from 'react-router-dom'

export default function Topbar({ title }) {
  const { t, i18n } = useTranslation()
  const { user, logout, language, setLanguage } = useAppStore()
  const navigate = useNavigate()

  const toggleLang = () => {
    const next = language === 'en' ? 'vi' : 'en'
    setLanguage(next)
    i18n.changeLanguage(next)
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6 sticky top-0 z-40">
      <h1 className="text-lg font-semibold text-slate-900">{title}</h1>

      <div className="flex items-center gap-3">
        {/* Language Toggle */}
        <button
          onClick={toggleLang}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-sm font-medium text-slate-700 transition-colors"
        >
          <span className="text-base">{language === 'en' ? '🇺🇸' : '🇻🇳'}</span>
          <span className="uppercase text-xs font-semibold">{language === 'en' ? 'EN' : 'VI'}</span>
        </button>

        {/* Notifications */}
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5 text-slate-600" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
        </Button>

        {/* User */}
        <div className="flex items-center gap-2 pl-3 border-l border-slate-200">
          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
            <User className="w-4 h-4 text-white" />
          </div>
          {user && (
            <div className="hidden md:block">
              <p className="text-sm font-medium text-slate-900 leading-tight">{user.email?.split('@')[0]}</p>
              <p className="text-xs text-slate-500">Admin</p>
            </div>
          )}
          <Button variant="ghost" size="icon" onClick={handleLogout}>
            <LogOut className="w-4 h-4 text-slate-500" />
          </Button>
        </div>
      </div>
    </header>
  )
}
