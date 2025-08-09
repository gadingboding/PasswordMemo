import { useState, useEffect } from 'react'
import { Save, RotateCcw, Shield, Server } from 'lucide-react'
import { useAuthStore } from '@/store/auth-store'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card'
import { webdavPermissions } from '@/utils/permissions'

export function SettingsPage() {
  const { passwordManager } = useAuthStore()
  const [pinEnabled, setPinEnabled] = useState(false)
  const [pinSetup, setPinSetup] = useState({
    pin: '',
    confirmPin: '',
    expiryHours: 24
  })
  const [webdavConfig, setWebdavConfig] = useState({
    url: '',
    username: '',
    password: ''
  })
  const [syncStatus, setSyncStatus] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadSettings()
  }, [passwordManager])

  const loadSettings = async () => {
    if (!passwordManager) return

    try {
      const isPinEnabled = passwordManager.isPINEnabled()
      setPinEnabled(isPinEnabled)
      
      const status = passwordManager.getSyncStatus()
      setSyncStatus(status)
      
      // Load WebDAV configuration if it exists
      const webdavConfig = await passwordManager.getWebDAVConfig()
      if (webdavConfig) {
        setWebdavConfig({
          url: webdavConfig.url,
          username: webdavConfig.username,
          password: webdavConfig.password
        })
      }
    } catch (error) {
      console.error('Failed to load settings:', error)
    }
  }

  const handleSetupPIN = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!passwordManager || pinSetup.pin !== pinSetup.confirmPin) {
      alert('PIN codes do not match')
      return
    }

    setLoading(true)
    try {
      await passwordManager.setupPIN(pinSetup.pin, pinSetup.expiryHours)
      setPinEnabled(true)
      setPinSetup({ pin: '', confirmPin: '', expiryHours: 24 })
      alert('PIN setup successful')
    } catch (error) {
      console.error('Failed to setup PIN:', error)
      alert('Failed to setup PIN')
    } finally {
      setLoading(false)
    }
  }

  const handleDisablePIN = async () => {
    if (!passwordManager || !confirm('Are you sure you want to disable PIN?')) return

    setLoading(true)
    try {
      await passwordManager.disablePIN()
      setPinEnabled(false)
      alert('PIN disabled successfully')
    } catch (error) {
      console.error('Failed to disable PIN:', error)
      alert('Failed to disable PIN')
    } finally {
      setLoading(false)
    }
  }

  const handleConfigureWebDAV = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!passwordManager) return

    setLoading(true)
    try {
      // 先请求WebDAV权限
      if (webdavConfig.url) {
        const hasPermission = await webdavPermissions.check(webdavConfig.url)
        if (!hasPermission) {
          const granted = await webdavPermissions.request(webdavConfig.url)
          if (!granted) {
            alert('需要授予跨域权限才能配置WebDAV服务器')
            setLoading(false)
            return
          }
        }
      }

      // 权限获取成功后配置WebDAV
      await passwordManager.configureWebDAV(webdavConfig)
      alert('WebDAV configuration saved successfully')
    } catch (error) {
      console.error('Failed to configure WebDAV:', error)
      alert('Failed to configure WebDAV')
    } finally {
      setLoading(false)
    }
  }

  const handlePush = async () => {
    if (!passwordManager) return

    setLoading(true)
    try {
      const result = await passwordManager.push()
      if (result.success) {
        alert(`Push completed successfully. ${result.recordsPushed} records pushed.`)
      } else {
        alert(`Push failed: ${result.error}`)
      }
      
      const status = passwordManager.getSyncStatus()
      setSyncStatus(status)
    } catch (error) {
      console.error('Failed to push:', error)
      alert('Push failed')
    } finally {
      setLoading(false)
    }
  }

  const handlePull = async () => {
    if (!passwordManager) return

    setLoading(true)
    try {
      const result = await passwordManager.pull()
      if (result.success) {
        if (result.vaultUpdated) {
          alert(`Pull completed successfully. ${result.recordsPulled} records pulled and vault updated.`)
        } else {
          alert('Pull completed successfully. No changes found.')
        }
      } else {
        alert(`Pull failed: ${result.error}`)
      }
      
      const status = passwordManager.getSyncStatus()
      setSyncStatus(status)
    } catch (error) {
      console.error('Failed to pull:', error)
      alert('Pull failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* PIN Configuration */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="flex items-center text-white">
            <Shield className="h-5 w-5 mr-2 text-blue-400" />
            PIN Configuration
          </CardTitle>
          <CardDescription className="text-slate-400">
            Set up a PIN for quick access to your vault
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pinEnabled ? (
            <div className="space-y-4">
              <div className="p-4 bg-green-900/20 border border-green-800 rounded-lg">
                <p className="text-sm text-green-400">PIN is currently enabled</p>
              </div>
              <Button
                variant="outline"
                onClick={handleDisablePIN}
                disabled={loading}
                className="border-red-600 text-red-400 hover:bg-red-900/20"
              >
                Disable PIN
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSetupPIN} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-200 mb-2">PIN</label>
                  <Input
                    type="password"
                    placeholder="Enter PIN"
                    value={pinSetup.pin}
                    onChange={(e) => setPinSetup({ ...pinSetup, pin: e.target.value })}
                    maxLength={6}
                    required
                    className="bg-slate-700 border-slate-600 text-white placeholder-slate-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-200 mb-2">Confirm PIN</label>
                  <Input
                    type="password"
                    placeholder="Confirm PIN"
                    value={pinSetup.confirmPin}
                    onChange={(e) => setPinSetup({ ...pinSetup, confirmPin: e.target.value })}
                    maxLength={6}
                    required
                    className="bg-slate-700 border-slate-600 text-white placeholder-slate-400"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-200 mb-2">Expiry Hours</label>
                <Input
                  type="number"
                  value={pinSetup.expiryHours}
                  onChange={(e) => setPinSetup({ ...pinSetup, expiryHours: parseInt(e.target.value) })}
                  min={1}
                  max={168}
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
              <Button 
                type="submit" 
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Save className="h-4 w-4 mr-2" />
                Setup PIN
              </Button>
            </form>
          )}
        </CardContent>
      </Card>

      {/* WebDAV Configuration */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="flex items-center text-white">
            <Server className="h-5 w-5 mr-2 text-blue-400" />
            WebDAV Sync Configuration
          </CardTitle>
          <CardDescription className="text-slate-400">
            Configure WebDAV server for syncing your vault across devices
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleConfigureWebDAV} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-200 mb-2">WebDAV URL</label>
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
                <label className="block text-sm font-medium text-slate-200 mb-2">Username</label>
                <Input
                  type="text"
                  placeholder="Username"
                  value={webdavConfig.username}
                  onChange={(e) => setWebdavConfig({ ...webdavConfig, username: e.target.value })}
                  required
                  className="bg-slate-700 border-slate-600 text-white placeholder-slate-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-200 mb-2">Password</label>
                <Input
                  type="password"
                  placeholder="Password"
                  value={webdavConfig.password}
                  onChange={(e) => setWebdavConfig({ ...webdavConfig, password: e.target.value })}
                  required
                  className="bg-slate-700 border-slate-600 text-white placeholder-slate-400"
                />
              </div>
            </div>
            <Button 
              type="submit" 
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Save className="h-4 w-4 mr-2" />
              Save WebDAV Configuration
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Push and Pull */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="flex items-center text-white">
            <Server className="h-5 w-5 mr-2 text-blue-400" />
            Push & Pull
          </CardTitle>
          <CardDescription className="text-slate-400">
            Push local changes to remote or pull remote changes to local
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Button
                onClick={handlePush}
                disabled={loading}
                className="bg-green-600 hover:bg-green-700"
              >
                <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                </svg>
                {loading ? 'Pushing...' : 'Push'}
              </Button>
              <Button
                onClick={handlePull}
                disabled={loading}
                className="bg-purple-600 hover:bg-purple-700"
              >
                <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8V20m0 0l4-4m-4 4l-4-4M7 4v12m0 0l-4-4m4 4l4-4" />
                </svg>
                {loading ? 'Pulling...' : 'Pull'}
              </Button>
            </div>
            <div className="p-4 bg-slate-700/50 border border-slate-600 rounded-lg">
              <h4 className="font-medium mb-2 text-white">Push & Pull Info</h4>
              <div className="text-sm text-slate-300 space-y-1">
                <p>• <span className="text-green-400">Push</span>: Upload local changes to remote server</p>
                <p>• <span className="text-purple-400">Pull</span>: Download remote changes to local vault</p>
                <p>• Use Push when you've made local changes</p>
                <p>• Use Pull when you want to get changes from other devices</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}