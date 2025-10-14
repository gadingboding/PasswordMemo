import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Globe, Sun, Moon, Monitor } from 'lucide-react'
import { WebDAVSync } from '@/components/WebDAVSync'
import { ResetSettings } from '@/components/ResetSettings'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card'
import { AppSettingsManager } from '@/lib/app-settings'
import { useThemeStore } from '@/store/theme-store'

export function SettingsPage() {
  const { t, i18n } = useTranslation()
  const [currentLanguage, setCurrentLanguage] = useState('zh-CN')
  const { theme, setTheme } = useThemeStore()

  useEffect(() => {
    loadLanguageSetting()
  }, [])

  const loadLanguageSetting = async () => {
    try {
      const settingsManager = AppSettingsManager.getInstance()
      const settings = await settingsManager.loadSettings()
      setCurrentLanguage(settings.language || 'zh-CN')
    } catch (error) {
      console.error('Failed to load language setting:', error)
    }
  }

  const handleLanguageChange = async (languageCode: string) => {
    try {
      await i18n.changeLanguage(languageCode)
      const settingsManager = AppSettingsManager.getInstance()
      await settingsManager.updateSetting('language', languageCode)
      setCurrentLanguage(languageCode)
    } catch (error) {
      console.error('Failed to change language:', error)
    }
  }

  const languages = [
    { code: 'zh-CN', name: '中文' },
    { code: 'en-US', name: 'English' }
  ]

  const themes = [
    { value: 'light', label: t('settings.light'), icon: Sun },
    { value: 'dark', label: t('settings.dark'), icon: Moon },
    { value: 'system', label: t('settings.system'), icon: Monitor },
  ]

  return (
    <div className="space-y-6">
      {/* Theme Settings */}
      <Card className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
        <CardHeader>
          <CardTitle className="flex items-center text-slate-900 dark:text-white">
            <Sun className="h-5 w-5 mr-2 text-blue-500 dark:text-blue-400" />
            {t('settings.theme')}
          </CardTitle>
          <CardDescription className="text-slate-500 dark:text-slate-400">
            {t('settings.themeDesc')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            {themes.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                onClick={() => setTheme(value as any)}
                className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-colors ${
                  theme === value
                    ? 'border-blue-500 bg-blue-500/10 text-blue-600 dark:text-blue-400'
                    : 'border-slate-300 dark:border-slate-600 hover:border-blue-500 dark:hover:border-blue-500 text-slate-600 dark:text-slate-300'
                }`}
              >
                <Icon className="h-6 w-6 mb-2" />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Language Settings */}
      <Card className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
        <CardHeader>
          <CardTitle className="flex items-center text-slate-900 dark:text-white">
            <Globe className="h-5 w-5 mr-2 text-blue-500 dark:text-blue-400" />
            {t('settings.language')}
          </CardTitle>
          <CardDescription className="text-slate-500 dark:text-slate-400">
            {t('settings.languageDesc')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">
              {t('settings.language')}
            </label>
            <select
              value={currentLanguage}
              onChange={(e) => handleLanguageChange(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {languages.map((language) => (
                <option key={language.code} value={language.code}>
                  {language.name}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      <WebDAVSync />
      <ResetSettings />
    </div>
  )
}