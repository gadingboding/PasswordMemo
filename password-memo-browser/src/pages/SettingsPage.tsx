import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Globe } from 'lucide-react'
import { WebDAVSync } from '@/components/WebDAVSync'
import { ResetSettings } from '@/components/ResetSettings'
import {ExportVault} from '@/components/ExportVault'
import {ImportVault} from '@/components/ImportVault'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card'
import { AppSettingsManager } from '@/lib/app-settings'

export function SettingsPage() {
  const { t, i18n } = useTranslation()
  const [currentLanguage, setCurrentLanguage] = useState('zh-CN')

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
      // Update i18n language
      await i18n.changeLanguage(languageCode)

      // Update app settings
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

  return (
    <div className="space-y-6">
      {/* Language Settings */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="flex items-center text-white">
            <Globe className="h-5 w-5 mr-2 text-blue-400" />
            {t('settings.language')}
          </CardTitle>
          <CardDescription className="text-slate-400">
            {t('settings.languageDesc')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-200 mb-2">
                {t('settings.language')}
              </label>
              <select
                value={currentLanguage}
                onChange={(e) => handleLanguageChange(e.target.value)}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 text-white rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {languages.map((language) => (
                  <option key={language.code} value={language.code}>
                    {language.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Import/Export Section */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">{t('settings.dataManagement')}</CardTitle>
          <CardDescription className="text-slate-400">
            {t('settings.dataManagementDesc')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <ExportVault />
            <ImportVault />
          </div>
        </CardContent>
      </Card>
      <WebDAVSync />
      <ResetSettings />
    </div>
  )
}