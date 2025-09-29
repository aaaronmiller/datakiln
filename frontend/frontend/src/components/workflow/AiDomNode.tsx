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

interface AiDomNodeProps {
  data: AiDomNodeData
}

const AiDomNode: React.FC<AiDomNodeProps> = ({ data }) => {
  console.log('🎨 RENDERING MODIFIED AI DOM NODE:', data.name)

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

  return (
    <div className={`
      relative rounded-xl border-3 shadow-2xl hover:shadow-3xl transform hover:scale-105
      transition-all duration-300 ease-in-out
      ${style.bg} ${style.border} ${style.text}
      min-w-[220px] max-w-[320px] p-5
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
          ✅ NEW
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
            MODIFIED
          </div>
        </div>
      </div>

      {/* CONNECTION HANDLES - MORE VISIBLE */}
      <Handle
        type="target"
        position={Position.Top}
        className="w-4 h-4 bg-white border-4 border-current hover:scale-125 transition-transform"
        style={{
          borderRadius: '50%',
          transform: 'translateY(-6px)',
          boxShadow: '0 0 10px rgba(255,255,255,0.5)'
        }}
      />

      <Handle
        type="source"
        position={Position.Bottom}
        className="w-4 h-4 bg-white border-4 border-current hover:scale-125 transition-transform"
        style={{
          borderRadius: '50%',
          transform: 'translateY(6px)',
          boxShadow: '0 0 10px rgba(255,255,255,0.5)'
        }}
      />

      {/* DEBUG OVERLAY - CLEARLY SHOWS NEW CODE */}
      <div className="absolute -top-3 -right-3 bg-red-500 text-white text-xs px-2 py-1 rounded-full font-bold shadow-lg animate-pulse">
        💫 NEW
      </div>

      {/* AUDIT WATERMARK */}
      <div className="absolute bottom-2 right-2 text-xs opacity-30 rotate-45">
        MODIFIED 2025
      </div>
    </div>
  )
}

export default AiDomNode