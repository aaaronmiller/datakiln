import React, { useState, useCallback, useMemo } from 'react'
import {
  addEdge,
  Connection,
  Edge,
  Node,
  OnConnect,
  NodeChange,
  ReactFlowProvider,
  useNodesState,
  useEdgesState,
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useReactFlow,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import WorkflowNode from './WorkflowNode'
import AiDomNode from './AiDomNode'
import NodeConfigDialog from './NodeConfigDialog'
import ExecutionLogViewer from './ExecutionLogViewer'
import { WORKFLOW_NODE_TYPES } from '../../types/workflow-fixed'
import { useNotifications } from '../../stores/uiStore'
import { nodeRegistryService, CustomNodeInfo } from '../../services/nodeRegistryService'
import {
  Database, Brain, Cpu, GitBranch, Filter, BarChart3, GitMerge, Layers, Sparkles, Workflow,
  Play, Save, Download, Upload, TestTube2, Trash2, Copy, Settings2, Eye, GripVertical,
  Search, Plus, X, ChevronDown, FileOutput, Shuffle, Combine, Clock, Network, Zap,
  CheckCircle2, AlertCircle, Loader2
} from 'lucide-react'

const nodeTypes = {
  dom_action: WorkflowNode,
  prompt: WorkflowNode,
  provider: WorkflowNode,
  transform: WorkflowNode,
  export: WorkflowNode,
  condition: WorkflowNode,
  filter: WorkflowNode,
  aggregate: WorkflowNode,
  join: WorkflowNode,
  union: WorkflowNode,
  ai_dom: AiDomNode,
  consolidate: WorkflowNode,
  dataSource: WorkflowNode,
  custom: WorkflowNode,
}

// Palette taxonomy — exclusive categories
const PALETTE_SECTIONS: { title: string; accent: string; items: typeof WORKFLOW_NODE_TYPES }[] = [
  { title: 'Sources', accent: 'from-sky-500 to-cyan-400', items: WORKFLOW_NODE_TYPES.filter(n => ['dataSource','dom_action'].includes(n.type)) },
  { title: 'Intelligence', accent: 'from-violet-600 to-indigo-500', items: WORKFLOW_NODE_TYPES.filter(n => ['provider','prompt','ai_dom'].includes(n.type)) },
  { title: 'Transforms', accent: 'from-cyan-500 to-teal-400', items: WORKFLOW_NODE_TYPES.filter(n => ['transform','filter','aggregate','consolidate'].includes(n.type)) },
  { title: 'Logic', accent: 'from-amber-500 to-orange-400', items: WORKFLOW_NODE_TYPES.filter(n => ['condition','join','union'].includes(n.type)) },
  { title: 'Outputs', accent: 'from-emerald-500 to-teal-400', items: WORKFLOW_NODE_TYPES.filter(n => n.type==='export') },
]

// Fallback: if section filter empty, show all
const ALL_PALETTE = WORKFLOW_NODE_TYPES

const ICON_BY_TYPE: Record<string, React.ReactNode> = {
  dom_action: <Network size={14} />,
  prompt: <Brain size={14} />,
  provider: <Cpu size={14} />,
  transform: <Shuffle size={14} />,
  export: <FileOutput size={14} />,
  condition: <GitBranch size={14} />,
  filter: <Filter size={14} />,
  aggregate: <BarChart3 size={14} />,
  join: <GitMerge size={14} />,
  union: <Layers size={14} />,
  ai_dom: <Sparkles size={14} />,
  consolidate: <Combine size={14} />,
  delay: <Clock size={14} />,
  wait: <Clock size={14} />,
  dataSource: <Database size={14} />,
}

interface WorkflowEditorProps {
  initialNodes?: Node[]
  initialEdges?: Edge[]
  onChange?: (nodes: Node[], edges: Edge[]) => void
  readonly?: boolean
}

const WorkflowEditorContent: React.FC<WorkflowEditorProps> = ({
  initialNodes = [],
  initialEdges = [],
  onChange,
  readonly = false,
}) => {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)
  const { add: addNotification } = useNotifications()
  const { screenToFlowPosition } = useReactFlow()

  const [selectedNode, setSelectedNode] = useState<string | null>(null)
  const [isExecuting, setIsExecuting] = useState(false)
  const [configDialogOpen, setConfigDialogOpen] = useState(false)
  const [configNode, setConfigNode] = useState<Node | null>(null)
  const [executionLogVisible, setExecutionLogVisible] = useState(false)
  const [currentExecutionId, setCurrentExecutionId] = useState<string | null>(null)
  const [showExecutionOrder, setShowExecutionOrder] = useState(false)
  const [executionOrder, setExecutionOrder] = useState<string[]>([])
  const [customNodes, setCustomNodes] = useState<CustomNodeInfo[]>([])
  const [paletteQuery, setPaletteQuery] = useState('')
  const [workflowName, setWorkflowName] = useState('Untitled Workflow')

  React.useEffect(() => {
    const load = async () => {
      await nodeRegistryService.loadCustomNodes()
      setCustomNodes(nodeRegistryService.getAllCustomNodes())
    }
    load()
  }, [])

  const selectedNodeData = useMemo(() => nodes.find(n => n.id === selectedNode) || null, [nodes, selectedNode])

  const onConnect: OnConnect = useCallback((params: Connection) => {
    const src = nodes.find(n => n.id === params.source)
    const tgt = nodes.find(n => n.id === params.target)
    if (!src || !tgt) {
      addNotification({ type: 'error', title: 'Connection failed', message: 'Invalid endpoints' })
      return
    }
    const newEdge = { ...params, id: `${params.source}-${params.target}-${Date.now()}` } as Edge
    const updated = addEdge({ ...newEdge, animated: true, style: { stroke: '#6366F1', strokeWidth: 2 } }, edges)
    setEdges(updated)
    onChange?.(nodes, updated)
    addNotification({ type: 'success', title: 'Linked', message: `${String(src.data?.name)} → ${String(tgt.data?.name)}` })
  }, [nodes, edges, onChange, setEdges, addNotification])

  const handleNodeSelectionChange = useCallback((changes: NodeChange[]) => {
    changes.forEach(c => { if (c.type === 'select') setSelectedNode(c.selected ? c.id : null) })
    onNodesChange(changes)
  }, [onNodesChange])

  const handleNodeDoubleClick = useCallback((_: React.MouseEvent, node: Node) => {
    setConfigNode(node); setConfigDialogOpen(true)
  }, [])

  const handleSaveNodeConfig = useCallback((nodeId: string, data: Record<string, unknown>) => {
    setNodes(nds => nds.map(n => n.id === nodeId ? { ...n, data: { ...n.data, ...data } } : n))
    setConfigDialogOpen(false); setConfigNode(null)
  }, [setNodes])

  const addNode = useCallback((type: string, position: { x: number; y: number }) => {
    const nt = WORKFLOW_NODE_TYPES.find(nt => nt.type === type)
    if (!nt && !nodeRegistryService.getDefaultNodeData(type)) {
      addNotification({ type: 'error', title: 'Unknown node type', message: type })
      return
    }
    const newNode: Node = {
      id: `${type}-${Date.now()}`,
      type: nt ? type : 'custom',
      position,
      data: {
        label: nt ? nt.label : type,
        name: `${nt ? nt.label : type} ${nodes.length + 1}`,
        type: nt ? nt.type : type,
        ...(nt ? (nt as unknown as { defaultData: Record<string, unknown> }).defaultData : {}),
        ...(nt ? {} : nodeRegistryService.getDefaultNodeData(type) as Record<string,unknown>),
      },
    }
    const updated = [...nodes, newNode]
    setNodes(updated)
    onChange?.(updated, edges)
    setSelectedNode(newNode.id)
  }, [nodes, edges, onChange, setNodes, addNotification])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const type = e.dataTransfer.getData('application/reactflow')
    if (!type || readonly) return
    const position = screenToFlowPosition({ x: e.clientX, y: e.clientY })
    addNode(type, position)
  }, [addNode, readonly, screenToFlowPosition])

  const onDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move' }, [])

  const calculateExecutionOrder = useCallback(() => {
    const adj = new Map<string, string[]>()
    edges.forEach(ed => { if (!adj.has(ed.source)) adj.set(ed.source, []); adj.get(ed.source)!.push(ed.target) })
    const indeg = new Map<string, number>()
    nodes.forEach(n => indeg.set(n.id, 0))
    edges.forEach(ed => indeg.set(ed.target, (indeg.get(ed.target)||0)+1))
    const q: string[] = []
    indeg.forEach((d,id)=>{ if(d===0) q.push(id) })
    const res: string[] = []
    while(q.length){ const id=q.shift()!; res.push(id); (adj.get(id)||[]).forEach(nb=>{ indeg.set(nb,(indeg.get(nb)||0)-1); if(indeg.get(nb)===0) q.push(nb) }) }
    nodes.forEach(n=>{ if(!res.includes(n.id)) res.push(n.id) })
    return res
  }, [nodes, edges])

  const convertToWorkflowFormat = useCallback(() => ({
    nodes: nodes.map((n: Node) => ({ id: n.id, type: String(n.data?.type), name: String(n.data?.name), position: n.position, data: n.data })),
    edges: edges.map((e: Edge) => ({ id: e.id, source: e.source, target: e.target })),
  }), [nodes, edges])

  const saveWorkflow = useCallback(async () => {
    if (!nodes.length) { addNotification({ type: 'warning', title: 'Empty canvas', message: 'Add nodes before saving.' }); return }
    try {
      const wf = convertToWorkflowFormat()
      const payload = { id: `workflow-${Date.now()}`, name: workflowName, description: 'Built in Aurora editor', nodes: wf.nodes, edges: wf.edges, metadata: { createdAt: new Date().toISOString(), version: 1 } }
      const res = await fetch('http://localhost:8000/api/v1/workflows', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      if (!res.ok) throw new Error(await res.text())
      const j = await res.json()
      addNotification({ type: 'success', title: 'Saved', message: `ID ${j.id}` })
    } catch(e){ addNotification({ type:'error', title:'Save failed', message: String(e) }) }
  }, [nodes, convertToWorkflowFormat, addNotification, workflowName])

  const executeWorkflow = useCallback(async () => {
    if (!nodes.length) { addNotification({ type:'warning', title:'Nothing to run', message:'Build a flow first.' }); return }
    setIsExecuting(true)
    try {
      const wf = convertToWorkflowFormat()
      // include name for validation
      const workflowPayload = { id: `run-${Date.now()}`, name: workflowName, nodes: wf.nodes.map(n=>({ ...n, name: String((n as unknown as {name:string}).name || n.id) })), edges: wf.edges.map(e=>({ id: e.id, source: e.source, target: e.target })) }
      const res = await fetch('http://localhost:8000/api/v1/workflows/execute', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ workflow: workflowPayload, validate_workflow: false }) })
      if (!res.ok) throw new Error(await res.text())
      const j = await res.json()
      setCurrentExecutionId(j.execution_id || j.run_id); setExecutionLogVisible(true)
      addNotification({ type:'success', title:'Running', message: `Execution ${j.execution_id||j.run_id}` })
    } catch(e){ addNotification({ type:'error', title:'Run failed', message: String(e) }) } finally { setIsExecuting(false) }
  }, [nodes, convertToWorkflowFormat, addNotification, workflowName])

  const deleteSelected = useCallback(() => {
    if (!selectedNode) return
    setNodes(nds=>nds.filter(n=>n.id!==selectedNode))
    setEdges(eds=>eds.filter(e=>e.source!==selectedNode && e.target!==selectedNode))
    setSelectedNode(null)
  }, [selectedNode, setNodes, setEdges])

  const duplicateSelected = useCallback(() => {
    const n = nodes.find(x=>x.id===selectedNode)
    if(!n) return
    const dup: Node = { ...n, id:`${String(n.data?.type)}-${Date.now()}`, position:{ x: n.position.x+24, y: n.position.y+24 }, data:{ ...n.data, name: `${String(n.data?.name)} copy` } }
    const upd=[...nodes, dup]; setNodes(upd); onChange?.(upd, edges); setSelectedNode(dup.id)
  }, [selectedNode, nodes, edges, onChange, setNodes])

  // Palette filtering
  const filteredSections = useMemo(() => {
    if (!paletteQuery) return PALETTE_SECTIONS
    const q = paletteQuery.toLowerCase()
    return PALETTE_SECTIONS.map(s=>({ ...s, items: s.items.filter(n=> n.label.toLowerCase().includes(q) || n.type.toLowerCase().includes(q) )})).filter(s=>s.items.length>0)
  }, [paletteQuery])

  // Inline inspector field update
  const updateSelectedData = useCallback((patch: Record<string, unknown>) => {
    if(!selectedNode) return
    setNodes(nds=> nds.map(n=> n.id===selectedNode ? { ...n, data:{ ...n.data, ...patch } } : n))
  }, [selectedNode, setNodes])

  return (
    <div className="h-[calc(100vh-56px)] flex flex-col bg-[var(--aurora-bg)] text-[var(--aurora-text)]" style={{ fontFamily: 'Instrument Sans, system-ui, sans-serif' }}>
      {/* Header */}
      <div className="h-[56px] shrink-0 border-b border-white/[0.06] bg-white/[0.02] backdrop-blur-xl flex items-center justify-between px-4 gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-400 via-violet-500 to-indigo-600 grid place-items-center shadow-lg shadow-violet-600/20 shrink-0">
            <Workflow size={16} className="text-white" />
          </div>
          <input
            value={workflowName}
            onChange={e=>setWorkflowName(e.target.value)}
            className="bg-white/[0.06] border border-white/10 rounded-lg px-3 py-1.5 text-sm font-medium min-w-[220px] focus:outline-none focus:border-violet-500/50 focus:bg-white/[0.08] transition-colors"
            placeholder="Workflow name"
          />
          <span className="hidden md:inline-flex items-center gap-2 text-xs px-2.5 py-1 rounded-full bg-white/[0.06] border border-white/10 text-white/60">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow shadow-emerald-400/50" /> {nodes.length} nodes · {edges.length} edges
          </span>
          {selectedNodeData && (
            <span className="hidden lg:inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-full bg-violet-500/15 border border-violet-500/30 text-violet-200">
              <Settings2 size={12} /> {String(selectedNodeData.data?.name).slice(0,24)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={()=>setShowExecutionOrder(s=>!s)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.10] border border-white/10 text-xs font-medium transition-colors cursor-pointer">
            <Eye size={14} /> {showExecutionOrder ? 'Hide order' : 'Show order'}
          </button>
          <button onClick={saveWorkflow} className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-white text-zinc-900 hover:bg-zinc-100 text-xs font-semibold transition-colors cursor-pointer">
            <Save size={14} /> Save
          </button>
          <button onClick={executeWorkflow} disabled={isExecuting} className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-gradient-to-r from-cyan-500 to-violet-600 hover:from-cyan-400 hover:to-violet-500 disabled:opacity-50 text-white text-xs font-semibold shadow-lg shadow-violet-600/25 transition-all cursor-pointer">
            {isExecuting ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />} Run
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Palette */}
        <aside className="w-[300px] shrink-0 border-r border-white/[0.06] bg-[#0B0F1E] flex flex-col overflow-hidden">
          <div className="p-3 border-b border-white/[0.06]">
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/40" />
              <input value={paletteQuery} onChange={e=>setPaletteQuery(e.target.value)} placeholder="Filter nodes…" className="w-full bg-white/[0.06] border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-xs placeholder:text-white/30 focus:outline-none focus:border-violet-500/40" />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-5">
            {filteredSections.length===0 ? (
              <p className="text-xs text-white/40 text-center py-8">No matches</p>
            ) : filteredSections.map(section=> (
              <div key={section.title}>
                <div className="flex items-center gap-2 mb-2">
                  <div className={`h-1 w-6 rounded-full bg-gradient-to-r ${section.accent}`} />
                  <p className="text-[10px] tracking-[0.14em] font-semibold text-white/50 uppercase">{section.title}</p>
                </div>
                <div className="grid grid-cols-1 gap-1.5">
                  {section.items.map(nt=> (
                    <button
                      key={nt.type}
                      draggable
                      onDragStart={e=>{ e.dataTransfer.setData('application/reactflow', nt.type); e.dataTransfer.effectAllowed='move' }}
                      onClick={()=> addNode(nt.type, { x: 240 + (nodes.length%4)*40, y: 160 + Math.floor(nodes.length/4)*80 })}
                      className="group flex items-center gap-2.5 px-2.5 py-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] hover:border-white/10 text-left transition-all cursor-pointer"
                      title={nt.description}
                    >
                      <span className="w-7 h-7 rounded-md bg-white/[0.08] group-hover:bg-white/[0.12] grid place-items-center text-white/80 shrink-0 transition-colors">
                        {ICON_BY_TYPE[nt.type] || <Zap size={14} />}
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-xs font-medium leading-none truncate">{nt.label}</span>
                        <span className="block text-[10px] text-white/40 truncate">{nt.type}</span>
                      </span>
                      <Plus size={12} className="text-white/20 group-hover:text-white/50" />
                    </button>
                  ))}
                </div>
              </div>
            ))}
            {customNodes.length>0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-1 w-6 rounded-full bg-gradient-to-r from-zinc-500 to-zinc-400" />
                  <p className="text-[10px] tracking-[0.14em] font-semibold text-white/50 uppercase">Custom</p>
                </div>
                <div className="grid gap-1.5">
                  {customNodes.map(n=>(
                    <button key={n.definition.type} draggable onDragStart={e=>{ e.dataTransfer.setData('application/reactflow', n.definition.type); e.dataTransfer.effectAllowed='move' }} onClick={()=> addNode(n.definition.type, { x: 240, y: 160 })} className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-left">
                      <span className="w-7 h-7 rounded-md bg-white/10 grid place-items-center"><Combine size={14}/></span>
                      <span className="text-xs font-medium truncate">{n.definition.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="p-3 border-t border-white/[0.06] flex gap-2">
            <button onClick={()=>{
              const dataStr = JSON.stringify(convertToWorkflowFormat(), null, 2)
              const blob = new Blob([dataStr], {type:'application/json'}); const url = URL.createObjectURL(blob)
              const a=document.createElement('a'); a.href=url; a.download=`${workflowName.replace(/\s+/g,'-')}.json`; a.click(); URL.revokeObjectURL(url)
            }} className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.10] border border-white/10 text-[11px] cursor-pointer"><Download size={12}/> Export</button>
            <label className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.10] border border-white/10 text-[11px] cursor-pointer">
              <Upload size={12}/> Import
              <input type="file" accept=".json" className="hidden" onChange={e=>{
                const f=e.target.files?.[0]; if(!f) return
                const r=new FileReader(); r.onload=ev=>{
                  try{
                    const j=JSON.parse(String(ev.target?.result))
                    const wfNodes=(j.nodes||[]).map((n:Record<string,unknown>,i:number)=>({ id:String(n.id||`n-${i}`), type:String((n as {type:string}).type||'custom'), position: (n as {position:{x:number,y:number}}).position||{x:200+i*40,y:200}, data:{ label:String((n as {label:string}).label|| (n as {name:string}).name || n.type), name:String((n as {name:string}).name|| n.type), type:String((n as {type:string}).type||'custom'), ...(n as {data:Record<string,unknown>}).data||{} } }))
                    const wfEdges=(j.edges||[]).map((ed:Record<string,unknown>,i:number)=>({ id:String(ed.id||`e-${i}`), source:String(ed.source), target:String(ed.target), animated:true }))
                    setNodes(wfNodes as Node[]); setEdges(wfEdges as Edge[])
                  }catch(err){ addNotification({ type:'error', title:'Import failed', message:String(err) }) }
                }; r.readAsText(f)
              }} />
            </label>
          </div>
        </aside>

        {/* Canvas */}
        <main className="flex-1 relative flex flex-col overflow-hidden bg-[#070A14]" onDrop={onDrop} onDragOver={onDragOver}>
          <div className="absolute inset-0 aurora-grid opacity-40" />
          <div className="absolute inset-0 aurora-glow" />
          <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(900px 500px at 30% 0%, rgba(99,102,241,0.06), transparent 60%)' }} />
          <div className="flex-1 relative">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={handleNodeSelectionChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onNodeDoubleClick={handleNodeDoubleClick}
              nodeTypes={nodeTypes}
              fitView
              fitViewOptions={{ padding: 0.2 }}
              attributionPosition="bottom-left"
              className="!bg-transparent"
              nodesDraggable={!readonly}
              nodesConnectable={!readonly}
              elementsSelectable={!readonly}
              proOptions={{ hideAttribution: false }}
              defaultEdgeOptions={{ animated: true, style: { stroke: '#6366F1', strokeWidth: 2 } }}
            >
              <Background color="rgba(255,255,255,0.04)" gap={24} size={1} />
              <Controls className="!bg-white/5 !backdrop-blur-xl !border-white/10 !rounded-xl !overflow-hidden" />
              <MiniMap className="!bg-[#0B0F1E] !border-white/10" nodeColor={(n)=> {
                const t=String((n.data as {type?:string})?.type||'')
                if(t.includes('source')||t==='dom_action') return '#0EA5E9'
                if(t==='provider'||t==='prompt') return '#8B5CF6'
                if(t==='export') return '#10B981'
                return '#6366F1'
              }} maskColor="rgba(7,10,20,0.7)" />
            </ReactFlow>
          </div>

          {/* Execution order strip */}
          {showExecutionOrder && (
            <div className="border-t border-white/[0.06] bg-[#0B0F1E]/80 backdrop-blur-xl p-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] tracking-[0.14em] font-semibold text-white/50 uppercase flex items-center gap-2"><GripVertical size={12}/> Execution order — drag to reorder</p>
                <button onClick={()=>setShowExecutionOrder(false)} className="p-1 rounded hover:bg-white/10 text-white/50"><X size={14}/></button>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {(executionOrder.length? executionOrder : calculateExecutionOrder()).map((id, idx)=>{
                  const n=nodes.find(x=>x.id===id); if(!n) return null
                  return (
                    <div key={id} draggable onDragStart={e=>e.dataTransfer.setData('text/plain', String(idx))} onDragOver={e=>e.preventDefault()} onDrop={e=>{
                      e.preventDefault(); const from=Number(e.dataTransfer.getData('text/plain')); if(from===idx) return
                      const arr=[...(executionOrder.length? executionOrder : calculateExecutionOrder())]; const [m]=arr.splice(from,1); arr.splice(idx,0,m); setExecutionOrder(arr)
                    }} className="shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.06] border border-white/10 text-xs cursor-grab active:cursor-grabbing">
                      <span className="w-5 h-5 rounded-full bg-gradient-to-br from-violet-600 to-cyan-500 grid place-items-center text-[10px] font-bold text-white">{idx+1}</span>
                      <span className="max-w-[120px] truncate">{String(n.data?.name)}</span>
                      <span className="text-white/30 text-[10px]">{String(n.data?.type)}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Selected toolbar */}
          {selectedNodeData && !readonly && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-2 py-1.5 rounded-full bg-[#111733]/90 backdrop-blur-xl border border-white/10 shadow-xl">
              <button onClick={duplicateSelected} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/[0.08] hover:bg-white/[0.12] text-xs cursor-pointer"><Copy size={12}/> Duplicate</button>
              <button onClick={deleteSelected} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-500/20 hover:bg-red-500/30 text-red-200 text-xs cursor-pointer"><Trash2 size={12}/> Delete</button>
              <button onClick={()=>{ if(selectedNodeData){ setConfigNode(selectedNodeData as Node); setConfigDialogOpen(true) } }} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-violet-500/20 hover:bg-violet-500/30 text-violet-200 text-xs cursor-pointer"><Settings2 size={12}/> Configure</button>
            </div>
          )}
          {nodes.length===0 && (
            <div className="absolute inset-0 grid place-items-center pointer-events-none">
              <div className="text-center max-w-sm">
                <div className="w-12 h-12 mx-auto rounded-2xl bg-white/[0.06] border border-white/10 grid place-items-center mb-3"><Plus size={20} className="text-white/50" /></div>
                <p className="text-sm font-medium">Canvas is empty</p>
                <p className="text-xs text-white/40 mt-1">Drag a node from the left or click to add. Connect handles to build your flow.</p>
              </div>
            </div>
          )}
        </main>

        {/* Inspector */}
        <aside className="w-[380px] shrink-0 border-l border-white/[0.06] bg-[#0B0F1E] flex flex-col overflow-hidden">
          {!selectedNodeData ? (
            <div className="flex-1 grid place-items-center p-6 text-center">
              <div>
                <div className="w-10 h-10 mx-auto rounded-xl bg-white/[0.06] border border-white/10 grid place-items-center mb-3"><Settings2 size={18} className="text-white/40" /></div>
                <p className="text-sm font-medium">No selection</p>
                <p className="text-xs text-white/40 mt-1">Click a node to edit its variables. Drag to reorder execution. Double-click for full config.</p>
                <div className="mt-4 text-left rounded-xl bg-white/[0.04] border border-white/[0.06] p-3">
                  <p className="text-[10px] tracking-[0.12em] font-semibold text-white/40 uppercase">Tips</p>
                  <ul className="mt-2 space-y-1 text-xs text-white/50 list-disc pl-4">
                    <li>Drag nodes to reposition — edges follow</li>
                    <li>Connect output → input to join flows</li>
                    <li>Use Inspector to set variables without opening dialog</li>
                  </ul>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto">
              <div className="p-4 border-b border-white/[0.06] flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] tracking-[0.14em] font-semibold text-white/40 uppercase">{String(selectedNodeData.data?.type)}</p>
                  <input value={String(selectedNodeData.data?.name||'')} onChange={e=>updateSelectedData({ name: e.target.value })} className="mt-1 w-full bg-white/[0.06] border border-white/10 rounded-lg px-2.5 py-1.5 text-sm font-medium focus:outline-none focus:border-violet-500/40" />
                </div>
                <button onClick={()=>setSelectedNode(null)} className="p-1.5 rounded-lg hover:bg-white/10 text-white/40"><X size={14}/></button>
              </div>
              <div className="p-4 space-y-4">
                {/* Generic fields - surfaced for all nodes */}
                <div className="space-y-3">
                  <label className="block">
                    <span className="text-[11px] font-medium text-white/60">Label</span>
                    <input value={String(selectedNodeData.data?.label||'')} onChange={e=>updateSelectedData({ label: e.target.value })} className="mt-1 w-full bg-white/[0.06] border border-white/10 rounded-lg px-2.5 py-2 text-xs focus:outline-none focus:border-violet-500/40" placeholder="Display label" />
                  </label>
                  {/* Type-specific quick fields */}
                  {String(selectedNodeData.data?.type)==='dataSource' && (
                    <>
                      <label className="block">
                        <span className="text-[11px] font-medium text-white/60">Mock data / value</span>
                        <textarea value={String((selectedNodeData.data as Record<string,unknown>)?.mock_data ?? (selectedNodeData.data as Record<string,unknown>)?.value ?? '')} onChange={e=>updateSelectedData({ mock_data: e.target.value, value: e.target.value })} rows={3} className="mt-1 w-full bg-white/[0.06] border border-white/10 rounded-lg px-2.5 py-2 text-xs font-mono focus:outline-none focus:border-violet-500/40" placeholder="hello from datakiln" />
                      </label>
                      <label className="block">
                        <span className="text-[11px] font-medium text-white/60">Source type</span>
                        <select value={String((selectedNodeData.data as Record<string,unknown>)?.source_type||'mock')} onChange={e=>updateSelectedData({ source_type: e.target.value })} className="mt-1 w-full bg-white/[0.06] border border-white/10 rounded-lg px-2.5 py-2 text-xs">
                          <option value="mock">mock</option><option value="inline">inline</option><option value="api">api</option><option value="youtube">youtube</option>
                        </select>
                      </label>
                    </>
                  )}
                  {String(selectedNodeData.data?.type)==='transform' && (
                    <label className="block">
                      <span className="text-[11px] font-medium text-white/60">Template</span>
                      <textarea value={String((selectedNodeData.data as Record<string,unknown>)?.template || (selectedNodeData.data as Record<string,unknown>)?.replacement || '{content}')} onChange={e=>updateSelectedData({ template: e.target.value, replacement: e.target.value })} rows={3} className="mt-1 w-full bg-white/[0.06] border border-white/10 rounded-lg px-2.5 py-2 text-xs font-mono focus:outline-none focus:border-violet-500/40" />
                    </label>
                  )}
                  {String(selectedNodeData.data?.type)==='export' && (
                    <>
                      <label className="block">
                        <span className="text-[11px] font-medium text-white/60">Filename</span>
                        <input value={String((selectedNodeData.data as Record<string,unknown>)?.filename || (selectedNodeData.data as Record<string,unknown>)?.path_key || 'output')} onChange={e=>updateSelectedData({ filename: e.target.value, path_key: e.target.value })} className="mt-1 w-full bg-white/[0.06] border border-white/10 rounded-lg px-2.5 py-2 text-xs" />
                      </label>
                      <label className="block">
                        <span className="text-[11px] font-medium text-white/60">Format</span>
                        <select value={String((selectedNodeData.data as Record<string,unknown>)?.format||'json')} onChange={e=>updateSelectedData({ format: e.target.value })} className="mt-1 w-full bg-white/[0.06] border border-white/10 rounded-lg px-2.5 py-2 text-xs">
                          <option value="json">json</option><option value="markdown">markdown</option><option value="yaml">yaml</option><option value="csv">csv</option>
                        </select>
                      </label>
                    </>
                  )}
                  {String(selectedNodeData.data?.type)==='condition' && (
                    <label className="block">
                      <span className="text-[11px] font-medium text-white/60">DKEL condition</span>
                      <input value={String((selectedNodeData.data as Record<string,unknown>)?.condition || (selectedNodeData.data as Record<string,unknown>)?.expr || '')} onChange={e=>updateSelectedData({ condition: e.target.value, expr: e.target.value })} className="mt-1 w-full bg-white/[0.06] border border-white/10 rounded-lg px-2.5 py-2 text-xs font-mono" placeholder="input.score > 50" />
                    </label>
                  )}
                  {String(selectedNodeData.data?.type)==='provider' && (
                    <>
                      <label className="block">
                        <span className="text-[11px] font-medium text-white/60">Provider</span>
                        <select value={String((selectedNodeData.data as Record<string,unknown>)?.provider_type||'gemini_deep_research')} onChange={e=>updateSelectedData({ provider_type: e.target.value })} className="mt-1 w-full bg-white/[0.06] border border-white/10 rounded-lg px-2.5 py-2 text-xs">
                          <option value="gemini_deep_research">gemini_deep_research</option><option value="perplexity">perplexity</option><option value="gemini_canvas">gemini_canvas</option>
                        </select>
                      </label>
                      <label className="block">
                        <span className="text-[11px] font-medium text-white/60">Research depth</span>
                        <select value={String((selectedNodeData.data as Record<string,unknown>)?.research_depth||'balanced')} onChange={e=>updateSelectedData({ research_depth: e.target.value })} className="mt-1 w-full bg-white/[0.06] border border-white/10 rounded-lg px-2.5 py-2 text-xs">
                          <option value="fast">fast</option><option value="balanced">balanced</option><option value="comprehensive">comprehensive</option>
                        </select>
                      </label>
                      <label className="block">
                        <span className="text-[11px] font-medium text-white/60">Query</span>
                        <input value={String((selectedNodeData.data as Record<string,unknown>)?.query||'')} onChange={e=>updateSelectedData({ query: e.target.value })} className="mt-1 w-full bg-white/[0.06] border border-white/10 rounded-lg px-2.5 py-2 text-xs" placeholder="Latest developments in renewable energy" />
                      </label>
                    </>
                  )}
                  {(String(selectedNodeData.data?.type)==='delay' || String(selectedNodeData.data?.type)==='wait') && (
                    <label className="block">
                      <span className="text-[11px] font-medium text-white/60">Delay (ms)</span>
                      <input type="number" value={Number((selectedNodeData.data as Record<string,unknown>)?.delay_ms ?? (selectedNodeData.data as Record<string,unknown>)?.wait_ms ?? 1000)} onChange={e=>updateSelectedData({ delay_ms: Number(e.target.value), wait_ms: Number(e.target.value) })} className="mt-1 w-full bg-white/[0.06] border border-white/10 rounded-lg px-2.5 py-2 text-xs" />
                    </label>
                  )}
                  {/* Generic config dump for other types */}
                  {!['dataSource','transform','export','condition','delay','wait'].includes(String(selectedNodeData.data?.type)) && (
                    <div className="rounded-lg bg-white/[0.04] border border-white/[0.06] p-3">
                      <p className="text-[11px] font-medium text-white/60 mb-2">Advanced</p>
                      <button onClick={()=>{ if(selectedNodeData){ setConfigNode(selectedNodeData as Node); setConfigDialogOpen(true) } }} className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-medium">Open full config</button>
                      <pre className="mt-2 text-[10px] leading-relaxed text-white/40 overflow-auto max-h-32 whitespace-pre-wrap">{JSON.stringify(selectedNodeData.data, null, 2)}</pre>
                    </div>
                  )}
                </div>

                <div className="pt-2 flex gap-2">
                  <button onClick={()=>{ if(selectedNodeData){ setConfigNode(selectedNodeData as Node); setConfigDialogOpen(true) } }} className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-white/[0.08] hover:bg-white/[0.12] border border-white/10 text-xs">Full config</button>
                  <button onClick={deleteSelected} className="px-3 py-2 rounded-lg bg-red-500/15 hover:bg-red-500/25 border border-red-500/20 text-red-200 text-xs"><Trash2 size={12}/></button>
                </div>

                {/* Connections */}
                <div className="rounded-xl bg-white/[0.04] border border-white/[0.06] p-3">
                  <p className="text-[10px] tracking-[0.12em] font-semibold text-white/40 uppercase flex items-center gap-1.5"><Network size={12}/> Connections</p>
                  <div className="mt-2 space-y-1.5 text-xs">
                    {edges.filter(e=>e.source===selectedNode || e.target===selectedNode).length===0 ? (
                      <p className="text-white/30">No edges. Drag from the handle to connect.</p>
                    ) : edges.filter(e=>e.source===selectedNode || e.target===selectedNode).map(e=>{
                      const otherId = e.source===selectedNode ? e.target : e.source
                      const other = nodes.find(n=>n.id===otherId)
                      const dir = e.source===selectedNode ? '→' : '←'
                      return (
                        <div key={e.id} className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06]">
                          <span className="truncate">{dir} {String(other?.data?.name||otherId)}</span>
                          <button onClick={()=> setEdges(eds=>eds.filter(x=>x.id!==e.id))} className="p-1 rounded hover:bg-white/10 text-white/40"><X size={12}/></button>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}
        </aside>
      </div>

      {/* Dialogs */}
      <NodeConfigDialog open={configDialogOpen} onOpenChange={setConfigDialogOpen} node={configNode} onSave={handleSaveNodeConfig} />
      {executionLogVisible && currentExecutionId && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 backdrop-blur-sm p-6" onClick={()=>setExecutionLogVisible(false)}>
          <div className="w-full max-w-2xl" onClick={e=>e.stopPropagation()}>
            <ExecutionLogViewer executionId={currentExecutionId} isVisible={executionLogVisible} onClose={()=>setExecutionLogVisible(false)} />
          </div>
        </div>
      )}
    </div>
  )
}

const WorkflowEditor: React.FC<WorkflowEditorProps> = (props) => (
  <ReactFlowProvider>
    <WorkflowEditorContent {...props} />
  </ReactFlowProvider>
)

export default WorkflowEditor
