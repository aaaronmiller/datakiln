import React from 'react'
import { Handle, Position } from '@xyflow/react'

interface AiDomNodeData {
  name: string
  provider: 'gemini' | 'perplexity' | 'ytt'
  actions: Array<{
    selector: string
    action: 'type' | 'click' | 'wait' | 'select'
    value?: string
    delayAfter?: number
  }>
  output: 'file' | 'screen' | 'clipboard' | 'next'
}

// Phase 5: Typed Connections - Data Kind Definitions
type DataKind =
  | 'text/plain'
  | 'text/markdown'
  | 'text/semantic'
  | 'html/url'
  | 'uri'
  | 'json'
  | 'file/path'
  | 'dom/clipboard'
  | 'dom/element'
  | 'bytes/blob'
  | 'transcript/vtt'
  | 'artifact/ref'
  | 'boolean'
  | 'user-feedback'
  | 'merge-result';

const DATA_KIND_REGISTRY: Record<DataKind, { color: string; icon: string; label: string }> = {
  'text/plain': { color: '#3B82F6', icon: '📄', label: 'Text' },
  'text/markdown': { color: '#8B5CF6', icon: '📝', label: 'Markdown' },
  'text/semantic': { color: '#A855F7', icon: '🧠', label: 'Semantic' },
  'html/url': { color: '#EF4444', icon: '🔗', label: 'URL' },
  'uri': { color: '#F97316', icon: '🌐', label: 'URI' },
  'json': { color: '#10B981', icon: '📊', label: 'JSON' },
  'file/path': { color: '#F59E0B', icon: '📁', label: 'File Path' },
  'dom/clipboard': { color: '#EC4899', icon: '📋', label: 'Clipboard' },
  'dom/element': { color: '#6366F1', icon: '🎯', label: 'DOM Element' },
  'bytes/blob': { color: '#6B7280', icon: '💾', label: 'Binary' },
  'transcript/vtt': { color: '#14B8A6', icon: '🎬', label: 'Transcript' },
  'artifact/ref': { color: '#84CC16', icon: '📦', label: 'Artifact' },
  'boolean': { color: '#F59E0B', icon: '✅', label: 'Boolean' },
  'user-feedback': { color: '#8B5CF6', icon: '💬', label: 'Feedback' },
  'merge-result': { color: '#06B6D4', icon: '🔀', label: 'Merge Result' }
};

// Node type definitions with port specifications
const NODE_TYPE_DEFINITIONS: Record<string, {
  inputPorts: Array<{ id: string; name: string; dataKind: DataKind }>;
  outputPorts: Array<{ id: string; name: string; dataKind: DataKind }>;
}> = {
  'ai_dom': {
    inputPorts: [
      { id: 'input', name: 'Input', dataKind: 'text/plain' }
    ],
    outputPorts: [
      { id: 'output', name: 'Output', dataKind: 'text/markdown' },
      { id: 'clipboard', name: 'Clipboard', dataKind: 'dom/clipboard' },
      { id: 'artifact', name: 'Artifact', dataKind: 'artifact/ref' }
    ]
  }
};

interface AiDomNodeProps {
  data: AiDomNodeData
}

