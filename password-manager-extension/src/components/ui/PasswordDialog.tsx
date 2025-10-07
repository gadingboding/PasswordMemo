import React, { useState } from 'react'
import { Lock } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Dialog, DialogFooter } from './Dialog'
import { Button } from './Button'
import { PasswordInput } from './PasswordInput'

interface PasswordDialogProps {
  open: boolean
  onClose: () => void
  onSubmit: (password: string) => void
  title: string
  description: string
  submitText: string
  loading?: boolean
  error?: string | null
}

export function PasswordDialog({
  open,
  onClose,
  onSubmit,
  title,
  description,
  submitText,
  loading = false,
  error = null
}: PasswordDialogProps) {
  const { t } = useTranslation()
  const [password, setPassword] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (password.trim()) {
      onSubmit(password)
    }
  }

  const handleClose = () => {
    if (!loading) {
      setPassword('')
      onClose()
    }
  }

  // Reset form when dialog opens/closes
  React.useEffect(() => {
    if (!open) {
      setPassword('')
    }
  }, [open])

  return (
    <Dialog open={open} onClose={handleClose} title={title}>
      <form onSubmit={handleSubmit}>
        <div className="space-y-4">
          <p className="text-sm text-slate-400">{description}</p>
          
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
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
          
          <div className="space-y-2">
            <label htmlFor="password" className="block text-sm font-medium text-slate-200">
              {t('auth.masterPassword')}
            </label>
            <PasswordInput
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t('auth.enterPassword')}
              className="bg-slate-700 border-slate-600 text-white placeholder-slate-400"
              disabled={loading}
              autoFocus
              required
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={loading}
            className="border-slate-600 text-slate-300 hover:bg-slate-700"
          >
            {t('common.cancel')}
          </Button>
          <Button
            type="submit"
            disabled={loading || !password.trim()}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {loading ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                {t('login.processing')}
              </div>
            ) : (
              <div className="flex items-center">
                <Lock className="h-4 w-4 mr-2" />
                {submitText}
              </div>
            )}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  )
}