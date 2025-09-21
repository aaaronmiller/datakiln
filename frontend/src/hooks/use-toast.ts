import { useState, useCallback } from 'react'

interface Toast {
  id: string
  title: string
  description?: string
  type?: 'success' | 'error' | 'warning' | 'info'
  variant?: 'default' | 'destructive' | 'secondary' | 'outline'
}

interface UseToastReturn {
  toasts: Toast[]
  toast: (toast: Omit<Toast, 'id'>) => void
  dismiss: (id: string) => void
}

interface ToastInput extends Omit<Toast, 'id'> {
  variant?: 'default' | 'destructive' | 'secondary' | 'outline'
  type?: 'success' | 'error' | 'warning' | 'info'
}

export const useToast = (): UseToastReturn => {
  const [toasts, setToasts] = useState<Toast[]>([])

  const toast = useCallback((toastData: ToastInput) => {
    const id = Math.random().toString(36).substr(2, 9)

    // Handle variant to type mapping
    let processedToastData = { ...toastData }
    if (toastData.variant && !toastData.type) {
      switch (toastData.variant) {
        case 'destructive':
          processedToastData.type = 'error'
          break
        case 'default':
          processedToastData.type = 'info'
          break
        case 'secondary':
          processedToastData.type = 'warning'
          break
        default:
          processedToastData.type = 'info'
      }
    }

    const newToast: Toast = { ...processedToastData, id }
    setToasts(prev => [...prev, newToast])

    // Auto-dismiss after 5 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 5000)
  }, [])

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  return { toasts, toast, dismiss }
}

export default useToast