const AiDomNode: React.FC<AiDomNodeProps> = ({ data }) => {
  console.log('🎨 RENDERING PHASE 5 TYPED AI DOM NODE:', data.name)

  const providerStyles = {
    gemini: {
      bg: 'bg-gradient-to-br from-blue-600 to-purple-700',
      border: 'border-blue-400',
      text: 'text-white',
      emoji: '🧠',
      name: 'Gemini AI'
    },
    perplexity: {
      bg: 'bg-gradient-to-br from-orange-500 to-red-600',
      border: 'border-orange-400',
      text: 'text-white',
      emoji: '🧐',
      name: 'Perplexity'
    },
    ytt: {
      bg: 'bg-gradient-to-br from-red-500 to-pink-600',
      border: 'border-red-400',
      text: 'text-white',
      emoji: '📺',
      name: 'YouTube Transcript'
    }
  }

  const style = providerStyles[data.provider] || providerStyles.gemini
  const actionIcons = {
    type: '⌨️',
    click: '👆',
    wait: '⏳',
    select: '📋'
  }

  const nodeType = NODE_TYPE_DEFINITIONS['ai_dom']

  return (
    <div className={`
      relative rounded-xl border-3 shadow-2xl hover:shadow-3xl transform hover:scale-105
      transition-all duration-300 ease-in-out
      ${style.bg} ${style.border} ${style.text}
      min-w-[280px] max-w-[360px] p-5
      ring-2 ring-white ring-opacity-20 hover:ring-opacity-50
    `}>

      {/* HEADER - MODERN DESIGN */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="bg-white bg-opacity-20 rounded-full p-2">
            <span className="text-2xl">{style.emoji}</span>
          </div>
          <div>
            <div className="font-bold text-lg leading-tight">{data.name}</div>
            <div className="text-sm opacity-90">{style.name}</div>
          </div>
        </div>

        {/* STATUS INDICATOR */}
        <div className="bg-white text-black px-2 py-1 rounded-full text-xs font-bold">
          ✅ PHASE 5
        </div>
      </div>

      {/* ACTIONS DISPLAY */}
      {data.actions && data.actions.length > 0 && (
        <div className="mb-4">
          <div className="text-sm font-semibold mb-2 opacity-90">
            Actions ({data.actions.length}):
          </div>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {data.actions.slice(0, 4).map((action, index) => (
              <div key={index} className="
                bg-white bg-opacity-10 rounded-lg p-3
                border border-white border-opacity-20
                hover:bg-white hover:bg-opacity-20 transition-colors
              ">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">{actionIcons[action.action]}</span>
                    <span className="text-sm font-medium capitalize">{action.action}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-xs opacity-80">
                      {action.delayAfter}ms delay
                    </div>
                  </div>
                </div>

                {action.selector && (
                  <div className="mt-2 text-xs opacity-80 font-mono bg-black bg-opacity-30 p-2 rounded truncate">
                    {action.selector}
                  </div>
                )}

                {action.value && (
                  <div className="mt-1 text-xs italic opacity-90">
                    "{action.value.length > 30 ? action.value.slice(0, 30) + '...' : action.value}"
                  </div>
                )}
              </div>
            ))}

            {data.actions.length > 4 && (
              <div className="text-center text-sm opacity-70">
                + {data.actions.length - 4} more actions...
              </div>
            )}
          </div>
        </div>
      )}

      {/* OUTPUT INFO */}
      <div className="border-t border-white border-opacity-30 pt-3">
        <div className="flex items-center justify-between">
          <div className="text-sm">
            <span className="font-semibold">Output:</span>
            <span className="ml-1 capitalize opacity-90">{data.output}</span>
          </div>

          {/* NODE MODIFICATION TIMESTAMP */}
          <div className="text-xs opacity-70 bg-black bg-opacity-30 px-2 py-1 rounded">
            PHASE 5 TYPED
          </div>
        </div>
      </div>

      {/* PHASE 5: TYPED CONNECTION HANDLES */}
      {/* Input Ports */}
      {nodeType.inputPorts.map((port, index) => {
        const portInfo = DATA_KIND_REGISTRY[port.dataKind];
        return (
          <Handle
            key={`input-${port.id}`}
            id={`input-${port.id}`}
            type="target"
            position={Position.Left}
            style={{
              left: '-8px',
              top: `${50 + (index * 30)}%`,
              backgroundColor: portInfo.color,
              border: `3px solid white`,
              width: '16px',
              height: '16px',
              borderRadius: '50%',
              boxShadow: `0 0 8px ${portInfo.color}80`,
              transform: 'translateY(-50%)'
            }}
            className="hover:scale-125 transition-transform"
          >
            {/* Port Label */}
            <div className="absolute left-full ml-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-80 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
              <span className="mr-1">{portInfo.icon}</span>
              {port.name}
            </div>
          </Handle>
        );
      })}

      {/* Output Ports */}
      {nodeType.outputPorts.map((port, index) => {
        const portInfo = DATA_KIND_REGISTRY[port.dataKind];
        return (
          <Handle
            key={`output-${port.id}`}
            id={`output-${port.id}`}
            type="source"
            position={Position.Right}
            style={{
              right: '-8px',
              top: `${50 + (index * 30)}%`,
              backgroundColor: portInfo.color,
              border: `3px solid white`,
              width: '16px',
              height: '16px',
              borderRadius: '50%',
              boxShadow: `0 0 8px ${portInfo.color}80`,
              transform: 'translateY(-50%)'
            }}
            className="hover:scale-125 transition-transform"
          >
            {/* Port Label */}
            <div className="absolute right-full mr-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-80 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
              {port.name}
              <span className="ml-1">{portInfo.icon}</span>
            </div>
          </Handle>
        );
      })}

      {/* DEBUG OVERLAY - CLEARLY SHOWS NEW CODE */}
      <div className="absolute -top-3 -right-3 bg-red-500 text-white text-xs px-2 py-1 rounded-full font-bold shadow-lg animate-pulse">
        💫 PHASE 5
      </div>

      {/* AUDIT WATERMARK */}
      <div className="absolute bottom-2 right-2 text-xs opacity-30 rotate-45">
        TYPED CONNECTIONS
      </div>
    </div>
  )
}

export default AiDomNode