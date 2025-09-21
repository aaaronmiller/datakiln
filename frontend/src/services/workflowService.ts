import { WorkflowGraph, WorkflowExecutionResult, WorkflowValidationResult, SelectorsRegistry, ProviderStatus, ExecutionHistoryItem } from '../types/workflow'

interface ViteEnv {
  VITE_API_BASE_URL?: string
}

declare global {
  interface ImportMeta {
    env: ViteEnv
  }
}

export class WorkflowService {
  private baseUrl: string

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'
  }

  // Execute a workflow
  async executeWorkflow(
    workflow: WorkflowGraph,
    options: Record<string, unknown> = {}
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
        const errorText = await response.text()
        throw new Error(`Workflow execution failed: ${response.status} ${response.statusText}. ${errorText}`)
      }

      const result = await response.json()
      return result
    } catch (error) {
      console.error('Workflow execution failed:', error)
      if (error instanceof Error) {
        throw new Error(`Workflow execution error: ${error.message}`)
      }
      throw new Error('Workflow execution failed: Unknown error')
    }
  }

  // Validate a workflow
  async validateWorkflow(workflow: WorkflowGraph): Promise<WorkflowValidationResult> {
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

  // Get available selectors
  async getSelectorsRegistry(): Promise<SelectorsRegistry> {
    try {
      const response = await fetch(`${this.baseUrl}/selectors/registry`)

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Failed to get selectors registry:', error)
      throw error
    }
  }

  // Test a provider
  async testProvider(providerName: string): Promise<unknown> {
    try {
      const response = await fetch(`${this.baseUrl}/providers/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ provider_name: providerName }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Provider test failed:', error)
      throw error
    }
  }

  // Get provider status
  async getProvidersStatus(): Promise<ProviderStatus> {
    try {
      const response = await fetch(`${this.baseUrl}/providers/status`)

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Failed to get provider status:', error)
      throw error
    }
  }

  // Get execution history
  async getExecutionHistory(limit: number = 10, includeDetails: boolean = false): Promise<{
    executions: ExecutionHistoryItem[]
    total: number
  }> {
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

  // Optimize a workflow
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

  // Create a workflow
  async createWorkflow(
    nodesConfig: Record<string, unknown>,
    connections: Array<{ from: string; to: string }>,
    name: string = 'Custom Workflow',
    description: string = ''
  ): Promise<unknown> {
    try {
      const response = await fetch(`${this.baseUrl}/workflow/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nodes_config: nodesConfig,
          connections,
          name,
          description,
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Workflow creation failed:', error)
      throw error
    }
  }

  // Health check
  async healthCheck(): Promise<unknown> {
    try {
      const response = await fetch(`${this.baseUrl}/health`)

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Health check failed:', error)
      throw error
    }
  }
}

// Create default instance
export const workflowService = new WorkflowService()

export default WorkflowService