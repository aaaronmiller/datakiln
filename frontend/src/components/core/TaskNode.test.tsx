import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { vi } from 'vitest'
import TaskNode from './TaskNode'

// Mock reactflow components
vi.mock('reactflow', () => ({
  Handle: ({ children, ...props }: any) => <div data-testid="handle" {...props}>{children}</div>,
  Position: {
    Left: 'left',
    Right: 'right',
  },
}))

// Mock UI components
vi.mock('../ui/card', () => ({
  Card: ({ children, className }: any) => <div className={className} data-testid="card">{children}</div>,
  CardContent: ({ children, className }: any) => <div className={className} data-testid="card-content">{children}</div>,
  CardHeader: ({ children, className }: any) => <div className={className} data-testid="card-header">{children}</div>,
  CardTitle: ({ children, className }: any) => <div className={className} data-testid="card-title">{children}</div>,
}))

vi.mock('../ui/button', () => ({
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

vi.mock('../ui/input', () => ({
  Input: ({ value, onChange, placeholder, className }: any) => (
    <input
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={className}
      data-testid="input"
    />
  ),
}))

describe('TaskNode', () => {
  const mockData = {
    label: 'Deep Research',
    parameters: {
      query: 'test query',
      maxResults: '10'
    },
    status: 'pending' as const,
    onParameterChange: vi.fn(),
    onDelete: vi.fn(),
    isSelected: false,
  }

  const defaultProps = {
    data: mockData,
    selected: false,
    id: 'test-node',
    type: 'taskNode',
    position: { x: 0, y: 0 },
    dragHandle: undefined,
    zIndex: 0,
    isConnectable: true,
    xPos: 0,
    yPos: 0,
    dragging: false,
    targetPosition: 'left' as any,
    sourcePosition: 'right' as any,
    positionAbsoluteX: 0,
    positionAbsoluteY: 0,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the task node with correct label', () => {
    render(<TaskNode {...defaultProps} />)

    expect(screen.getByText('Deep Research')).toBeInTheDocument()
    expect(screen.getByText('🔬')).toBeInTheDocument() // Deep research icon
  })

  it('displays the correct status', () => {
    render(<TaskNode {...defaultProps} />)

    expect(screen.getByText('⏳ pending')).toBeInTheDocument()
  })

  it('shows different status colors and icons', () => {
    const statuses = ['running', 'completed', 'error'] as const

    statuses.forEach(status => {
      const statusData = { ...mockData, status }
      const statusProps = { ...defaultProps, data: statusData }

      const { rerender } = render(<TaskNode {...statusProps} />)

      if (status === 'running') {
        expect(screen.getByText('⚙️ running')).toBeInTheDocument()
      } else if (status === 'completed') {
        expect(screen.getByText('✅ completed')).toBeInTheDocument()
      } else if (status === 'error') {
        expect(screen.getByText('❌ error')).toBeInTheDocument()
      }

      rerender(<></>) // Clean up for next iteration
    })
  })

  it('renders parameters as inputs', () => {
    render(<TaskNode {...defaultProps} />)

    const inputs = screen.getAllByTestId('input')
    expect(inputs).toHaveLength(2)

    expect(screen.getByDisplayValue('test query')).toBeInTheDocument()
    expect(screen.getByDisplayValue('10')).toBeInTheDocument()
  })

  it('calls onParameterChange when input value changes', () => {
    render(<TaskNode {...defaultProps} />)

    const queryInput = screen.getByDisplayValue('test query')
    fireEvent.change(queryInput, { target: { value: 'new query' } })

    expect(mockData.onParameterChange).toHaveBeenCalledWith('query', 'new query')
  })

  it('calls onDelete when delete button is clicked', () => {
    render(<TaskNode {...defaultProps} />)

    const deleteButton = screen.getByText('×')
    fireEvent.click(deleteButton)

    expect(mockData.onDelete).toHaveBeenCalled()
  })

  it('shows selected styling when selected', () => {
    const selectedProps = { ...defaultProps, selected: true }
    render(<TaskNode {...selectedProps} />)

    const card = screen.getByTestId('card')
    expect(card.className).toContain('ring-2 ring-blue-500')
  })

  it('renders handles for connections', () => {
    render(<TaskNode {...defaultProps} />)

    const handles = screen.getAllByTestId('handle')
    expect(handles).toHaveLength(2) // One source, one target
  })

  it('displays correct icons for different task types', () => {
    const taskTypes = [
      { label: 'YouTube Analysis', expectedIcon: '📺' },
      { label: 'Web Search', expectedIcon: '🔍' },
      { label: 'Data Analysis', expectedIcon: '📊' },
      { label: 'Content Generation', expectedIcon: '✍️' },
      { label: 'Export', expectedIcon: '📤' },
      { label: 'Unknown Task', expectedIcon: '⚡' }, // Default icon
    ]

    taskTypes.forEach(({ label, expectedIcon }) => {
      const taskData = { ...mockData, label }
      const taskProps = { ...defaultProps, data: taskData }

      const { rerender } = render(<TaskNode {...taskProps} />)

      expect(screen.getByText(expectedIcon)).toBeInTheDocument()

      rerender(<></>) // Clean up for next iteration
    })
  })
})