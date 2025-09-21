import * as React from "react"
import { Handle, Position, NodeProps } from '@xyflow/react'
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card"
import { Button } from "../ui/button"
import { Input } from "../ui/input"

// ReactFlow-compatible interface for node data
interface TaskNodeData extends Record<string, unknown> {
  label: string
  parameters: Record<string, string>
  status: 'pending' | 'running' | 'completed' | 'error'
  onParameterChange?: (_paramName: string, _value: string) => void
  onDelete?: () => void
  isSelected?: boolean
}

const TaskNode: React.FC<NodeProps> = ({ data, selected }) => {
  const nodeData = data as TaskNodeData

  const getNodeIcon = (type: string) => {
    const icons: Record<string, string> = {
      'deep-research': "🔬",
      'youtube-analysis': "📺",
      'web-search': "🔍",
      'data-analysis': "📊",
      'content-generation': "✍️",
      'export': "📤"
    }
    return icons[type] || "⚡"
  }

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

  return (
    <Card className={`w-64 ${selected ? "ring-2 ring-blue-500" : ""}`}>
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 !bg-green-500"
      />

      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-lg">{getNodeIcon(nodeData.label.toLowerCase().replace(' ', '-'))}</span>
            <CardTitle className="text-sm">{nodeData.label}</CardTitle>
          </div>
          <div className="flex items-center space-x-2">
            <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium text-white ${getStatusColor(nodeData.status)}`}>
              {getStatusIcon(nodeData.status)} {nodeData.status}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={nodeData.onDelete}
              className="h-6 w-6 p-0"
            >
              ×
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {Object.entries(nodeData.parameters).map(([paramName, paramValue]) => (
          <div key={paramName}>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              {paramName.charAt(0).toUpperCase() + paramName.slice(1).replace(/([A-Z])/g, ' $1')}
            </label>
            <Input
              value={paramValue}
              onChange={(e) => nodeData.onParameterChange?.(paramName, e.target.value)}
              placeholder={`Enter ${paramName}`}
              className="text-xs"
            />
          </div>
        ))}
      </CardContent>

      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 !bg-blue-500"
      />
    </Card>
  )
}

export default TaskNode