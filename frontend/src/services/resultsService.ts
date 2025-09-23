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

class ResultsService {
  private baseUrl: string

  constructor(baseUrl: string = 'http://localhost:8000') {
    this.baseUrl = baseUrl
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
}

const resultsService = new ResultsService()

export default resultsService
export type { Artifact, ArtifactIndex }