import { useState, useCallback, useEffect } from 'react'
import { ReactFlowQueryNode, QueryEdge } from '../types/query'
import { queryGraphPersistenceService, QueryGraphMetadata, SerializedQueryGraph } from '../services/queryGraphPersistenceService'

interface SearchFilters {
  category?: string
  tags?: string[]
  author?: string
}

interface UseQueryGraphPersistenceOptions {
  onSaveSuccess?: (id: string) => void
  onSaveError?: (error: Error) => void
  onLoadSuccess?: (data: { nodes: ReactFlowQueryNode[], edges: QueryEdge[], metadata: QueryGraphMetadata }) => void
  onLoadError?: (error: Error) => void
}

interface UseQueryGraphPersistenceReturn {
  // State
  isLoading: boolean
  isSaving: boolean
  currentGraphId: string | null
  lastSaved: Date | null
  hasUnsavedChanges: boolean

  // Actions
  saveGraph: (nodes: ReactFlowQueryNode[], edges: QueryEdge[], metadata?: Partial<QueryGraphMetadata>) => Promise<string | null>
  loadGraph: (id: string) => Promise<boolean>
  deleteGraph: (id: string) => Promise<boolean>
  duplicateGraph: (id: string, newName?: string) => Promise<string | null>
  exportGraph: (id: string) => Promise<string | null>
  importGraph: (jsonData: string) => Promise<string | null>

  // Utilities
  markAsModified: () => void
  resetUnsavedChanges: () => void
  getAllGraphs: () => Promise<SerializedQueryGraph[]>
  searchGraphs: (query: string, filters?: SearchFilters) => Promise<SerializedQueryGraph[]>
  getRecentGraphs: () => Array<{ id: string, accessedAt: string }>
  getFavoriteGraphs: () => string[]
  addToFavorites: (id: string) => Promise<boolean>
  removeFromFavorites: (id: string) => Promise<boolean>
  getStorageStats: () => { totalGraphs: number, totalSize: number, recentCount: number, favoritesCount: number }
}

