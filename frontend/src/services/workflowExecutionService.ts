interface WorkflowExecutionOptions {
  execution_id?: string
  query?: string
  start_time?: string
  [key: string]: unknown
}

interface WorkflowExecutionResult {
  success?: boolean
  run_id?: string
  execution_id?: string
  execution_time?: number
  data?: unknown[]
  error?: string
  performance?: unknown
  timestamp?: string
  message?: string
}

interface WorkflowGraph {
  nodes: unknown[]
  edges: unknown[]
}

export class WorkflowExecutionService {
  private baseUrl: string

  constructor(baseUrl: string = 'http://localhost:8000') {
    this.baseUrl = baseUrl
  }

  async executeWorkflow(
    workflow: WorkflowGraph,
    options: WorkflowExecutionOptions = {}
  ): Promise<WorkflowExecutionResult> {
    try {
      const response = await fetch(`${this.baseUrl}/workflow/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          workflow,
          execution_options: options,
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()

      // Simulate progress updates for now
      if (result.status === 'completed') {
        this.simulateProgress()
      }

      return result
    } catch (error) {
      console.error('Workflow execution failed:', error)
      throw error
    }
  }

  async validateWorkflow(workflow: WorkflowGraph): Promise<unknown> {
    try {
      const response = await fetch(`${this.baseUrl}/workflow/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ workflow }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Workflow validation failed:', error)
      throw error
    }
  }

  async getExecutionHistory(limit: number = 10, includeDetails: boolean = false): Promise<unknown> {
    try {
      const params = new URLSearchParams({
        limit: limit.toString(),
        include_details: includeDetails.toString(),
      })

      const response = await fetch(`${this.baseUrl}/execution/history?${params}`)

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Failed to get execution history:', error)
      throw error
    }
  }

  async optimizeWorkflow(workflow: WorkflowGraph): Promise<unknown> {
    try {
      const response = await fetch(`${this.baseUrl}/workflow/optimize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(workflow),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Workflow optimization failed:', error)
      throw error
    }
  }

  private simulateProgress(): void {
    // This would be replaced with real-time progress updates
    // For now, just log that execution started
    console.log('Workflow execution started')
  }
}

export default WorkflowExecutionService