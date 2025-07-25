import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { renderWithProviders } from './helpers/testUtils'

// Simple test component for testing
const TestComponent = () => <div>Hello Test World</div>

describe('Frontend Testing Setup', () => {
  it('should render basic component', () => {
    render(<TestComponent />)
    expect(screen.getByText('Hello Test World')).toBeInTheDocument()
  })

  it('should have access to test environment variables', () => {
    expect(import.meta.env.VITE_API_URL).toBe('http://localhost:3001')
    expect(import.meta.env.NODE_ENV).toBe('test')
  })

  it('should render with providers', () => {
    renderWithProviders(<TestComponent />)
    expect(screen.getByText('Hello Test World')).toBeInTheDocument()
  })

  it('should have localStorage mocked', () => {
    localStorage.setItem('test', 'value')
    expect(localStorage.setItem).toHaveBeenCalledWith('test', 'value')
    expect(localStorage.getItem('test')).toBeUndefined() // Because it's mocked
  })

  it('should have window.matchMedia mocked', () => {
    expect(window.matchMedia).toBeDefined()
    expect(typeof window.matchMedia).toBe('function')
    
    const result = window.matchMedia('(min-width: 768px)')
    expect(result).toBeDefined()
    expect(result.matches).toBe(false)
    expect(typeof result.addEventListener).toBe('function')
  })
})