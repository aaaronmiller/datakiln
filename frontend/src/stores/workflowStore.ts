import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

export interface WorkflowNode {
  id: string
  type: string
  position: { x: number; y: number }
  data: {
    label: string
    parameters: Record<string, any>
    status: 'pending' | 'running' | 'completed' | 'error'
  }
}

export interface WorkflowEdge {
  id: string
  source: string
  target: string
  sourceHandle?: string | null
  targetHandle?: string | null
}

interface WorkflowState {
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
  selectedNodeId: string | null
  addNode: (node: Omit<WorkflowNode, 'id'>) => void
  updateNode: (id: string, updates: Partial<WorkflowNode>) => void
  deleteNode: (id: string) => void
  addEdge: (edge: Omit<WorkflowEdge, 'id'>) => void
  deleteEdge: (id: string) => void
  setSelectedNode: (id: string | null) => void
  saveWorkflow: () => void
  loadWorkflow: (workflow: { nodes: WorkflowNode[]; edges: WorkflowEdge[] }) => void
  executeWorkflow: () => Promise<void>
}

export const useWorkflowStore = create<WorkflowState>()(
  devtools(
    (set, get) => ({
      nodes: [],
      edges: [],
      selectedNodeId: null,

      addNode: (node) => {
        const newNode = {
          ...node,
          id: `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
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
          id: `edge-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
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

      saveWorkflow: () => {
        const { nodes, edges } = get()
        const workflow = { nodes, edges }
        localStorage.setItem('workflow', JSON.stringify(workflow))
      },

      loadWorkflow: (workflow) => {
        set({
          nodes: workflow.nodes,
          edges: workflow.edges,
          selectedNodeId: null
        })
      },

      executeWorkflow: async () => {
        const { nodes, edges } = get()

        // Mark all nodes as running
        set((state) => ({
          nodes: state.nodes.map((node) => ({
            ...node,
            data: { ...node.data, status: 'running' as const }
          }))
        }))

        try {
          // Call backend API to execute workflow
          const response = await fetch('/api/workflows/execute', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ nodes, edges })
          })

          if (!response.ok) {
            throw new Error('Workflow execution failed')
          }

          const result = await response.json()

          // Update node statuses based on result
          set((state) => ({
            nodes: state.nodes.map((node) => ({
              ...node,
              data: {
                ...node.data,
                status: result.nodeStatuses?.[node.id] || 'completed'
              }
            }))
          }))
        } catch (error) {
          // Mark all nodes as error
          set((state) => ({
            nodes: state.nodes.map((node) => ({
              ...node,
              data: { ...node.data, status: 'error' as const }
            }))
          }))
        }
      }
    }),
    { name: 'workflow-store' }
  )
)