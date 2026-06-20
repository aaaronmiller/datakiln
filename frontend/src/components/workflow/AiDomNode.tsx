import React, { memo, useMemo } from 'react'
import { Handle, Position, NodeProps } from '@xyflow/react'
import {
  Bot,
  Search,
  Youtube,
  Monitor,
  ChevronRight,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
} from 'lucide-react'

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
  [key: string]: unknown
}

interface AiDomNodeProps extends NodeProps {
  data: AiDomNodeData
}

/* ---- Provider Config ---- */

const PROVIDER_CONFIG = {
  gemini: {
    icon: Bot,
    label: 'Gemini',
    gradient: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
    bgLight: 'rgba(99, 102, 241, 0.1)',
    borderLight: 'rgba(99, 102, 241, 0.2)',
  },
  perplexity: {
    icon: Search,
    label: 'Perplexity',
    gradient: 'linear-gradient(135deg, #ea580c 0%, #f59e0b 100%)',
    bgLight: 'rgba(249, 115, 22, 0.1)',
    borderLight: 'rgba(249, 115, 22, 0.2)',
  },
  youtube_transcript: {
    icon: Youtube,
    label: 'YouTube',
    gradient: 'linear-gradient(135deg, #dc2626 0%, #f43f5e 100%)',
    bgLight: 'rgba(239, 68, 68, 0.1)',
    borderLight: 'rgba(239, 68, 68, 0.2)',
  },
} as const

const STATUS_CONFIG = {
  pending: { icon: Clock, color: '#fbbf24', label: 'Pending' },
  running: { icon: Loader2, color: '#34d399', label: 'Running' },
  completed: { icon: CheckCircle2, color: '#34d399', label: 'Done' },
  error: { icon: XCircle, color: '#f87171', label: 'Error' },
} as const

