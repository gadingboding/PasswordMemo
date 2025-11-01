import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Save, Server, Upload, Download } from 'lucide-react'
import { useAuthStore } from '@/store/auth-store'
import { Button } from '@/components/ui/Button'

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card'
import { PasswordDialog } from '@/components/ui/PasswordDialog'
import { useToastContext } from '@/contexts/ToastContext'
import {WebDAVForm} from "@components/WebDAVForm.tsx";

export function WebDAVSync() {
  const { t } = useTranslation()
  const { passwordManager, isAuthenticated } = useAuthStore()
  const { showSuccess, showError } = useToastContext()
  const [webdavConfig, setWebdavConfig] = useState({
    url: '',
    username: '',
    password: ''
  })
  const [syncStatus, setSyncStatus] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [passwordDialog, setPasswordDialog] = useState({
    open: false,
    mode: 'push' as 'push' | 'pull',
    error: null as string | null
  })
  const [isConfigured, setIsConfigured] = useState(false)

  // 监听认证状态变化，重置WebDAV配置状态
  useEffect(() => {
    if (!isAuthenticated) {
      // 用户未认证时，重置所有状态
      setWebdavConfig({
        url: '',
        username: '',
        password: ''
      })
      setIsConfigured(false)
      setSyncStatus(null)
    }
  }, [isAuthenticated])

  useEffect(() => {
    loadSettings()
  }, [passwordManager, isAuthenticated]) // 添加isAuthenticated依赖

  const loadSettings = async () => {
    try {
      // 只有在用户已认证且密码管理器可用且未锁定时才加载配置
      if (isAuthenticated && passwordManager && passwordManager.isUnlocked()) {
        try {
          const webdavConfigFromManager = await passwordManager.getWebDAVConfig()
          if (webdavConfigFromManager && webdavConfigFromManager.url) {
            setWebdavConfig({
              url: webdavConfigFromManager.url,
              username: webdavConfigFromManager.username,
              password: webdavConfigFromManager.password
            })
            setIsConfigured(true)
          } else {
            // 如果没有配置或配置无效，重置状态
            setWebdavConfig({
              url: '',
              username: '',
              password: ''
            })
            setIsConfigured(false)
          }
        } catch (error) {
          console.error('Failed to load WebDAV config from password manager:', error)
          // 出错时也要重置状态
          setWebdavConfig({
            url: '',
            username: '',
            password: ''
          })
          setIsConfigured(false)
        }
        
        const status = passwordManager.getSyncStatus()
        setSyncStatus(status)
      }
    } catch (error) {
      console.error('Failed to load settings:', error)
      // 出错时重置状态
      setWebdavConfig({
        url: '',
        username: '',
        password: ''
      })
      setIsConfigured(false)
    }
  }

  const handleConfigureWebDAV = async (e: React.FormEvent) => {
    e.preventDefault()

    // WebDAV configuration should only be saved in the password manager for security
    if (!isAuthenticated || !passwordManager || !passwordManager.isUnlocked()) {
      showError(t('sync.webdavConfigLocked'))
      return
    }

    setLoading(true)
    try {
      // Save WebDAV configuration to password manager (user profile) only
      await passwordManager.configureWebDAV(webdavConfig)
      
      setIsConfigured(true)
      showSuccess(t('sync.webdavConfigSaved'))
    } catch (error) {
      console.error('Failed to configure WebDAV:', error)
      showError(t('sync.webdavConfigFailed'))
    } finally {
      setLoading(false)
    }
  }

  const handlePush = async () => {
    if (!isAuthenticated || !passwordManager) return

    setLoading(true)
    try {
      // First try push without password
      const result = await passwordManager.push()
      
      if (result.success) {
        showSuccess(t('sync.pushCompleted', { count: result.recordsPushed }))
      } else if (result.passwordRequired) {
        // Show password dialog
        setPasswordDialog({ open: true, mode: 'push', error: null })
      } else {
        showError(t('sync.pushFailed', { error: result.error }))
      }
      
      const status = passwordManager.getSyncStatus()
      setSyncStatus(status)
    } catch (error) {
      console.error('Failed to push:', error)
      const errorMessage = error instanceof Error ? error.message : String(error)
      showError(t('sync.pushFailed', { error: errorMessage }))
    } finally {
      setLoading(false)
    }
  }

  const handlePull = async () => {
    if (!isAuthenticated || !passwordManager) return

    setLoading(true)
    try {
      // First try pull without password
      const result = await passwordManager.pull()
      
      if (result.success) {
        if (result.vaultUpdated) {
          showSuccess(t('sync.pullCompleted', { count: result.recordsPulled }))
        } else {
          showSuccess(t('sync.pullNoChanges'))
        }
      } else if (result.passwordRequired) {
        // Show password dialog
        setPasswordDialog({ open: true, mode: 'pull', error: null })
      } else {
        showError(t('sync.pullFailed', { error: result.error }))
      }
      
      const status = passwordManager.getSyncStatus()
      setSyncStatus(status)
    } catch (error) {
      console.error('Failed to pull:', error)
      const errorMessage = error instanceof Error ? error.message : String(error)
      showError(t('sync.pullFailed', { error: errorMessage }))
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordSubmit = async (password: string) => {
    if (!isAuthenticated || !passwordManager) return

    setLoading(true)
    try {
      if (passwordDialog.mode === 'push') {
        const result = await passwordManager.push(password)
        if (result.success) {
          showSuccess(t('sync.pushCompleted', { count: result.recordsPushed }))
          setPasswordDialog({ open: false, mode: 'push', error: null })
        } else {
          // Check if it's a password validation error
          if (result.error?.includes('Invalid master password')) {
            const errorMessage = t('errors.authentication.incorrectPassword')
            setPasswordDialog({ ...passwordDialog, error: errorMessage })
          } else {
            showError(t('sync.pushFailed', { error: result.error }))
            setPasswordDialog({ open: false, mode: 'push', error: null })
          }
        }
      } else {
        const result = await passwordManager.pull(password)
        if (result.success) {
          if (result.vaultUpdated) {
            showSuccess(t('sync.pullCompleted', { count: result.recordsPulled }))
          } else {
            showSuccess(t('sync.pullNoChanges'))
          }
          setPasswordDialog({ open: false, mode: 'pull', error: null })
        } else {
          // Check if it's a password validation error
          if (result.error?.includes('Invalid master password')) {
            const errorMessage = t('errors.authentication.incorrectPassword')
            setPasswordDialog({ ...passwordDialog, error: errorMessage })
          } else {
            showError(t('sync.pullFailed', { error: result.error }))
            setPasswordDialog({ open: false, mode: 'pull', error: null })
          }
        }
      }
      
      const status = passwordManager.getSyncStatus()
      setSyncStatus(status)
    } catch (error) {
      console.error(`Failed to ${passwordDialog.mode}:`, error)
      const errorMessage = error instanceof Error ? error.message : String(error)
      // Check if it's a password validation error
      if (errorMessage.includes('Invalid master password')) {
        const userErrorMessage = t('errors.authentication.incorrectPassword')
        setPasswordDialog({ ...passwordDialog, error: userErrorMessage })
      } else {
        showError(passwordDialog.mode === 'push'
          ? t('sync.pushFailed', { error: errorMessage })
          : t('sync.pullFailed', { error: errorMessage }))
        setPasswordDialog({ open: false, mode: passwordDialog.mode, error: null })
      }
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordDialogClose = () => {
    if (!loading) {
      setPasswordDialog({ open: false, mode: passwordDialog.mode, error: null })
    }
  }

  const handleResetConfig = async () => {
    try {
      // Only reset in password manager - never in app settings for security
      if (isAuthenticated && passwordManager && passwordManager.isUnlocked()) {
        // Use the dedicated method to clear WebDAV config
        await passwordManager.clearWebDAVConfig()
      }
      
      // 重置本地状态
      setWebdavConfig({
        url: '',
        username: '',
        password: ''
      })
      setIsConfigured(false)
    } catch (error) {
      console.error('Failed to reset WebDAV config:', error)
    }
  }

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader>
        <CardTitle className="flex items-center text-white">
          <Server className="h-5 w-5 mr-2 text-blue-400" />
          {t('sync.webdavConfig')}
        </CardTitle>
        <CardDescription className="text-slate-400">
          {t('sync.webdavConfigDesc')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Configuration Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-white">
              {isConfigured
                ? t('sync.webdavConfig') + ' - ' + t('common.settings')
                : t('sync.webdavConfig')}
            </h3>
            <form onSubmit={handleConfigureWebDAV} className="space-y-4">
              <WebDAVForm webdavConfig={webdavConfig} setWebdavConfig={setWebdavConfig}/>
              <div className="flex gap-2">
                <Button 
                  type="submit" 
                  disabled={loading}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {t('sync.saveWebdavConfig')}
                </Button>
                {isConfigured && (
                  <Button 
                    type="button"
                    onClick={handleResetConfig}
                    disabled={loading}
                    variant="outline"
                    className="border-slate-600 text-slate-300 hover:bg-slate-700"
                  >
                    {t('common.reset')}
                  </Button>
                )}
              </div>
            </form>
          </div>

          {/* Sync Operations Section */}
          {isConfigured && (
            <div className="space-y-4 border-t border-slate-700 pt-6">
              <h3 className="text-lg font-medium text-white">{t('sync.pushAndPull')}</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <Button
                  onClick={handlePush}
                  disabled={loading}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {loading ? t('sync.pushing') : t('sync.push')}
                </Button>
                <Button
                  onClick={handlePull}
                  disabled={loading}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  <Download className="h-4 w-4 mr-2" />
                  {loading ? t('sync.pulling') : t('sync.pull')}
                </Button>
              </div>
              
              <div className="p-4 bg-slate-700/50 border border-slate-600 rounded-lg">
                <h4 className="font-medium mb-2 text-white">{t('sync.pushPullInfo')}</h4>
                <div className="text-sm text-slate-300 space-y-1">
                  <p>• <span className="text-green-400">{t('sync.push')}</span>: {t('sync.pushInfo')}</p>
                  <p>• <span className="text-purple-400">{t('sync.pull')}</span>: {t('sync.pullInfo')}</p>
                  <p>• {t('sync.pushUsage')}</p>
                  <p>• {t('sync.pullUsage')}</p>
                </div>
              </div>
            </div>
          )}

          {/* Sync Status */}
          {syncStatus && (
            <div className="space-y-2 border-t border-slate-700 pt-6">
              <h3 className="text-lg font-medium text-white">{t('sync.lastSync')}</h3>
              <div className="text-sm text-slate-300">
                {syncStatus.lastSyncTime ? new Date(syncStatus.lastSyncTime).toLocaleString() : t('sync.noRemoteChanges')}
              </div>
            </div>
          )}
        </div>
      </CardContent>

      {/* Password Dialog */}
      <PasswordDialog
        open={passwordDialog.open}
        onClose={handlePasswordDialogClose}
        onSubmit={handlePasswordSubmit}
        title={passwordDialog.mode === 'push'
          ? t('sync.pushToRemote')
          : t('sync.pullFromRemote')}
        description={
          passwordDialog.mode === 'push'
            ? t('sync.pushDesc')
            : t('sync.pullDesc')
        }
        submitText={passwordDialog.mode === 'push'
          ? t('sync.push')
          : t('sync.pull')}
        loading={loading}
        error={passwordDialog.error}
      />
    </Card>
  )
}