import { QueryNode, QueryEdge, ReactFlowQueryNode } from '../types/query'

// Query Graph Metadata
export interface QueryGraphMetadata {
  id: string
  name: string
  description?: string
  category?: string
  tags?: string[]
  createdAt: string
  updatedAt: string
  version: number
  author?: string
  isPublic?: boolean
  nodeCount: number
  edgeCount: number
  thumbnail?: string
}

// Serialized Query Graph
export interface SerializedQueryGraph {
  metadata: QueryGraphMetadata
  graph: {
    nodes: QueryNode[]
    edges: QueryEdge[]
  }
}

// Query Graph Collection
export interface QueryGraphCollection {
  graphs: SerializedQueryGraph[]
  total: number
  lastUpdated: string
}

 // Backend workflow response interface
interface BackendWorkflowResponse {
  id: string
  name: string
  description?: string
  metadata?: {
    createdAt?: string
    updatedAt?: string
    tags?: string[]
    description?: string
    category?: string
    author?: string
    isPublic?: boolean
    version?: number
    thumbnail?: string
  }
  nodes: QueryNode[]
  edges: QueryEdge[]
  nodeCount?: number
  edgeCount?: number
}

// Fallback storage keys for offline/local mode
const STORAGE_KEYS = {
  QUERY_GRAPHS: 'datakiln_query_graphs',
  RECENT_GRAPHS: 'datakiln_recent_graphs',
  FAVORITE_GRAPHS: 'datakiln_favorite_graphs',
  GRAPH_VERSIONS: 'datakiln_graph_versions'
}

class QueryGraphPersistenceService {
  private static instance: QueryGraphPersistenceService
  private apiBase: string

  private constructor() {
    this.apiBase = '/api/v1'
    // Keep localStorage as fallback for offline mode
    this.initializeStorage()
  }

  static getInstance(): QueryGraphPersistenceService {
    if (!QueryGraphPersistenceService.instance) {
      QueryGraphPersistenceService.instance = new QueryGraphPersistenceService()
    }
    return QueryGraphPersistenceService.instance
  }

