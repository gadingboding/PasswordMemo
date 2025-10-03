import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Eye, EyeOff, Lock, Server, Check } from 'lucide-react'
import { PasswordManager } from 'password-manager-core'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Stepper } from '@/components/ui/Stepper'
import { webdavPermissions } from '@/utils/permissions'

interface InitializationFlowProps {
  onComplete: (passwordManager: PasswordManager) => void
}

interface WebDAVConfig {
  url: string
  username: string
  password: string
}

export function InitializationFlow({ onComplete }: InitializationFlowProps) {
  const { t, ready } = useTranslation()
  const [currentStep, setCurrentStep] = useState(0)
  const [loading, setLoading] = useState(false)
  
  // Step 1: Password state
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  
  // Step 1: WebDAV state
  const [webdavConfig, setWebdavConfig] = useState<WebDAVConfig>({
    url: '',
    username: '',
    password: ''
  })
  const [configureWebDAV, setConfigureWebDAV] = useState(false)
  const [webdavConfigured, setWebdavConfigured] = useState(false)
  const [pullRemoteVault, setPullRemoteVault] = useState(false)
  const [connectionTestResult, setConnectionTestResult] = useState<'idle' | 'testing' | 'success' | 'error'>('idle')
  const [connectionError, setConnectionError] = useState('')
  
  const steps = [
    {
      id: 'webdav',
      title: ready ? t('initialization.step2Title') : 'WebDAV Sync',
      description: ready ? t('initialization.step2Desc') : 'Configure remote synchronization (optional)'
    },
    {
      id: 'password',
      title: ready ? t('initialization.step1Title') : 'Master Password',
      description: ready ? t('initialization.step1Desc') : 'Create a strong master password to protect your vault'
    }
  ]

  const validatePasswordStep = () => {
    if (!password.trim()) {
      alert(ready ? t('initialization.passwordRequired') : 'Master password is required')
      return false
    }
    if (password !== confirmPassword) {
      alert(ready ? t('initialization.passwordMismatch') : 'Passwords do not match')
      return false
    }
    return true
  }

  const validateWebDAVStep = () => {
    // If user chose not to configure WebDAV, allow proceeding
    if (!configureWebDAV) {
      return true
    }
    
    // If user chose to configure but hasn't saved the configuration yet
    if (configureWebDAV && !webdavConfigured) {
      alert('Please save your WebDAV configuration or cancel to proceed')
      return false
    }
    
    return true
  }

  const handleNext = async () => {
    if (currentStep === 0) {
      if (!validateWebDAVStep()) return
      setCurrentStep(1)
    } else if (currentStep === 1) {
      if (!validatePasswordStep()) return
      await handleComplete()
    }
  }

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const testWebDAVConnection = async () => {
    if (!webdavConfig.url.trim()) return
    
    setConnectionTestResult('testing')
    setConnectionError('')
    
    try {
      // Request WebDAV permissions first
      const hasPermission = await webdavPermissions.check(webdavConfig.url)
      if (!hasPermission) {
        const granted = await webdavPermissions.request(webdavConfig.url)
        if (!granted) {
          setConnectionTestResult('error')
          setConnectionError(ready ? t('sync.webdavPermissionRequired') : 'Cross-origin permission required')
          return
        }
      }

      // Test connection using the singleton PasswordManager instance
      const tempManager = PasswordManager.getInstance()
      const isConnected = await tempManager.testWebDAVConnection(webdavConfig)
      
      if (isConnected) {
        setConnectionTestResult('success')
      } else {
        setConnectionTestResult('error')
        setConnectionError(ready ? t('initialization.connectionFailed', { error: 'Unknown error' }) : 'Connection failed: Unknown error')
      }
    } catch (error) {
      setConnectionTestResult('error')
      const errorMessage = error instanceof Error ? error.message : String(error)
      setConnectionError(ready ? t('initialization.connectionFailed', { error: errorMessage }) : `Connection failed: ${errorMessage}`)
    }
  }

  const saveWebDAVConfig = async () => {
    if (!webdavConfig.url.trim() || !webdavConfig.username.trim() || !webdavConfig.password.trim()) {
      alert('Please fill in all WebDAV configuration fields')
      return
    }
    
    // Test connection again when saving
    await testWebDAVConnection()
    
    // Set as configured regardless of test result (user can proceed even if test fails)
    setWebdavConfigured(true)
  }

  const cancelWebDAVConfig = () => {
    setConfigureWebDAV(false)
    setWebdavConfigured(false)
    setConnectionTestResult('idle')
    setConnectionError('')
    setWebdavConfig({
      url: '',
      username: '',
      password: ''
    })
  }

  const handleComplete = async () => {
    setLoading(true)
    
    try {
      const manager = PasswordManager.getInstance()
      
      // Initialize with configuration and master password
      await manager.initialize({
        config: {
          storage: {
            basePath: undefined,
            namespace: 'password-manager'
          },
          webdav: configureWebDAV ? webdavConfig : undefined,
          pullRemoteVault: configureWebDAV && pullRemoteVault
        },
        masterPassword: password
      })
      
      onComplete(manager)
    } catch (error) {
      console.error('Initialization failed:', error)
      const errorMessage = error instanceof Error ? error.message : String(error)
      alert(`Initialization failed: ${errorMessage}`)
    } finally {
      setLoading(false)
    }
  }

  const renderPasswordStep = () => (
    <div className="space-y-6">
      <div className="space-y-4">
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-slate-200 mb-2">
            {ready ? t('initialization.masterPasswordLabel') : 'Master Password'}
          </label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder={ready ? t('initialization.masterPasswordPlaceholder') : 'Enter a strong master password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pr-10 bg-slate-700 border-slate-600 text-white placeholder-slate-400"
              autoFocus
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-0 top-0 h-full px-3 text-slate-400 hover:text-white"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
        
        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-200 mb-2">
            {ready ? t('initialization.confirmPasswordLabel') : 'Confirm Password'}
          </label>
          <div className="relative">
            <Input
              id="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              placeholder={ready ? t('initialization.confirmPasswordPlaceholder') : 'Confirm your master password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="pr-10 bg-slate-700 border-slate-600 text-white placeholder-slate-400"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-0 top-0 h-full px-3 text-slate-400 hover:text-white"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            >
              {showConfirmPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )

  const renderWebDAVStep = () => (
    <div className="space-y-6">
      <div className="space-y-4">
        {!configureWebDAV ? (
          <div className="space-y-4">
            <p className="text-sm text-slate-300">
              {ready ? t('sync.webdavConfigDesc') : 'Configure WebDAV server for syncing your vault across devices'}
            </p>
            <div className="flex items-center space-x-4">
              <Button
                type="button"
                onClick={() => setConfigureWebDAV(true)}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Server className="h-4 w-4 mr-2" />
                {ready ? t('initialization.configureWebDAV') : 'Configure WebDAV'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleNext}
                className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-700"
              >
                {ready ? t('common.next') : 'Skip for Now'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-200 mb-2">
                  {ready ? t('initialization.webDAVUrlLabel') : 'WebDAV URL'}
                </label>
                <Input
                  type="url"
                  placeholder={ready ? t('initialization.webDAVUrlPlaceholder') : 'https://your-webdav-server.com/dav'}
                  value={webdavConfig.url}
                  onChange={(e) => setWebdavConfig({ ...webdavConfig, url: e.target.value })}
                  className="bg-slate-700 border-slate-600 text-white placeholder-slate-400"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-200 mb-2">
                    {ready ? t('initialization.usernameLabel') : 'Username'}
                  </label>
                  <Input
                    type="text"
                    placeholder={ready ? t('initialization.usernamePlaceholder') : 'Enter username'}
                    value={webdavConfig.username}
                    onChange={(e) => setWebdavConfig({ ...webdavConfig, username: e.target.value })}
                    className="bg-slate-700 border-slate-600 text-white placeholder-slate-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-200 mb-2">
                    {ready ? t('initialization.webDAVPasswordLabel') : 'WebDAV Password'}
                  </label>
                  <Input
                    type="password"
                    placeholder={ready ? t('initialization.webDAVPasswordPlaceholder') : 'Enter WebDAV password'}
                    value={webdavConfig.password}
                    onChange={(e) => setWebdavConfig({ ...webdavConfig, password: e.target.value })}
                    className="bg-slate-700 border-slate-600 text-white placeholder-slate-400"
                  />
                </div>
              </div>

              <div className="p-4 bg-slate-700/50 border border-slate-600 rounded-lg">
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={pullRemoteVault}
                    onChange={(e) => setPullRemoteVault(e.target.checked)}
                    className="w-4 h-4 text-blue-600 bg-slate-700 border-slate-600 rounded focus:ring-blue-500"
                  />
                  <div>
                    <div className="text-sm font-medium text-white">
                      {ready ? t('initialization.pullRemoteVault') : 'Pull existing vault from server'}
                    </div>
                    <div className="text-xs text-slate-400">
                      {ready ? t('initialization.pullRemoteVaultDesc') : 'If you have an existing vault on the server, we can download it now'}
                    </div>
                  </div>
                </label>
              </div>

              {connectionTestResult === 'success' && (
                <div className="p-3 bg-green-900/20 border border-green-600/30 rounded-md text-sm text-green-400">
                  <div className="flex items-center">
                    <Check className="h-4 w-4 mr-2" />
                    {ready ? t('initialization.connectionSuccess') : 'Connection successful!'}
                  </div>
                </div>
              )}

              {connectionTestResult === 'error' && (
                <div className="p-3 bg-red-900/20 border border-red-600/30 rounded-md text-sm text-red-400">
                  {connectionError}
                </div>
              )}

              <div className="grid grid-cols-3 gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={testWebDAVConnection}
                  disabled={connectionTestResult === 'testing' || !webdavConfig.url.trim()}
                  className="border-slate-600 text-slate-300 hover:bg-slate-700"
                >
                  {connectionTestResult === 'testing' ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      {ready ? t('initialization.processing') : 'Testing...'}
                    </div>
                  ) : (
                    ready ? t('sync.testConnection') : 'Test Connection'
                  )}
                </Button>
                <Button
                  type="button"
                  onClick={saveWebDAVConfig}
                  disabled={!webdavConfig.url.trim() || !webdavConfig.username.trim() || !webdavConfig.password.trim()}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {ready ? t('common.save') : 'Save'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={cancelWebDAVConfig}
                  className="border-slate-600 text-slate-300 hover:bg-slate-700"
                >
                  {ready ? t('common.cancel') : 'Cancel'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl space-y-4">
          <div className="text-center">
            <Lock className="mx-auto h-10 w-10 text-blue-400" />
            <h2 className="mt-4 text-2xl font-bold text-white">
              {ready ? t('initialization.title') : 'Setup Password Manager'}
            </h2>
            <p className="mt-2 text-sm text-slate-400">
              {ready ? t('initialization.subtitle') : "Let's set up your password vault"}
            </p>
          </div>

          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="pb-4">
              <Stepper steps={steps} currentStep={currentStep} />
            </CardHeader>
            
            <CardContent className="pt-0">
              <div className="min-h-[250px]">
                {currentStep === 0 && renderWebDAVStep()}
                {currentStep === 1 && renderPasswordStep()}
              </div>

              <div className="flex justify-between mt-6">
                {currentStep > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleBack}
                    disabled={loading}
                    className="border-slate-600 text-slate-300 hover:bg-slate-700"
                  >
                    {ready ? t('initialization.back') : 'Back'}
                  </Button>
                )}
                
                <div className={currentStep > 0 ? '' : 'ml-auto'}>
                  <Button
                    type="button"
                    onClick={handleNext}
                    disabled={loading}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {loading ? (
                      <div className="flex items-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        {currentStep === 1
                          ? (ready ? t('initialization.configuringSync') : 'Configuring synchronization...')
                          : (ready ? t('initialization.processing') : 'Processing...')
                        }
                      </div>
                    ) : (
                      currentStep === 1
                        ? (ready ? t('initialization.finish') : 'Finish')
                        : (ready ? t('initialization.next') : 'Next')
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}