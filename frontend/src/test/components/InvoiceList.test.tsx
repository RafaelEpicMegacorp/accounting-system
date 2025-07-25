import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders, mockApiError } from '../helpers/testUtils'
import { mockInvoices, mockApiResponses } from '../mocks/apiMocks'
import InvoiceList from '../../components/invoices/InvoiceList'

// Mock invoice service
vi.mock('../../services/invoiceService', () => ({
  invoiceService: {
    getInvoices: vi.fn(),
    deleteInvoice: vi.fn(),
    updateInvoiceStatus: vi.fn(),
    sendInvoiceEmail: vi.fn(),
    downloadInvoicePDF: vi.fn(),
  },
}))

import { invoiceService } from '../../services/invoiceService'

describe('InvoiceList', () => {
  const mockGetInvoices = invoiceService.getInvoices as any
  const mockDeleteInvoice = invoiceService.deleteInvoice as any
  const mockUpdateInvoiceStatus = invoiceService.updateInvoiceStatus as any
  const mockSendInvoiceEmail = invoiceService.sendInvoiceEmail as any
  const mockDownloadInvoicePDF = invoiceService.downloadInvoicePDF as any
  const mockOnEdit = vi.fn()
  const mockOnDelete = vi.fn()
  const mockOnViewPayments = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    mockGetInvoices.mockResolvedValue({
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
    })
    mockUpdateInvoiceStatus.mockResolvedValue({ data: { invoice: mockInvoices[0] } })
    mockSendInvoiceEmail.mockResolvedValue({ data: { success: true } })
    mockDeleteInvoice.mockResolvedValue({ data: { success: true } })
    mockDownloadInvoicePDF.mockResolvedValue(new Blob(['PDF content'], { type: 'application/pdf' }))
  })

  const defaultProps = {
    onEdit: mockOnEdit,
    onDelete: mockOnDelete,
    onViewPayments: mockOnViewPayments,
  }

  describe('Component Rendering', () => {
    it('should render invoice list with loading state initially', () => {
      renderWithProviders(<InvoiceList {...defaultProps} />)
      
      expect(screen.getByRole('progressbar')).toBeInTheDocument()
    })

    it('should render invoice list with data after loading', async () => {
      renderWithProviders(<InvoiceList {...defaultProps} />)
      
      await waitFor(() => {
        expect(screen.getByText('INV-2025-000001')).toBeInTheDocument()
        expect(screen.getByText('Test Client 1')).toBeInTheDocument()
        expect(screen.getByText('$100.00')).toBeInTheDocument()
      })
    })

    it('should display invoice status with proper styling', async () => {
      renderWithProviders(<InvoiceList {...defaultProps} />)
      
      await waitFor(() => {
        const statusChip = screen.getByText('SENT')
        expect(statusChip).toBeInTheDocument()
        expect(statusChip).toHaveClass('MuiChip-colorWarning') // Assuming SENT status uses warning color
      })
    })

    it('should render action buttons for each invoice', async () => {
      renderWithProviders(<InvoiceList {...defaultProps} />)
      
      await waitFor(() => {
        expect(screen.getByLabelText(/view invoice details/i)).toBeInTheDocument()
        expect(screen.getByLabelText(/download pdf/i)).toBeInTheDocument()
        expect(screen.getByLabelText(/send email/i)).toBeInTheDocument()
        expect(screen.getByLabelText(/view payments/i)).toBeInTheDocument()
        expect(screen.getByLabelText(/edit invoice/i)).toBeInTheDocument()
        expect(screen.getByLabelText(/delete invoice/i)).toBeInTheDocument()
      })
    })

    it('should format dates correctly', async () => {
      renderWithProviders(<InvoiceList {...defaultProps} />)
      
      await waitFor(() => {
        // Dates should be formatted in user-friendly format
        expect(screen.getByText(/Jan 1, 2025/i)).toBeInTheDocument()
        expect(screen.getByText(/Jan 31, 2025/i)).toBeInTheDocument()
      })
    })
  })

  describe('Status Management', () => {
    it('should show status dropdown for invoices', async () => {
      renderWithProviders(<InvoiceList {...defaultProps} />)
      
      await waitFor(() => {
        const statusButton = screen.getByLabelText(/change status/i)
        expect(statusButton).toBeInTheDocument()
      })
    })

    it('should update invoice status when status is changed', async () => {
      const user = userEvent.setup()
      renderWithProviders(<InvoiceList {...defaultProps} />)
      
      await waitFor(() => {
        expect(screen.getByText('SENT')).toBeInTheDocument()
      })

      const statusButton = screen.getByLabelText(/change status/i)
      await user.click(statusButton)
      
      await waitFor(() => {
        const paidOption = screen.getByText('PAID')
        expect(paidOption).toBeInTheDocument()
      })

      const paidOption = screen.getByText('PAID')
      await user.click(paidOption)
      
      await waitFor(() => {
        expect(mockUpdateInvoiceStatus).toHaveBeenCalledWith(mockInvoices[0].id, 'PAID')
      })
    })

    it('should show different status options based on current status', async () => {
      const user = userEvent.setup()
      renderWithProviders(<InvoiceList {...defaultProps} />)
      
      await waitFor(() => {
        expect(screen.getByText('SENT')).toBeInTheDocument()
      })

      const statusButton = screen.getByLabelText(/change status/i)
      await user.click(statusButton)
      
      await waitFor(() => {
        expect(screen.getByText('DRAFT')).toBeInTheDocument()
        expect(screen.getByText('PAID')).toBeInTheDocument()
        expect(screen.getByText('OVERDUE')).toBeInTheDocument()
        expect(screen.getByText('CANCELLED')).toBeInTheDocument()
      })
    })

    it('should show loading state while updating status', async () => {
      const user = userEvent.setup()
      let resolvePromise: (value: any) => void
      const pendingPromise = new Promise(resolve => {
        resolvePromise = resolve
      })
      mockUpdateInvoiceStatus.mockReturnValue(pendingPromise)
      
      renderWithProviders(<InvoiceList {...defaultProps} />)
      
      await waitFor(() => {
        expect(screen.getByText('SENT')).toBeInTheDocument()
      })

      const statusButton = screen.getByLabelText(/change status/i)
      await user.click(statusButton)
      
      const paidOption = screen.getByText('PAID')
      await user.click(paidOption)
      
      expect(screen.getByRole('progressbar')).toBeInTheDocument()
      
      // Resolve the promise
      resolvePromise!({ data: { invoice: { ...mockInvoices[0], status: 'PAID' } } })
    })

    it('should handle status update errors', async () => {
      const user = userEvent.setup()
      mockUpdateInvoiceStatus.mockRejectedValue(mockApiError('Status update failed'))
      
      renderWithProviders(<InvoiceList {...defaultProps} />)
      
      await waitFor(() => {
        expect(screen.getByText('SENT')).toBeInTheDocument()
      })

      const statusButton = screen.getByLabelText(/change status/i)
      await user.click(statusButton)
      
      const paidOption = screen.getByText('PAID')
      await user.click(paidOption)
      
      await waitFor(() => {
        expect(screen.getByText(/status update failed/i)).toBeInTheDocument()
      })
    })
  })

  describe('PDF Download', () => {
    it('should download PDF when download button is clicked', async () => {
      const user = userEvent.setup()
      
      // Mock URL.createObjectURL
      const mockCreateObjectURL = vi.fn().mockReturnValue('blob:mock-url')
      global.URL.createObjectURL = mockCreateObjectURL
      
      // Mock link click
      const mockClick = vi.fn()
      vi.spyOn(document, 'createElement').mockImplementation((tagName) => {
        if (tagName === 'a') {
          return {
            href: '',
            download: '',
            click: mockClick,
          } as any
        }
        return document.createElement(tagName)
      })
      
      renderWithProviders(<InvoiceList {...defaultProps} />)
      
      await waitFor(() => {
        expect(screen.getByLabelText(/download pdf/i)).toBeInTheDocument()
      })

      const downloadButton = screen.getByLabelText(/download pdf/i)
      await user.click(downloadButton)
      
      await waitFor(() => {
        expect(mockDownloadInvoicePDF).toHaveBeenCalledWith(mockInvoices[0].id)
        expect(mockCreateObjectURL).toHaveBeenCalled()
        expect(mockClick).toHaveBeenCalled()
      })
    })

    it('should show loading state during PDF download', async () => {
      const user = userEvent.setup()
      let resolvePromise: (value: any) => void
      const pendingPromise = new Promise(resolve => {
        resolvePromise = resolve
      })
      mockDownloadInvoicePDF.mockReturnValue(pendingPromise)
      
      renderWithProviders(<InvoiceList {...defaultProps} />)
      
      await waitFor(() => {
        expect(screen.getByLabelText(/download pdf/i)).toBeInTheDocument()
      })

      const downloadButton = screen.getByLabelText(/download pdf/i)
      await user.click(downloadButton)
      
      expect(downloadButton).toBeDisabled()
      
      // Resolve the promise
      resolvePromise!(new Blob(['PDF content'], { type: 'application/pdf' }))
    })

    it('should handle PDF download errors', async () => {
      const user = userEvent.setup()
      mockDownloadInvoicePDF.mockRejectedValue(mockApiError('PDF generation failed'))
      
      renderWithProviders(<InvoiceList {...defaultProps} />)
      
      await waitFor(() => {
        expect(screen.getByLabelText(/download pdf/i)).toBeInTheDocument()
      })

      const downloadButton = screen.getByLabelText(/download pdf/i)
      await user.click(downloadButton)
      
      await waitFor(() => {
        expect(screen.getByText(/pdf generation failed/i)).toBeInTheDocument()
      })
    })
  })

  describe('Email Functionality', () => {
    it('should send invoice email when email button is clicked', async () => {
      const user = userEvent.setup()
      renderWithProviders(<InvoiceList {...defaultProps} />)
      
      await waitFor(() => {
        expect(screen.getByLabelText(/send email/i)).toBeInTheDocument()
      })

      const emailButton = screen.getByLabelText(/send email/i)
      await user.click(emailButton)
      
      await waitFor(() => {
        expect(mockSendInvoiceEmail).toHaveBeenCalledWith(mockInvoices[0].id)
      })
    })

    it('should show success message after email is sent', async () => {
      const user = userEvent.setup()
      renderWithProviders(<InvoiceList {...defaultProps} />)
      
      await waitFor(() => {
        expect(screen.getByLabelText(/send email/i)).toBeInTheDocument()
      })

      const emailButton = screen.getByLabelText(/send email/i)
      await user.click(emailButton)
      
      await waitFor(() => {
        expect(screen.getByText(/email sent successfully/i)).toBeInTheDocument()
      })
    })

    it('should handle email send errors', async () => {
      const user = userEvent.setup()
      mockSendInvoiceEmail.mockRejectedValue(mockApiError('Email send failed'))
      
      renderWithProviders(<InvoiceList {...defaultProps} />)
      
      await waitFor(() => {
        expect(screen.getByLabelText(/send email/i)).toBeInTheDocument()
      })

      const emailButton = screen.getByLabelText(/send email/i)
      await user.click(emailButton)
      
      await waitFor(() => {
        expect(screen.getByText(/email send failed/i)).toBeInTheDocument()
      })
    })

    it('should disable email button for cancelled invoices', async () => {
      const cancelledInvoice = { ...mockInvoices[0], status: 'CANCELLED' as const }
      mockGetInvoices.mockResolvedValue({
        data: {
          invoices: [cancelledInvoice],
          pagination: {
            currentPage: 1,
            totalPages: 1,
            totalCount: 1,
            limit: 10,
            hasNextPage: false,
            hasPreviousPage: false,
          },
        },
      })
      
      renderWithProviders(<InvoiceList {...defaultProps} />)
      
      await waitFor(() => {
        const emailButton = screen.getByLabelText(/send email/i)
        expect(emailButton).toBeDisabled()
      })
    })
  })

  describe('Search and Filtering', () => {
    it('should display search input', async () => {
      renderWithProviders(<InvoiceList {...defaultProps} />)
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText(/search invoices/i)).toBeInTheDocument()
      })
    })

    it('should call API with search term when searching', async () => {
      const user = userEvent.setup()
      renderWithProviders(<InvoiceList {...defaultProps} />)
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText(/search invoices/i)).toBeInTheDocument()
      })

      const searchInput = screen.getByPlaceholderText(/search invoices/i)
      await user.type(searchInput, 'INV-2025')
      
      await waitFor(() => {
        expect(mockGetInvoices).toHaveBeenCalledWith({
          search: 'INV-2025',
          page: 1,
          limit: 10,
        })
      }, { timeout: 1000 })
    })

    it('should display status filter', async () => {
      renderWithProviders(<InvoiceList {...defaultProps} />)
      
      await waitFor(() => {
        expect(screen.getByLabelText(/filter by status/i)).toBeInTheDocument()
      })
    })

    it('should filter invoices by status', async () => {
      const user = userEvent.setup()
      renderWithProviders(<InvoiceList {...defaultProps} />)
      
      await waitFor(() => {
        expect(screen.getByLabelText(/filter by status/i)).toBeInTheDocument()
      })

      const statusFilter = screen.getByLabelText(/filter by status/i)
      await user.click(statusFilter)
      
      const paidFilter = screen.getByText('PAID')
      await user.click(paidFilter)
      
      await waitFor(() => {
        expect(mockGetInvoices).toHaveBeenCalledWith({
          status: 'PAID',
          page: 1,
          limit: 10,
        })
      })
    })

    it('should combine search and filter parameters', async () => {
      const user = userEvent.setup()
      renderWithProviders(<InvoiceList {...defaultProps} />)
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText(/search invoices/i)).toBeInTheDocument()
        expect(screen.getByLabelText(/filter by status/i)).toBeInTheDocument()
      })

      // First set search
      const searchInput = screen.getByPlaceholderText(/search invoices/i)
      await user.type(searchInput, 'Client 1')
      
      // Then set filter
      const statusFilter = screen.getByLabelText(/filter by status/i)
      await user.click(statusFilter)
      const sentFilter = screen.getByText('SENT')
      await user.click(sentFilter)
      
      await waitFor(() => {
        expect(mockGetInvoices).toHaveBeenCalledWith({
          search: 'Client 1',
          status: 'SENT',
          page: 1,
          limit: 10,
        })
      })
    })
  })

  describe('Invoice Actions', () => {
    it('should call onEdit when edit button is clicked', async () => {
      const user = userEvent.setup()
      renderWithProviders(<InvoiceList {...defaultProps} />)
      
      await waitFor(() => {
        expect(screen.getByLabelText(/edit invoice/i)).toBeInTheDocument()
      })

      const editButton = screen.getByLabelText(/edit invoice/i)
      await user.click(editButton)
      
      expect(mockOnEdit).toHaveBeenCalledWith(mockInvoices[0])
    })

    it('should call onViewPayments when payments button is clicked', async () => {
      const user = userEvent.setup()
      renderWithProviders(<InvoiceList {...defaultProps} />)
      
      await waitFor(() => {
        expect(screen.getByLabelText(/view payments/i)).toBeInTheDocument()
      })

      const paymentsButton = screen.getByLabelText(/view payments/i)
      await user.click(paymentsButton)
      
      expect(mockOnViewPayments).toHaveBeenCalledWith(mockInvoices[0])
    })

    it('should open delete confirmation dialog', async () => {
      const user = userEvent.setup()
      renderWithProviders(<InvoiceList {...defaultProps} />)
      
      await waitFor(() => {
        expect(screen.getByLabelText(/delete invoice/i)).toBeInTheDocument()
      })

      const deleteButton = screen.getByLabelText(/delete invoice/i)
      await user.click(deleteButton)
      
      await waitFor(() => {
        expect(screen.getByText(/are you sure you want to delete/i)).toBeInTheDocument()
        expect(screen.getByText('INV-2025-000001')).toBeInTheDocument()
      })
    })

    it('should delete invoice when confirmed', async () => {
      const user = userEvent.setup()
      renderWithProviders(<InvoiceList {...defaultProps} />)
      
      await waitFor(() => {
        expect(screen.getByLabelText(/delete invoice/i)).toBeInTheDocument()
      })

      const deleteButton = screen.getByLabelText(/delete invoice/i)
      await user.click(deleteButton)
      
      await waitFor(() => {
        expect(screen.getByText(/are you sure you want to delete/i)).toBeInTheDocument()
      })

      const confirmButton = screen.getByRole('button', { name: /delete/i })
      await user.click(confirmButton)
      
      await waitFor(() => {
        expect(mockDeleteInvoice).toHaveBeenCalledWith(mockInvoices[0].id)
        expect(mockOnDelete).toHaveBeenCalledWith(mockInvoices[0].id)
      })
    })

    it('should only allow deleting draft invoices', async () => {
      const sentInvoice = { ...mockInvoices[0], status: 'SENT' as const }
      mockGetInvoices.mockResolvedValue({
        data: {
          invoices: [sentInvoice],
          pagination: {
            currentPage: 1,
            totalPages: 1,
            totalCount: 1,
            limit: 10,
            hasNextPage: false,
            hasPreviousPage: false,
          },
        },
      })
      
      renderWithProviders(<InvoiceList {...defaultProps} />)
      
      await waitFor(() => {
        const deleteButton = screen.getByLabelText(/delete invoice/i)
        expect(deleteButton).toBeDisabled()
      })
    })
  })

  describe('Error Handling', () => {
    it('should display error message when loading fails', async () => {
      mockGetInvoices.mockRejectedValue(mockApiError('Failed to load invoices'))
      
      renderWithProviders(<InvoiceList {...defaultProps} />)
      
      await waitFor(() => {
        expect(screen.getByText(/failed to load invoices/i)).toBeInTheDocument()
      })
    })

    it('should show retry button on error', async () => {
      mockGetInvoices.mockRejectedValue(mockApiError('Network error'))
      
      renderWithProviders(<InvoiceList {...defaultProps} />)
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
      })
    })

    it('should retry loading when retry button is clicked', async () => {
      const user = userEvent.setup()
      mockGetInvoices
        .mockRejectedValueOnce(mockApiError('Network error'))
        .mockResolvedValueOnce({
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
        })
      
      renderWithProviders(<InvoiceList {...defaultProps} />)
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
      })

      const retryButton = screen.getByRole('button', { name: /retry/i })
      await user.click(retryButton)
      
      await waitFor(() => {
        expect(screen.getByText('INV-2025-000001')).toBeInTheDocument()
      })
    })
  })

  describe('Empty State', () => {
    it('should display empty state when no invoices exist', async () => {
      mockGetInvoices.mockResolvedValue({
        data: {
          invoices: [],
          pagination: {
            currentPage: 1,
            totalPages: 0,
            totalCount: 0,
            limit: 10,
            hasNextPage: false,
            hasPreviousPage: false,
          },
        },
      })
      
      renderWithProviders(<InvoiceList {...defaultProps} />)
      
      await waitFor(() => {
        expect(screen.getByText(/no invoices found/i)).toBeInTheDocument()
      })
    })

    it('should show create invoice suggestion in empty state', async () => {
      mockGetInvoices.mockResolvedValue({
        data: {
          invoices: [],
          pagination: {
            currentPage: 1,
            totalPages: 0,
            totalCount: 0,
            limit: 10,
            hasNextPage: false,
            hasPreviousPage: false,
          },
        },
      })
      
      renderWithProviders(<InvoiceList {...defaultProps} />)
      
      await waitFor(() => {
        expect(screen.getByText(/create your first invoice/i)).toBeInTheDocument()
      })
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels for all actions', async () => {
      renderWithProviders(<InvoiceList {...defaultProps} />)
      
      await waitFor(() => {
        expect(screen.getByLabelText(/view invoice details/i)).toBeInTheDocument()
        expect(screen.getByLabelText(/download pdf/i)).toBeInTheDocument()
        expect(screen.getByLabelText(/send email/i)).toBeInTheDocument()
        expect(screen.getByLabelText(/view payments/i)).toBeInTheDocument()
        expect(screen.getByLabelText(/edit invoice/i)).toBeInTheDocument()
        expect(screen.getByLabelText(/delete invoice/i)).toBeInTheDocument()
      })
    })

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup()
      renderWithProviders(<InvoiceList {...defaultProps} />)
      
      await waitFor(() => {
        expect(screen.getByLabelText(/view invoice details/i)).toBeInTheDocument()
      })

      const firstButton = screen.getByLabelText(/view invoice details/i)
      await user.tab()
      expect(firstButton).toHaveFocus()
      
      await user.keyboard('{Enter}')
      // Should trigger the action
    })

    it('should announce status changes to screen readers', async () => {
      const user = userEvent.setup()
      renderWithProviders(<InvoiceList {...defaultProps} />)
      
      await waitFor(() => {
        expect(screen.getByLabelText(/change status/i)).toBeInTheDocument()
      })

      const statusButton = screen.getByLabelText(/change status/i)
      await user.click(statusButton)
      
      const paidOption = screen.getByText('PAID')
      await user.click(paidOption)
      
      await waitFor(() => {
        // Should announce the status change
        expect(screen.getByText(/status updated to paid/i)).toBeInTheDocument()
      })
    })
  })
})