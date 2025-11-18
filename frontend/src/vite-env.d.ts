/// <reference types="vite/client" />

// Extend ImportMetaEnv for custom Vite environment variables
interface ImportMetaEnv {
  readonly VITE_DEFAULT_SYSTEM_HEALTH?: string
  readonly VITE_DEFAULT_QUEUE_PENDING?: string
  readonly VITE_DEFAULT_QUEUE_PROCESSING?: string
  readonly VITE_API_BASE_URL?: string
  // more env variables...
}
