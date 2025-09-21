// Global type definitions for browser APIs and Node.js globals

// Browser APIs
declare const console: {
  log: (...args: unknown[]) => void
  error: (...args: unknown[]) => void
  warn: (...args: unknown[]) => void
  info: (...args: unknown[]) => void
  debug: (...args: unknown[]) => void
}

declare function setTimeout(callback: (...args: unknown[]) => void, ms?: number): number
declare function clearTimeout(id: number): void
declare function setInterval(callback: (...args: unknown[]) => void, ms?: number): number
declare function clearInterval(id: number): void

declare const window: typeof globalThis & Record<string, unknown>
declare const document: Record<string, unknown>
declare const navigator: Record<string, unknown>

// Node.js globals (for compatibility)
declare const global: typeof globalThis
declare const process: {
  env: Record<string, string | undefined>
  cwd: () => string
  platform: string
  version: string
}

// React global types
declare namespace JSX {
  interface IntrinsicElements {
    [elemName: string]: unknown
  }
}

// Additional utility types
declare type ReactNode = React.ReactNode
declare type ReactElement = React.ReactElement
declare type FC<P = {}> = React.FC<P>
declare type Component<P = {}, S = {}> = React.Component<P, S>

// Ensure global types are available
declare global {
  interface Window {
    [key: string]: unknown
  }

  interface Document {
    [key: string]: unknown
  }

  interface Navigator {
    [key: string]: unknown
  }
}