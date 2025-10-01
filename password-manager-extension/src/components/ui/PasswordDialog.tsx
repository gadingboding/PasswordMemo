import React, { useState } from 'react'
import { Eye, EyeOff, Lock } from 'lucide-react'
import { Dialog, DialogFooter } from './Dialog'
import { Button } from './Button'
import { Input } from './Input'

interface PasswordDialogProps {
  open: boolean
  onClose: () => void
  onSubmit: (password: string) => void
  title: string
  description: string
  submitText: string
  loading?: boolean
}

export function PasswordDialog({
  open,
  onClose,
  onSubmit,
  title,
  description,
  submitText,
  loading = false
}: PasswordDialogProps) {
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (password.trim()) {
      onSubmit(password)
    }
  }

  const handleClose = () => {
    if (!loading) {
      setPassword('')
      setShowPassword(false)
      onClose()
    }
  }

  // Reset form when dialog opens/closes
  React.useEffect(() => {
    if (!open) {
      setPassword('')
      setShowPassword(false)
    }
  }, [open])

  return (
    <Dialog open={open} onClose={handleClose} title={title}>
      <form onSubmit={handleSubmit}>
        <div className="space-y-4">
          <p className="text-sm text-slate-400">{description}</p>
          
          <div className="space-y-2">
            <label htmlFor="password" className="block text-sm font-medium text-slate-200">
              Master Password
            </label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your master password"
                className="pr-10 bg-slate-700 border-slate-600 text-white placeholder-slate-400"
                disabled={loading}
                autoFocus
                required
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full px-3 text-slate-400 hover:text-white"
                onClick={() => setShowPassword(!showPassword)}
                disabled={loading}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
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
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={loading || !password.trim()}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {loading ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Processing...
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