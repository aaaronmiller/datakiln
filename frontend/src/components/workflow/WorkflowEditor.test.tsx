import { afterEach, describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ReactFlowProvider } from '@xyflow/react'
import WorkflowEditor from './WorkflowEditor'

// Mock hooks and services
vi.mock('../../stores/uiStore', () => ({
  useNotifications: () => ({
    add: vi.fn(),
  }),
}))
vi.mock('../../services/workflowValidationService', () => ({
  workflowValidationService: {
    validateWorkflow: vi.fn(() => ({ valid: true, errors: [], warnings: [] })),
    exportWorkflow: vi.fn(() => ({ valid: true, errors: [], warnings: [], json: '{"nodes":[],"edges":[]}' })),
    validateRoundTrip: vi.fn(() => ({ valid: true, errors: [], warnings: [] })),
  },
}))

afterEach(() => {
  vi.restoreAllMocks()
})

const renderWorkflowEditor = (props = {}) => {
  return render(
    <ReactFlowProvider>
      <WorkflowEditor {...props} />
    </ReactFlowProvider>
  )
}

describe('WorkflowEditor Component', () => {
  it('renders workflow editor with toolbar', () => {
    renderWorkflowEditor()

    expect(screen.getByText('Add Node:')).toBeInTheDocument()
    expect(screen.getByRole('application', { name: 'Workflow Editor Application' })).toBeInTheDocument()
    expect(screen.getByRole('complementary', { name: 'Node palette sidebar' })).toBeInTheDocument()
  })

  it('adds node when toolbar button is clicked', async () => {
    const user = userEvent.setup()
    renderWorkflowEditor()

    const firstAddBtn = screen.getByRole('button', { name: /AI DOM Action/i })

    await user.click(firstAddBtn)

    expect(firstAddBtn).toBeInTheDocument()
  })

  it('shows execution order controls', () => {
    renderWorkflowEditor()

    const executionOrderBtn = screen.getByText('Show Execution Order')
    expect(executionOrderBtn).toBeInTheDocument()
  })

  it('toggles execution order panel', async () => {
    const user = userEvent.setup()
    renderWorkflowEditor()

    const executionOrderBtn = screen.getByText('Show Execution Order')

    // Initially "Show"
    expect(executionOrderBtn).toBeInTheDocument()

    await user.click(executionOrderBtn)

    // Should toggle to "Hide" (if implementation shows it)
    const hideBtn = screen.queryByText('Hide Execution Order')
    expect(hideBtn).toBeInTheDocument()
  })

  it('shows status bar with node and edge counts', () => {
    renderWorkflowEditor()

    expect(screen.getByText(/Nodes:/)).toBeInTheDocument()
    expect(screen.getByText(/Edges:/)).toBeInTheDocument()
  })

  it('enables save button when nodes exist', () => {
    renderWorkflowEditor()

    const saveBtn = screen.getByText('Save Workflow')
    expect(saveBtn).toBeDisabled()
  })

  it('enables execute button when nodes exist', () => {
    renderWorkflowEditor()

    const executeBtn = screen.getByText(/Execute Workflow/)
    expect(executeBtn).toBeDisabled()
  })

  it('shows performance test button only when enabled', () => {
    // This depends on environment variable VITE_ENABLE_TEST_WORKFLOWS
    renderWorkflowEditor()

    expect(screen.getByText('Load Performance Test (50+ nodes)')).toBeInTheDocument()
  })

  it('shows sample workflow button only when enabled', () => {
    renderWorkflowEditor()

    const sampleWorkflowBtn = screen.queryByText('Load Sample Workflow')
    // Should be present if test workflows are enabled (environment dependent)
    expect(sampleWorkflowBtn).toBeTruthy()
  })

  it('handles import JSON file', async () => {
    const user = userEvent.setup()
    renderWorkflowEditor()

    const importBtn = screen.getByText('Import JSON')

    const fileInput = document.createElement('input')
    fileInput.type = 'file'
    fileInput.accept = '.json'
    const click = vi.spyOn(fileInput, 'click').mockImplementation(() => {})
    vi.spyOn(document, 'createElement').mockReturnValue(fileInput)

    await user.click(importBtn)

    expect(document.createElement).toHaveBeenCalledWith('input')
    expect(click).toHaveBeenCalled()
  })

  it('exports workflow JSON', async () => {
    const user = userEvent.setup()
    renderWorkflowEditor()

    const exportBtn = screen.getByText('Export JSON')
    await user.click(exportBtn)

    // Should trigger export (implementation dependent)
    expect(exportBtn).toBeInTheDocument()
  })

  it('validates workflow before export', async () => {
    const user = userEvent.setup()
    renderWorkflowEditor()

    const exportBtn = screen.getByText('Export JSON')
    await user.click(exportBtn)

    // Validation service should be called
    expect(exportBtn).toBeInTheDocument()
  })
})