export function useQueryGraphPersistence(
  options: UseQueryGraphPersistenceOptions = {}
): UseQueryGraphPersistenceReturn {
  const {
    onSaveSuccess,
    onSaveError,
    onLoadSuccess,
    onLoadError
  } = options

  // State
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [currentGraphId, setCurrentGraphId] = useState<string | null>(null)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Cleanup logic if needed
    }
  }, [])

  // Actions
  const saveGraph = useCallback(async (
    nodes: ReactFlowQueryNode[],
    edges: QueryEdge[],
    metadata: Partial<QueryGraphMetadata> = {}
  ): Promise<string | null> => {
    try {
      setIsSaving(true)
      const id = await queryGraphPersistenceService.saveQueryGraph(nodes, edges, {
        id: currentGraphId || undefined,
        ...metadata
      })

      if (id) {
        setCurrentGraphId(id)
        setLastSaved(new Date())
        setHasUnsavedChanges(false)
        onSaveSuccess?.(id)
        return id
      }

      return null
    } catch (error) {
      onSaveError?.(error as Error)
      return null
    } finally {
      setIsSaving(false)
    }
  }, [currentGraphId, onSaveSuccess, onSaveError])

  const loadGraph = useCallback(async (id: string): Promise<boolean> => {
    try {
      setIsLoading(true)
      const data = await queryGraphPersistenceService.loadQueryGraph(id)

      if (data) {
        setCurrentGraphId(id)
        setLastSaved(new Date())
        setHasUnsavedChanges(false)
        onLoadSuccess?.(data)
        return true
      }

      return false
    } catch (error) {
      onLoadError?.(error as Error)
      return false
    } finally {
      setIsLoading(false)
    }
  }, [onLoadSuccess, onLoadError])

  const deleteGraph = useCallback(async (id: string): Promise<boolean> => {
    try {
      const success = await queryGraphPersistenceService.deleteQueryGraph(id)
      if (success && currentGraphId === id) {
        setCurrentGraphId(null)
        setLastSaved(null)
        setHasUnsavedChanges(false)
      }
      return success
    } catch (error) {
      console.error('Failed to delete graph:', error)
      return false
    }
  }, [currentGraphId])

  const duplicateGraph = useCallback(async (id: string, newName?: string): Promise<string | null> => {
    try {
      return await queryGraphPersistenceService.duplicateQueryGraph(id, newName)
    } catch (error) {
      console.error('Failed to duplicate graph:', error)
      return null
    }
  }, [])

  const exportGraph = useCallback(async (id: string): Promise<string | null> => {
    try {
      return await queryGraphPersistenceService.exportQueryGraph(id)
    } catch (error) {
      console.error('Failed to export graph:', error)
      return null
    }
  }, [])

  const importGraph = useCallback(async (jsonData: string): Promise<string | null> => {
    try {
      return await queryGraphPersistenceService.importQueryGraph(jsonData)
    } catch (error) {
      console.error('Failed to import graph:', error)
      return null
    }
  }, [])

  // Utilities
  const markAsModified = useCallback(() => {
    setHasUnsavedChanges(true)
  }, [])

  const resetUnsavedChanges = useCallback(() => {
    setHasUnsavedChanges(false)
  }, [])

  const getAllGraphs = useCallback(async (): Promise<SerializedQueryGraph[]> => {
    try {
      return await queryGraphPersistenceService.getAllQueryGraphs()
    } catch (error) {
      console.error('Failed to get all graphs:', error)
      return []
    }
  }, [])

  const searchGraphs = useCallback(async (query: string, filters?: SearchFilters): Promise<SerializedQueryGraph[]> => {
    try {
      return await queryGraphPersistenceService.searchQueryGraphs(query, filters)
    } catch (error) {
      console.error('Failed to search graphs:', error)
      return []
    }
  }, [])

  const getRecentGraphs = useCallback(() => {
    return queryGraphPersistenceService.getRecentGraphs()
  }, [])

  const getFavoriteGraphs = useCallback(() => {
    return queryGraphPersistenceService.getFavoriteGraphs()
  }, [])

  const addToFavorites = useCallback(async (id: string): Promise<boolean> => {
    try {
      return await queryGraphPersistenceService.addToFavorites(id)
    } catch (error) {
      console.error('Failed to add to favorites:', error)
      return false
    }
  }, [])

  const removeFromFavorites = useCallback(async (id: string): Promise<boolean> => {
    try {
      return await queryGraphPersistenceService.removeFromFavorites(id)
    } catch (error) {
      console.error('Failed to remove from favorites:', error)
      return false
    }
  }, [])

  const getStorageStats = useCallback(() => {
    return queryGraphPersistenceService.getStorageStats()
  }, [])

  return {
    // State
    isLoading,
    isSaving,
    currentGraphId,
    lastSaved,
    hasUnsavedChanges,

    // Actions
    saveGraph,
    loadGraph,
    deleteGraph,
    duplicateGraph,
    exportGraph,
    importGraph,

    // Utilities
    markAsModified,
    resetUnsavedChanges,
    getAllGraphs,
    searchGraphs,
    getRecentGraphs,
    getFavoriteGraphs,
    addToFavorites,
    removeFromFavorites,
    getStorageStats
  }
}

// Hook for managing query graph collections
export function useQueryGraphCollections() {
  const [collections, setCollections] = useState<{
    all: SerializedQueryGraph[]
    recent: Array<{ id: string, accessedAt: string }>
    favorites: string[]
    searchResults: SerializedQueryGraph[]
  }>({
    all: [],
    recent: [],
    favorites: [],
    searchResults: []
  })

  const [isLoading, setIsLoading] = useState(false)

  const loadCollections = useCallback(async () => {
    setIsLoading(true)
    try {
      const [all, recent, favorites] = await Promise.all([
        queryGraphPersistenceService.getAllQueryGraphs(),
        Promise.resolve(queryGraphPersistenceService.getRecentGraphs()),
        Promise.resolve(queryGraphPersistenceService.getFavoriteGraphs())
      ])

      setCollections({
        all,
        recent,
        favorites,
        searchResults: []
      })
    } catch (error) {
      console.error('Failed to load collections:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const searchGraphs = useCallback(async (query: string, filters?: SearchFilters) => {
    setIsLoading(true)
    try {
      const results = await queryGraphPersistenceService.searchQueryGraphs(query, filters)
      setCollections(prev => ({ ...prev, searchResults: results }))
      return results
    } catch (error) {
      console.error('Failed to search graphs:', error)
      return []
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadCollections()
  }, [loadCollections])

  return {
    collections,
    isLoading,
    loadCollections,
    searchGraphs
  }
}