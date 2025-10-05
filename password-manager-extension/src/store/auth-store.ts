import { create } from 'zustand'
import { PasswordManager } from 'password-manager-core'

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
      const isInitialized = await manager.isInitialized()

      if (isInitialized) {
        const result = await manager.authenticate(password)
        if (result.success) {
          set({
            isAuthenticated: true,
            passwordManager: manager,
            isLoading: false
          })
          return true
        } else {
          // Enhanced error handling for sentinel password validation
          let errorMessage = result.error || 'Authentication failed'
          
          // Check if it's a sentinel validation error
          if (result.error?.includes('validation failed') ||
              result.error?.includes('sentinel value mismatch') ||
              result.error?.includes('Invalid master key')) {
            errorMessage = 'Incorrect master password. Please check your password and try again.'
          }
          
          set({
            error: errorMessage,
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
      
      // Enhanced error handling for different types of errors
      let errorMessage = 'Authentication failed'
      if (error instanceof Error) {
        if (error.message.includes('validation failed') ||
            error.message.includes('sentinel') ||
            error.message.includes('Invalid master key')) {
          errorMessage = 'Incorrect master password. Please check your password and try again.'
        } else {
          errorMessage = error.message
        }
      }
      
      set({
        error: errorMessage,
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