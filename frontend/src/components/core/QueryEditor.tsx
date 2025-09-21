import * as React from "react"
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Node,
  Edge,
  NodeTypes,
  OnConnect,
  BackgroundVariant,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { Button } from "../ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog"

// Query Node Data Interfaces
interface DataSourceNodeData {
  source?: string
  label: string
}

interface FilterNodeData {
  condition?: string
  label: string
}

interface TransformNodeData {
  transformation?: string
  label: string
}

interface AggregateNodeData {
  aggregation?: string
  label: string
}

type QueryNodeData = DataSourceNodeData | FilterNodeData | TransformNodeData | AggregateNodeData

// Query Node Types
const DataSourceNode: React.FC<{ data: DataSourceNodeData }> = ({ data }) => (
  <Card className="w-48 border-green-300 bg-green-50">
    <CardHeader className="pb-2">
      <CardTitle className="text-sm text-green-800">📊 Data Source</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="text-xs text-gray-600">
        {data.source || "Select data source"}
      </div>
    </CardContent>
  </Card>
)

const FilterNode: React.FC<{ data: FilterNodeData }> = ({ data }) => (
  <Card className="w-48 border-blue-300 bg-blue-50">
    <CardHeader className="pb-2">
      <CardTitle className="text-sm text-blue-800">🔍 Filter</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="text-xs text-gray-600">
        {data.condition || "Define filter condition"}
      </div>
    </CardContent>
  </Card>
)

const TransformNode: React.FC<{ data: TransformNodeData }> = ({ data }) => (
  <Card className="w-48 border-orange-300 bg-orange-50">
    <CardHeader className="pb-2">
      <CardTitle className="text-sm text-orange-800">⚡ Transform</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="text-xs text-gray-600">
        {data.transformation || "Define transformation"}
      </div>
    </CardContent>
  </Card>
)

const AggregateNode: React.FC<{ data: AggregateNodeData }> = ({ data }) => (
  <Card className="w-48 border-purple-300 bg-purple-50">
    <CardHeader className="pb-2">
      <CardTitle className="text-sm text-purple-800">📈 Aggregate</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="text-xs text-gray-600">
        {data.aggregation || "Define aggregation"}
      </div>
    </CardContent>
  </Card>
)

const queryNodeTypes: NodeTypes = {
  dataSource: DataSourceNode,
  filter: FilterNode,
  transform: TransformNode,
  aggregate: AggregateNode,
}

interface QueryEditorProps {
  isOpen: boolean
  onClose: () => void
  initialQueryGraph?: {
    nodes: Node[]
    connections: Edge[]
  }
  onSave: (queryGraph: { nodes: Node[], connections: Edge[] }) => void
}

const QueryEditor: React.FC<QueryEditorProps> = ({
  isOpen,
  onClose,
  initialQueryGraph,
  onSave
}) => {
  const [nodes, setNodes, onNodesChange] = useNodesState(
    initialQueryGraph?.nodes || []
  )
  const [edges, setEdges, onEdgesChange] = useEdgesState(
    initialQueryGraph?.connections || []
  )

  const availableQueryNodeTypes = [
    { type: "dataSource", label: "Data Source", icon: "📊", color: "bg-green-500" },
    { type: "filter", label: "Filter", icon: "🔍", color: "bg-blue-500" },
    { type: "transform", label: "Transform", icon: "⚡", color: "bg-orange-500" },
    { type: "aggregate", label: "Aggregate", icon: "📈", color: "bg-purple-500" }
  ]

  const onConnect: OnConnect = (params) => {
    setEdges((eds) => addEdge(params, eds))
  }

  const handleAddNode = (type: string) => {
    const newNode: Node = {
      id: `query-node-${Date.now()}`,
      type,
      position: { x: Math.random() * 400, y: Math.random() * 400 },
      data: getDefaultNodeData(type) as unknown as Record<string, unknown>,
    }
    setNodes((nds) => nds.concat(newNode))
  }

  const getDefaultNodeData = (type: string): QueryNodeData => {
    const defaults: Record<string, QueryNodeData> = {
      dataSource: { source: "Select data source", label: "Data Source" },
      filter: { condition: "Define filter condition", label: "Filter" },
      transform: { transformation: "Define transformation", label: "Transform" },
      aggregate: { aggregation: "Define aggregation", label: "Aggregate" }
    }
    return defaults[type] || { label: "Unknown" }
  }

  const handleSave = () => {
    onSave({
      nodes,
      connections: edges
    })
    onClose()
  }

  const handleCancel = () => {
    // Reset to initial state
    setNodes(initialQueryGraph?.nodes || [])
    setEdges(initialQueryGraph?.connections || [])
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
          <div className="w-48 bg-gray-50 border-r border-gray-200 p-3 overflow-y-auto">
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
                onClick={handleSave}
                className="w-full bg-green-600 hover:bg-green-700"
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
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              nodeTypes={queryNodeTypes}
              fitView
              attributionPosition="top-right"
            >
              <Controls />
              <MiniMap />
              <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
            </ReactFlow>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default QueryEditor