import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders, mockApiError, testClient } from '../helpers/testUtils'
import ClientForm from '../../components/clients/ClientForm'

// Mock client service
vi.mock('../../services/clientService', () => ({
  clientService: {
    createClient: vi.fn(),
    updateClient: vi.fn(),
  },
}))

import { clientService } from '../../services/clientService'

describe('ClientForm', () => {
  const mockCreateClient = clientService.createClient as any
  const mockUpdateClient = clientService.updateClient as any
  const mockOnSuccess = vi.fn()
  const mockOnCancel = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    mockCreateClient.mockResolvedValue({ data: { client: testClient } })
    mockUpdateClient.mockResolvedValue({ data: { client: testClient } })
  })

  const defaultProps = {
    open: true,
    onSuccess: mockOnSuccess,
    onCancel: mockOnCancel,
  }

  describe('Component Rendering', () => {
    it('should render create form when no client is provided', () => {
      renderWithProviders(<ClientForm {...defaultProps} />)
      
      expect(screen.getByText('Add New Client')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /create client/i })).toBeInTheDocument()
    })

    it('should render edit form when client is provided', () => {
      renderWithProviders(<ClientForm {...defaultProps} client={testClient} />)
      
      expect(screen.getByText('Edit Client')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /update client/i })).toBeInTheDocument()
    })

    it('should pre-populate form fields when editing existing client', () => {
      renderWithProviders(<ClientForm {...defaultProps} client={testClient} />)
      
      expect(screen.getByDisplayValue(testClient.name)).toBeInTheDocument()
      expect(screen.getByDisplayValue(testClient.email)).toBeInTheDocument()
      expect(screen.getByDisplayValue(testClient.company!)).toBeInTheDocument()
      expect(screen.getByDisplayValue(testClient.phone!)).toBeInTheDocument()
      expect(screen.getByDisplayValue(testClient.address!)).toBeInTheDocument()
    })

    it('should not render when open is false', () => {
      renderWithProviders(<ClientForm {...defaultProps} open={false} />)
      
      expect(screen.queryByText('Add New Client')).not.toBeInTheDocument()
    })
  })

  describe('Form Fields', () => {
    it('should render all required form fields', () => {
      renderWithProviders(<ClientForm {...defaultProps} />)
      
      expect(screen.getByLabelText(/name/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/company/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/phone/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/address/i)).toBeInTheDocument()
    })

    it('should mark required fields with asterisk', () => {
      renderWithProviders(<ClientForm {...defaultProps} />)
      
      const nameField = screen.getByLabelText(/name \*/i)
      const emailField = screen.getByLabelText(/email \*/i)
      
      expect(nameField).toBeInTheDocument()
      expect(emailField).toBeInTheDocument()
    })

    it('should allow typing in all form fields', async () => {
      const user = userEvent.setup()
      renderWithProviders(<ClientForm {...defaultProps} />)
      
      const nameField = screen.getByLabelText(/name/i)
      const emailField = screen.getByLabelText(/email/i)
      const companyField = screen.getByLabelText(/company/i)
      const phoneField = screen.getByLabelText(/phone/i)
      const addressField = screen.getByLabelText(/address/i)
      
      await user.type(nameField, 'John Doe')
      await user.type(emailField, 'john@example.com')
      await user.type(companyField, 'Acme Corp')
      await user.type(phoneField, '+1234567890')
      await user.type(addressField, '123 Main St')
      
      expect(nameField).toHaveValue('John Doe')
      expect(emailField).toHaveValue('john@example.com')
      expect(companyField).toHaveValue('Acme Corp')
      expect(phoneField).toHaveValue('+1234567890')
      expect(addressField).toHaveValue('123 Main St')
    })
  })

  describe('Form Validation', () => {
    it('should show validation errors for required fields when submitted empty', async () => {
      const user = userEvent.setup()
      renderWithProviders(<ClientForm {...defaultProps} />)
      
      const submitButton = screen.getByRole('button', { name: /create client/i })
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByText(/name is required/i)).toBeInTheDocument()
        expect(screen.getByText(/email is required/i)).toBeInTheDocument()
      })
    })

    it('should validate email format', async () => {
      const user = userEvent.setup()
      renderWithProviders(<ClientForm {...defaultProps} />)
      
      const nameField = screen.getByLabelText(/name/i)
      const emailField = screen.getByLabelText(/email/i)
      
      await user.type(nameField, 'John Doe')
      await user.type(emailField, 'invalid-email')
      
      const submitButton = screen.getByRole('button', { name: /create client/i })
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument()
      })
    })

    it('should validate phone number format', async () => {
      const user = userEvent.setup()
      renderWithProviders(<ClientForm {...defaultProps} />)
      
      const nameField = screen.getByLabelText(/name/i)
      const emailField = screen.getByLabelText(/email/i)
      const phoneField = screen.getByLabelText(/phone/i)
      
      await user.type(nameField, 'John Doe')
      await user.type(emailField, 'john@example.com')
      await user.type(phoneField, '123') // Invalid phone
      
      const submitButton = screen.getByRole('button', { name: /create client/i })
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByText(/please enter a valid phone number/i)).toBeInTheDocument()
      })
    })

    it('should clear validation errors when fields are corrected', async () => {
      const user = userEvent.setup()
      renderWithProviders(<ClientForm {...defaultProps} />)
      
      // Submit empty form to trigger validation
      const submitButton = screen.getByRole('button', { name: /create client/i })
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByText(/name is required/i)).toBeInTheDocument()
      })
      
      // Fix the validation error
      const nameField = screen.getByLabelText(/name/i)
      await user.type(nameField, 'John Doe')
      
      await waitFor(() => {
        expect(screen.queryByText(/name is required/i)).not.toBeInTheDocument()
      })
    })

    it('should validate name length', async () => {
      const user = userEvent.setup()
      renderWithProviders(<ClientForm {...defaultProps} />)
      
      const nameField = screen.getByLabelText(/name/i)
      const emailField = screen.getByLabelText(/email/i)
      
      await user.type(nameField, 'Jo') // Too short
      await user.type(emailField, 'john@example.com')
      
      const submitButton = screen.getByRole('button', { name: /create client/i })
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByText(/name must be at least 3 characters/i)).toBeInTheDocument()
      })
    })
  })

  describe('Form Submission', () => {
    it('should create new client when form is valid', async () => {
      const user = userEvent.setup()
      renderWithProviders(<ClientForm {...defaultProps} />)
      
      const nameField = screen.getByLabelText(/name/i)
      const emailField = screen.getByLabelText(/email/i)
      const companyField = screen.getByLabelText(/company/i)
      const phoneField = screen.getByLabelText(/phone/i)
      const addressField = screen.getByLabelText(/address/i)
      
      await user.type(nameField, 'John Doe')
      await user.type(emailField, 'john@example.com')
      await user.type(companyField, 'Acme Corp')
      await user.type(phoneField, '+1234567890')
      await user.type(addressField, '123 Main St')
      
      const submitButton = screen.getByRole('button', { name: /create client/i })
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(mockCreateClient).toHaveBeenCalledWith({
          name: 'John Doe',
          email: 'john@example.com',
          company: 'Acme Corp',
          phone: '+1234567890',
          address: '123 Main St',
        })
        expect(mockOnSuccess).toHaveBeenCalled()
      })
    })

    it('should update existing client when editing', async () => {
      const user = userEvent.setup()
      renderWithProviders(<ClientForm {...defaultProps} client={testClient} />)
      
      const nameField = screen.getByDisplayValue(testClient.name)
      await user.clear(nameField)
      await user.type(nameField, 'Updated Name')
      
      const submitButton = screen.getByRole('button', { name: /update client/i })
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(mockUpdateClient).toHaveBeenCalledWith(testClient.id, {
          name: 'Updated Name',
          email: testClient.email,
          company: testClient.company,
          phone: testClient.phone,
          address: testClient.address,
        })
        expect(mockOnSuccess).toHaveBeenCalled()
      })
    })

    it('should show loading state during submission', async () => {
      const user = userEvent.setup()
      let resolvePromise: (value: any) => void
      const pendingPromise = new Promise(resolve => {
        resolvePromise = resolve
      })
      mockCreateClient.mockReturnValue(pendingPromise)
      
      renderWithProviders(<ClientForm {...defaultProps} />)
      
      const nameField = screen.getByLabelText(/name/i)
      const emailField = screen.getByLabelText(/email/i)
      
      await user.type(nameField, 'John Doe')
      await user.type(emailField, 'john@example.com')
      
      const submitButton = screen.getByRole('button', { name: /create client/i })
      await user.click(submitButton)
      
      expect(screen.getByText(/creating/i)).toBeInTheDocument()
      expect(submitButton).toBeDisabled()
      
      // Resolve the promise
      resolvePromise!({ data: { client: testClient } })
      
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
      mockCreateClient.mockReturnValue(pendingPromise)
      
      renderWithProviders(<ClientForm {...defaultProps} />)
      
      const nameField = screen.getByLabelText(/name/i)
      const emailField = screen.getByLabelText(/email/i)
      
      await user.type(nameField, 'John Doe')
      await user.type(emailField, 'john@example.com')
      
      const submitButton = screen.getByRole('button', { name: /create client/i })
      await user.click(submitButton)
      
      expect(nameField).toBeDisabled()
      expect(emailField).toBeDisabled()
      
      // Resolve the promise
      resolvePromise!({ data: { client: testClient } })
    })

    it('should handle API errors gracefully', async () => {
      const user = userEvent.setup()
      mockCreateClient.mockRejectedValue(mockApiError('Email already exists', 400))
      
      renderWithProviders(<ClientForm {...defaultProps} />)
      
      const nameField = screen.getByLabelText(/name/i)
      const emailField = screen.getByLabelText(/email/i)
      
      await user.type(nameField, 'John Doe')
      await user.type(emailField, 'john@example.com')
      
      const submitButton = screen.getByRole('button', { name: /create client/i })
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByText(/email already exists/i)).toBeInTheDocument()
      })
      
      expect(mockOnSuccess).not.toHaveBeenCalled()
    })
  })

  describe('Form Actions', () => {
    it('should call onCancel when cancel button is clicked', async () => {
      const user = userEvent.setup()
      renderWithProviders(<ClientForm {...defaultProps} />)
      
      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      await user.click(cancelButton)
      
      expect(mockOnCancel).toHaveBeenCalled()
    })

    it('should call onCancel when dialog is closed via backdrop click', async () => {
      const user = userEvent.setup()
      renderWithProviders(<ClientForm {...defaultProps} />)
      
      // Click on backdrop (outside the dialog)
      const dialog = screen.getByRole('dialog')
      const backdrop = dialog.parentElement
      if (backdrop) {
        await user.click(backdrop)
        expect(mockOnCancel).toHaveBeenCalled()
      }
    })

    it('should reset form when dialog is reopened', async () => {
      const { rerender } = renderWithProviders(<ClientForm {...defaultProps} open={false} />)
      
      rerender(<ClientForm {...defaultProps} open={true} />)
      
      const nameField = screen.getByLabelText(/name/i)
      const emailField = screen.getByLabelText(/email/i)
      
      expect(nameField).toHaveValue('')
      expect(emailField).toHaveValue('')
    })

    it('should preserve unsaved changes when switching between tabs', async () => {
      const user = userEvent.setup()
      renderWithProviders(<ClientForm {...defaultProps} />)
      
      const nameField = screen.getByLabelText(/name/i)
      await user.type(nameField, 'Temporary Name')
      
      // Simulate tab switch (blur and focus)
      await user.tab()
      await user.tab()
      
      expect(nameField).toHaveValue('Temporary Name')
    })
  })

  describe('Accessibility', () => {
    it('should have proper form labels and ARIA attributes', () => {
      renderWithProviders(<ClientForm {...defaultProps} />)
      
      const dialog = screen.getByRole('dialog')
      expect(dialog).toHaveAccessibleName(/add new client/i)
      
      const nameField = screen.getByLabelText(/name/i)
      const emailField = screen.getByLabelText(/email/i)
      
      expect(nameField).toHaveAttribute('aria-required', 'true')
      expect(emailField).toHaveAttribute('aria-required', 'true')
    })

    it('should focus first field when dialog opens', async () => {
      renderWithProviders(<ClientForm {...defaultProps} />)
      
      await waitFor(() => {
        const nameField = screen.getByLabelText(/name/i)
        expect(nameField).toHaveFocus()
      })
    })

    it('should trap focus within dialog', async () => {
      const user = userEvent.setup()
      renderWithProviders(<ClientForm {...defaultProps} />)
      
      const nameField = screen.getByLabelText(/name/i)
      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      const submitButton = screen.getByRole('button', { name: /create client/i })
      
      expect(nameField).toHaveFocus()
      
      // Tab to last element
      await user.tab() // email
      await user.tab() // company
      await user.tab() // phone
      await user.tab() // address
      await user.tab() // cancel
      await user.tab() // submit
      await user.tab() // should wrap back to name
      
      expect(nameField).toHaveFocus()
    })

    it('should announce validation errors to screen readers', async () => {
      const user = userEvent.setup()
      renderWithProviders(<ClientForm {...defaultProps} />)
      
      const submitButton = screen.getByRole('button', { name: /create client/i })
      await user.click(submitButton)
      
      await waitFor(() => {
        const nameField = screen.getByLabelText(/name/i)
        expect(nameField).toHaveAttribute('aria-invalid', 'true')
        expect(nameField).toHaveAttribute('aria-describedby')
      })
    })

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup()
      renderWithProviders(<ClientForm {...defaultProps} />)
      
      const nameField = screen.getByLabelText(/name/i)
      const emailField = screen.getByLabelText(/email/i)
      
      await user.type(nameField, 'John Doe')
      await user.keyboard('{Tab}')
      expect(emailField).toHaveFocus()
      
      await user.type(emailField, 'john@example.com')
      await user.keyboard('{Tab}')
      
      // Continue tabbing to submit button
      await user.keyboard('{Tab}') // company
      await user.keyboard('{Tab}') // phone
      await user.keyboard('{Tab}') // address
      await user.keyboard('{Tab}') // cancel
      await user.keyboard('{Tab}') // submit
      
      const submitButton = screen.getByRole('button', { name: /create client/i })
      expect(submitButton).toHaveFocus()
      
      // Submit with Enter
      await user.keyboard('{Enter}')
      
      await waitFor(() => {
        expect(mockCreateClient).toHaveBeenCalled()
      })
    })
  })

  describe('Edge Cases', () => {
    it('should handle very long input values', async () => {
      const user = userEvent.setup()
      renderWithProviders(<ClientForm {...defaultProps} />)
      
      const longName = 'A'.repeat(500)
      const nameField = screen.getByLabelText(/name/i)
      const emailField = screen.getByLabelText(/email/i)
      
      await user.type(nameField, longName)
      await user.type(emailField, 'john@example.com')
      
      const submitButton = screen.getByRole('button', { name: /create client/i })
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByText(/name is too long/i)).toBeInTheDocument()
      })
    })

    it('should handle special characters in input', async () => {
      const user = userEvent.setup()
      renderWithProviders(<ClientForm {...defaultProps} />)
      
      const nameField = screen.getByLabelText(/name/i)
      const emailField = screen.getByLabelText(/email/i)
      const addressField = screen.getByLabelText(/address/i)
      
      await user.type(nameField, "O'Connor & Sons")
      await user.type(emailField, 'test@example.com')
      await user.type(addressField, '123 Main St, Apt #2B')
      
      const submitButton = screen.getByRole('button', { name: /create client/i })
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(mockCreateClient).toHaveBeenCalledWith(
          expect.objectContaining({
            name: "O'Connor & Sons",
            address: '123 Main St, Apt #2B',
          })
        )
      })
    })

    it('should handle network timeouts gracefully', async () => {
      const user = userEvent.setup()
      mockCreateClient.mockRejectedValue({ 
        code: 'ECONNABORTED',
        message: 'timeout of 5000ms exceeded' 
      })
      
      renderWithProviders(<ClientForm {...defaultProps} />)
      
      const nameField = screen.getByLabelText(/name/i)
      const emailField = screen.getByLabelText(/email/i)
      
      await user.type(nameField, 'John Doe')
      await user.type(emailField, 'john@example.com')
      
      const submitButton = screen.getByRole('button', { name: /create client/i })
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByText(/request timed out/i)).toBeInTheDocument()
      })
    })
  })
})