import React from 'react'
import { render, fireEvent } from '@testing-library/react'
import { screen } from '@testing-library/dom'
import '@testing-library/jest-dom'
import ResultsDisplay from './ResultsDisplay'

// Mock UI components
jest.mock('../ui/card', () => ({
  Card: ({ children, className }: any) => <div className={className} data-testid="card">{children}</div>,
  CardContent: ({ children, className }: any) => <div className={className} data-testid="card-content">{children}</div>,
  CardHeader: ({ children, className }: any) => <div className={className} data-testid="card-header">{children}</div>,
  CardTitle: ({ children, className }: any) => <div className={className} data-testid="card-title">{children}</div>,
}))

jest.mock('../ui/button', () => ({
  Button: ({ children, onClick, className, variant, size }: any) => (
    <button
      onClick={onClick}
      className={className}
      data-testid={`button-${variant}-${size}`}
    >
      {children}
    </button>
  ),
}))

describe('ResultsDisplay', () => {
  const mockResults = [
    {
      id: '1',
      title: 'Search Results',
      content: 'This is the search result content',
      type: 'search',
      timestamp: '2024-01-01T12:00:00Z',
      metadata: {
        source: 'Google',
        count: 10
      }
    },
    {
      id: '2',
      title: 'Analysis Report',
      content: 'This is the analysis content',
      type: 'analysis',
      timestamp: '2024-01-01T13:00:00Z'
    }
  ]

  const defaultProps = {
    results: mockResults,
    isLoading: false,
    onExport: jest.fn(),
    onClear: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders loading state when isLoading is true', () => {
    render(<ResultsDisplay {...defaultProps} isLoading={true} />)

    expect(screen.getByText('Processing results...')).toBeInTheDocument()
    // Check for the loading spinner div
    const spinner = document.querySelector('.animate-spin')
    expect(spinner).toBeInTheDocument()
  })

  it('renders empty state when no results', () => {
    render(<ResultsDisplay {...defaultProps} results={[]} />)

    expect(screen.getByText('No Results Yet')).toBeInTheDocument()
    expect(screen.getByText('Run a workflow to see results here')).toBeInTheDocument()
    expect(screen.getByText('📊')).toBeInTheDocument()
  })

  it('renders results correctly', () => {
    render(<ResultsDisplay {...defaultProps} />)

    expect(screen.getByText('Research Results')).toBeInTheDocument()
    expect(screen.getByText('Search Results')).toBeInTheDocument()
    expect(screen.getByText('Analysis Report')).toBeInTheDocument()
    expect(screen.getByText('This is the search result content')).toBeInTheDocument()
    expect(screen.getByText('This is the analysis content')).toBeInTheDocument()
  })

  it('displays correct icons for different result types', () => {
    render(<ResultsDisplay {...defaultProps} />)

    expect(screen.getByText('🔍')).toBeInTheDocument() // Search icon
    expect(screen.getByText('📊')).toBeInTheDocument() // Analysis icon
  })

  it('formats timestamps correctly', () => {
    render(<ResultsDisplay {...defaultProps} />)

    // Check that timestamps are displayed (exact format may vary by locale)
    const timestampElements = screen.getAllByText(/2024/)
    expect(timestampElements.length).toBeGreaterThan(0)
  })

  it('renders metadata when present', () => {
    render(<ResultsDisplay {...defaultProps} />)

    expect(screen.getByText('Metadata')).toBeInTheDocument()
    expect(screen.getByText(/source/)).toBeInTheDocument()
    expect(screen.getByText(/Google/)).toBeInTheDocument()
    expect(screen.getByText(/count/)).toBeInTheDocument()
    expect(screen.getByText(/10/)).toBeInTheDocument()
  })

  it('does not render metadata section when no metadata', () => {
    const resultsWithoutMetadata = [
      {
        id: '1',
        title: 'Test Result',
        content: 'Content',
        type: 'search',
        timestamp: '2024-01-01T12:00:00Z'
      }
    ]

    render(<ResultsDisplay {...defaultProps} results={resultsWithoutMetadata} />)

    expect(screen.queryByText('Metadata')).not.toBeInTheDocument()
  })

  it('calls onExport with correct format when export buttons are clicked', () => {
    render(<ResultsDisplay {...defaultProps} />)

    const jsonButton = screen.getByText('Export JSON')
    const csvButton = screen.getByText('Export CSV')

    fireEvent.click(jsonButton)
    expect(defaultProps.onExport).toHaveBeenCalledWith('json')

    fireEvent.click(csvButton)
    expect(defaultProps.onExport).toHaveBeenCalledWith('csv')
  })

  it('calls onClear when clear button is clicked', () => {
    render(<ResultsDisplay {...defaultProps} />)

    const clearButton = screen.getByText('Clear')
    fireEvent.click(clearButton)

    expect(defaultProps.onClear).toHaveBeenCalled()
  })

  it('renders multiple results in a grid', () => {
    render(<ResultsDisplay {...defaultProps} />)

    const cards = screen.getAllByTestId('card')
    expect(cards).toHaveLength(2) // One card per result
  })

  it('handles results with empty metadata object', () => {
    const resultsWithEmptyMetadata = [
      {
        id: '1',
        title: 'Test Result',
        content: 'Content',
        type: 'search',
        timestamp: '2024-01-01T12:00:00Z',
        metadata: {}
      }
    ]

    render(<ResultsDisplay {...defaultProps} results={resultsWithEmptyMetadata} />)

    expect(screen.queryByText('Metadata')).not.toBeInTheDocument()
  })

  it('handles results with undefined metadata', () => {
    const resultsWithUndefinedMetadata = [
      {
        id: '1',
        title: 'Test Result',
        content: 'Content',
        type: 'search',
        timestamp: '2024-01-01T12:00:00Z',
        metadata: undefined
      }
    ]

    render(<ResultsDisplay {...defaultProps} results={resultsWithUndefinedMetadata} />)

    expect(screen.queryByText('Metadata')).not.toBeInTheDocument()
  })

  it('preserves whitespace in content', () => {
    const resultsWithWhitespace = [
      {
        id: '1',
        title: 'Test Result',
        content: 'Line 1\nLine 2\n  Indented line',
        type: 'search',
        timestamp: '2024-01-01T12:00:00Z'
      }
    ]

    render(<ResultsDisplay {...defaultProps} results={resultsWithWhitespace} />)

    // Check that the content contains the expected text
    expect(screen.getByText(/Line 1/)).toBeInTheDocument()
    expect(screen.getByText(/Line 2/)).toBeInTheDocument()
    expect(screen.getByText(/Indented line/)).toBeInTheDocument()

    // Check that the element has the whitespace preservation class
    const contentElement = screen.getByText(/Line 1/)
    expect(contentElement).toHaveClass('whitespace-pre-wrap')
  })

  it('handles any result types with default icon', () => {
    const resultsWithUnknownType = [
      {
        id: '1',
        title: 'Unknown Type Result',
        content: 'Content',
        type: 'any',
        timestamp: '2024-01-01T12:00:00Z'
      }
    ]

    render(<ResultsDisplay {...defaultProps} results={resultsWithUnknownType} />)

    expect(screen.getByText('📄')).toBeInTheDocument() // Default icon
  })
})