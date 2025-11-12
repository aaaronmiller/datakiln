import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { vi } from 'vitest'
import { ReactFlowProvider } from '@xyflow/react'
import TaskNode from './TaskNode'

// Mock reactflow components
vi.mock('@xyflow/react', async () => {
  const actual = await vi.importActual('@xyflow/react')
  return {
    ...actual,
    Handle: ({ children, ...props }: any) => <div data-testid="handle" {...props}>{children}</div>,
    Position: {
      Left: 'left',
      Right: 'right',
    },
  }
})

// Mock UI components
vi.mock('../../components/ui/card', () => ({
  Card: ({ children, className }: any) => <div className={className} data-testid="card">{children}</div>,
  CardContent: ({ children, className }: any) => <div className={className} data-testid="card-content">{children}</div>,
  CardHeader: ({ children, className }: any) => <div className={className} data-testid="card-header">{children}</div>,
  CardTitle: ({ children, className }: any) => <div className={className} data-testid="card-title">{children}</div>,
}))

vi.mock('../../components/ui/button', () => ({
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

vi.mock('../../components/ui/input', () => ({
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

vi.mock('../../components/ui/textarea', () => ({
  Textarea: ({ value, onChange, placeholder, className, id, rows }: any) => (
    <textarea
      id={id}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={className}
      rows={rows}
      data-testid="input"
    />
  ),
}))

vi.mock('../../components/ui/label', () => ({
  Label: ({ children, htmlFor, className }: any) => (
    <label htmlFor={htmlFor} className={className}>
      {children}
    </label>
  ),
}))

vi.mock('../../services/nodeRegistryService', () => ({
  default: {
    getNodeType: vi.fn(() => ({
      paramsSchema: {
        type: 'object',
        properties: {
          query: { type: 'string', default: '' },
          maxResults: { type: 'number', default: 10 }
        }
      }
    }))
  }
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

  const renderWithProvider = (component: React.ReactElement) => {
    return render(
      <ReactFlowProvider>
        {component}
      </ReactFlowProvider>
    )
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the task node with correct label', () => {
    renderWithProvider(<TaskNode {...defaultProps} />)

    expect(screen.getByText('Deep Research')).toBeInTheDocument()
    expect(screen.getByText('🔬')).toBeInTheDocument() // Deep research icon
  })

  it('displays the correct status', () => {
    renderWithProvider(<TaskNode {...defaultProps} />)

    expect(screen.getByText('⏳ pending')).toBeInTheDocument()
  })

  it('shows different status colors and icons', () => {
    const statuses = ['running', 'completed', 'error'] as const

    statuses.forEach(status => {
      const statusData = { ...mockData, status }
      const statusProps = { ...defaultProps, data: statusData }

      const { rerender } = renderWithProvider(<TaskNode {...statusProps} />)

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
    renderWithProvider(<TaskNode {...defaultProps} />)

    const inputs = screen.getAllByTestId('input')
    expect(inputs).toHaveLength(2)

    expect(screen.getByDisplayValue('test query')).toBeInTheDocument()
    expect(screen.getByDisplayValue('10')).toBeInTheDocument()
  })

  it('calls onParameterChange when input value changes', () => {
    renderWithProvider(<TaskNode {...defaultProps} />)

    const queryInput = screen.getByDisplayValue('test query')
    fireEvent.change(queryInput, { target: { value: 'new query' } })

    expect(mockData.onParameterChange).toHaveBeenCalledWith('query', 'new query')
  })

  it('calls onDelete when delete button is clicked', () => {
    renderWithProvider(<TaskNode {...defaultProps} />)

    const deleteButton = screen.getByText('×')
    fireEvent.click(deleteButton)

    expect(mockData.onDelete).toHaveBeenCalled()
  })

  it('shows selected styling when selected', () => {
    const selectedProps = { ...defaultProps, selected: true }
    renderWithProvider(<TaskNode {...selectedProps} />)

    const card = screen.getByTestId('card')
    expect(card.className).toContain('ring-2 ring-blue-500')
  })

  it('renders handles for connections', () => {
    renderWithProvider(<TaskNode {...defaultProps} />)

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

      const { rerender } = renderWithProvider(<TaskNode {...taskProps} />)

      expect(screen.getByText(expectedIcon)).toBeInTheDocument()

      rerender(<></>) // Clean up for next iteration
    })
  })
})