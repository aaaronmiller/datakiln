import React, { memo } from 'react'
import { Handle, Position, NodeProps } from '@xyflow/react'
import { WORKFLOW_NODE_TYPES } from '../../types/workflow-fixed'
import '../../styles/workflow-nodes.css'

interface WorkflowNodeData {
  type: string
  name: string
  label?: string
  action?: string
  selector_key?: string
  template_id?: string
  max_tokens?: number
  provider_type?: string
  research_depth?: string
  transform_type?: string
  output_key?: string
  format?: string
  path_key?: string
  expr?: string
  status?: string
  filter_type?: string
  functions?: unknown[]
  join_type?: string
  union_mode?: string
  model?: string
  attachments?: unknown[]
  [key: string]: unknown
}

interface WorkflowNodeProps extends NodeProps {
  data: WorkflowNodeData
}

const WorkflowNodeComponent: React.FC<WorkflowNodeProps> = ({ data, selected }) => {
  const nodeType = WORKFLOW_NODE_TYPES.find(type => type.type === data.type) || WORKFLOW_NODE_TYPES[0]

  const getInputCount = () => {
    switch (data.type) {
      case 'condition':
        return 1
      case 'join':
      case 'union':
        return 2
      default:
        return nodeType.inputs
    }
  }

  const getOutputCount = () => {
    switch (data.type) {
      case 'condition':
        return 2 // true and false branches
      case 'export':
        return 0
      default:
        return nodeType.outputs
    }
  }

  const renderNodeContent = (): React.ReactNode => {
    switch (data.type) {
      case 'dom_action':
        return (
          <div className="text-xs space-y-1">
            <div className="font-medium">{data.name}</div>
            <div className="text-gray-600">Action: {data.action}</div>
            {data.selector_key && (
              <div className="text-gray-500 truncate">Selector: {data.selector_key}</div>
            )}
          </div>
        )

      case 'prompt':
        return (
          <div className="text-xs space-y-1">
            <div className="font-medium">{data.name}</div>
            {data.template_id && (
              <div className="text-gray-500">Template: {data.template_id}</div>
            )}
            {data.max_tokens && (
              <div className="text-gray-400">Tokens: {data.max_tokens}</div>
            )}
          </div>
        )

      case 'provider':
        return (
          <div className="text-xs space-y-1">
            <div className="font-medium">{data.name}</div>
            <div className="text-gray-600">Provider: {data.provider_type}</div>
            {data.research_depth && (
              <div className="text-gray-500">Depth: {data.research_depth}</div>
            )}
          </div>
        )

      case 'transform':
        return (
          <div className="text-xs space-y-1">
            <div className="font-medium">{data.name}</div>
            <div className="text-gray-600">Type: {data.transform_type}</div>
            {data.output_key && (
              <div className="text-gray-500">Output: {data.output_key}</div>
            )}
          </div>
        )

      case 'export':
        return (
          <div className="text-xs space-y-1">
            <div className="font-medium">{data.name}</div>
            <div className="text-gray-600">Format: {data.format}</div>
            {data.path_key && (
              <div className="text-gray-500 truncate">Path: {data.path_key}</div>
            )}
          </div>
        )

      case 'condition':
        return (
          <div className="text-xs space-y-1">
            <div className="font-medium">{data.name}</div>
            <div className="text-gray-600">Condition</div>
            {data.expr && (
              <div className="text-gray-500 truncate">Expr: {data.expr}</div>
            )}
          </div>
        )

      case 'filter':
        return (
          <div className="text-xs space-y-1">
            <div className="font-medium">{data.name}</div>
            <div className="text-gray-600">Filter</div>
            {data.filter_type ? (
              <div className="text-gray-500">Type: {data.filter_type}</div>
            ) : null}
          </div>
        )

      case 'aggregate':
        return (
          <div className="text-xs space-y-1">
            <div className="font-medium">{data.name}</div>
            <div className="text-gray-600">Aggregate</div>
            {data.functions && data.functions.length > 0 ? (
              <div className="text-gray-500">Functions: {data.functions.map((f: unknown) => typeof f === 'string' ? f : String(f)).join(', ')}</div>
            ) : null}
          </div>
        )

      case 'join':
        return (
          <div className="text-xs space-y-1">
            <div className="font-medium">{data.name}</div>
            <div className="text-gray-600">Join</div>
            {data.join_type ? (
              <div className="text-gray-500">Type: {data.join_type}</div>
            ) : null}
          </div>
        )

      case 'union':
        return (
          <div className="text-xs space-y-1">
            <div className="font-medium">{data.name}</div>
            <div className="text-gray-600">Union</div>
            {data.union_mode ? (
              <div className="text-gray-500">Mode: {data.union_mode}</div>
            ) : null}
          </div>
        )

      case 'consolidate':
        return (
          <div className="text-xs space-y-1">
            <div className="font-medium">{data.name}</div>
            <div className="text-gray-600">Consolidate</div>
            {data.model ? (
              <div className="text-gray-500">Model: {data.model}</div>
            ) : null}
            {data.attachments && data.attachments.length > 0 ? (
              <div className="text-gray-500">{data.attachments.length} attachment{data.attachments.length !== 1 ? 's' : ''}</div>
            ) : null}
          </div>
        )

      default:
        return (
          <div className="text-xs">
            <div className="font-medium">{data.name}</div>
            <div className="text-gray-500">{nodeType.description}</div>
          </div>
        )
    }
  }

  return (
    <div
      className={`
        workflow-node-${data.type} workflow-node-content
        ${selected ? 'selected' : ''}
      `}
      style={{
        minWidth: '180px',
        minHeight: '80px',
        position: 'relative'
      }}
      title={`${data.name} (${nodeType.label}) - ${nodeType.description}`}
    >
      {/* Input Handles */}
      {Array.from({ length: getInputCount() }, (_, i) => (
        <Handle
          key={`input-${i}`}
          type="target"
          position={Position.Left}
          id={`input-${i}`}
          className="w-2 h-2 bg-gray-400 border border-white"
          style={{ top: `${((i + 1) * 100) / (getInputCount() + 1)}%` }}
        />
      ))}

      {/* Node Content */}
      <div className="flex items-center space-x-2">
        <span className="text-sm">{nodeType.icon}</span>
        <div className="flex-1">
          {renderNodeContent()}
        </div>
      </div>

      {/* Output Handles */}
      {Array.from({ length: getOutputCount() }, (_, i) => (
        <Handle
          key={`output-${i}`}
          type="source"
          position={Position.Right}
          id={`output-${i}`}
          className="w-2 h-2 bg-gray-400 border border-white"
          style={{
            top: data.type === 'condition' && i === 0
              ? '25%'  // True branch
              : data.type === 'condition' && i === 1
              ? '75%'  // False branch
              : `${((i + 1) * 100) / (getOutputCount() + 1)}%`
          }}
        />
      ))}

      {/* Status Indicator */}
      {data.status && (
        <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-white">
          <div
            className={`w-full h-full rounded-full ${
              data.status === 'completed' ? 'bg-green-400' :
              data.status === 'error' ? 'bg-red-400' :
              data.status === 'running' ? 'bg-yellow-400' :
              'bg-gray-400'
            }`}
          />
        </div>
      )}
    </div>
  )
}

export default memo(WorkflowNodeComponent)