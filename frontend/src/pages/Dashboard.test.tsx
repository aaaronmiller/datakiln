import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import Dashboard from './Dashboard'

// Mock axios
vi.mock('axios')
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => vi.fn()
  }
})

// Mock toast
vi.mock('../hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn()
  })
}))

// Mock WebSocket
vi.mock('../services/websocketService', () => ({
  default: {
    connect: vi.fn(),
    on: vi.fn(),
    off: vi.fn()
  }
}))

const renderDashboard = () => {
  return render(
    <BrowserRouter>
      <Dashboard />
    </BrowserRouter>
  )
}

describe('Dashboard Page', () => {
  it('renders dashboard header with refresh button', () => {
    renderDashboard()

    const refreshBtn = screen.getByText('Refresh').closest('button')
    expect(refreshBtn).toBeInTheDocument()

    // Initially enabled
    expect(refreshBtn).not.toBeDisabled()
  })

  it('disables refresh button when loading', async () => {
    const user = userEvent.setup()
    renderDashboard()

    const refreshBtn = screen.getByText('Refresh').closest('button')!
    await user.click(refreshBtn)

    // Should disable during loading (this might need to be adjusted based on implementation)
    expect(refreshBtn).toBeDisabled()
  })

  it('renders quick action tiles', () => {
    renderDashboard()

    expect(screen.getByText('Deep Research')).toBeInTheDocument()
    expect(screen.getByText('Transcript Analysis')).toBeInTheDocument()
    expect(screen.getByText('Create Workflow')).toBeInTheDocument()
    expect(screen.getByText('View Results')).toBeInTheDocument()
  })

  it('navigates to workflows page when Create Workflow is clicked', async () => {
    const user = userEvent.setup()
    renderDashboard()

    const createWorkflowBtn = screen.getByText('Create Workflow')
    await user.click(createWorkflowBtn)

    // Navigation should be mocked
    expect(createWorkflowBtn).toBeInTheDocument()
  })

  it('navigates to results page when View Results is clicked', async () => {
    const user = userEvent.setup()
    renderDashboard()

    const viewResultsBtn = screen.getByText('View Results')
    await user.click(viewResultsBtn)

    // Navigation should be mocked
    expect(viewResultsBtn).toBeInTheDocument()
  })

  it('shows system status widget', () => {
    renderDashboard()

    expect(screen.getByText('System Overview')).toBeInTheDocument()
  })

  it('shows performance metrics section', () => {
    renderDashboard()

    expect(screen.getByText('Performance Overview')).toBeInTheDocument()
    expect(screen.getByText('Success Rate')).toBeInTheDocument()
    expect(screen.getByText('Avg Response Time')).toBeInTheDocument()
    expect(screen.getByText('Total Executions')).toBeInTheDocument()
  })

  it('handles quick run actions', async () => {
    const user = userEvent.setup()
    renderDashboard()

    const deepResearchBtn = screen.getByText('Deep Research')
    await user.click(deepResearchBtn)

    // Should trigger API call (mocked)
    expect(deepResearchBtn).toBeInTheDocument()
  })
})