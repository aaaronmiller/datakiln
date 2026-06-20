import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'
import { vi } from 'vitest'

afterEach(() => {
  cleanup()
})

Object.defineProperty(globalThis, 'jest', {
  value: vi,
  configurable: true,
})

const storage = new Map<string, string>()

Object.defineProperty(globalThis, 'localStorage', {
  value: {
    getItem: vi.fn((key: string) => storage.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      storage.set(key, value)
    }),
    removeItem: vi.fn((key: string) => {
      storage.delete(key)
    }),
    clear: vi.fn(() => {
      storage.clear()
    }),
  },
  configurable: true,
})

class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

Object.defineProperty(globalThis, 'ResizeObserver', {
  value: MockResizeObserver,
  configurable: true,
})

Object.defineProperty(globalThis, 'PointerEvent', {
  value: MouseEvent,
  configurable: true,
})

Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: vi.fn(() => Promise.resolve()),
  },
  configurable: true,
})

HTMLElement.prototype.scrollIntoView = vi.fn()
