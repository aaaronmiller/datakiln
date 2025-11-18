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
  status?: 'running' | 'completed' | 'error' | 'pending'
  progress?: number
  retryCount?: number
  onRetry?: () => void
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
        <div className="absolute -top-1 -right-1 flex flex-col items-end space-y-1">
          <div className="w-4 h-4 rounded-full border-2 border-white flex items-center justify-center">
            {data.status === 'running' ? (
              <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
            ) : (
              <div
                className={`w-2 h-2 rounded-full ${
                  data.status === 'completed' ? 'bg-green-400' :
                  data.status === 'error' ? 'bg-red-400' :
                  'bg-gray-400'
                }`}
              />
            )}
          </div>

          {/* Progress Bar for Running Nodes */}
          {data.status === 'running' && (
            <div className="w-16 h-1 bg-white bg-opacity-30 rounded-full overflow-hidden">
              <div
                className="h-full bg-yellow-400 rounded-full animate-pulse"
                style={{
                  width: data.progress !== undefined ? `${Math.min(data.progress, 100)}%` : '30%',
                  animation: data.progress !== undefined ? 'none' : 'pulse 1.5s ease-in-out infinite'
                }}
              />
            </div>
          )}

          {/* Progress Percentage */}
          {data.status === 'running' && data.progress !== undefined && data.progress !== null && (
            <div className="text-xs text-white font-medium bg-black bg-opacity-50 px-1 py-0.5 rounded">
              {Math.round(data.progress)}%
            </div>
          )}

          {/* Retry Button for Failed Nodes */}
          {data.status === 'error' && data.onRetry && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                data.onRetry?.()
              }}
              className="text-xs px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded shadow-lg transition-colors flex items-center space-x-1"
              title="Retry failed node"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Retry {data.retryCount ? `(${data.retryCount})` : ''}</span>
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default memo(AiDomNodeComponent)