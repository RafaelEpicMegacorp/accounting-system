import React, { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import { AuthProvider } from '../../contexts/AuthContext'
import { vi } from 'vitest'

// Create a test theme
const testTheme = createTheme({
  palette: {
    mode: 'light',
  },
})

// Mock AuthContext value
export const mockAuthContext = {
  user: { id: 'user1', email: 'test@example.com', name: 'Test User' },
  token: 'mock-jwt-token',
  login: vi.fn().mockResolvedValue(undefined),
  register: vi.fn().mockResolvedValue(undefined),
  logout: vi.fn(),
  loading: false,
}

// Custom render function with providers
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  initialEntries?: string[]
  authValue?: typeof mockAuthContext
}

export const renderWithProviders = (
  ui: ReactElement,
  {
    initialEntries = ['/'],
    authValue = mockAuthContext,
    ...renderOptions
  }: CustomRenderOptions = {}
) => {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <BrowserRouter>
      <ThemeProvider theme={testTheme}>
        <AuthProvider value={authValue}>
          {children}
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  )

  return render(ui, { wrapper: Wrapper, ...renderOptions })
}

// Helper to render component without authentication
export const renderWithoutAuth = (
  ui: ReactElement,
  options: CustomRenderOptions = {}
) => {
  return renderWithProviders(ui, {
    ...options,
    authValue: {
      ...mockAuthContext,
      user: null,
      token: null,
    },
  })
}

// Mock Material-UI components that might cause issues in tests
export const mockMUIComponents = () => {
  // Mock DatePicker
  vi.mock('@mui/x-date-pickers/DatePicker', () => ({
    DatePicker: ({ onChange, value, ...props }: any) => (
      <input
        data-testid="date-picker"
        type="date"
        value={value?.toISOString?.()?.split('T')[0] || ''}
        onChange={(e) => onChange?.(new Date(e.target.value))}
        {...props}
      />
    ),
  }))

  // Mock LocalizationProvider
  vi.mock('@mui/x-date-pickers/LocalizationProvider', () => ({
    LocalizationProvider: ({ children }: any) => children,
  }))

  // Mock AdapterDateFns
  vi.mock('@mui/x-date-pickers/AdapterDateFns', () => ({
    AdapterDateFns: {},
  }))
}

// Helper to create mock events
export const createMockEvent = (
  type: string,
  target: Partial<EventTarget> = {}
): Event => {
  const event = new Event(type, { bubbles: true, cancelable: true })
  Object.assign(event, { target })
  return event
}

// Helper to wait for async operations
export const waitForAsync = () => new Promise(resolve => setTimeout(resolve, 0))

// Mock file for file upload tests
export const createMockFile = (
  name = 'test.pdf',
  size = 1024,
  type = 'application/pdf'
): File => {
  const file = new File(['test content'], name, { type })
  Object.defineProperty(file, 'size', { value: size })
  return file
}

// Helper for testing error states
export const mockApiError = (message = 'API Error', status = 500) => ({
  response: {
    data: {
      success: false,
      message,
    },
    status,
  },
})

// Helper for testing loading states
export const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// Common test data
export const testUser = {
  id: 'user1',
  email: 'test@example.com',
  name: 'Test User',
}

export const testClient = {
  id: 'client1',
  name: 'Test Client',
  email: 'client@example.com',
  company: 'Test Company',
  phone: '+1234567890',
  address: '123 Test Street',
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-01-01T00:00:00Z',
}

export const testInvoice = {
  id: 'invoice1',
  invoiceNumber: 'INV-2025-000001',
  amount: 100.00,
  status: 'SENT' as const,
  issueDate: '2025-01-01T00:00:00Z',
  dueDate: '2025-01-31T00:00:00Z',
  client: {
    id: 'client1',
    name: 'Test Client',
    email: 'client@example.com',
    company: 'Test Company',
  },
  order: {
    id: 'order1',
    description: 'Monthly Service',
    frequency: 'MONTHLY',
  },
}

// Re-export testing library utilities
export * from '@testing-library/react'
export { default as userEvent } from '@testing-library/user-event'