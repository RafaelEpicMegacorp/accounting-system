import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders, mockApiError, testInvoice } from '../helpers/testUtils'
import { mockPayments } from '../mocks/apiMocks'
import PaymentRecordDialog from '../../components/payments/PaymentRecordDialog'

// Mock payment service
vi.mock('../../services/paymentService', () => ({
  paymentService: {
    recordPayment: vi.fn(),
  },
}))

import { paymentService } from '../../services/paymentService'

describe('PaymentRecordDialog', () => {
  const mockRecordPayment = paymentService.recordPayment as any
  const mockOnSuccess = vi.fn()
  const mockOnCancel = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    mockRecordPayment.mockResolvedValue({
      data: {
        payment: mockPayments[0],
        invoice: testInvoice,
        paymentSummary: {
          totalPaid: 50.00,
          remainingAmount: 50.00,
          isFullyPaid: false,
        },
      },
    })
  })

  const defaultProps = {
    open: true,
    invoice: testInvoice,
    onSuccess: mockOnSuccess,
    onCancel: mockOnCancel,
  }

  describe('Component Rendering', () => {
    it('should render payment recording dialog', () => {
      renderWithProviders(<PaymentRecordDialog {...defaultProps} />)
      
      expect(screen.getByText('Record Payment')).toBeInTheDocument()
      expect(screen.getByText(`Invoice: ${testInvoice.invoiceNumber}`)).toBeInTheDocument()
      expect(screen.getByText(`Amount Due: $${testInvoice.amount.toFixed(2)}`)).toBeInTheDocument()
    })

    it('should not render when open is false', () => {
      renderWithProviders(<PaymentRecordDialog {...defaultProps} open={false} />)
      
      expect(screen.queryByText('Record Payment')).not.toBeInTheDocument()
    })

    it('should display invoice information', () => {
      renderWithProviders(<PaymentRecordDialog {...defaultProps} />)
      
      expect(screen.getByText(testInvoice.client.name)).toBeInTheDocument()
      expect(screen.getByText(testInvoice.client.company!)).toBeInTheDocument()
    })

    it('should show remaining amount when invoice is partially paid', () => {
      const partiallyPaidInvoice = {
        ...testInvoice,
        totalPaid: 30.00,
        remainingAmount: 70.00,
      }
      
      renderWithProviders(
        <PaymentRecordDialog {...defaultProps} invoice={partiallyPaidInvoice} />
      )
      
      expect(screen.getByText('Amount Due: $70.00')).toBeInTheDocument()
      expect(screen.getByText('Already Paid: $30.00')).toBeInTheDocument()
    })
  })

  describe('Form Fields', () => {
    it('should render all payment form fields', () => {
      renderWithProviders(<PaymentRecordDialog {...defaultProps} />)
      
      expect(screen.getByLabelText(/amount/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/payment method/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/payment date/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/notes/i)).toBeInTheDocument()
    })

    it('should have amount field pre-filled with remaining invoice amount', () => {
      renderWithProviders(<PaymentRecordDialog {...defaultProps} />)
      
      const amountField = screen.getByLabelText(/amount/i)
      expect(amountField).toHaveValue(testInvoice.amount)
    })

    it('should default payment method to BANK_TRANSFER', () => {
      renderWithProviders(<PaymentRecordDialog {...defaultProps} />)
      
      const methodField = screen.getByLabelText(/payment method/i)
      expect(methodField).toHaveValue('BANK_TRANSFER')
    })

    it('should default payment date to current date', () => {
      renderWithProviders(<PaymentRecordDialog {...defaultProps} />)
      
      const dateField = screen.getByLabelText(/payment date/i)
      const today = new Date().toISOString().split('T')[0]
      expect(dateField).toHaveValue(today)
    })

    it('should allow selecting different payment methods', async () => {
      const user = userEvent.setup()
      renderWithProviders(<PaymentRecordDialog {...defaultProps} />)
      
      const methodField = screen.getByLabelText(/payment method/i)
      await user.click(methodField)
      
      await waitFor(() => {
        expect(screen.getByText('Credit Card')).toBeInTheDocument()
        expect(screen.getByText('Check')).toBeInTheDocument()
        expect(screen.getByText('Cash')).toBeInTheDocument()
        expect(screen.getByText('Other')).toBeInTheDocument()
      })
    })
  })

  describe('Form Validation', () => {
    it('should validate required amount field', async () => {
      const user = userEvent.setup()
      renderWithProviders(<PaymentRecordDialog {...defaultProps} />)
      
      const amountField = screen.getByLabelText(/amount/i)
      await user.clear(amountField)
      
      const recordButton = screen.getByRole('button', { name: /record payment/i })
      await user.click(recordButton)
      
      await waitFor(() => {
        expect(screen.getByText(/amount is required/i)).toBeInTheDocument()
      })
    })

    it('should validate positive amount', async () => {
      const user = userEvent.setup()
      renderWithProviders(<PaymentRecordDialog {...defaultProps} />)
      
      const amountField = screen.getByLabelText(/amount/i)
      await user.clear(amountField)
      await user.type(amountField, '-50')
      
      const recordButton = screen.getByRole('button', { name: /record payment/i })
      await user.click(recordButton)
      
      await waitFor(() => {
        expect(screen.getByText(/amount must be positive/i)).toBeInTheDocument()
      })
    })

    it('should validate amount does not exceed invoice total', async () => {
      const user = userEvent.setup()
      renderWithProviders(<PaymentRecordDialog {...defaultProps} />)
      
      const amountField = screen.getByLabelText(/amount/i)
      await user.clear(amountField)
      await user.type(amountField, '150') // Exceeds invoice amount of 100
      
      const recordButton = screen.getByRole('button', { name: /record payment/i })
      await user.click(recordButton)
      
      await waitFor(() => {
        expect(screen.getByText(/amount cannot exceed invoice total/i)).toBeInTheDocument()
      })
    })

    it('should validate payment date is not in future', async () => {
      const user = userEvent.setup()
      renderWithProviders(<PaymentRecordDialog {...defaultProps} />)
      
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 7)
      const futureDateString = futureDate.toISOString().split('T')[0]
      
      const dateField = screen.getByLabelText(/payment date/i)
      await user.clear(dateField)
      await user.type(dateField, futureDateString)
      
      const recordButton = screen.getByRole('button', { name: /record payment/i })
      await user.click(recordButton)
      
      await waitFor(() => {
        expect(screen.getByText(/payment date cannot be in the future/i)).toBeInTheDocument()
      })
    })

    it('should validate notes length', async () => {
      const user = userEvent.setup()
      renderWithProviders(<PaymentRecordDialog {...defaultProps} />)
      
      const notesField = screen.getByLabelText(/notes/i)
      const longNotes = 'x'.repeat(501) // Exceeds 500 character limit
      await user.type(notesField, longNotes)
      
      const recordButton = screen.getByRole('button', { name: /record payment/i })
      await user.click(recordButton)
      
      await waitFor(() => {
        expect(screen.getByText(/notes cannot exceed 500 characters/i)).toBeInTheDocument()
      })
    })

    it('should clear validation errors when fields are corrected', async () => {
      const user = userEvent.setup()
      renderWithProviders(<PaymentRecordDialog {...defaultProps} />)
      
      const amountField = screen.getByLabelText(/amount/i)
      await user.clear(amountField)
      
      const recordButton = screen.getByRole('button', { name: /record payment/i })
      await user.click(recordButton)
      
      await waitFor(() => {
        expect(screen.getByText(/amount is required/i)).toBeInTheDocument()
      })
      
      await user.type(amountField, '50')
      
      await waitFor(() => {
        expect(screen.queryByText(/amount is required/i)).not.toBeInTheDocument()
      })
    })
  })

  describe('Payment Recording', () => {
    it('should record payment with valid data', async () => {
      const user = userEvent.setup()
      renderWithProviders(<PaymentRecordDialog {...defaultProps} />)
      
      const amountField = screen.getByLabelText(/amount/i)
      const notesField = screen.getByLabelText(/notes/i)
      
      await user.clear(amountField)
      await user.type(amountField, '75.50')
      await user.type(notesField, 'Partial payment')
      
      const recordButton = screen.getByRole('button', { name: /record payment/i })
      await user.click(recordButton)
      
      await waitFor(() => {
        expect(mockRecordPayment).toHaveBeenCalledWith(testInvoice.id, {
          amount: 75.50,
          method: 'BANK_TRANSFER',
          paidDate: expect.any(String),
          notes: 'Partial payment',
        })
        expect(mockOnSuccess).toHaveBeenCalled()
      })
    })

    it('should show loading state during payment recording', async () => {
      const user = userEvent.setup()
      let resolvePromise: (value: any) => void
      const pendingPromise = new Promise(resolve => {
        resolvePromise = resolve
      })
      mockRecordPayment.mockReturnValue(pendingPromise)
      
      renderWithProviders(<PaymentRecordDialog {...defaultProps} />)
      
      const recordButton = screen.getByRole('button', { name: /record payment/i })
      await user.click(recordButton)
      
      expect(screen.getByText(/recording payment/i)).toBeInTheDocument()
      expect(recordButton).toBeDisabled()
      
      // Resolve the promise
      resolvePromise!({
        data: {
          payment: mockPayments[0],
          invoice: testInvoice,
          paymentSummary: {
            totalPaid: 100.00,
            remainingAmount: 0,
            isFullyPaid: true,
          },
        },
      })
      
      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalled()
      })
    })

    it('should disable form fields during submission', async () => {
      const user = userEvent.setup()
      let resolvePromise: (value: any) => void
      const pendingPromise = new Promise(resolve => {
        resolvePromise = resolve
      })
      mockRecordPayment.mockReturnValue(pendingPromise)
      
      renderWithProviders(<PaymentRecordDialog {...defaultProps} />)
      
      const recordButton = screen.getByRole('button', { name: /record payment/i })
      await user.click(recordButton)
      
      const amountField = screen.getByLabelText(/amount/i)
      const methodField = screen.getByLabelText(/payment method/i)
      const dateField = screen.getByLabelText(/payment date/i)
      const notesField = screen.getByLabelText(/notes/i)
      
      expect(amountField).toBeDisabled()
      expect(methodField).toBeDisabled()
      expect(dateField).toBeDisabled()
      expect(notesField).toBeDisabled()
      
      // Resolve the promise
      resolvePromise!({ data: { payment: mockPayments[0] } })
    })

    it('should handle API errors gracefully', async () => {
      const user = userEvent.setup()
      mockRecordPayment.mockRejectedValue(mockApiError('Payment recording failed'))
      
      renderWithProviders(<PaymentRecordDialog {...defaultProps} />)
      
      const recordButton = screen.getByRole('button', { name: /record payment/i })
      await user.click(recordButton)
      
      await waitFor(() => {
        expect(screen.getByText(/payment recording failed/i)).toBeInTheDocument()
      })
      
      expect(mockOnSuccess).not.toHaveBeenCalled()
    })

    it('should show success message after successful payment', async () => {
      const user = userEvent.setup()
      renderWithProviders(<PaymentRecordDialog {...defaultProps} />)
      
      const recordButton = screen.getByRole('button', { name: /record payment/i })
      await user.click(recordButton)
      
      await waitFor(() => {
        expect(screen.getByText(/payment recorded successfully/i)).toBeInTheDocument()
      })
    })
  })

  describe('Dialog Actions', () => {
    it('should call onCancel when cancel button is clicked', async () => {
      const user = userEvent.setup()
      renderWithProviders(<PaymentRecordDialog {...defaultProps} />)
      
      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      await user.click(cancelButton)
      
      expect(mockOnCancel).toHaveBeenCalled()
    })

    it('should reset form when dialog is reopened', () => {
      const { rerender } = renderWithProviders(
        <PaymentRecordDialog {...defaultProps} open={false} />
      )
      
      rerender(<PaymentRecordDialog {...defaultProps} open={true} />)
      
      const amountField = screen.getByLabelText(/amount/i)
      expect(amountField).toHaveValue(testInvoice.amount)
    })

    it('should handle ESC key to close dialog', async () => {
      const user = userEvent.setup()
      renderWithProviders(<PaymentRecordDialog {...defaultProps} />)
      
      await user.keyboard('{Escape}')
      
      expect(mockOnCancel).toHaveBeenCalled()
    })
  })

  describe('Payment Suggestions', () => {
    it('should show quick amount buttons', () => {
      renderWithProviders(<PaymentRecordDialog {...defaultProps} />)
      
      expect(screen.getByRole('button', { name: /full amount/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /half amount/i })).toBeInTheDocument()
    })

    it('should set amount to full when full amount button is clicked', async () => {
      const user = userEvent.setup()
      renderWithProviders(<PaymentRecordDialog {...defaultProps} />)
      
      const amountField = screen.getByLabelText(/amount/i)
      await user.clear(amountField)
      
      const fullAmountButton = screen.getByRole('button', { name: /full amount/i })
      await user.click(fullAmountButton)
      
      expect(amountField).toHaveValue(testInvoice.amount)
    })

    it('should set amount to half when half amount button is clicked', async () => {
      const user = userEvent.setup()
      renderWithProviders(<PaymentRecordDialog {...defaultProps} />)
      
      const amountField = screen.getByLabelText(/amount/i)
      await user.clear(amountField)
      
      const halfAmountButton = screen.getByRole('button', { name: /half amount/i })
      await user.click(halfAmountButton)
      
      expect(amountField).toHaveValue(testInvoice.amount / 2)
    })
  })

  describe('Accessibility', () => {
    it('should have proper form labels and ARIA attributes', () => {
      renderWithProviders(<PaymentRecordDialog {...defaultProps} />)
      
      const dialog = screen.getByRole('dialog')
      expect(dialog).toHaveAccessibleName(/record payment/i)
      
      const amountField = screen.getByLabelText(/amount/i)
      const methodField = screen.getByLabelText(/payment method/i)
      const dateField = screen.getByLabelText(/payment date/i)
      
      expect(amountField).toHaveAttribute('aria-required', 'true')
      expect(methodField).toHaveAttribute('aria-required', 'true')
      expect(dateField).toHaveAttribute('aria-required', 'true')
    })

    it('should focus amount field when dialog opens', async () => {
      renderWithProviders(<PaymentRecordDialog {...defaultProps} />)
      
      await waitFor(() => {
        const amountField = screen.getByLabelText(/amount/i)
        expect(amountField).toHaveFocus()
      })
    })

    it('should trap focus within dialog', async () => {
      const user = userEvent.setup()
      renderWithProviders(<PaymentRecordDialog {...defaultProps} />)
      
      const amountField = screen.getByLabelText(/amount/i)
      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      const recordButton = screen.getByRole('button', { name: /record payment/i })
      
      expect(amountField).toHaveFocus()
      
      // Tab through all elements and back to start
      await user.tab() // method
      await user.tab() // date
      await user.tab() // notes
      await user.tab() // full amount button
      await user.tab() // half amount button
      await user.tab() // cancel
      await user.tab() // record
      await user.tab() // should wrap to amount
      
      expect(amountField).toHaveFocus()
    })

    it('should announce validation errors to screen readers', async () => {
      const user = userEvent.setup()
      renderWithProviders(<PaymentRecordDialog {...defaultProps} />)
      
      const amountField = screen.getByLabelText(/amount/i)
      await user.clear(amountField)
      
      const recordButton = screen.getByRole('button', { name: /record payment/i })
      await user.click(recordButton)
      
      await waitFor(() => {
        expect(amountField).toHaveAttribute('aria-invalid', 'true')
        expect(amountField).toHaveAttribute('aria-describedby')
      })
    })

    it('should support keyboard-only operation', async () => {
      const user = userEvent.setup()
      renderWithProviders(<PaymentRecordDialog {...defaultProps} />)
      
      const amountField = screen.getByLabelText(/amount/i)
      await user.clear(amountField)
      await user.type(amountField, '50')
      
      await user.keyboard('{Tab}') // method
      await user.keyboard('{Tab}') // date
      await user.keyboard('{Tab}') // notes
      await user.type(screen.getByLabelText(/notes/i), 'Test payment')
      
      // Navigate to record button and submit
      await user.keyboard('{Tab}') // full amount
      await user.keyboard('{Tab}') // half amount
      await user.keyboard('{Tab}') // cancel
      await user.keyboard('{Tab}') // record
      await user.keyboard('{Enter}')
      
      await waitFor(() => {
        expect(mockRecordPayment).toHaveBeenCalled()
      })
    })
  })

  describe('Edge Cases', () => {
    it('should handle invoice with no remaining amount', () => {
      const fullyPaidInvoice = {
        ...testInvoice,
        totalPaid: 100.00,
        remainingAmount: 0,
      }
      
      renderWithProviders(
        <PaymentRecordDialog {...defaultProps} invoice={fullyPaidInvoice} />
      )
      
      expect(screen.getByText('This invoice is fully paid')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /record payment/i })).toBeDisabled()
    })

    it('should handle very small amounts', async () => {
      const user = userEvent.setup()
      renderWithProviders(<PaymentRecordDialog {...defaultProps} />)
      
      const amountField = screen.getByLabelText(/amount/i)
      await user.clear(amountField)
      await user.type(amountField, '0.01')
      
      const recordButton = screen.getByRole('button', { name: /record payment/i })
      await user.click(recordButton)
      
      await waitFor(() => {
        expect(mockRecordPayment).toHaveBeenCalledWith(
          testInvoice.id,
          expect.objectContaining({ amount: 0.01 })
        )
      })
    })

    it('should handle network timeouts', async () => {
      const user = userEvent.setup()
      mockRecordPayment.mockRejectedValue({
        code: 'ECONNABORTED',
        message: 'timeout of 5000ms exceeded',
      })
      
      renderWithProviders(<PaymentRecordDialog {...defaultProps} />)
      
      const recordButton = screen.getByRole('button', { name: /record payment/i })
      await user.click(recordButton)
      
      await waitFor(() => {
        expect(screen.getByText(/request timed out/i)).toBeInTheDocument()
      })
    })
  })
})