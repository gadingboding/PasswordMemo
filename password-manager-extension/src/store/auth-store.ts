import { create } from 'zustand'
import { PasswordManager, DEFAULT_STORAGE_NAMESPACE } from 'password-manager-core'

interface AuthState {
  isAuthenticated: boolean
  passwordManager: PasswordManager | null
  isLoading: boolean
  error: string | null
  
  // Actions
  login: (password: string) => Promise<boolean>
  logout: () => void
  lock: () => void
  reset: () => Promise<boolean>
  clearError: () => void
  setPasswordManager: (manager: PasswordManager) => void
}

export const useAuthStore = create<AuthState>((set, get) => ({
  isAuthenticated: false,
  passwordManager: null,
  isLoading: false,
  error: null,

  login: async (password: string) => {
    set({ isLoading: true, error: null })
    
    try {
      const manager = PasswordManager.getInstance()

      // Check if already initialized
      const isInitialized = await manager.isInitialized({
        basePath: undefined,
        namespace: DEFAULT_STORAGE_NAMESPACE
      })

      if (isInitialized) {
        // Already initialized, just initialize and authenticate
        await manager.initialize({
          config: {
            storage: {
              basePath: undefined,
              namespace: 'password-manager'
            }
          }
        })
        const result = await manager.authenticate(password)
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
      } else {
        // Not initialized, this shouldn't happen in normal flow
        // But we handle it gracefully
        set({
          error: 'Password manager not initialized. Please set up a new vault.',
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

  logout: () => {
    const { passwordManager } = get()
    if (passwordManager) {
      passwordManager.lock()
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

  clearError: () => set({ error: null }),

  setPasswordManager: (manager: PasswordManager) => set({
    isAuthenticated: true,
    passwordManager: manager,
    isLoading: false,
    error: null
  }),
    reset: async () => {
    set({ isLoading: true, error: null })

    try {
      const { passwordManager } = get()

      // User must be logged in to access reset, so passwordManager must exist
      if (!passwordManager) {
        throw new Error('Password manager not available')
      }

      await passwordManager.reset()

      // Reset all state
      set({
        isAuthenticated: false,
        passwordManager: null,
        isLoading: false,
        error: null
      })
      return true
    } catch (error) {
      console.error('Reset error:', error)
      set({
        error: error instanceof Error ? error.message : 'Reset failed',
        isLoading: false
      })
      return false
    }
  }
}))