  private initializeStorage(): void {
    // Initialize collections if they don't exist (for offline fallback)
    const collections = [
      STORAGE_KEYS.QUERY_GRAPHS,
      STORAGE_KEYS.RECENT_GRAPHS,
      STORAGE_KEYS.FAVORITE_GRAPHS,
      STORAGE_KEYS.GRAPH_VERSIONS
    ]

    collections.forEach(key => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify({
          graphs: [],
          total: 0,
          lastUpdated: new Date().toISOString()
        }))
      }
    })
  }

  private async apiCall<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.apiBase}${endpoint}`
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    })

    if (!response.ok) {
      throw new Error(`API call failed: ${response.status} ${response.statusText}`)
    }

    return response.json()
  }

  private async apiCallWithFallback<T>(
    apiCall: () => Promise<T>,
    fallbackCall: () => T
  ): Promise<T> {
    try {
      return await apiCall()
    } catch (error) {
      console.warn('API call failed, falling back to local storage:', error)
      return fallbackCall()
    }
  }

  // Serialize a query graph to JSON
  serializeQueryGraph(
    nodes: ReactFlowQueryNode[],
    edges: QueryEdge[],
    metadata: Partial<QueryGraphMetadata>
  ): SerializedQueryGraph {
    // Convert ReactFlow nodes to QueryNode format
    const queryNodes: QueryNode[] = nodes.map(node => ({
      id: node.id,
      type: node.type || 'custom',
      position: node.position,
      data: {
        label: node.data.label || 'Node',
        source: node.data.source,
        condition: node.data.condition,
        transformation: node.data.transformation,
        aggregation: node.data.aggregation,
        joinType: node.data.joinType,
        joinCondition: node.data.joinCondition,
        // Include additional properties from node.data (excluding label to avoid duplication)
        ...Object.fromEntries(
          Object.entries(node.data).filter(([key]) => key !== 'label')
        )
      }
    }))

    const now = new Date().toISOString()
    const graphMetadata: QueryGraphMetadata = {
      id: metadata.id || this.generateId(),
      name: metadata.name || 'Untitled Query Graph',
      description: metadata.description || '',
      category: metadata.category || 'general',
      tags: metadata.tags || [],
      createdAt: metadata.createdAt || now,
      updatedAt: now,
      version: metadata.version || 1,
      author: metadata.author || 'Anonymous',
      isPublic: metadata.isPublic || false,
      nodeCount: queryNodes.length,
      edgeCount: edges.length,
      thumbnail: metadata.thumbnail
    }

    return {
      metadata: graphMetadata,
      graph: {
        nodes: queryNodes,
        edges: edges
      }
    }
  }

  // Deserialize a query graph from JSON
  deserializeQueryGraph(serialized: SerializedQueryGraph): {
    nodes: ReactFlowQueryNode[]
    edges: QueryEdge[]
    metadata: QueryGraphMetadata
  } {
    // Convert QueryNode format to ReactFlow format
    const reactFlowNodes: ReactFlowQueryNode[] = serialized.graph.nodes.map(node => ({
      id: node.id,
      type: node.type,
      position: node.position,
      data: {
        id: node.id,
        type: node.type,
        position: node.position,
        label: node.data.label || 'Node',
        source: node.data.source,
        condition: node.data.condition,
        transformation: node.data.transformation,
        aggregation: node.data.aggregation,
        joinType: node.data.joinType,
        joinCondition: node.data.joinCondition,
        // Include all other properties from node.data (excluding duplicates)
        ...Object.fromEntries(
          Object.entries(node.data).filter(([key]) => !['id', 'type', 'position', 'label'].includes(key))
        )
      }
    }))

    return {
      nodes: reactFlowNodes,
      edges: serialized.graph.edges,
      metadata: serialized.metadata
    }
  }

  // Save a query graph
  async saveQueryGraph(
    nodes: ReactFlowQueryNode[],
    edges: QueryEdge[],
    metadata: Partial<QueryGraphMetadata>
  ): Promise<string> {
    try {
      const serialized = this.serializeQueryGraph(nodes, edges, metadata)

      // Try API first, fallback to localStorage
      const result = await this.apiCallWithFallback(
        async () => {
          const workflowData = {
            id: serialized.metadata.id,
            name: serialized.metadata.name,
            description: serialized.metadata.description,
            metadata: {
              createdAt: serialized.metadata.createdAt,
              updatedAt: serialized.metadata.updatedAt,
              tags: serialized.metadata.tags,
              description: serialized.metadata.description,
              category: serialized.metadata.category,
              author: serialized.metadata.author,
              isPublic: serialized.metadata.isPublic,
              version: serialized.metadata.version
            },
            nodes: serialized.graph.nodes,
            edges: serialized.graph.edges
          }

          if (serialized.metadata.id) {
            // Update existing
            await this.apiCall(`/workflows/${serialized.metadata.id}`, {
              method: 'PUT',
              body: JSON.stringify(workflowData)
            })
          } else {
            // Create new
            const response = await this.apiCall<{id: string}>('/workflows', {
              method: 'POST',
              body: JSON.stringify(workflowData)
            })
            serialized.metadata.id = response.id
          }

          return serialized.metadata.id
        },
        () => {
          // Fallback to localStorage
          const collection = this.getCollection()

          // Check if graph already exists (update) or is new
          const existingIndex = collection.graphs.findIndex(g => g.metadata.id === serialized.metadata.id)

          if (existingIndex >= 0) {
            // Update existing graph
            serialized.metadata.version = collection.graphs[existingIndex].metadata.version + 1
            serialized.metadata.updatedAt = new Date().toISOString()
            collection.graphs[existingIndex] = serialized
          } else {
            // Add new graph
            collection.graphs.push(serialized)
          }

          collection.total = collection.graphs.length
          collection.lastUpdated = new Date().toISOString()

          // Save to localStorage
          localStorage.setItem(STORAGE_KEYS.QUERY_GRAPHS, JSON.stringify(collection))

          return serialized.metadata.id
        }
      )

      // Add to recent graphs
      this.addToRecent(result)

      return result
    } catch (error) {
      console.error('Failed to save query graph:', error)
      throw new Error('Failed to save query graph')
    }
  }

  // Load a query graph by ID
  async loadQueryGraph(id: string): Promise<{
    nodes: ReactFlowQueryNode[]
    edges: QueryEdge[]
    metadata: QueryGraphMetadata
  } | null> {
    try {
      const result = await this.apiCallWithFallback(
        async () => {
          const workflow = await this.apiCall<BackendWorkflowResponse>(`/workflows/${id}`)

          // Convert backend workflow format to frontend format
          const serialized: SerializedQueryGraph = {
            metadata: {
              id: workflow.id,
              name: workflow.name,
              description: workflow.description,
              category: workflow.metadata?.category || 'general',
              tags: workflow.metadata?.tags || [],
              createdAt: workflow.metadata?.createdAt || '',
              updatedAt: workflow.metadata?.updatedAt || '',
              version: workflow.metadata?.version || 1,
              author: workflow.metadata?.author,
              isPublic: workflow.metadata?.isPublic || false,
              nodeCount: workflow.nodeCount || 0,
              edgeCount: workflow.edgeCount || 0,
              thumbnail: workflow.metadata?.thumbnail
            },
            graph: {
              nodes: workflow.nodes || [],
              edges: workflow.edges || []
            }
          }

          return this.deserializeQueryGraph(serialized)
        },
        () => {
          // Fallback to localStorage
          const collection = this.getCollection()
          const serialized = collection.graphs.find(g => g.metadata.id === id)

          if (!serialized) {
            return null
          }

          return this.deserializeQueryGraph(serialized)
        }
      )

      // Add to recent graphs
      this.addToRecent(id)

      return result
    } catch (error) {
      console.error('Failed to load query graph:', error)
      return null
    }
  }

  // Delete a query graph
  async deleteQueryGraph(id: string): Promise<boolean> {
    try {
      const collection = this.getCollection()
      const initialLength = collection.graphs.length

      collection.graphs = collection.graphs.filter(g => g.metadata.id !== id)

      if (collection.graphs.length < initialLength) {
        collection.total = collection.graphs.length
        collection.lastUpdated = new Date().toISOString()

        localStorage.setItem(STORAGE_KEYS.QUERY_GRAPHS, JSON.stringify(collection))

        // Remove from recent and favorites
        this.removeFromRecent(id)
        this.removeFromFavorites(id)

        return true
      }

      return false
    } catch (error) {
      console.error('Failed to delete query graph:', error)
      return false
    }
  }

  // Get all query graphs
  async getAllQueryGraphs(): Promise<SerializedQueryGraph[]> {
    try {
      return await this.apiCallWithFallback(
        async () => {
          const workflows = await this.apiCall<BackendWorkflowResponse[]>('/workflows')

          // Convert backend format to frontend format
          return workflows.map(workflow => ({
            metadata: {
              id: workflow.id,
              name: workflow.name,
              description: workflow.description,
              category: workflow.metadata?.category || 'general',
              tags: workflow.metadata?.tags || [],
              createdAt: workflow.metadata?.createdAt || '',
              updatedAt: workflow.metadata?.updatedAt || '',
              version: workflow.metadata?.version || 1,
              author: workflow.metadata?.author,
              isPublic: workflow.metadata?.isPublic || false,
              nodeCount: workflow.nodeCount || 0,
              edgeCount: workflow.edgeCount || 0,
              thumbnail: workflow.metadata?.thumbnail
            },
            graph: {
              nodes: workflow.nodes || [],
              edges: workflow.edges || []
            }
          }))
        },
        () => {
          // Fallback to localStorage
          const collection = this.getCollection()
          return collection.graphs
        }
      )
    } catch (error) {
      console.error('Failed to get query graphs:', error)
      return []
    }
  }

  // Search query graphs
  async searchQueryGraphs(query: string, filters?: {
    category?: string
    tags?: string[]
    author?: string
  }): Promise<SerializedQueryGraph[]> {
    try {
      const collection = this.getCollection()
      let results = collection.graphs

      // Apply text search
      if (query.trim()) {
        const searchTerm = query.toLowerCase()
        results = results.filter(graph =>
          graph.metadata.name.toLowerCase().includes(searchTerm) ||
          graph.metadata.description?.toLowerCase().includes(searchTerm) ||
          graph.metadata.tags?.some(tag => tag.toLowerCase().includes(searchTerm))
        )
      }

      // Apply filters
      if (filters?.category) {
        results = results.filter(graph => graph.metadata.category === filters.category)
      }

      if (filters?.tags && filters.tags.length > 0) {
        results = results.filter(graph =>
          filters.tags!.some(tag => graph.metadata.tags?.includes(tag))
        )
      }

      if (filters?.author) {
        results = results.filter(graph => graph.metadata.author === filters.author)
      }

      return results
    } catch (error) {
      console.error('Failed to search query graphs:', error)
      return []
    }
  }

  // Duplicate a query graph
  async duplicateQueryGraph(id: string, newName?: string): Promise<string | null> {
    try {
      const original = await this.loadQueryGraph(id)
      if (!original) return null

      const newMetadata: Partial<QueryGraphMetadata> = {
        ...original.metadata,
        id: this.generateId(),
        name: newName || `${original.metadata.name} (Copy)`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: 1
      }

      return await this.saveQueryGraph(original.nodes, original.edges, newMetadata)
    } catch (error) {
      console.error('Failed to duplicate query graph:', error)
      return null
    }
  }

  // Export query graph to JSON file
  async exportQueryGraph(id: string): Promise<string | null> {
    try {
      const collection = this.getCollection()
      const serialized = collection.graphs.find(g => g.metadata.id === id)

      if (!serialized) return null

      // Create downloadable JSON
      const dataStr = JSON.stringify(serialized, null, 2)
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr)

      // Create temporary link and trigger download
      const exportFileDefaultName = `${serialized.metadata.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_query_graph.json`

      const linkElement = document.createElement('a')
      linkElement.setAttribute('href', dataUri)
      linkElement.setAttribute('download', exportFileDefaultName)
      linkElement.click()

      return exportFileDefaultName
    } catch (error) {
      console.error('Failed to export query graph:', error)
      return null
    }
  }

  // Import query graph from JSON
  async importQueryGraph(jsonData: string): Promise<string | null> {
    try {
      const serialized: SerializedQueryGraph = JSON.parse(jsonData)

      // Validate structure
      if (!serialized.metadata || !serialized.graph) {
        throw new Error('Invalid query graph format')
      }

      // Generate new ID to avoid conflicts
      serialized.metadata.id = this.generateId()
      serialized.metadata.createdAt = new Date().toISOString()
      serialized.metadata.updatedAt = new Date().toISOString()
      serialized.metadata.version = 1

      // Save imported graph
      const collection = this.getCollection()
      collection.graphs.push(serialized)
      collection.total = collection.graphs.length
      collection.lastUpdated = new Date().toISOString()

      localStorage.setItem(STORAGE_KEYS.QUERY_GRAPHS, JSON.stringify(collection))

      return serialized.metadata.id
    } catch (error) {
      console.error('Failed to import query graph:', error)
      return null
    }
  }

  // Recent graphs management
  private addToRecent(id: string): void {
    try {
      const recent = this.getRecentGraphs()
      // Remove if already exists
      const filtered = recent.filter(g => g.id !== id)
      // Add to beginning
      filtered.unshift({ id, accessedAt: new Date().toISOString() })
      // Keep only last 10
      const trimmed = filtered.slice(0, 10)

      localStorage.setItem(STORAGE_KEYS.RECENT_GRAPHS, JSON.stringify({
        graphs: trimmed,
        lastUpdated: new Date().toISOString()
      }))
    } catch (error) {
      console.error('Failed to update recent graphs:', error)
    }
  }

  private removeFromRecent(id: string): void {
    try {
      const recent = this.getRecentGraphs()
      const filtered = recent.filter(g => g.id !== id)

      localStorage.setItem(STORAGE_KEYS.RECENT_GRAPHS, JSON.stringify({
        graphs: filtered,
        lastUpdated: new Date().toISOString()
      }))
    } catch (error) {
      console.error('Failed to remove from recent graphs:', error)
    }
  }

  getRecentGraphs(): Array<{ id: string, accessedAt: string }> {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.RECENT_GRAPHS)
      if (!data) return []

      const parsed = JSON.parse(data)
      return parsed.graphs || []
    } catch (error) {
      console.error('Failed to get recent graphs:', error)
      return []
    }
  }

  // Favorites management
  async addToFavorites(id: string): Promise<boolean> {
    try {
      const favorites = this.getFavoriteGraphs()
      if (!favorites.includes(id)) {
        favorites.push(id)
        localStorage.setItem(STORAGE_KEYS.FAVORITE_GRAPHS, JSON.stringify({
          graphs: favorites,
          lastUpdated: new Date().toISOString()
        }))
      }
      return true
    } catch (error) {
      console.error('Failed to add to favorites:', error)
      return false
    }
  }

  async removeFromFavorites(id: string): Promise<boolean> {
    try {
      const favorites = this.getFavoriteGraphs()
      const filtered = favorites.filter(g => g !== id)

      localStorage.setItem(STORAGE_KEYS.FAVORITE_GRAPHS, JSON.stringify({
        graphs: filtered,
        lastUpdated: new Date().toISOString()
      }))
      return true
    } catch (error) {
      console.error('Failed to remove from favorites:', error)
      return false
    }
  }

  getFavoriteGraphs(): string[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.FAVORITE_GRAPHS)
      if (!data) return []

      const parsed = JSON.parse(data)
      return parsed.graphs || []
    } catch (error) {
      console.error('Failed to get favorite graphs:', error)
      return []
    }
  }

  // Utility methods
  private getCollection(): QueryGraphCollection {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.QUERY_GRAPHS)
      if (!data) {
        return { graphs: [], total: 0, lastUpdated: new Date().toISOString() }
      }

      return JSON.parse(data)
    } catch (error) {
      console.error('Failed to get collection:', error)
      return { graphs: [], total: 0, lastUpdated: new Date().toISOString() }
    }
  }

  private generateId(): string {
    return `query_graph_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  // Clear all data (for testing/debugging)
  clearAllData(): void {
    const keys = Object.values(STORAGE_KEYS)
    keys.forEach(key => localStorage.removeItem(key))
    this.initializeStorage()
  }

  // Get storage statistics
  getStorageStats(): {
    totalGraphs: number
    totalSize: number
    recentCount: number
    favoritesCount: number
  } {
    try {
      const collection = this.getCollection()
      const recent = this.getRecentGraphs()
      const favorites = this.getFavoriteGraphs()

      // Estimate size (rough calculation)
      const data = localStorage.getItem(STORAGE_KEYS.QUERY_GRAPHS) || ''
      const totalSize = new Blob([data]).size

      return {
        totalGraphs: collection.total,
        totalSize,
        recentCount: recent.length,
        favoritesCount: favorites.length
      }
    } catch (error) {
      console.error('Failed to get storage stats:', error)
      return {
        totalGraphs: 0,
        totalSize: 0,
        recentCount: 0,
        favoritesCount: 0
      }
    }
  }
}

// Export singleton instance
export const queryGraphPersistenceService = QueryGraphPersistenceService.getInstance()