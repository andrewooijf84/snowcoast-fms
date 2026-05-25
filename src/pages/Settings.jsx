import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAppStore } from '@/store/useStore'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Globe, Database, Factory, CheckCircle, Trash2, AlertTriangle } from 'lucide-react'

export default function Settings() {
  const { t, i18n } = useTranslation()
  const { language, setLanguage, factoryConfig, setFactoryConfig, clearAllData } = useAppStore()
  const [cfg, setCfg] = useState({ ...factoryConfig })
  const [saved, setSaved] = useState(false)

  // Danger Zone state
  const [clearStep, setClearStep] = useState(0) // 0=idle, 1=confirm, 2=clearing, 3=done
  const [clearError, setClearError] = useState(null)

  const handleClearData = async () => {
    if (clearStep === 0) { setClearStep(1); return }
    if (clearStep === 1) {
      setClearStep(2)
      setClearError(null)
      try {
        await clearAllData()
        setClearStep(3)
        setTimeout(() => setClearStep(0), 3000)
      } catch (e) {
        setClearError(e.message)
        setClearStep(1)
      }
    }
  }

  const toggleLang = (lang) => {
    setLanguage(lang)
    i18n.changeLanguage(lang)
  }

  const handleSave = () => {
    setFactoryConfig({
      totalLinePairs: Number(cfg.totalLinePairs),
      workingHoursPerDay: Number(cfg.workingHoursPerDay),
      operatorsPerLine: Number(cfg.operatorsPerLine),
      defaultEfficiency: Number(cfg.defaultEfficiency),
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <div className="max-w-2xl space-y-6">
      {/* Language */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Globe className="w-5 h-5 text-blue-500" />
            Language / Ngôn Ngữ
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            {[
              { code: 'en', flag: '🇺🇸', name: 'English' },
              { code: 'vi', flag: '🇻🇳', name: 'Tiếng Việt' },
              { code: 'zh', flag: '🇨🇳', name: '中文' },
            ].map(({ code, flag, name }) => (
              <button
                key={code}
                onClick={() => toggleLang(code)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${
                  language === code
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                <span className="text-xl">{flag}</span>
                {name}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Factory Config */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Factory className="w-5 h-5 text-blue-500" />
            Factory Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Total Line Pairs</Label>
              <Input
                type="number"
                value={cfg.totalLinePairs}
                onChange={e => setCfg(c => ({ ...c, totalLinePairs: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Working Hours/Day</Label>
              <Input
                type="number"
                value={cfg.workingHoursPerDay}
                onChange={e => setCfg(c => ({ ...c, workingHoursPerDay: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Operators per Line</Label>
              <Input
                type="number"
                value={cfg.operatorsPerLine}
                onChange={e => setCfg(c => ({ ...c, operatorsPerLine: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Default Efficiency %</Label>
              <Input
                type="number"
                value={cfg.defaultEfficiency}
                onChange={e => setCfg(c => ({ ...c, defaultEfficiency: e.target.value }))}
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button size="sm" onClick={handleSave}>{t('common.save')}</Button>
            {saved && (
              <span className="flex items-center gap-1.5 text-sm text-green-600">
                <CheckCircle className="w-4 h-4" /> Saved
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Supabase */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Database className="w-5 h-5 text-green-500" />
            Database Connection
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Supabase URL</Label>
            <Input placeholder="https://xxx.supabase.co" defaultValue={import.meta.env.VITE_SUPABASE_URL} readOnly />
          </div>
          <div className="space-y-1.5">
            <Label>Anon Key</Label>
            <Input type="password" placeholder="eyJ..." defaultValue={import.meta.env.VITE_SUPABASE_ANON_KEY} readOnly />
          </div>
          <p className="text-xs text-slate-400">Connection settings are managed via the <code>.env</code> file.</p>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-red-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2 text-red-600">
            <AlertTriangle className="w-5 h-5" />
            Danger Zone
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 space-y-3">
            <div>
              <p className="text-sm font-medium text-red-800">Clear All Data</p>
              <p className="text-xs text-red-600 mt-0.5">
                Permanently deletes all orders, line allocations, output records, shipment milestones, and customer visits. This action cannot be undone.
              </p>
            </div>

            {clearError && (
              <p className="text-xs text-red-700 bg-red-100 rounded px-2 py-1">{clearError}</p>
            )}

            {clearStep === 3 ? (
              <span className="flex items-center gap-1.5 text-sm text-green-700 font-medium">
                <CheckCircle className="w-4 h-4" /> All data has been cleared.
              </span>
            ) : (
              <div className="flex items-center gap-3">
                <Button
                  size="sm"
                  variant={clearStep === 1 ? 'destructive' : 'outline'}
                  className={clearStep === 0 ? 'border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700' : ''}
                  disabled={clearStep === 2}
                  onClick={handleClearData}
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                  {clearStep === 0 && 'Clear All Data'}
                  {clearStep === 1 && 'Yes, delete everything'}
                  {clearStep === 2 && 'Clearing…'}
                </Button>
                {clearStep === 1 && (
                  <Button size="sm" variant="ghost" onClick={() => setClearStep(0)} className="text-slate-500">
                    Cancel
                  </Button>
                )}
                {clearStep === 1 && (
                  <span className="text-xs text-red-600 font-medium">⚠ This cannot be undone!</span>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
