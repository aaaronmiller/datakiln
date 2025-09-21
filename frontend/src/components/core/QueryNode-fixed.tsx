import * as React from "react"
import { Handle, Position, NodeProps } from '@xyflow/react'
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card"
import { Button } from "../ui/button"

// Base interface for node data (without ReactFlow properties)
interface QueryNodeBaseData extends Record<string, unknown> {
  label: string
  queryGraph?: {
    nodes: unknown[]
    connections: unknown[]
  }
  status: 'pending' | 'running' | 'completed' | 'error'
  onDelete?: () => void
  onOpenEditor?: () => void
  isSelected?: boolean
  // ReactFlow Node compatibility properties
  source?: string
  condition?: string
  transformation?: string
  aggregation?: string
  joinType?: 'inner' | 'left' | 'right' | 'full'
  joinCondition?: string
}

// ReactFlow-compatible interface extending Node
interface QueryNodeData extends Record<string, unknown> {
  // Required ReactFlow Node properties
  id: string
  position: { x: number; y: number }
  data: QueryNodeBaseData
}

const QueryNode: React.FC<NodeProps<QueryNodeData>> = ({ data, selected }) => {
  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: "bg-gray-500",
      running: "bg-blue-500",
      completed: "bg-green-500",
      error: "bg-red-500"
    }
    return colors[status] || "bg-gray-500"
  }

  const getStatusIcon = (status: string) => {
    const icons: Record<string, string> = {
      pending: "⏳",
      running: "⚙️",
      completed: "✅",
      error: "❌"
    }
    return icons[status] || "⏳"
  }

  const getQuerySummary = () => {
    if (!data.queryGraph || data.queryGraph.nodes.length === 0) {
      return "No query defined"
    }
    const nodeCount = data.queryGraph.nodes.length
    const connectionCount = data.queryGraph.connections.length
    return `${nodeCount} nodes, ${connectionCount} connections`
  }

  return (
    <Card className={`w-72 border-purple-300 bg-gradient-to-br from-purple-50 to-blue-50 ${selected ? "ring-2 ring-purple-500" : ""}`}>
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 !bg-purple-500"
      />

      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-lg">🕸️</span>
            <CardTitle className="text-sm text-purple-800">{data.label}</CardTitle>
          </div>
          <div className="flex items-center space-x-2">
            <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium text-white ${getStatusColor(data.status)}`}>
              {getStatusIcon(data.status)} {data.status}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={data.onDelete}
              className="h-6 w-6 p-0 hover:bg-red-100"
            >
              ×
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="text-xs text-gray-600 bg-white p-2 rounded border">
          <strong>Query Summary:</strong><br />
          {getQuerySummary()}
        </div>

        <Button
          onClick={data.onOpenEditor}
          className="w-full bg-purple-600 hover:bg-purple-700 text-white"
          size="sm"
        >
          🖊️ Open Query Editor
        </Button>
      </CardContent>

      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 !bg-purple-500"
      />
    </Card>
  )
}

export default QueryNode