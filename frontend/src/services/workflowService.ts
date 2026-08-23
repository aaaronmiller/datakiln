import { WorkflowGraph, WorkflowExecutionResult, WorkflowValidationResult, SelectorsRegistry, ProviderStatus, ExecutionHistoryItem } from '../types/workflow'

interface ViteEnv {
  VITE_API_BASE_URL?: string
}

declare global {
  interface ImportMeta {
    env: ViteEnv
  }
}

export interface WorkflowMetadata {
  id: string
  name: string
  description: string
  status: 'active' | 'draft' | 'archived'
  last_modified: string
  version: string
  tags: string[]
  run_count: number
}

export class WorkflowService {
  private baseUrl: string

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'
  }

  // Get all workflows — adapts og camelCase to frontend snake_case
  async getAllWorkflows(): Promise<WorkflowMetadata[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/workflows`)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const raw = await response.json() as unknown[]
      return (raw as Record<string, unknown>[]).map((w) => {
        const r = w as Record<string, unknown>
        return {
          id: String(r.id ?? ''),
          name: String(r.name ?? 'Untitled'),
          description: String(r.description ?? ''),
          status: (r.status as WorkflowMetadata['status']) ?? 'active',
          last_modified: String(r.last_modified ?? r.updatedAt ?? r.updated_at ?? r.lastModified ?? new Date().toISOString()),
          version: String(r.version ?? '1.0'),
          tags: (r.tags as string[]) ?? [],
          run_count: Number(r.run_count ?? r.runCount ?? 0),
        }
      })
    } catch (error) {
      console.error('Failed to get workflows:', error)
      throw error
    }
  }

  // Execute a workflow
  async executeWorkflow(
    workflow: WorkflowGraph,
    options: Record<string, unknown> = {}
  ): Promise<WorkflowExecutionResult> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/workflows/execute`, {
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
      const response = await fetch(`${this.baseUrl}/api/v1/workflows/validate`, {
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
      const response = await fetch(`${this.baseUrl}/api/v1/selectors/registry`)

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
      const response = await fetch(`${this.baseUrl}/api/v1/providers/test`, {
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
      const response = await fetch(`${this.baseUrl}/api/v1/providers/status`)

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

      // Try runs endpoint if execution history is legacy
      const response = await fetch(`${this.baseUrl}/api/v1/results?${params}`)

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
      const response = await fetch(`${this.baseUrl}/api/v1/workflows/optimize`, {
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
      const response = await fetch(`${this.baseUrl}/api/v1/workflows`, {
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
export default workflowService