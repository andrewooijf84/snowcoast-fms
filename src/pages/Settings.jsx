import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAppStore } from '@/store/useStore'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Globe, Database, Factory, CheckCircle } from 'lucide-react'

export default function Settings() {
  const { t, i18n } = useTranslation()
  const { language, setLanguage, factoryConfig, setFactoryConfig } = useAppStore()
  const [cfg, setCfg] = useState({ ...factoryConfig })
  const [saved, setSaved] = useState(false)

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
    </div>
  )
}