const AiDomNodeComponent: React.FC<AiDomNodeProps> = ({ data, selected }) => {
  const provider = data.provider || 'gemini'
  const config = PROVIDER_CONFIG[provider]
  const ProviderIcon = config.icon

  const statusConfig = data.status ? STATUS_CONFIG[data.status] : null
  const StatusIcon = statusConfig?.icon

  const actionSummary = useMemo(() => {
    if (!data.actions?.length) return null
    const labels = data.actions.slice(0, 2).map((a) => a.action)
    const suffix = data.actions.length > 2 ? ` +${data.actions.length - 2}` : ''
    return labels.join(' → ') + suffix
  }, [data.actions])

  return (
    <div
      className="group relative w-[220px] rounded-[14px] overflow-hidden shadow-lg transition-all duration-300 hover:-translate-y-[2px] hover:shadow-xl"
      style={{
        background: 'var(--dk-surface)',
        border: `1.5px solid ${selected ? 'rgba(129, 140, 248, 0.5)' : 'var(--dk-surface-border)'}`,
        boxShadow: selected
          ? '0 8px 24px rgba(0,0,0,0.35), 0 0 24px rgba(99, 102, 241, 0.2)'
          : '0 4px 16px rgba(0,0,0,0.25)',
      }}
    >
      {/* Gradient Header Bar */}
      <div
        className="h-[3px] w-full"
        style={{ background: config.gradient }}
      />

      {/* Main Content */}
      <div className="px-4 py-3">
        {/* Header Row */}
        <div className="flex items-start justify-between gap-2 mb-2.5">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            {/* Provider Icon Badge */}
            <div
              className="flex items-center justify-center rounded-lg flex-shrink-0"
              style={{
                width: 32,
                height: 32,
                background: config.bgLight,
                border: `1px solid ${config.borderLight}`,
              }}
            >
              <ProviderIcon className="w-4 h-4" style={{ color: config.gradient.includes('#4f46e5') ? '#818cf8' : config.gradient.includes('#ea580c') ? '#fb923c' : '#f87171' }} />
            </div>

            {/* Title & Subtitle */}
            <div className="min-w-0">
              <div
                className="text-[13px] font-semibold truncate"
                style={{ color: 'var(--dk-text-primary)' }}
              >
                {data.name || 'Unnamed Node'}
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span
                  className="text-[10px] font-medium uppercase tracking-wide px-1.5 py-0.5 rounded-full"
                  style={{
                    background: config.bgLight,
                    color: config.gradient.includes('#4f46e5') ? '#818cf8' : config.gradient.includes('#ea580c') ? '#fb923c' : '#f87171',
                  }}
                >
                  {config.label}
                </span>
                <span style={{ color: 'var(--dk-text-muted)', fontSize: 10 }}>
                  AI DOM
                </span>
              </div>
            </div>
          </div>

          {/* Status Indicator */}
          {statusConfig && (
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {data.status === 'running' ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: statusConfig.color }} />
              ) : StatusIcon ? (
                <StatusIcon className="w-3.5 h-3.5" style={{ color: statusConfig.color }} />
              ) : null}
              {data.status === 'running' && data.progress !== undefined && (
                <span className="text-[10px] font-medium" style={{ color: statusConfig.color }}>
                  {Math.round(data.progress)}%
                </span>
              )}
            </div>
          )}
        </div>

        {/* Actions Summary */}
        {actionSummary && (
          <div
            className="flex items-center gap-1 text-[11px] mb-2 px-2 py-1.5 rounded-md"
            style={{
              background: 'var(--dk-bg-secondary)',
              color: 'var(--dk-text-secondary)',
            }}
          >
            <Monitor className="w-3 h-3 flex-shrink-0 opacity-60" />
            <span className="truncate">{actionSummary}</span>
            <ChevronRight className="w-3 h-3 flex-shrink-0 opacity-40" />
          </div>
        )}

        {/* Output Badge */}
        {data.output && typeof data.output === 'string' && (
          <div className="flex items-center gap-1.5">
            <span
              className="text-[10px] font-medium px-2 py-0.5 rounded-full"
              style={{
                background: 'rgba(52, 211, 153, 0.1)',
                color: '#34d399',
                border: '1px solid rgba(52, 211, 153, 0.2)',
              }}
            >
              Output: {data.output}
            </span>
            {data.actions && data.actions.length > 0 && (
              <span
                className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                style={{
                  background: 'rgba(96, 165, 250, 0.1)',
                  color: '#60a5fa',
                  border: '1px solid rgba(96, 165, 250, 0.2)',
                }}
              >
                {data.actions.length} action{data.actions.length > 1 ? 's' : ''}
              </span>
            )}
          </div>
        )}

        {/* Progress Bar for Running Nodes */}
        {data.status === 'running' && (
          <div className="mt-2.5 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <div
              className="h-full rounded-full transition-all duration-500 ease-out relative"
              style={{
                width: `${data.progress !== undefined ? Math.min(data.progress, 100) : 30}%`,
                background: 'linear-gradient(90deg, #34d399, #10b981)',
              }}
            >
              <div
                className="absolute inset-0"
                style={{
                  background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
                  animation: 'dk-shimmer 1.5s ease-in-out infinite',
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Input Handle — Left */}
      <Handle
        type="target"
        position={Position.Left}
        className="!w-[10px] !h-[10px] !border-[2.5px] !border-[rgba(15,17,23,0.8)]"
        style={{
          background: 'linear-gradient(135deg, #60a5fa, #3b82f6)',
          boxShadow: '0 0 8px rgba(59, 130, 246, 0.4)',
          top: '50%',
          transform: 'translateY(-50%)',
        }}
        aria-label="Input connection"
      />

      {/* Output Handle — Right */}
      <Handle
        type="source"
        position={Position.Right}
        className="!w-[10px] !h-[10px] !border-[2.5px] !border-[rgba(15,17,23,0.8)]"
        style={{
          background: 'linear-gradient(135deg, #34d399, #10b981)',
          boxShadow: '0 0 8px rgba(52, 211, 153, 0.4)',
          top: '50%',
          transform: 'translateY(-50%)',
        }}
        aria-label="Output connection"
      />
    </div>
  )
}

export default memo(AiDomNodeComponent)
