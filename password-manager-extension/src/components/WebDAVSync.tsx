import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Save, Server, Upload, Download } from 'lucide-react'
import { useAuthStore } from '@/store/auth-store'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card'
import { PasswordDialog } from '@/components/ui/PasswordDialog'

export function WebDAVSync() {
  const { t, ready } = useTranslation()
  const { passwordManager } = useAuthStore()
  const [webdavConfig, setWebdavConfig] = useState({
    url: '',
    username: '',
    password: ''
  })
  const [syncStatus, setSyncStatus] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [passwordDialog, setPasswordDialog] = useState({
    open: false,
    mode: 'push' as 'push' | 'pull'
  })
  const [isConfigured, setIsConfigured] = useState(false)

  useEffect(() => {
    loadSettings()
  }, [passwordManager])

  const loadSettings = async () => {
    try {
      // Only load from password manager (user profile) - never from app settings for security
      if (passwordManager && passwordManager.isUnlocked()) {
        try {
          const webdavConfigFromManager = await passwordManager.getWebDAVConfig()
          if (webdavConfigFromManager) {
            setWebdavConfig({
              url: webdavConfigFromManager.url,
              username: webdavConfigFromManager.username,
              password: webdavConfigFromManager.password
            })
            setIsConfigured(true)
          }
        } catch (error) {
          console.error('Failed to load WebDAV config from password manager:', error)
        }
        
        const status = passwordManager.getSyncStatus()
        setSyncStatus(status)
      }
    } catch (error) {
      console.error('Failed to load settings:', error)
    }
  }

  const handleConfigureWebDAV = async (e: React.FormEvent) => {
    e.preventDefault()

    // WebDAV configuration should only be saved in the password manager for security
    if (!passwordManager || !passwordManager.isUnlocked()) {
      alert(ready ? t('sync.webdavConfigLocked') : 'Please unlock your vault first to configure WebDAV settings')
      return
    }

    setLoading(true)
    try {
      // Save WebDAV configuration to password manager (user profile) only
      await passwordManager.configureWebDAV(webdavConfig)
      
      setIsConfigured(true)
      alert(ready ? t('sync.webdavConfigSaved') : 'WebDAV configuration saved successfully')
    } catch (error) {
      console.error('Failed to configure WebDAV:', error)
      alert(ready ? t('sync.webdavConfigFailed') : 'Failed to configure WebDAV')
    } finally {
      setLoading(false)
    }
  }

  const handlePush = async () => {
    setPasswordDialog({ open: true, mode: 'push' })
  }

  const handlePull = async () => {
    setPasswordDialog({ open: true, mode: 'pull' })
  }

  const handlePasswordSubmit = async (password: string) => {
    if (!passwordManager) return

    setLoading(true)
    try {
      if (passwordDialog.mode === 'push') {
        const result = await passwordManager.push(password)
        if (result.success) {
          alert(ready ? t('sync.pushCompleted', { count: result.recordsPushed }) : `Push completed successfully. ${result.recordsPushed} records pushed.`)
        } else {
          alert(ready ? t('sync.pushFailed', { error: result.error }) : `Push failed: ${result.error}`)
        }
      } else {
        const result = await passwordManager.pull(password)
        if (result.success) {
          if (result.vaultUpdated) {
            alert(ready ? t('sync.pullCompleted', { count: result.recordsPulled }) : `Pull completed successfully. ${result.recordsPulled} records pulled and vault updated.`)
          } else {
            alert(ready ? t('sync.pullNoChanges') : 'Pull completed successfully. No changes found.')
          }
        } else {
          alert(ready ? t('sync.pullFailed', { error: result.error }) : `Pull failed: ${result.error}`)
        }
      }
      
      const status = passwordManager.getSyncStatus()
      setSyncStatus(status)
    } catch (error) {
      console.error(`Failed to ${passwordDialog.mode}:`, error)
      const errorMessage = error instanceof Error ? error.message : String(error)
      alert(passwordDialog.mode === 'push'
        ? (ready ? t('sync.pushFailed', { error: errorMessage }) : `Push failed: ${errorMessage}`)
        : (ready ? t('sync.pullFailed', { error: errorMessage }) : `Pull failed: ${errorMessage}`))
    } finally {
      setLoading(false)
      setPasswordDialog({ open: false, mode: 'push' })
    }
  }

  const handlePasswordDialogClose = () => {
    if (!loading) {
      setPasswordDialog({ open: false, mode: 'push' })
    }
  }

  const handleResetConfig = async () => {
    try {
      // Only reset in password manager - never in app settings for security
      if (passwordManager && passwordManager.isUnlocked()) {
        // Use the dedicated method to clear WebDAV config
        await passwordManager.clearWebDAVConfig()
      }
      
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
          {ready ? t('sync.webdavConfig') : 'WebDAV Configuration'}
        </CardTitle>
        <CardDescription className="text-slate-400">
          {ready ? t('sync.webdavConfigDesc') : 'Configure WebDAV server for syncing your vault across devices'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Configuration Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-white">
              {isConfigured
                ? (ready ? t('sync.webdavConfig') + ' - ' + t('common.settings') : 'WebDAV Configuration - Settings')
                : (ready ? t('sync.webdavConfig') : 'WebDAV Configuration')}
            </h3>
            
            <form onSubmit={handleConfigureWebDAV} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-200 mb-2">{ready ? t('sync.webdavUrl') : 'WebDAV URL'}</label>
                <Input
                  type="url"
                  placeholder="https://your-webdav-server.com/dav"
                  value={webdavConfig.url}
                  onChange={(e) => setWebdavConfig({ ...webdavConfig, url: e.target.value })}
                  required
                  className="bg-slate-700 border-slate-600 text-white placeholder-slate-400"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-200 mb-2">{ready ? t('sync.username') : 'Username'}</label>
                  <Input
                    type="text"
                    placeholder={ready ? t('sync.username') : 'Username'}
                    value={webdavConfig.username}
                    onChange={(e) => setWebdavConfig({ ...webdavConfig, username: e.target.value })}
                    required
                    className="bg-slate-700 border-slate-600 text-white placeholder-slate-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-200 mb-2">{ready ? t('sync.password') : 'Password'}</label>
                  <Input
                    type="password"
                    placeholder={ready ? t('sync.password') : 'Password'}
                    value={webdavConfig.password}
                    onChange={(e) => setWebdavConfig({ ...webdavConfig, password: e.target.value })}
                    required
                    className="bg-slate-700 border-slate-600 text-white placeholder-slate-400"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button 
                  type="submit" 
                  disabled={loading}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {ready ? t('sync.saveWebdavConfig') : 'Save WebDAV Configuration'}
                </Button>
                {isConfigured && (
                  <Button 
                    type="button"
                    onClick={handleResetConfig}
                    disabled={loading}
                    variant="outline"
                    className="border-slate-600 text-slate-300 hover:bg-slate-700"
                  >
                    {ready ? t('common.reset') : 'Reset'}
                  </Button>
                )}
              </div>
            </form>
          </div>

          {/* Sync Operations Section */}
          {isConfigured && (
            <div className="space-y-4 border-t border-slate-700 pt-6">
              <h3 className="text-lg font-medium text-white">{ready ? t('sync.pushAndPull') : 'Push & Pull'}</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <Button
                  onClick={handlePush}
                  disabled={loading}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {loading ? (ready ? t('sync.pushing') : 'Pushing...') : (ready ? t('sync.push') : 'Push')}
                </Button>
                <Button
                  onClick={handlePull}
                  disabled={loading}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  <Download className="h-4 w-4 mr-2" />
                  {loading ? (ready ? t('sync.pulling') : 'Pulling...') : (ready ? t('sync.pull') : 'Pull')}
                </Button>
              </div>
              
              <div className="p-4 bg-slate-700/50 border border-slate-600 rounded-lg">
                <h4 className="font-medium mb-2 text-white">{ready ? t('sync.pushPullInfo') : 'Push & Pull Info'}</h4>
                <div className="text-sm text-slate-300 space-y-1">
                  <p>• <span className="text-green-400">{ready ? t('sync.push') : 'Push'}</span>: {ready ? t('sync.pushInfo') : 'Upload local changes to remote server'}</p>
                  <p>• <span className="text-purple-400">{ready ? t('sync.pull') : 'Pull'}</span>: {ready ? t('sync.pullInfo') : 'Download remote changes to local vault'}</p>
                  <p>• {ready ? t('sync.pushUsage') : 'Use Push when you\'ve made local changes'}</p>
                  <p>• {ready ? t('sync.pullUsage') : 'Use Pull when you want to get changes from other devices'}</p>
                </div>
              </div>
            </div>
          )}

          {/* Sync Status */}
          {syncStatus && (
            <div className="space-y-2 border-t border-slate-700 pt-6">
              <h3 className="text-lg font-medium text-white">{ready ? t('sync.lastSync') : 'Last Sync'}</h3>
              <div className="text-sm text-slate-300">
                {syncStatus.lastSyncTime ? new Date(syncStatus.lastSyncTime).toLocaleString() : (ready ? t('sync.noRemoteChanges') : 'No remote changes')}
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
          ? (ready ? t('sync.pushToRemote') : 'Push to Remote')
          : (ready ? t('sync.pullFromRemote') : 'Pull from Remote')}
        description={
          passwordDialog.mode === 'push'
            ? (ready ? t('sync.pushDesc') : 'Enter your master password to encrypt and push your local changes to the remote server.')
            : (ready ? t('sync.pullDesc') : 'Enter your master password to decrypt and pull changes from the remote server.')
        }
        submitText={passwordDialog.mode === 'push'
          ? (ready ? t('sync.push') : 'Push')
          : (ready ? t('sync.pull') : 'Pull')}
        loading={loading}
      />
    </Card>
  )
}