import { afterEach, expect } from 'vitest'
import matchers from '@testing-library/jest-dom/matchers'
import { cleanup } from '@testing-library/react'

if (typeof expect === 'function' && 'extend' in expect) {
  (expect as any).extend(matchers as any)
}

afterEach(() => {
  cleanup()
})
