import React, { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { Input } from './Input'
import { Button } from './Button'

interface PasswordInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  showPasswordToggle?: boolean
}

export function PasswordInput({ 
  showPasswordToggle = true, 
  className = '', 
  ...props 
}: PasswordInputProps) {
  const [showPassword, setShowPassword] = useState(false)

  if (!showPasswordToggle) {
    return <Input type="password" className={className} {...props} />
  }

  return (
    <div className="relative">
      <Input
        type={showPassword ? 'text' : 'password'}
        className={`pr-10 ${className}`}
        {...props}
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
  )
}