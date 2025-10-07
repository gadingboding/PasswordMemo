import { useState, useCallback } from 'react'
import { ToastType } from '../components/ui/Toast'

interface ToastItem {
  id: string
  type: ToastType
  message: string
  duration?: number
}

export function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const addToast = useCallback((type: ToastType, message: string, duration?: number) => {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9)
    const newToast: ToastItem = {
      id,
      type,
      message,
      duration,
    }

    setToasts((prev) => [...prev, newToast])
    return id
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }, [])

  const showSuccess = useCallback((message: string, duration?: number) => {
    return addToast('success', message, duration)
  }, [addToast])

  const showError = useCallback((message: string, duration?: number) => {
    return addToast('error', message, duration)
  }, [addToast])

  const showInfo = useCallback((message: string, duration?: number) => {
    return addToast('info', message, duration)
  }, [addToast])

  return {
    toasts,
    addToast,
    removeToast,
    showSuccess,
    showError,
    showInfo,
  }
}