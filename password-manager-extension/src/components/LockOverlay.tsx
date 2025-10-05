import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Lock, Eye, EyeOff } from 'lucide-react'
import { PasswordManager } from 'password-manager-core'
import { useAuthStore } from '@/store/auth-store'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { InitializationFlow } from '@/components/InitializationFlow'

export function LockOverlay() {
  const { t, ready } = useTranslation()
  const { login, setPasswordManager } = useAuthStore()
  const [masterPassword, setMasterPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [isInitialized, setIsInitialized] = useState<boolean | null>(null)
  const [showInitialization, setShowInitialization] = useState(false)

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

  const handleInitializationComplete = (passwordManager: PasswordManager) => {
    setPasswordManager(passwordManager)
    setIsInitialized(true)
    setShowInitialization(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!masterPassword.trim()) return

    setLoading(true)
    setError('')

    try {
      const success = await login(masterPassword)
      if (!success) {
        setError(ready ? t('auth.incorrectPassword') : 'Invalid master password. Please try again.')
        setMasterPassword('')
      }
      // 如果成功，组件会自动隐藏因为isAuthenticated变为true
    } catch (err) {
      console.error('Login failed:', err)
      setError(ready ? t('auth.incorrectPassword') : 'Authentication failed. Please try again.')
      setMasterPassword('')
    } finally {
      setLoading(false)
    }
  }


  // Show loading while checking initialization status
  if (isInitialized === null) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/95 backdrop-blur-sm">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mx-auto"></div>
          <p className="mt-2 text-sm text-slate-400">{t('common.loading')}</p>
        </div>
      </div>
    )
  }

  // Show initialization flow for new users
  if (showInitialization || !isInitialized) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/95 backdrop-blur-sm">
        <div className="w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
          <InitializationFlow onComplete={handleInitializationComplete} />
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/95 backdrop-blur-sm">
      <div className="w-full max-w-md mx-4">
        {/* Lock Icon */}
        <div className="flex justify-center mb-8">
          <div className="p-4 bg-slate-800 rounded-full">
            <Lock className="h-12 w-12 text-blue-400" />
          </div>
        </div>

        {/* Title */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white mb-2">{ready ? t('auth.lock') : 'Vault Locked'}</h1>
          <p className="text-slate-400">{ready ? t('auth.enterPassword') : 'Enter your master password to unlock'}</p>
        </div>

        {/* Unlock Form */}
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="masterPassword" className="block text-sm font-medium text-slate-200">
                {ready ? t('auth.masterPassword') : 'Master Password'}
              </label>
              <div className="relative">
                <Input
                  id="masterPassword"
                  type={showPassword ? 'text' : 'password'}
                  value={masterPassword}
                  onChange={(e) => setMasterPassword(e.target.value)}
                  placeholder={ready ? t('auth.enterPassword') : 'Enter master password'}
                  className="bg-slate-700 border-slate-600 text-white placeholder-slate-400 pr-12"
                  required
                  autoFocus
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 text-slate-400 hover:text-white"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-900/20 border border-red-800 rounded-lg">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            <div className="space-y-3">
              <Button
                type="submit"
                disabled={loading || !masterPassword.trim()}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                {loading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    {ready ? t('common.loading') : 'Unlocking...'}
                  </div>
                ) : (
                  <>
                    <Lock className="h-4 w-4 mr-2" />
                    {ready ? t('auth.unlock') : 'Unlock Vault'}
                  </>
                )}
              </Button>

            </div>
          </form>
        </div>

        {/* Hint */}
        <div className="mt-6 text-center">
          <p className="text-xs text-slate-500">
            Don't remember your master password?
            <br />
            You'll need to reset your vault.
          </p>
        </div>
      </div>
    </div>
  )
}