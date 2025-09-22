import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

export type NotificationType = 'success' | 'error' | 'warning' | 'info'

export interface Notification {
  id: string
  type: NotificationType
  title: string
  message?: string
  duration?: number // in milliseconds, default 5000
  timestamp: number
}

export interface LoadingState {
  id: string
  message?: string
  isLoading: boolean
}

interface UIState {
  // Modal states
  isCommandPaletteOpen: boolean
  isGlobalSearchOpen: boolean
  isSidebarOpen: boolean

  // Loading states
  globalLoading: boolean
  globalLoadingMessage?: string
  loadingStates: Record<string, LoadingState>

  // Notifications
  notifications: Notification[]

  // Modal actions
  openCommandPalette: () => void
  closeCommandPalette: () => void
  toggleCommandPalette: () => void

  openGlobalSearch: () => void
  closeGlobalSearch: () => void
  toggleGlobalSearch: () => void

  openSidebar: () => void
  closeSidebar: () => void
  toggleSidebar: () => void

  // Loading actions
  setGlobalLoading: (loading: boolean, message?: string) => void
  setLoadingState: (id: string, isLoading: boolean, message?: string) => void
  removeLoadingState: (id: string) => void
  isLoading: (id?: string) => boolean

  // Notification actions
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp'>) => string
  removeNotification: (id: string) => void
  clearNotifications: () => void
  clearNotificationsByType: (type: NotificationType) => void
}

export const useUIStore = create<UIState>()(
  devtools(
    (set, get) => ({
      // Initial state
      isCommandPaletteOpen: false,
      isGlobalSearchOpen: false,
      isSidebarOpen: false,

      globalLoading: false,
      globalLoadingMessage: undefined,
      loadingStates: {},

      notifications: [],

      // Modal actions
      openCommandPalette: () => set({ isCommandPaletteOpen: true }),
      closeCommandPalette: () => set({ isCommandPaletteOpen: false }),
      toggleCommandPalette: () => set((state) => ({ isCommandPaletteOpen: !state.isCommandPaletteOpen })),

      openGlobalSearch: () => set({ isGlobalSearchOpen: true }),
      closeGlobalSearch: () => set({ isGlobalSearchOpen: false }),
      toggleGlobalSearch: () => set((state) => ({ isGlobalSearchOpen: !state.isGlobalSearchOpen })),

      openSidebar: () => set({ isSidebarOpen: true }),
      closeSidebar: () => set({ isSidebarOpen: false }),
      toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),

      // Loading actions
      setGlobalLoading: (loading: boolean, message?: string) =>
        set({ globalLoading: loading, globalLoadingMessage: message }),

      setLoadingState: (id: string, isLoading: boolean, message?: string) =>
        set((state) => ({
          loadingStates: {
            ...state.loadingStates,
            [id]: { id, isLoading, message }
          }
        })),

      removeLoadingState: (id: string) =>
        set((state) => {
          const newLoadingStates = { ...state.loadingStates }
          delete newLoadingStates[id]
          return { loadingStates: newLoadingStates }
        }),

      isLoading: (id?: string) => {
        const state = get()
        if (id) {
          return state.loadingStates[id]?.isLoading || false
        }
        return state.globalLoading || Object.values(state.loadingStates).some(ls => ls.isLoading)
      },

      // Notification actions
      addNotification: (notification) => {
        const id = `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        const newNotification: Notification = {
          ...notification,
          id,
          timestamp: Date.now(),
          duration: notification.duration ?? 5000
        }

        set((state) => ({
          notifications: [...state.notifications, newNotification]
        }))

        // Auto-remove notification after duration
        if (newNotification.duration && newNotification.duration > 0) {
          setTimeout(() => {
            get().removeNotification(id)
          }, newNotification.duration)
        }

        return id
      },

      removeNotification: (id: string) =>
        set((state) => ({
          notifications: state.notifications.filter(n => n.id !== id)
        })),

      clearNotifications: () => set({ notifications: [] }),

      clearNotificationsByType: (type: NotificationType) =>
        set((state) => ({
          notifications: state.notifications.filter(n => n.type !== type)
        }))
    }),
    { name: 'ui-store' }
  )
)

// Convenience hooks for specific functionality
export const useCommandPalette = () => {
  const { isCommandPaletteOpen, openCommandPalette, closeCommandPalette, toggleCommandPalette } = useUIStore()
  return { isOpen: isCommandPaletteOpen, open: openCommandPalette, close: closeCommandPalette, toggle: toggleCommandPalette }
}

export const useGlobalSearch = () => {
  const { isGlobalSearchOpen, openGlobalSearch, closeGlobalSearch, toggleGlobalSearch } = useUIStore()
  return { isOpen: isGlobalSearchOpen, open: openGlobalSearch, close: closeGlobalSearch, toggle: toggleGlobalSearch }
}

export const useSidebar = () => {
  const { isSidebarOpen, openSidebar, closeSidebar, toggleSidebar } = useUIStore()
  return { isOpen: isSidebarOpen, open: openSidebar, close: closeSidebar, toggle: toggleSidebar }
}

export const useLoading = () => {
  const { globalLoading, globalLoadingMessage, setGlobalLoading, isLoading } = useUIStore()
  return { isLoading: globalLoading, message: globalLoadingMessage, setLoading: setGlobalLoading, isAnyLoading: isLoading }
}

export const useNotifications = () => {
  const { notifications, addNotification, removeNotification, clearNotifications, clearNotificationsByType } = useUIStore()
  return { notifications, add: addNotification, remove: removeNotification, clear: clearNotifications, clearByType: clearNotificationsByType }
}