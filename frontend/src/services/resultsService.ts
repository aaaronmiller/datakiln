interface Artifact {
  id: string
  name: string
  content_type: string
  size: number
  created_at: string
  download_url: string
}

interface ArtifactIndex {
  run_id: string
  artifacts: Artifact[]
  total: number
}

interface RunResult {
  execution_id: string
  workflow_id: string
  status: 'running' | 'completed' | 'failed' | 'cancelled'
  started_at: string
  completed_at?: string
  duration?: number
  results: Record<string, unknown>
  error?: string
}

interface PaginatedResults {
  results: RunResult[]
  pagination: {
    total: number
    limit: number
    offset: number
  }
}

class ResultsService {
  private baseUrl: string

  constructor(baseUrl: string = 'http://localhost:8000') {
    this.baseUrl = baseUrl
  }

  async getResults(limit: number = 20, offset: number = 0, status?: string): Promise<PaginatedResults> {
    try {
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString()
      })
      if (status && status !== 'all') {
        params.append('status', status)
      }

      const response = await fetch(`${this.baseUrl}/api/v1/results?${params.toString()}`)

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Failed to get results:', error)
      throw error
    }
  }

  async getResult(executionId: string): Promise<RunResult> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/results/${executionId}`)

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Failed to get result:', error)
      throw error
    }
  }

  async cancelRun(runId: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/workflows/runs/${runId}/cancel`, {
        method: 'POST'
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
    } catch (error) {
      console.error('Failed to cancel run:', error)
      throw error
    }
  }

  async getArtifactIndex(runId: string): Promise<ArtifactIndex> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/workflows/runs/${runId}/artifacts/index`)

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Failed to get artifact index:', error)
      throw error
    }
  }

  async downloadArtifact(artifactId: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/workflows/artifacts/${artifactId}/download`)

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      // Create a blob from the response
      const blob = await response.blob()

      // Create a temporary URL for the blob
      const url = window.URL.createObjectURL(blob)

      // Create a temporary anchor element and trigger download
      const a = document.createElement('a')
      a.href = url
      a.download = response.headers.get('content-disposition')?.split('filename=')[1]?.replace(/"/g, '') || 'artifact'
      document.body.appendChild(a)
      a.click()

      // Clean up
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Failed to download artifact:', error)
      throw error
    }
  }

  async getArtifactInfo(artifactId: string): Promise<Artifact> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/workflows/artifacts/${artifactId}`)

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Failed to get artifact info:', error)
      throw error
    }
  }

  async deleteResult(executionId: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/results/${executionId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
    } catch (error) {
      console.error('Failed to delete result:', error)
      throw error
    }
  }

  async getTopWorkflows(limit: number = 5): Promise<Array<{ workflow_id: string, count: number, last_run: string }>> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/results/stats/top?limit=${limit}`)

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Failed to get top workflows:', error)
      return []
    }
  }
}

const resultsService = new ResultsService()

export default resultsService
export type { Artifact, ArtifactIndex, RunResult, PaginatedResults }