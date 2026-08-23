import React, { memo } from 'react'
import { Handle, Position, NodeProps } from '@xyflow/react'
import {
  Network, Brain, Cpu, Shuffle, FileOutput, GitBranch, Filter, BarChart3, GitMerge, Layers, Sparkles, Combine, Clock, Database
} from 'lucide-react'

interface WorkflowNodeData {
  type: string
  name: string
  label?: string
  action?: string; selector_key?: string; template_id?: string; max_tokens?: number
  provider_type?: string; research_depth?: string; transform_type?: string; output_key?: string
  format?: string; path_key?: string; expr?: string; status?: string; filter_type?: string
  functions?: unknown[]; join_type?: string; union_mode?: string; model?: string
  [key: string]: unknown
}
interface WorkflowNodeProps extends NodeProps { data: WorkflowNodeData }

const META: Record<string, { label: string; icon: React.ReactNode; grad: string; accent: string }> = {
  dom_action: { label: 'DOM Action', icon: <Network size={13} />, grad: 'from-sky-500 to-cyan-400', accent: '#0EA5E9' },
  prompt: { label: 'AI Prompt', icon: <Brain size={13} />, grad: 'from-violet-600 to-indigo-500', accent: '#8B5CF6' },
  provider: { label: 'AI Provider', icon: <Cpu size={13} />, grad: 'from-violet-600 to-fuchsia-500', accent: '#8B5CF6' },
  transform: { label: 'Transform', icon: <Shuffle size={13} />, grad: 'from-cyan-500 to-teal-400', accent: '#06B6D4' },
  export: { label: 'Export', icon: <FileOutput size={13} />, grad: 'from-emerald-500 to-teal-400', accent: '#10B981' },
  condition: { label: 'Condition', icon: <GitBranch size={13} />, grad: 'from-amber-500 to-orange-400', accent: '#F59E0B' },
  filter: { label: 'Filter', icon: <Filter size={13} />, grad: 'from-amber-500 to-yellow-400', accent: '#F59E0B' },
  aggregate: { label: 'Aggregate', icon: <BarChart3 size={13} />, grad: 'from-fuchsia-500 to-pink-400', accent: '#C084FC' },
  join: { label: 'Join', icon: <GitMerge size={13} />, grad: 'from-blue-500 to-indigo-500', accent: '#6366F1' },
  union: { label: 'Union', icon: <Layers size={13} />, grad: 'from-indigo-500 to-violet-500', accent: '#6366F1' },
  ai_dom: { label: 'AI DOM Automation', icon: <Sparkles size={13} />, grad: 'from-pink-500 to-violet-500', accent: '#EC4899' },
  consolidate: { label: 'Consolidate', icon: <Combine size={13} />, grad: 'from-teal-500 to-emerald-400', accent: '#14B8A6' },
  delay: { label: 'Delay', icon: <Clock size={13} />, grad: 'from-zinc-600 to-zinc-500', accent: '#71717A' },
  wait: { label: 'Wait', icon: <Clock size={13} />, grad: 'from-zinc-600 to-zinc-500', accent: '#71717A' },
}

const WorkflowNodeComponent: React.FC<WorkflowNodeProps> = ({ data, selected }) => {
  const meta = META[data.type] || { label: data.type, icon: <Database size={13} />, grad: 'from-zinc-600 to-zinc-700', accent: '#71717A' }
  const subtitle = (() => {
    switch (data.type) {
      case 'dom_action': return data.action ? String(data.action) : String(data.selector_key || 'click / fill')
      case 'provider': return String(data.provider_type || data.model || 'gemini')
      case 'transform': return String(data.transform_type || 'markdown')
      case 'export': return `${String(data.format || 'json')} · ${String(data.path_key || data.filename || 'output')}`
      case 'condition': return String(data.expr || data.condition || 'condition')
      case 'filter': return String(data.filter_type || 'filter')
      case 'aggregate': return Array.isArray(data.functions) && data.functions.length ? (data.functions as string[]).join(', ') : 'aggregate'
      case 'join': return String(data.join_type || 'inner join')
      case 'union': return String(data.union_mode || 'union')
      default: return String(data.label || data.type)
    }
  })()

  return (
    <div
      className={[
        'group relative w-[220px] rounded-xl overflow-hidden',
        'bg-[#111733] border',
        selected ? 'border-violet-500/50 shadow-[0_8px_32px_rgba(99,102,241,0.25)]' : 'border-white/10 shadow-[0_8px_24px_rgba(0,0,0,0.35)]',
        'transition-colors duration-[var(--duration-normal)] ease-[var(--ease-enter)]',
        'hover:border-white/15 hover:shadow-[0_12px_32px_rgba(0,0,0,0.45)]',
      ].join(' ')}
    >
      <div className={`h-1 w-full bg-gradient-to-r ${meta.grad}`} style={{ opacity: selected ? 1 : 0.9 }} />
      <div className="px-3 pt-2.5 pb-2 flex items-start gap-2.5">
        <div className="w-7 h-7 rounded-lg bg-white/[0.08] border border-white/10 grid place-items-center shrink-0 text-white/80">
          {meta.icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="text-xs font-semibold leading-none truncate" style={{ fontFamily: 'Sora, sans-serif' }}>{String(data.name)}</p>
            {data.status && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow shadow-emerald-400/50 shrink-0" />}
          </div>
          <p className="text-[10px] tracking-[0.08em] font-medium text-white/40 uppercase truncate">{meta.label}</p>
        </div>
      </div>
      <div className="px-3 pb-3">
        <div className="rounded-lg bg-white/[0.04] border border-white/[0.06] px-2.5 py-2">
          <p className="text-[11px] leading-relaxed text-white/60 truncate font-mono">{subtitle}</p>
          {data.type === 'export' && String(data.path_key || '').length > 0 && (
            <p className="text-[10px] text-white/30 truncate mt-1">{String(data.path_key)}</p>
          )}
        </div>
      </div>
      <Handle type="target" position={Position.Top} className="!w-2.5 !h-2.5 !bg-white !border-2 !border-violet-500 !-top-1" style={{ borderColor: meta.accent }} />
      <Handle type="source" position={Position.Bottom} className="!w-2.5 !h-2.5 !bg-white !border-2 !border-violet-500 !-bottom-1" style={{ borderColor: meta.accent }} />
      {selected && <div className="absolute inset-0 pointer-events-none rounded-xl ring-1 ring-violet-500/30" />}
    </div>
  )
}

export default memo(WorkflowNodeComponent)
