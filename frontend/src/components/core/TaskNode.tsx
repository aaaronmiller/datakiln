import * as React from "react"
import { Handle, Position, NodeProps } from '@xyflow/react'
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card"
import { Button } from "../ui/button"
import FormGenerator from "./FormGenerator"
import nodeRegistryService from "../../services/nodeRegistryService"

// ReactFlow-compatible interface for node data
interface TaskNodeData extends Record<string, unknown> {
  label: string
  parameters: Record<string, any>
  status: 'pending' | 'running' | 'completed' | 'error'
  onParameterChange?: (_paramName: string, _value: any) => void
  onDelete?: () => void
  isSelected?: boolean
  nodeType?: string
}

const TaskNode: React.FC<NodeProps> = ({ data, selected, type }) => {
  const nodeData = data as TaskNodeData

  // Get schema from registry
  const nodeType = nodeData.nodeType || (type as string)?.replace('taskNode', '') || 'unknown'
  const registryEntry = nodeRegistryService.getNodeType(nodeType)
  const schema = registryEntry?.paramsSchema

  // Validation function
  const validateParameters = (parameters: Record<string, any>, schema: any): Record<string, string> => {
    const errors: Record<string, string> = {}

    if (!schema || !schema.properties) return errors

    const requiredFields = schema.required || []

    // Check required fields
    requiredFields.forEach((field: string) => {
      const value = parameters[field]
      if (value === undefined || value === null || value === '') {
        errors[field] = `${field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} is required`
      }
    })

    // Check field constraints
    Object.entries(schema.properties).forEach(([fieldName, fieldSchema]: [string, any]) => {
      const value = parameters[fieldName]

      if (value !== undefined && value !== null && value !== '') {
        // Type validation
        if (fieldSchema.type === 'number' || fieldSchema.type === 'integer') {
          const numValue = Number(value)
          if (isNaN(numValue)) {
            errors[fieldName] = 'Must be a valid number'
          } else {
            if (fieldSchema.minimum !== undefined && numValue < fieldSchema.minimum) {
              errors[fieldName] = `Must be at least ${fieldSchema.minimum}`
            }
            if (fieldSchema.maximum !== undefined && numValue > fieldSchema.maximum) {
              errors[fieldName] = `Must be at most ${fieldSchema.maximum}`
            }
          }
        }

        if (fieldSchema.type === 'string') {
          const strValue = String(value)
          if (fieldSchema.minLength !== undefined && strValue.length < fieldSchema.minLength) {
            errors[fieldName] = `Must be at least ${fieldSchema.minLength} characters`
          }
          if (fieldSchema.maxLength !== undefined && strValue.length > fieldSchema.maxLength) {
            errors[fieldName] = `Must be at most ${fieldSchema.maxLength} characters`
          }
          if (fieldSchema.pattern && !new RegExp(fieldSchema.pattern).test(strValue)) {
            errors[fieldName] = 'Invalid format'
          }
        }

        if (fieldSchema.enum && !fieldSchema.enum.includes(value)) {
          errors[fieldName] = 'Invalid option selected'
        }
      }
    })

    return errors
  }

  const validationErrors = schema ? validateParameters(nodeData.parameters, schema) : {}
  const hasErrors = Object.keys(validationErrors).length > 0

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
            {hasErrors && <span className="text-red-500 text-sm">⚠️</span>}
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
        {schema ? (
          <FormGenerator
            schema={schema as any}
            values={nodeData.parameters}
            onChange={(field, value) => nodeData.onParameterChange?.(field, value)}
            errors={validationErrors}
          />
        ) : (
          // Fallback to simple parameter display if no schema
          Object.entries(nodeData.parameters).map(([paramName, paramValue]) => (
            <div key={paramName}>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                {paramName.charAt(0).toUpperCase() + paramName.slice(1).replace(/([A-Z])/g, ' $1')}
              </label>
              <input
                type="text"
                value={paramValue as string}
                onChange={(e) => nodeData.onParameterChange?.(paramName, e.target.value)}
                placeholder={`Enter ${paramName}`}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-xs ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
          ))
        )}
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