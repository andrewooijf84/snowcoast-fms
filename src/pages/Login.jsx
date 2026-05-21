import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Snowflake, Eye, EyeOff } from 'lucide-react'
import { useAppStore } from '@/store/useStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { supabase } from '@/lib/supabase'

export default function Login() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { setUser, language, setLanguage } = useAppStore()
  const [email, setEmail] = useState('demo@snowcoast.com')
  const [password, setPassword] = useState('demo1234')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const toggleLang = () => {
    const next = language === 'en' ? 'vi' : 'en'
    setLanguage(next)
    i18n.changeLanguage(next)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const url = import.meta.env.VITE_SUPABASE_URL || ''
    const isConfigured = url && !url.includes('placeholder') && !url.startsWith('<')

    if (isConfigured) {
      const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password })
      if (authError) {
        // If user doesn't exist yet, try creating them (first-time setup)
        if (authError.message.includes('Invalid login')) {
          setError('Invalid email or password. Use demo@snowcoast.com / demo1234 or create a user in Supabase Auth.')
        } else {
          setError(authError.message)
        }
        setLoading(false)
        return
      }
      setUser(data.user)
    } else {
      // Demo mode (no Supabase configured)
      setUser({ email, id: 'demo-user', role: 'admin' })
    }

    setLoading(false)
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      {/* Language toggle */}
      <button
        onClick={toggleLang}
        className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm transition-colors"
      >
        <span>{language === 'en' ? '🇺🇸' : '🇻🇳'}</span>
        <span className="uppercase font-semibold text-xs">{language === 'en' ? 'EN' : 'VI'}</span>
      </button>

      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg">
              <Snowflake className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">{t('app.name')}</h1>
            <p className="text-slate-500 text-sm mt-1">{t('app.tagline')}</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="email">{t('auth.email')}</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@snowcoast.com"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">{t('auth.password')}</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input type="checkbox" className="rounded border-slate-300" defaultChecked />
                Remember me
              </label>
              <button type="button" className="text-sm text-blue-600 hover:underline">
                {t('auth.forgotPassword')}
              </button>
            </div>

            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? t('auth.signingIn') : t('auth.signIn')}
            </Button>
          </form>

          {/* Demo note */}
          <p className="text-center text-xs text-slate-400 mt-6">
            Demo: demo@snowcoast.com / demo1234
          </p>
        </div>
      </div>
    </div>
  )
}
