import { useState, useEffect } from 'react'
import { Lock } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { PasswordManager } from 'password-memo-core'
import { useAuthStore } from '@/store/auth-store'
import { Button } from '@/components/ui/Button'
import { PasswordInput } from '@/components/ui/PasswordInput'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card'
import { InitializationFlow } from '@/components/InitializationFlow'

export function LoginPage() {
  const { t } = useTranslation()
  const [password, setPassword] = useState('')
  const [isInitialized, setIsInitialized] = useState<boolean | null>(null)
  const [showInitialization, setShowInitialization] = useState(false)
  
  const { login, isLoading, error, clearError, setPasswordManager } = useAuthStore()

  // Check if already initialized on mount
  useEffect(() => {
    checkInitializationStatus()
  }, [])

  const checkInitializationStatus = async () => {
    try {
      // Use the singleton instance to check initialization status
      const manager = PasswordManager.getInstance()
      
      // Use the isInitialized method to check status without full initialization
      const initialized = await manager.isInitialized()

      setIsInitialized(initialized)
    } catch (error) {
      console.error('Failed to check initialization status:', error)
      setIsInitialized(false)
    }
  }

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!password) return
    
    clearError()
    const success = await login(password)
    if (!success) {
      setPassword('')
    }
  }

  const handleInitializationComplete = (passwordManager: PasswordManager) => {
    setPasswordManager(passwordManager)
    setIsInitialized(true)
    setShowInitialization(false)
  }

  const handleSetupNewVault = () => {
    setShowInitialization(true)
  }

  // Show loading while checking initialization status
  if (isInitialized === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600">{t('common.loading')}</p>
        </div>
      </div>
    )
  }

  // Show initialization flow for new users
  if (showInitialization || !isInitialized) {
    return <InitializationFlow onComplete={handleInitializationComplete} />
  }

  // Show regular login for existing users
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <Lock className="mx-auto h-12 w-12 text-primary" />
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            {t('login.title')}
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {t('login.subtitle')}
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t('login.masterPasswordTitle')}</CardTitle>
            <CardDescription>
              {t('login.masterPasswordDesc')}
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm animate-pulse">
                <div className="flex items-center">
                  <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <span className="font-medium">Authentication Error:</span>
                </div>
                <p className="mt-1">{error}</p>
                <p className="mt-2 text-xs text-red-600">Please check your password and try again.</p>
              </div>
            )}

            <form onSubmit={handlePasswordLogin} className="space-y-4">
              <PasswordInput
                placeholder={t('login.enterMasterPassword')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
              />
              
              <div className="text-xs text-muted-foreground">
                <p><strong>{t('login.returningUser')}</strong> {t('login.returningUserDesc')}</p>
                <p className="mt-2">
                  <button
                    type="button"
                    onClick={handleSetupNewVault}
                    className="text-blue-600 hover:text-blue-800 underline"
                  >
                    {t('login.firstTime')} {t('login.firstTimeDesc')}
                  </button>
                </p>
              </div>
              
              <Button
                type="submit"
                className="w-full"
                disabled={isLoading || !password}
              >
                {isLoading ? t('login.processing') : t('login.continue')}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}