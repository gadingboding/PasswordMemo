import { create } from 'zustand'
import { PasswordManager } from 'password-manager-core'

interface AuthState {
  isAuthenticated: boolean
  passwordManager: PasswordManager | null
  isLoading: boolean
  error: string | null
  
  // Actions
  login: (password: string) => Promise<boolean>
  loginWithPIN: (pin: string) => Promise<boolean>
  logout: () => void
  lock: () => void
  clearError: () => void
}

export const useAuthStore = create<AuthState>((set, get) => ({
  isAuthenticated: false,
  passwordManager: null,
  isLoading: false,
  error: null,

  login: async (password: string) => {
    set({ isLoading: true, error: null })
    
    try {
      const manager = new PasswordManager()
      await manager.initialize({
        storage: {
          useIndexedDB: false, // 使用 localStorage
          namespace: 'password-manager'
        }
      })
      const result = await manager.authenticate({
        password: password
      })
      if (result.success) {
        set({
          isAuthenticated: true,
          passwordManager: manager,
          isLoading: false
        })
        return true
      } else {
        set({
          error: result.error || 'Authentication failed',
          isLoading: false
        })
        return false
      }
    } catch (error) {
      console.error('Authentication error:', error)
      set({
        error: error instanceof Error ? error.message : 'Authentication failed',
        isLoading: false
      })
      return false
    }
  },

  loginWithPIN: async (pin: string) => {
    set({ isLoading: true, error: null })
    
    try {
      const manager = get().passwordManager || new PasswordManager()
      
      if (!get().passwordManager) {
        await manager.initialize({
          storage: {
            useIndexedDB: true,
            namespace: 'password-manager'
          }
        })
      }

      const result = await manager.unlockWithPIN(pin)

      if (result.success) {
        set({
          isAuthenticated: true,
          passwordManager: manager,
          isLoading: false
        })
        return true
      } else {
        set({
          error: result.error || 'PIN authentication failed',
          isLoading: false
        })
        return false
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'PIN authentication failed',
        isLoading: false
      })
      return false
    }
  },

  logout: () => {
    const { passwordManager } = get()
    if (passwordManager) {
      passwordManager.logout()
    }
    set({
      isAuthenticated: false,
      passwordManager: null,
      error: null
    })
  },

  lock: () => {
    const { passwordManager } = get()
    if (passwordManager) {
      passwordManager.lock()
    }
    set({
      isAuthenticated: false,
      error: null
    })
  },

  clearError: () => set({ error: null })
}))