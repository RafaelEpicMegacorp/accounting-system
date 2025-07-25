import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders, mockApiError } from '../helpers/testUtils'
import { setupApiMocks, mockClients, mockApiResponses } from '../mocks/apiMocks'
import ClientList from '../../components/clients/ClientList'

// Mock client service
vi.mock('../../services/clientService', () => ({
  clientService: {
    getClients: vi.fn(),
    deleteClient: vi.fn(),
  },
}))

import { clientService } from '../../services/clientService'

describe('ClientList', () => {
  const mockGetClients = clientService.getClients as any
  const mockDeleteClient = clientService.deleteClient as any
  const mockOnEdit = vi.fn()
  const mockOnDelete = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    mockGetClients.mockResolvedValue({
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
    })
  })

  const defaultProps = {
    onEdit: mockOnEdit,
    onDelete: mockOnDelete,
  }

  describe('Component Rendering', () => {
    it('should render client list with loading state initially', () => {
      renderWithProviders(<ClientList {...defaultProps} />)
      
      expect(screen.getByRole('progressbar')).toBeInTheDocument()
    })

    it('should render client list with data after loading', async () => {
      renderWithProviders(<ClientList {...defaultProps} />)
      
      await waitFor(() => {
        expect(screen.getByText('Test Client 1')).toBeInTheDocument()
        expect(screen.getByText('Test Client 2')).toBeInTheDocument()
      })

      expect(screen.getByText('client1@example.com')).toBeInTheDocument()
      expect(screen.getByText('Test Company 1')).toBeInTheDocument()
      expect(screen.getByText('+1234567890')).toBeInTheDocument()
    })

    it('should display pagination information', async () => {
      renderWithProviders(<ClientList {...defaultProps} />)
      
      await waitFor(() => {
        expect(screen.getByText(/2 clients total/i)).toBeInTheDocument()
      })
    })

    it('should render action buttons for each client', async () => {
      renderWithProviders(<ClientList {...defaultProps} />)
      
      await waitFor(() => {
        const editButtons = screen.getAllByLabelText(/edit client/i)
        const deleteButtons = screen.getAllByLabelText(/delete client/i)
        
        expect(editButtons).toHaveLength(2)
        expect(deleteButtons).toHaveLength(2)
      })
    })
  })

  describe('Search Functionality', () => {
    it('should display search input', async () => {
      renderWithProviders(<ClientList {...defaultProps} />)
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText(/search clients/i)).toBeInTheDocument()
      })
    })

    it('should call API with search term when searching', async () => {
      const user = userEvent.setup()
      renderWithProviders(<ClientList {...defaultProps} />)
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText(/search clients/i)).toBeInTheDocument()
      })

      const searchInput = screen.getByPlaceholderText(/search clients/i)
      await user.type(searchInput, 'Test Client 1')
      
      // Wait for debounced search
      await waitFor(() => {
        expect(mockGetClients).toHaveBeenCalledWith(
          expect.objectContaining({
            search: 'Test Client 1',
          })
        )
      }, { timeout: 1000 })
    })

    it('should clear search when clear button is clicked', async () => {
      const user = userEvent.setup()
      renderWithProviders(<ClientList {...defaultProps} />)
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText(/search clients/i)).toBeInTheDocument()
      })

      const searchInput = screen.getByPlaceholderText(/search clients/i)
      await user.type(searchInput, 'Test')
      
      await waitFor(() => {
        const clearButton = screen.getByLabelText(/clear search/i)
        expect(clearButton).toBeInTheDocument()
      })

      const clearButton = screen.getByLabelText(/clear search/i)
      await user.click(clearButton)
      
      expect(searchInput).toHaveValue('')
    })
  })

  describe('Pagination', () => {
    beforeEach(() => {
      mockGetClients.mockResolvedValue({
        data: {
          clients: mockClients,
          pagination: {
            currentPage: 1,
            totalPages: 3,
            totalCount: 25,
            limit: 10,
            hasNextPage: true,
            hasPreviousPage: false,
          },
        },
      })
    })

    it('should display pagination controls when there are multiple pages', async () => {
      renderWithProviders(<ClientList {...defaultProps} />)
      
      await waitFor(() => {
        expect(screen.getByLabelText(/go to next page/i)).toBeInTheDocument()
        expect(screen.getByText('1')).toBeInTheDocument()
        expect(screen.getByText('3')).toBeInTheDocument()
      })
    })

    it('should call API with correct page when page is changed', async () => {
      const user = userEvent.setup()
      renderWithProviders(<ClientList {...defaultProps} />)
      
      await waitFor(() => {
        expect(screen.getByLabelText(/go to next page/i)).toBeInTheDocument()
      })

      const nextButton = screen.getByLabelText(/go to next page/i)
      await user.click(nextButton)
      
      await waitFor(() => {
        expect(mockGetClients).toHaveBeenCalledWith(
          expect.objectContaining({
            page: 2,
          })
        )
      })
    })

    it('should disable previous button on first page', async () => {
      renderWithProviders(<ClientList {...defaultProps} />)
      
      await waitFor(() => {
        const prevButton = screen.getByLabelText(/go to previous page/i)
        expect(prevButton).toBeDisabled()
      })
    })
  })

  describe('Sorting', () => {
    it('should display sort options', async () => {
      renderWithProviders(<ClientList {...defaultProps} />)
      
      await waitFor(() => {
        expect(screen.getByText(/sort by/i)).toBeInTheDocument()
      })
    })

    it('should call API with sort parameters when sort is changed', async () => {
      const user = userEvent.setup()
      renderWithProviders(<ClientList {...defaultProps} />)
      
      await waitFor(() => {
        expect(screen.getByText(/sort by/i)).toBeInTheDocument()
      })

      // Click on sort dropdown
      const sortDropdown = screen.getByRole('combobox', { name: /sort by/i })
      await user.click(sortDropdown)
      
      // Select name option
      const nameOption = screen.getByText(/name/i)
      await user.click(nameOption)
      
      await waitFor(() => {
        expect(mockGetClients).toHaveBeenCalledWith(
          expect.objectContaining({
            sortBy: 'name',
          })
        )
      })
    })
  })

  describe('Client Actions', () => {
    it('should call onEdit when edit button is clicked', async () => {
      const user = userEvent.setup()
      renderWithProviders(<ClientList {...defaultProps} />)
      
      await waitFor(() => {
        expect(screen.getByText('Test Client 1')).toBeInTheDocument()
      })

      const editButtons = screen.getAllByLabelText(/edit client/i)
      await user.click(editButtons[0])
      
      expect(mockOnEdit).toHaveBeenCalledWith(mockClients[0])
    })

    it('should open delete confirmation dialog when delete button is clicked', async () => {
      const user = userEvent.setup()
      renderWithProviders(<ClientList {...defaultProps} />)
      
      await waitFor(() => {
        expect(screen.getByText('Test Client 1')).toBeInTheDocument()
      })

      const deleteButtons = screen.getAllByLabelText(/delete client/i)
      await user.click(deleteButtons[0])
      
      await waitFor(() => {
        expect(screen.getByText(/are you sure you want to delete/i)).toBeInTheDocument()
        expect(screen.getByText('Test Client 1')).toBeInTheDocument()
      })
    })

    it('should call delete service and refresh list when delete is confirmed', async () => {
      const user = userEvent.setup()
      mockDeleteClient.mockResolvedValue({ success: true })
      
      renderWithProviders(<ClientList {...defaultProps} />)
      
      await waitFor(() => {
        expect(screen.getByText('Test Client 1')).toBeInTheDocument()
      })

      // Open delete dialog
      const deleteButtons = screen.getAllByLabelText(/delete client/i)
      await user.click(deleteButtons[0])
      
      await waitFor(() => {
        expect(screen.getByText(/are you sure you want to delete/i)).toBeInTheDocument()
      })

      // Confirm delete
      const confirmButton = screen.getByRole('button', { name: /delete/i })
      await user.click(confirmButton)
      
      await waitFor(() => {
        expect(mockDeleteClient).toHaveBeenCalledWith(mockClients[0].id)
        expect(mockOnDelete).toHaveBeenCalledWith(mockClients[0].id)
      })
    })

    it('should close delete dialog when cancel is clicked', async () => {
      const user = userEvent.setup()
      renderWithProviders(<ClientList {...defaultProps} />)
      
      await waitFor(() => {
        expect(screen.getByText('Test Client 1')).toBeInTheDocument()
      })

      // Open delete dialog
      const deleteButtons = screen.getAllByLabelText(/delete client/i)
      await user.click(deleteButtons[0])
      
      await waitFor(() => {
        expect(screen.getByText(/are you sure you want to delete/i)).toBeInTheDocument()
      })

      // Cancel delete
      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      await user.click(cancelButton)
      
      await waitFor(() => {
        expect(screen.queryByText(/are you sure you want to delete/i)).not.toBeInTheDocument()
      })
    })
  })

  describe('Error Handling', () => {
    it('should display error message when API call fails', async () => {
      mockGetClients.mockRejectedValue(mockApiError('Failed to fetch clients'))
      
      renderWithProviders(<ClientList {...defaultProps} />)
      
      await waitFor(() => {
        expect(screen.getByText(/failed to fetch clients/i)).toBeInTheDocument()
      })
    })

    it('should display retry button on error', async () => {
      mockGetClients.mockRejectedValue(mockApiError('Network error'))
      
      renderWithProviders(<ClientList {...defaultProps} />)
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
      })
    })

    it('should retry API call when retry button is clicked', async () => {
      const user = userEvent.setup()
      mockGetClients.mockRejectedValueOnce(mockApiError('Network error'))
      mockGetClients.mockResolvedValueOnce({
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
      })
      
      renderWithProviders(<ClientList {...defaultProps} />)
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
      })

      const retryButton = screen.getByRole('button', { name: /retry/i })
      await user.click(retryButton)
      
      await waitFor(() => {
        expect(screen.getByText('Test Client 1')).toBeInTheDocument()
      })
    })

    it('should show error message when delete fails', async () => {
      const user = userEvent.setup()
      mockDeleteClient.mockRejectedValue(mockApiError('Delete failed'))
      
      renderWithProviders(<ClientList {...defaultProps} />)
      
      await waitFor(() => {
        expect(screen.getByText('Test Client 1')).toBeInTheDocument()
      })

      // Open and confirm delete
      const deleteButtons = screen.getAllByLabelText(/delete client/i)
      await user.click(deleteButtons[0])
      
      await waitFor(() => {
        expect(screen.getByText(/are you sure you want to delete/i)).toBeInTheDocument()
      })

      const confirmButton = screen.getByRole('button', { name: /delete/i })
      await user.click(confirmButton)
      
      await waitFor(() => {
        expect(screen.getByText(/delete failed/i)).toBeInTheDocument()
      })
    })
  })

  describe('Empty State', () => {
    it('should display empty state when no clients are found', async () => {
      mockGetClients.mockResolvedValue({
        data: {
          clients: [],
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
      
      renderWithProviders(<ClientList {...defaultProps} />)
      
      await waitFor(() => {
        expect(screen.getByText(/no clients found/i)).toBeInTheDocument()
      })
    })

    it('should display empty search results message when search returns no results', async () => {
      const user = userEvent.setup()
      mockGetClients
        .mockResolvedValueOnce({
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
        })
        .mockResolvedValueOnce({
          data: {
            clients: [],
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
      
      renderWithProviders(<ClientList {...defaultProps} />)
      
      await waitFor(() => {
        expect(screen.getByText('Test Client 1')).toBeInTheDocument()
      })

      const searchInput = screen.getByPlaceholderText(/search clients/i)
      await user.type(searchInput, 'NonExistent Client')
      
      await waitFor(() => {
        expect(screen.getByText(/no clients found matching/i)).toBeInTheDocument()
      })
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels', async () => {
      renderWithProviders(<ClientList {...defaultProps} />)
      
      await waitFor(() => {
        expect(screen.getByRole('table')).toBeInTheDocument()
        expect(screen.getByRole('table')).toHaveAccessibleName(/clients table/i)
      })
    })

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup()
      renderWithProviders(<ClientList {...defaultProps} />)
      
      await waitFor(() => {
        expect(screen.getByText('Test Client 1')).toBeInTheDocument()
      })

      const editButtons = screen.getAllByLabelText(/edit client/i)
      
      // Tab to first edit button
      await user.tab()
      expect(editButtons[0]).toHaveFocus()
      
      // Press Enter to trigger edit
      await user.keyboard('{Enter}')
      expect(mockOnEdit).toHaveBeenCalledWith(mockClients[0])
    })

    it('should announce loading state to screen readers', () => {
      renderWithProviders(<ClientList {...defaultProps} />)
      
      const progressBar = screen.getByRole('progressbar')
      expect(progressBar).toHaveAccessibleName(/loading clients/i)
    })
  })

  describe('Performance', () => {
    it('should debounce search input', async () => {
      const user = userEvent.setup()
      renderWithProviders(<ClientList {...defaultProps} />)
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText(/search clients/i)).toBeInTheDocument()
      })

      const searchInput = screen.getByPlaceholderText(/search clients/i)
      
      // Type multiple characters quickly
      await user.type(searchInput, 'Test')
      
      // Should not call API immediately
      expect(mockGetClients).toHaveBeenCalledTimes(1) // Only initial load
      
      // Wait for debounce delay
      await waitFor(() => {
        expect(mockGetClients).toHaveBeenCalledWith(
          expect.objectContaining({
            search: 'Test',
          })
        )
      }, { timeout: 1000 })
    })

    it('should not make unnecessary API calls when props do not change', async () => {
      const { rerender } = renderWithProviders(<ClientList {...defaultProps} />)
      
      await waitFor(() => {
        expect(screen.getByText('Test Client 1')).toBeInTheDocument()
      })

      // Re-render with same props
      rerender(<ClientList {...defaultProps} />)
      
      // Should not make additional API calls
      expect(mockGetClients).toHaveBeenCalledTimes(1)
    })
  })
})