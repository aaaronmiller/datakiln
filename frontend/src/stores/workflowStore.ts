import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { workflowService } from '../services/workflowService'
import { WorkflowNode, WorkflowEdge, WorkflowGraph } from '../types/workflow'

// Re-export for compatibility
export type { WorkflowNode, WorkflowEdge }

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
          // Convert nodes and edges to workflow format expected by backend
          const workflowGraph: WorkflowGraph = {
            name: 'Workflow from Store',
            start_node: nodes[0]?.id || '',
            nodes: nodes.reduce((acc, node) => {
              acc[node.id] = {
                id: node.id,
                type: node.type as unknown as WorkflowNode['type'],
                position: node.position,
                data: {
                  ...node.data,
                  name: node.data.label // Add required name field
                }
              }
              return acc
            }, {} as Record<string, WorkflowNode>),
            edges: edges
          }

          // Call backend API using workflowService
          await workflowService.executeWorkflow(workflowGraph)

          // Update node statuses based on result - for now mark all as completed
          set((state) => ({
            nodes: state.nodes.map((node) => ({
              ...node,
              data: {
                ...node.data,
                status: 'completed' as const
              }
            }))
          }))
        } catch (error) {
          console.error('Workflow execution error:', error)
          // Mark all nodes as error
          set((state) => ({
            nodes: state.nodes.map((node) => ({
              ...node,
              data: { ...node.data, status: 'error' as const }
            }))
          }))
          // Re-throw to allow UI to handle the error
          throw error
        }
      }
    }),
    { name: 'workflow-store' }
  )
)