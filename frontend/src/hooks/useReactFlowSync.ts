import { useCallback, useRef, useEffect } from 'react'
import { NodeChange, EdgeChange, applyNodeChanges, applyEdgeChanges, Node, Edge } from '@xyflow/react'
import { debounce } from 'lodash'

interface UseReactFlowSyncProps {
  nodes: Node[]
  edges: Edge[]
  setNodes: (nodes: Node[]) => void
  setEdges: (edges: Edge[]) => void
  onNodesChange?: (changes: NodeChange[]) => void
  onEdgesChange?: (changes: EdgeChange[]) => void
  debounceMs?: number
}

/**
 * Hook to synchronize ReactFlow state with Zustand store with proper debouncing
 * Prevents state conflicts during rapid changes and ensures consistent state
 */
export const useReactFlowSync = ({
  nodes,
  edges,
  setNodes,
  setEdges,
  onNodesChange,
  onEdgesChange,
  debounceMs = 100
}: UseReactFlowSyncProps) => {
  // Track if we're currently applying changes to prevent infinite loops
  const isApplyingChanges = useRef(false)
  
  // Debounced store update functions
  const debouncedSetNodes = useRef(
    debounce((newNodes: Node[]) => {
      if (!isApplyingChanges.current) {
        setNodes(newNodes)
      }
    }, debounceMs)
  ).current

  const debouncedSetEdges = useRef(
    debounce((newEdges: Edge[]) => {
      if (!isApplyingChanges.current) {
        setEdges(newEdges)
      }
    }, debounceMs)
  ).current

  // Handle node changes with proper synchronization
  const handleNodesChange = useCallback((changes: NodeChange[]) => {
    isApplyingChanges.current = true
    
    try {
      // Apply changes to current nodes
      const updatedNodes = applyNodeChanges(changes, nodes)
      
      // Call external handler if provided
      onNodesChange?.(changes)
      
      // Update store with debouncing
      debouncedSetNodes(updatedNodes)
    } finally {
      // Reset flag after a short delay to allow for synchronization
      setTimeout(() => {
        isApplyingChanges.current = false
      }, 50)
    }
  }, [nodes, onNodesChange, debouncedSetNodes])

  // Handle edge changes with proper synchronization
  const handleEdgesChange = useCallback((changes: EdgeChange[]) => {
    isApplyingChanges.current = true
    
    try {
      // Apply changes to current edges
      const updatedEdges = applyEdgeChanges(changes, edges)
      
      // Call external handler if provided
      onEdgesChange?.(changes)
      
      // Update store with debouncing
      debouncedSetEdges(updatedEdges)
    } finally {
      // Reset flag after a short delay to allow for synchronization
      setTimeout(() => {
        isApplyingChanges.current = false
      }, 50)
    }
  }, [edges, onEdgesChange, debouncedSetEdges])

  // Cleanup debounced functions on unmount
  useEffect(() => {
    return () => {
      debouncedSetNodes.cancel()
      debouncedSetEdges.cancel()
    }
  }, [debouncedSetNodes, debouncedSetEdges])

  return {
    handleNodesChange,
    handleEdgesChange,
    isApplyingChanges: isApplyingChanges.current
  }
}