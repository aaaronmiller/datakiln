import React, { memo } from 'react'
import { Handle, Position, NodeProps } from '@xyflow/react'
import { Sparkles } from 'lucide-react'

interface AiDomNodeData { type: string; name: string; provider?: string; actions?: unknown[]; output?: string; status?: string; [k:string]:unknown }
interface AiDomNodeProps extends NodeProps { data: AiDomNodeData }

const AiDomNodeComponent: React.FC<AiDomNodeProps> = ({ data, selected }) => {
  const provider = String(data.provider || 'gemini')
  const grad = provider==='perplexity' ? 'from-amber-500 to-orange-400' : provider==='youtube_transcript' ? 'from-red-500 to-rose-400' : 'from-violet-600 to-fuchsia-500'
  return (
    <div className={['relative w-[220px] rounded-xl overflow-hidden bg-[#111733] border', selected?'border-violet-500/50 shadow-[0_8px_32px_rgba(99,102,241,0.25)]':'border-white/10 shadow-[0_8px_24px_rgba(0,0,0,0.35)]', 'transition-colors duration-[var(--duration-normal)]'].join(' ')}>
      <div className={`h-1 w-full bg-gradient-to-r ${grad}`} />
      <div className="px-3 pt-2.5 pb-3">
        <div className="flex items-center gap-2">
          <span className="w-7 h-7 rounded-lg bg-white/[0.08] border border-white/10 grid place-items-center"><Sparkles size={13} className="text-white/80"/></span>
          <div className="min-w-0">
            <p className="text-xs font-semibold truncate" style={{fontFamily:'Sora, sans-serif'}}>{String(data.name)}</p>
            <p className="text-[10px] tracking-[0.08em] font-medium text-white/40 uppercase truncate">{provider} · AI DOM</p>
          </div>
        </div>
        <div className="mt-2 rounded-lg bg-white/[0.04] border border-white/[0.06] px-2.5 py-2">
          <p className="text-[11px] text-white/60 truncate">{Array.isArray(data.actions) ? `${(data.actions as unknown[]).length} actions` : 'AI automation'}</p>
          {typeof data.output==='string' && <p className="text-[10px] text-white/30">→ {String(data.output)}</p>}
        </div>
      </div>
      <Handle type="target" position={Position.Top} className="!w-2.5 !h-2.5 !bg-white !border-2 !border-violet-500 !-top-1" />
      <Handle type="source" position={Position.Bottom} className="!w-2.5 !h-2.5 !bg-white !border-2 !border-violet-500 !-bottom-1" />
    </div>
  )
}
export default memo(AiDomNodeComponent)
