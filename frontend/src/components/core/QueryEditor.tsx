import * as React from "react"
import {
  MiniMap,
  Controls,
  Background,
  Node,
  Edge,
  NodeTypes,
  OnConnect,
  BackgroundVariant,
  NodeChange,
  EdgeChange,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { Button } from "../ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog"
import { Input } from "../ui/input"
import { Label } from "../ui/label"
import { Textarea } from "../ui/textarea"
import { ReactFlowWrapper } from "../ui/react-flow-wrapper"
import { nodeRegistryService } from "../../services/nodeRegistryService"
import { useQueryGraphPersistence } from "../../hooks/useQueryGraphPersistence"
import { QueryGraphMetadata } from "../../services/queryGraphPersistenceService"
import { useQueryStore } from "../../stores/queryStore"
import { ReactFlowQueryNode, QueryEdge, QueryNodeData } from "../../types/query"

// Generic Node Component using registry data - optimized for performance
const GenericNode: React.FC<{ data: Record<string, unknown> }> = React.memo(({ data }) => {
  const nodeType = data.type as string
  const displayInfo = nodeRegistryService.getNodeDisplayInfo(nodeType)

  // Memoize data entries to avoid recalculation on every render
  const dataEntries = React.useMemo(() => {
    const entries = Object.entries(data).filter(([key, value]) =>
      key !== 'type' && key !== 'label' && value != null
    )
    // For performance, limit displayed entries in large graphs
    return entries.slice(0, 3)
  }, [data])

  const hasMoreData = React.useMemo(() =>
    Object.keys(data).filter(key => key !== 'type' && key !== 'label' && data[key] != null).length > 3,
    [data]
  )

  return (
    <Card className="w-48 border-2 bg-white">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center space-x-2">
          <span>{displayInfo.icon}</span>
          <span>{displayInfo.label}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-xs text-gray-600 space-y-1">
          {dataEntries.map(([key, value]) => (
            <div key={key} className="truncate" title={`${key}: ${String(value)}`}>
              <span className="font-medium">{key}:</span> {String(value)}
            </div>
          ))}
          {hasMoreData && (
            <div className="text-gray-400 italic">...and more</div>
          )}
        </div>
      </CardContent>
    </Card>
  )
})
GenericNode.displayName = "GenericNode"

// Create node types dynamically from registry - optimized as module constant
const queryNodeTypes: NodeTypes = (() => {
  const nodeTypes: NodeTypes = {}
  const allNodes = nodeRegistryService.getAllNodeTypes()

  allNodes.forEach(nodeEntry => {
    nodeTypes[nodeEntry.type] = GenericNode
  })

  return nodeTypes
})()

interface QueryEditorProps {
  isOpen: boolean
  onClose: () => void
  initialQueryGraph?: {
    nodes: Node[]
    connections: Edge[]
  }
  onSave: (queryGraph: { nodes: Node[], connections: Edge[] }) => void
  graphId?: string // For loading existing graphs
}

const QueryEditor: React.FC<QueryEditorProps> = ({
  isOpen,
  onClose,
  initialQueryGraph,
  onSave,
  graphId
}) => {
  // Use query store for state management
  const {
    nodes,
    edges,
    addNode,
    addEdge,
    loadQueryGraph,
    clearQueryGraph,
    setNodes,
    setEdges
  } = useQueryStore()

  // Graph metadata state
  const [graphMetadata, setGraphMetadata] = React.useState<Partial<QueryGraphMetadata>>({
    name: 'Untitled Query Graph',
    description: '',
    category: 'general',
    tags: []
  })

  // Persistence hook
  const {
    saveGraph,
    loadGraph,
    isSaving,
    markAsModified
  } = useQueryGraphPersistence({
    onSaveSuccess: (id) => {
      console.log('Query graph saved successfully:', id)
    },
    onSaveError: (error) => {
      console.error('Failed to save query graph:', error)
    },
    onLoadSuccess: (data) => {
      loadQueryGraph(data.nodes, data.edges)
      setGraphMetadata(data.metadata)
      console.log('Query graph loaded successfully')
    },
    onLoadError: (error) => {
      console.error('Failed to load query graph:', error)
    }
  })

  // Initialize store with initial data when dialog opens
  React.useEffect(() => {
    if (isOpen && initialQueryGraph) {
      // Convert initial data to store format
      const convertedNodes: ReactFlowQueryNode[] = (initialQueryGraph.nodes || []).map(node => ({
        ...node,
        data: node.data as QueryNodeData
      }))
      const convertedEdges: QueryEdge[] = (initialQueryGraph.connections || []).map(edge => ({
        ...edge,
        sourceHandle: edge.sourceHandle || undefined,
        targetHandle: edge.targetHandle || undefined
      }))
      loadQueryGraph(convertedNodes, convertedEdges)
    } else if (isOpen && !graphId) {
      // Clear store for new graph
      clearQueryGraph()
    }
  }, [isOpen, initialQueryGraph, graphId, loadQueryGraph, clearQueryGraph])

  // Load existing graph if graphId is provided
  React.useEffect(() => {
    if (graphId && isOpen) {
      loadGraph(graphId)
    }
  }, [graphId, isOpen, loadGraph])

  // Cleanup when dialog closes
  React.useEffect(() => {
    if (!isOpen) {
      clearQueryGraph()
    }
  }, [isOpen, clearQueryGraph])

  const availableQueryNodeTypes = React.useMemo(() =>
    nodeRegistryService.getAllNodeTypes().map(nodeEntry => {
      const displayInfo = nodeRegistryService.getNodeDisplayInfo(nodeEntry.type)
      return {
        type: nodeEntry.type,
        label: displayInfo.label,
        icon: displayInfo.icon,
        color: displayInfo.color,
        description: displayInfo.description
      }
    }), []
  )

  const onConnect: OnConnect = (params) => {
    addEdge({
      source: params.source,
      target: params.target,
      sourceHandle: params.sourceHandle || undefined,
      targetHandle: params.targetHandle || undefined
    })
    markAsModified()
  }

  // Handle nodes changes from ReactFlow and sync with Zustand store
  const handleNodesChange = React.useCallback((changes: NodeChange[]) => {
    // Get current nodes and apply changes
    let updatedNodes = [...nodes]

    changes.forEach((change) => {
      switch (change.type) {
        case 'add':
          if (change.item) {
            updatedNodes.push(change.item as ReactFlowQueryNode)
          }
          break
        case 'remove':
          updatedNodes = updatedNodes.filter((node) => node.id !== change.id)
          break
        case 'replace':
          if (change.item) {
            updatedNodes = updatedNodes.map((node) =>
              node.id === change.id ? (change.item as ReactFlowQueryNode) : node
            )
          }
          break
        case 'position':
          updatedNodes = updatedNodes.map((node) =>
            node.id === change.id
              ? { ...node, position: change.position || node.position, dragging: change.dragging }
              : node
          )
          break
        case 'select':
          // Selection is handled separately
          break
        default:
          break
      }
    })

    // Update the store with the new nodes
    setNodes(updatedNodes)
    markAsModified()
  }, [nodes, setNodes, markAsModified])

  // Handle edges changes from ReactFlow and sync with Zustand store
  const handleEdgesChange = React.useCallback((changes: EdgeChange[]) => {
    // Get current edges and apply changes
    let updatedEdges = [...edges]

    changes.forEach((change) => {
      switch (change.type) {
        case 'add':
          if (change.item) {
            updatedEdges.push(change.item as QueryEdge)
          }
          break
        case 'remove':
          updatedEdges = updatedEdges.filter((edge) => edge.id !== change.id)
          break
        case 'replace':
          if (change.item) {
            updatedEdges = updatedEdges.map((edge) =>
              edge.id === change.id ? (change.item as QueryEdge) : edge
            )
          }
          break
        case 'select':
          // Selection is handled separately
          break
        default:
          break
      }
    })

    // Update the store with the new edges
    setEdges(updatedEdges)
    markAsModified()
  }, [edges, setEdges, markAsModified])

  const handleAddNode = (type: string) => {
    const defaultData = getDefaultNodeData(type)
    addNode({
      type,
      position: { x: Math.random() * 400, y: Math.random() * 400 },
      data: defaultData
    })
  }

  const getDefaultNodeData = (type: string): QueryNodeData => {
    const defaults = nodeRegistryService.getDefaultNodeData(type)
    return {
      ...defaults,
      id: `temp-${Date.now()}`, // Will be overridden by store
      type,
      position: { x: 0, y: 0 }, // Will be overridden
      label: nodeRegistryService.getNodeDisplayInfo(type).label
    } as QueryNodeData
  }

  const handleSaveToPersistence = async () => {
    const id = await saveGraph(nodes, edges, graphMetadata)
    if (id) {
      // Also call the original onSave for backward compatibility
      onSave({
        nodes,
        connections: edges
      })
    }
  }

  const handleSave = () => {
    // For now, just use the original save method
    // In the future, this could be enhanced to use persistence
    onSave({
      nodes,
      connections: edges
    })
    onClose()
  }

  const handleCancel = () => {
    // Reset to initial state
    if (initialQueryGraph) {
      const convertedNodes: ReactFlowQueryNode[] = (initialQueryGraph.nodes || []).map(node => ({
        ...node,
        data: node.data as QueryNodeData
      }))
      const convertedEdges: QueryEdge[] = (initialQueryGraph.connections || []).map(edge => ({
        ...edge,
        sourceHandle: edge.sourceHandle || undefined,
        targetHandle: edge.targetHandle || undefined
      }))
      loadQueryGraph(convertedNodes, convertedEdges)
    } else {
      clearQueryGraph()
    }
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl h-[80vh]">
        <DialogHeader>
          <DialogTitle>Query Editor</DialogTitle>
        </DialogHeader>

        <div className="flex h-full">
          {/* Toolbar */}
          <div className="w-64 bg-gray-50 border-r border-gray-200 p-3 overflow-y-auto">
            {/* Graph Metadata */}
            <div className="mb-4">
              <h4 className="text-sm font-semibold mb-2">Graph Metadata</h4>
              <div className="space-y-2">
                <div>
                  <Label htmlFor="graph-name" className="text-xs">Name</Label>
                  <Input
                    id="graph-name"
                    value={graphMetadata.name || ''}
                    onChange={(e) => setGraphMetadata(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Graph name"
                    className="h-7 text-xs"
                  />
                </div>
                <div>
                  <Label htmlFor="graph-description" className="text-xs">Description</Label>
                  <Textarea
                    id="graph-description"
                    value={graphMetadata.description || ''}
                    onChange={(e) => setGraphMetadata(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Graph description"
                    className="h-16 text-xs resize-none"
                  />
                </div>
              </div>
            </div>

            <h4 className="text-sm font-semibold mb-3">Query Nodes</h4>
            <div className="space-y-2">
              {availableQueryNodeTypes.map((nodeType) => (
                <Button
                  key={nodeType.type}
                  variant="outline"
                  size="sm"
                  className="w-full justify-start text-xs"
                  onClick={() => handleAddNode(nodeType.type)}
                >
                  <span className="mr-2">{nodeType.icon}</span>
                  {nodeType.label}
                </Button>
              ))}
            </div>

            <div className="mt-6 space-y-2">
              <Button
                onClick={handleSaveToPersistence}
                className="w-full bg-green-600 hover:bg-green-700"
                size="sm"
                disabled={isSaving}
              >
                {isSaving ? '💾 Saving...' : '💾 Save to Storage'}
              </Button>
              <Button
                onClick={handleSave}
                variant="outline"
                className="w-full"
                size="sm"
              >
                💾 Save Query
              </Button>
              <Button
                onClick={handleCancel}
                variant="outline"
                className="w-full"
                size="sm"
              >
                ❌ Cancel
              </Button>
            </div>
          </div>

          {/* Canvas */}
          <div className="flex-1">
            <ReactFlowWrapper
              nodes={nodes}
              edges={edges}
              onNodesChange={handleNodesChange}
              onEdgesChange={handleEdgesChange}
              onConnect={onConnect}
              nodeTypes={queryNodeTypes}
              fitView
              attributionPosition="top-right"
              enablePerformanceMonitoring={true}
              maxNodesForOptimization={30}
            >
              <Controls />
              <MiniMap />
              <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
            </ReactFlowWrapper>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default QueryEditor