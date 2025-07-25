import { vi } from 'vitest'
import { InvoiceWithRelations, InvoiceStatus } from '../../services/invoiceService'
import { Client } from '../../services/clientService'
import { Order } from '../../services/orderService'
import { Payment, PaymentHistory } from '../../services/paymentService'

// Mock API responses
export const mockClients: Client[] = [
  {
    id: 'client1',
    name: 'Test Client 1',
    email: 'client1@example.com',
    company: 'Test Company 1',
    phone: '+1234567890',
    address: '123 Test Street',
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
  },
  {
    id: 'client2',
    name: 'Test Client 2',
    email: 'client2@example.com',
    company: 'Test Company 2',
    phone: '+1234567891',
    address: '456 Test Avenue',
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
  },
]

export const mockOrders: Order[] = [
  {
    id: 'order1',
    clientId: 'client1',
    description: 'Monthly Service',
    amount: 100.00,
    frequency: 'MONTHLY',
    status: 'ACTIVE',
    startDate: '2025-01-01T00:00:00Z',
    nextInvoiceDate: '2025-02-01T00:00:00Z',
    leadTimeDays: 3,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
  },
]

export const mockInvoices: InvoiceWithRelations[] = [
  {
    id: 'invoice1',
    orderId: 'order1',
    clientId: 'client1',
    invoiceNumber: 'INV-2025-000001',
    amount: 100.00,
    issueDate: '2025-01-01T00:00:00Z',
    dueDate: '2025-01-31T00:00:00Z',
    status: 'SENT' as InvoiceStatus,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
    client: {
      id: 'client1',
      name: 'Test Client 1',
      email: 'client1@example.com',
      company: 'Test Company 1',
    },
    order: {
      id: 'order1',
      description: 'Monthly Service',
      frequency: 'MONTHLY',
    },
  },
]

export const mockPayments: Payment[] = [
  {
    id: 'payment1',
    invoiceId: 'invoice1',
    amount: 50.00,
    method: 'BANK_TRANSFER',
    paidDate: '2025-01-15T00:00:00Z',
    notes: 'Partial payment',
    createdAt: '2025-01-15T00:00:00Z',
  },
]

export const mockPaymentHistory: PaymentHistory = {
  invoice: {
    id: 'invoice1',
    invoiceNumber: 'INV-2025-000001',
    amount: 100.00,
    status: 'SENT',
    client: {
      id: 'client1',
      name: 'Test Client 1',
      company: 'Test Company 1',
    },
    order: {
      id: 'order1',
      description: 'Monthly Service',
    },
  },
  payments: mockPayments,
  summary: {
    totalPaid: 50.00,
    remainingAmount: 50.00,
    isFullyPaid: false,
    paymentCount: 1,
  },
}

// Mock axios instance
export const mockApi = {
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
}

// Mock service responses
export const mockApiResponses = {
  // Auth responses
  login: {
    data: {
      success: true,
      data: {
        user: { id: 'user1', email: 'test@example.com', name: 'Test User' },
        token: 'mock-jwt-token',
      },
    },
  },
  
  // Client responses
  clients: {
    data: {
      data: {
        clients: mockClients,
        pagination: {
          currentPage: 1,
          totalPages: 1,
          totalCount: 2,
          limit: 10,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      },
    },
  },
  
  // Invoice responses
  invoices: {
    data: {
      data: {
        invoices: mockInvoices,
        pagination: {
          currentPage: 1,
          totalPages: 1,
          totalCount: 1,
          limit: 10,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      },
    },
  },
  
  // Payment responses
  paymentHistory: {
    data: {
      data: mockPaymentHistory,
    },
  },
  
  recordPayment: {
    data: {
      data: {
        payment: mockPayments[0],
        invoice: mockInvoices[0],
        paymentSummary: {
          totalPaid: 50.00,
          remainingAmount: 50.00,
          isFullyPaid: false,
        },
      },
    },
  },
}

// Helper to setup API mocks
export const setupApiMocks = () => {
  mockApi.get.mockImplementation((url: string) => {
    if (url.includes('/api/clients')) return Promise.resolve(mockApiResponses.clients)
    if (url.includes('/api/invoices')) return Promise.resolve(mockApiResponses.invoices)
    if (url.includes('/api/payments/invoice/')) return Promise.resolve(mockApiResponses.paymentHistory)
    return Promise.reject(new Error(`Unmocked API call: ${url}`))
  })
  
  mockApi.post.mockImplementation((url: string) => {
    if (url.includes('/api/auth/login')) return Promise.resolve(mockApiResponses.login)
    if (url.includes('/api/payments/invoice/')) return Promise.resolve(mockApiResponses.recordPayment)
    return Promise.reject(new Error(`Unmocked API call: ${url}`))
  })
  
  return mockApi
}