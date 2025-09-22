import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { ReactFlowQueryNode, QueryEdge } from '../types/query'

interface QueryState {
  nodes: ReactFlowQueryNode[]
  edges: QueryEdge[]
  selectedNodeId: string | null
  isLoading: boolean
  error: string | null

  // Actions
  setNodes: (nodes: ReactFlowQueryNode[]) => void
  setEdges: (edges: QueryEdge[]) => void
  addNode: (node: Omit<ReactFlowQueryNode, 'id'>) => void
  updateNode: (id: string, updates: Partial<ReactFlowQueryNode>) => void
  deleteNode: (id: string) => void
  addEdge: (edge: Omit<QueryEdge, 'id'>) => void
  deleteEdge: (id: string) => void
  setSelectedNode: (id: string | null) => void
  loadQueryGraph: (nodes: ReactFlowQueryNode[], edges: QueryEdge[]) => void
  clearQueryGraph: () => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void

  // Computed properties
  getNodeCount: () => number
  getEdgeCount: () => number
}

export const useQueryStore = create<QueryState>()(
  devtools(
    (set, get) => ({
      nodes: [],
      edges: [],
      selectedNodeId: null,
      isLoading: false,
      error: null,

      setNodes: (nodes) => set({ nodes }),

      setEdges: (edges) => set({ edges }),

      addNode: (node) => {
        const newNode = {
          ...node,
          id: `query-node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        }
        set((state) => ({
          nodes: [...state.nodes, newNode]
        }))
      },

      updateNode: (id, updates) => {
        set((state) => ({
          nodes: state.nodes.map((node) =>
            node.id === id ? { ...node, ...updates } : node
          )
        }))
      },

      deleteNode: (id) => {
        set((state) => ({
          nodes: state.nodes.filter((node) => node.id !== id),
          edges: state.edges.filter((edge) => edge.source !== id && edge.target !== id),
          selectedNodeId: state.selectedNodeId === id ? null : state.selectedNodeId
        }))
      },

      addEdge: (edge) => {
        const newEdge = {
          ...edge,
          id: `query-edge-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        }
        set((state) => ({
          edges: [...state.edges, newEdge]
        }))
      },

      deleteEdge: (id) => {
        set((state) => ({
          edges: state.edges.filter((edge) => edge.id !== id)
        }))
      },

      setSelectedNode: (id) => {
        set({ selectedNodeId: id })
      },

      loadQueryGraph: (nodes, edges) => {
        set({
          nodes,
          edges,
          selectedNodeId: null,
          error: null
        })
      },

      clearQueryGraph: () => {
        set({
          nodes: [],
          edges: [],
          selectedNodeId: null,
          error: null
        })
      },

      setLoading: (loading) => set({ isLoading: loading }),

      setError: (error) => set({ error }),

      getNodeCount: () => get().nodes.length,

      getEdgeCount: () => get().edges.length,
    }),
    { name: 'query-store' }
  )
)

// Selectors for optimized re-renders
export const useQueryNodes = () => useQueryStore((state) => state.nodes)
export const useQueryEdges = () => useQueryStore((state) => state.edges)
export const useQuerySelectedNode = () => useQueryStore((state) => state.selectedNodeId)
export const useQueryLoading = () => useQueryStore((state) => state.isLoading)
export const useQueryError = () => useQueryStore((state) => state.error)
export const useQueryActions = () => useQueryStore((state) => ({
  setNodes: state.setNodes,
  setEdges: state.setEdges,
  addNode: state.addNode,
  updateNode: state.updateNode,
  deleteNode: state.deleteNode,
  addEdge: state.addEdge,
  deleteEdge: state.deleteEdge,
  setSelectedNode: state.setSelectedNode,
  loadQueryGraph: state.loadQueryGraph,
  clearQueryGraph: state.clearQueryGraph,
  setLoading: state.setLoading,
  setError: state.setError,
}))