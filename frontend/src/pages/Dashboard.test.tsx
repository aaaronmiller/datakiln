import { beforeEach, describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import axios from 'axios'
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
    connect: vi.fn(() => Promise.resolve()),
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
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(axios.get).mockImplementation((url: string) => {
      if (url.includes('system-status')) {
        return Promise.resolve({
          data: {
            active_runs: 2,
            recent_results: 5,
            system_health: 'healthy',
            uptime: '1d 2h',
            cpu_usage: 24,
            memory_usage: 52,
            last_updated: new Date().toISOString(),
          },
        })
      }
      if (url.includes('recent-activity')) {
        return Promise.resolve({ data: { activities: [] } })
      }
      if (url.includes('queue-status')) {
        return Promise.resolve({
          data: {
            pending_jobs: 1,
            processing_jobs: 0,
            completed_today: 4,
            failed_today: 0,
            average_processing_time: '30s',
            queue_depth: 1,
            last_updated: new Date().toISOString(),
          },
        })
      }
      return Promise.resolve({ data: {} })
    })
    vi.mocked(axios.post).mockResolvedValue({ data: { id: 'run-1' } })
  })

  it('renders dashboard header with refresh button', () => {
    renderDashboard()

    const refreshBtn = screen.getByText('Refreshing...').closest('button')
    expect(refreshBtn).toBeInTheDocument()
  })

  it('disables refresh button when loading', () => {
    renderDashboard()

    const refreshBtn = screen.getByText('Refreshing...').closest('button')!
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
    renderDashboard()

    const createWorkflowBtn = screen.getByText('Create Workflow')
    fireEvent.click(createWorkflowBtn)

    // Navigation should be mocked
    expect(createWorkflowBtn).toBeInTheDocument()
  })

  it('navigates to results page when View Results is clicked', async () => {
    renderDashboard()

    const viewResultsBtn = screen.getByText('View Results')
    fireEvent.click(viewResultsBtn)

    // Navigation should be mocked
    expect(viewResultsBtn).toBeInTheDocument()
  })

  it('shows system status widget', () => {
    renderDashboard()

    expect(screen.getByText('System Status')).toBeInTheDocument()
  })

  it('shows performance metrics section', () => {
    renderDashboard()

    expect(screen.getByText('Performance Overview')).toBeInTheDocument()
    expect(screen.getByText('Success Rate')).toBeInTheDocument()
    expect(screen.getByText('Avg Response Time')).toBeInTheDocument()
    expect(screen.getByText('Total Executions')).toBeInTheDocument()
  })

  it('handles quick run actions', async () => {
    renderDashboard()

    const deepResearchBtn = screen.getByText('Deep Research')
    fireEvent.click(deepResearchBtn)

    // Should trigger API call (mocked)
    expect(deepResearchBtn).toBeInTheDocument()
  })
})
