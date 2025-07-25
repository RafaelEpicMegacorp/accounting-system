import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '../helpers/testUtils'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'

// Simple test components
const ClickableButton = ({ onClick }: { onClick: () => void }) => (
  <Button onClick={onClick} data-testid="test-button">
    Click me
  </Button>
)

const SimpleForm = ({ onSubmit }: { onSubmit: (value: string) => void }) => {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const value = formData.get('testInput') as string
    onSubmit(value)
  }

  return (
    <form onSubmit={handleSubmit} data-testid="test-form">
      <TextField
        name="testInput"
        label="Test Input"
        data-testid="test-input"
      />
      <Button type="submit" data-testid="submit-button">
        Submit
      </Button>
    </form>
  )
}

describe('React Component Testing', () => {
  it('should render Material-UI Button component', () => {
    const mockClick = vi.fn()
    renderWithProviders(<ClickableButton onClick={mockClick} />)
    
    const button = screen.getByTestId('test-button')
    expect(button).toBeInTheDocument()
    expect(button).toHaveTextContent('Click me')
  })

  it('should handle button clicks', async () => {
    const user = userEvent.setup()
    const mockClick = vi.fn()
    
    renderWithProviders(<ClickableButton onClick={mockClick} />)
    
    const button = screen.getByTestId('test-button')
    await user.click(button)
    
    expect(mockClick).toHaveBeenCalledTimes(1)
  })

  it('should render Material-UI TextField component', () => {
    const mockSubmit = vi.fn()
    renderWithProviders(<SimpleForm onSubmit={mockSubmit} />)
    
    const input = screen.getByTestId('test-input')
    const form = screen.getByTestId('test-form')
    const submitButton = screen.getByTestId('submit-button')
    
    expect(input).toBeInTheDocument()
    expect(form).toBeInTheDocument()
    expect(submitButton).toBeInTheDocument()
  })

  it('should handle form submission', async () => {
    const user = userEvent.setup()
    const mockSubmit = vi.fn()
    
    renderWithProviders(<SimpleForm onSubmit={mockSubmit} />)
    
    const input = screen.getByLabelText('Test Input')
    const submitButton = screen.getByTestId('submit-button')
    
    // Type in the input
    await user.type(input, 'test value')
    expect(input).toHaveValue('test value')
    
    // Submit the form
    await user.click(submitButton)
    
    expect(mockSubmit).toHaveBeenCalledTimes(1)
    expect(mockSubmit).toHaveBeenCalledWith('test value')
  })

  it('should support multiple interactions', async () => {
    const user = userEvent.setup()
    const mockSubmit = vi.fn()
    
    renderWithProviders(<SimpleForm onSubmit={mockSubmit} />)
    
    const input = screen.getByLabelText('Test Input')
    const submitButton = screen.getByTestId('submit-button')
    
    // First submission
    await user.type(input, 'first')
    await user.click(submitButton)
    
    // Clear and second submission
    await user.clear(input)
    await user.type(input, 'second')
    await user.click(submitButton)
    
    expect(mockSubmit).toHaveBeenCalledTimes(2)
    expect(mockSubmit).toHaveBeenNthCalledWith(1, 'first')
    expect(mockSubmit).toHaveBeenNthCalledWith(2, 'second')
  })
})