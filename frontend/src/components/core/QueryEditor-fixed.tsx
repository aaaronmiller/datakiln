import * as React from "react"
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  NodeTypes,
  OnConnect,
  OnEdgesChange,
  OnNodesChange,
  BackgroundVariant,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { Button } from "../ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog"
import { ErrorBoundary } from "../ui/error-boundary"
import { ReactFlowWrapper } from "../ui/react-flow-wrapper"
import { QueryNode as QueryNodeType, QueryGraph, QUERY_NODE_TYPES } from "../../types/query"

// Query Node Components
const DataSourceNode: React.FC<any> = ({ data }) => (
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

const FilterNode: React.FC<any> = ({ data }) => (
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

const TransformNode: React.FC<any> = ({ data }) => (
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

const AggregateNode: React.FC<any> = ({ data }) => (
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

const JoinNode: React.FC<any> = ({ data }) => (
  <Card className="w-48 border-indigo-300 bg-indigo-50">
    <CardHeader className="pb-2">
      <CardTitle className="text-sm text-indigo-800">🔗 Join</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="text-xs text-gray-600">
        {data.joinCondition || "Define join condition"}
      </div>
    </CardContent>
  </Card>
)

const UnionNode: React.FC<any> = ({ data }) => (
  <Card className="w-48 border-pink-300 bg-pink-50">
    <CardHeader className="pb-2">
      <CardTitle className="text-sm text-pink-800">🔀 Union</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="text-xs text-gray-600">
        Combine data sources
      </div>
    </CardContent>
  </Card>
)

const queryNodeTypes: NodeTypes = {
  dataSource: DataSourceNode,
  filter: FilterNode,
  transform: TransformNode,
  aggregate: AggregateNode,
  join: JoinNode,
  union: UnionNode,
}

interface QueryEditorProps {
  isOpen: boolean
  onClose: () => void
  initialQueryGraph?: QueryGraph
  onSave: (queryGraph: QueryGraph) => void
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
    initialQueryGraph?.edges || []
  )

  const onConnect: OnConnect = (params) => {
    setEdges((eds) => addEdge(params, eds))
  }

  const handleAddNode = (nodeType: QueryNodeType) => {
    const newNode: Node = {
      id: `query-node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: nodeType.type,
      position: {
        x: Math.random() * 300 + 50,
        y: Math.random() * 300 + 50
      },
      data: {
        label: nodeType.label,
        ...nodeType.defaultData
      },
    }
    setNodes((nds) => nds.concat(newNode))
  }

  const handleSave = () => {
    const queryGraph: QueryGraph = {
      nodes,
      edges
    }
    onSave(queryGraph)
    onClose()
  }

  const handleCancel = () => {
    // Reset to initial state
    setNodes(initialQueryGraph?.nodes || [])
    setEdges(initialQueryGraph?.edges || [])
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl h-[80vh]">
        <DialogHeader>
          <DialogTitle>Query Editor</DialogTitle>
        </DialogHeader>

        <ErrorBoundary>
          <div className="flex h-full">
            {/* Toolbar */}
            <div className="w-48 bg-gray-50 border-r border-gray-200 p-3 overflow-y-auto">
              <h4 className="text-sm font-semibold mb-3">Query Nodes</h4>
              <div className="space-y-2">
                {QUERY_NODE_TYPES.map((nodeType) => (
                  <Button
                    key={nodeType.type}
                    variant="outline"
                    size="sm"
                    className="w-full justify-start text-xs"
                    onClick={() => handleAddNode(nodeType)}
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
              <ReactFlowWrapper
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                nodeTypes={queryNodeTypes}
                fitView={true}
                className="bg-gray-50"
              >
                <Controls />
                <MiniMap />
                <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
              </ReactFlowWrapper>
            </div>
          </div>
        </ErrorBoundary>
      </DialogContent>
    </Dialog>
  )
}

export default QueryEditor