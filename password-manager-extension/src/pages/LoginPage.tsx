import { useState } from 'react'
import { Eye, EyeOff, Lock, KeyRound } from 'lucide-react'
import { useAuthStore } from '@/store/auth-store'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card'

export function LoginPage() {
  const [password, setPassword] = useState('')
  const [pin, setPIN] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loginMode, setLoginMode] = useState<'password' | 'pin'>('password')
  
  const { login, loginWithPIN, isLoading, error, clearError } = useAuthStore()

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!password) return
    
    clearError()
    const success = await login(password)
    if (!success) {
      setPassword('')
    }
  }

  const handlePINLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!pin) return
    
    clearError()
    const success = await loginWithPIN(pin)
    if (!success) {
      setPIN('')
    }
  }

  const switchMode = () => {
    clearError()
    setPassword('')
    setPIN('')
    setLoginMode(loginMode === 'password' ? 'pin' : 'password')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <Lock className="mx-auto h-12 w-12 text-primary" />
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Password Manager
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Sign in to access your vault
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>
              {loginMode === 'password' ? 'Master Password' : 'PIN Access'}
            </CardTitle>
            <CardDescription>
              {loginMode === 'password'
                ? 'Enter your master password to unlock your vault. If this is your first time, a new vault will be created.'
                : 'Enter your PIN to quickly access your vault'
              }
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            {error && (
              <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-md text-sm">
                {error}
              </div>
            )}

            {loginMode === 'password' ? (
              <form onSubmit={handlePasswordLogin} className="space-y-4">
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter master password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pr-10"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </button>
                </div>
                
                <div className="text-xs text-muted-foreground">
                  <p><strong>First time?</strong> Just enter a secure password to create your vault.</p>
                  <p><strong>Returning user?</strong> Enter your existing master password.</p>
                </div>
                
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isLoading || !password}
                >
                  {isLoading ? 'Processing...' : 'Continue'}
                </Button>
              </form>
            ) : (
              <form onSubmit={handlePINLogin} className="space-y-4">
                <Input
                  type="password"
                  placeholder="Enter PIN"
                  value={pin}
                  onChange={(e) => setPIN(e.target.value)}
                  maxLength={6}
                  disabled={isLoading}
                />
                
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isLoading || !pin}
                >
                  {isLoading ? 'Unlocking...' : 'Unlock with PIN'}
                </Button>
              </form>
            )}

            <div className="mt-4 text-center">
              <Button
                variant="ghost"
                onClick={switchMode}
                disabled={isLoading}
                className="text-sm"
              >
                <KeyRound className="h-4 w-4 mr-2" />
                {loginMode === 'password' ? 'Use PIN instead' : 'Use master password instead'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}