import '@testing-library/jest-dom'
import { expect, afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'

// Global test setup
beforeEach(() => {
  // Mock console methods to avoid noise in tests
  vi.spyOn(console, 'error').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})

// Cleanup after each test
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.clearAllMocks()
})

// Mock environment variables - use actual env or default for tests
vi.mock('import.meta', () => ({
  env: {
    VITE_API_URL: process.env.VITE_API_URL || 'http://localhost:3001',
    NODE_ENV: 'test',
  },
}))

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}
vi.stubGlobal('localStorage', localStorageMock)

// Mock window.matchMedia for responsive testing
const matchMediaMock = vi.fn((query) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: vi.fn(), // deprecated
  removeListener: vi.fn(), // deprecated
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
}))

// Use vi.stubGlobal for better Vitest compatibility
vi.stubGlobal('matchMedia', matchMediaMock)

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Mock URL.createObjectURL for file download tests
global.URL.createObjectURL = vi.fn().mockReturnValue('mock-blob-url')
global.URL.revokeObjectURL = vi.fn()