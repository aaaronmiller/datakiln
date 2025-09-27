import React, { memo } from 'react'
import { Handle, Position, NodeProps } from '@xyflow/react'

interface AiDomNodeData {
  type: string
  name: string
  provider?: 'gemini' | 'perplexity' | 'youtube_transcript'
  actions?: Array<{
    selector: string
    action: 'type' | 'click' | 'wait'
    value?: string
    delayAfter?: number
  }>
  output?: 'file' | 'screen' | 'clipboard' | 'next'
  [key: string]: unknown
}

interface AiDomNodeProps extends NodeProps {
  data: AiDomNodeData
}

const AiDomNodeComponent: React.FC<AiDomNodeProps> = ({ data, selected }) => {
  const getProviderColor = (provider?: string) => {
    switch (provider) {
      case 'gemini':
        return 'bg-blue-500 border-blue-600'
      case 'perplexity':
        return 'bg-orange-500 border-orange-600'
      case 'youtube_transcript':
        return 'bg-red-500 border-red-600'
      default:
        return 'bg-gray-500 border-gray-600'
    }
  }

  const getProviderIcon = (provider?: string) => {
    switch (provider) {
      case 'gemini':
        return '🤖'
      case 'perplexity':
        return '🔍'
      case 'youtube_transcript':
        return '📺'
      default:
        return '🖥️'
    }
  }

  return (
    <div
      className={`
        relative rounded-lg border-2 p-3 min-w-[200px] min-h-[120px]
        ${getProviderColor(data.provider)}
        ${selected ? 'ring-2 ring-blue-400 ring-opacity-50' : ''}
        text-white shadow-lg
      `}
      style={{
        background: `linear-gradient(135deg, ${data.provider === 'gemini' ? '#3b82f6' : data.provider === 'perplexity' ? '#f97316' : data.provider === 'youtube_transcript' ? '#ef4444' : '#6b7280'} 0%, rgba(0,0,0,0.1) 100%)`
      }}
    >
      {/* Header */}
      <div className="flex items-center space-x-2 mb-2">
        <span className="text-lg">{getProviderIcon(data.provider)}</span>
        <div className="flex-1">
          <div className="font-semibold text-sm truncate">{data.name}</div>
          <div className="text-xs opacity-80 capitalize">{data.provider || 'AI DOM'}</div>
        </div>
      </div>

      {/* Actions Summary */}
      {data.actions && data.actions.length > 0 && (
        <div className="text-xs space-y-1 mb-2">
          <div className="font-medium">Actions: {data.actions.length}</div>
          {data.actions.slice(0, 2).map((action, index) => (
            <div key={index} className="truncate opacity-90">
              {action.action}: {action.selector}
            </div>
          ))}
          {data.actions.length > 2 && (
            <div className="opacity-75">+{data.actions.length - 2} more</div>
          )}
        </div>
      )}

      {/* Output */}
      {data.output && typeof data.output === 'string' && (
        <div className="text-xs">
          <span className="font-medium">Output:</span> {data.output as string}
        </div>
      )}

      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 bg-white border-2 border-current"
      />

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 bg-white border-2 border-current"
      />

      {/* Status Indicator */}
      {data.status && (
        <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full border-2 border-white flex items-center justify-center">
          <div
            className={`w-2 h-2 rounded-full ${
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

export default memo(AiDomNodeComponent)