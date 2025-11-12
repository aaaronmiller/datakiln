import { afterEach, expect } from 'vitest'
import matchers from '@testing-library/jest-dom/matchers'
import { cleanup } from '@testing-library/react'

if (expect && typeof expect.extend === 'function') {
  expect.extend(matchers)
}

afterEach(() => {
  cleanup()
})
