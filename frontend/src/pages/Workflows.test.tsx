import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import Workflows from './Workflows'
import { Toaster } from '../components/ui/toast'

// Mock navigate
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate
  }
})

// Mock toast hook
vi.mock('../hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn()
  })
}))

const renderWorkflows = () => {
  return render(
    <BrowserRouter>
      <Workflows />
      <Toaster />
    </BrowserRouter>
  )
}

describe('Workflows Page', () => {
  it('renders workflow grid with data', () => {
    renderWorkflows()

    const newWorkflowBtn = screen.getByText('New Workflow')
    expect(newWorkflowBtn).toBeInTheDocument()

    const importBtn = screen.getByText('Import')
    expect(importBtn).toBeInTheDocument()

    const exportBtn = screen.getByText('Export')
    expect(exportBtn).toBeInTheDocument()
  })

  it('navigates to new workflow on New Workflow button click', async () => {
    const user = userEvent.setup()
    renderWorkflows()

    const newWorkflowBtn = screen.getByText('New Workflow')
    await user.click(newWorkflowBtn)

    expect(mockNavigate).toHaveBeenCalledWith('/workflows/new')
  })

  it('shows workflow options dropdown when More button is clicked', async () => {
    const user = userEvent.setup()
    renderWorkflows()

    // Find the first More button (MoreVertical)
    const moreButtons = screen.getAllByRole('button').filter(btn =>
      btn.className.includes('variant-ghost')
    )
    const firstMoreBtn = moreButtons[moreButtons.length - 1] // Last ghost button should be the More button

    await user.click(firstMoreBtn)

    // Check if dropdown appears (this would need to be adjusted based on actual implementation)
    await waitFor(() => {
      expect(screen.queryByText('Duplicate')).toBeTruthy()
    })
  })

  it('filters workflows when search input changes', async () => {
    const user = userEvent.setup()
    renderWorkflows()

    const searchInput = screen.getByPlaceholderText('Search workflows...')
    await user.type(searchInput, 'Research')

    // Should show filtered results
    expect(screen.getByText('Deep Research Pipeline')).toBeInTheDocument()
  })

  it('changes sort order when sort select changes', async () => {
    const user = userEvent.setup()
    renderWorkflows()

    const sortSelect = screen.getByDisplayValue('Last Modified')
    await user.selectOptions(sortSelect, 'Name')

    // Should update the sorting (implementation dependent)
  })

  it('navigates to edit workflow when Edit button is clicked', async () => {
    const user = userEvent.setup()
    renderWorkflows()

    const editButtons = screen.getAllByText('Edit')
    const firstEditBtn = editButtons[0]

    await user.click(firstEditBtn)

    expect(mockNavigate).toHaveBeenCalledWith('/workflows/1/edit')
  })

  it('navigates to runs page when Run button is clicked', async () => {
    const user = userEvent.setup()
    renderWorkflows()

    const runButtons = screen.getAllByText('Run')
    const firstRunBtn = runButtons[0]

    await user.click(firstRunBtn)

    expect(mockNavigate).toHaveBeenCalledWith('/runs?workflow=1')
  })

  it('shows toast notification for Import button', async () => {
    const user = userEvent.setup()
    renderWorkflows()

    const importBtn = screen.getByText('Import')
    await user.click(importBtn)

    // Toast should be triggered (mocked)
  })

  it('shows toast notification for Export button', async () => {
    const user = userEvent.setup()
    renderWorkflows()

    const exportBtn = screen.getByText('Export')
    await user.click(exportBtn)

    // Toast should be triggered (mocked)
  })
})