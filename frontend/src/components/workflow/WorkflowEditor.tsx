import React, { useState, useCallback } from 'react'
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
  useReactFlow,
  MiniMap,
  Controls,
  Panel,
  SelectionMode,
} from '@xyflow/react'
import { useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { WORKFLOW_NODE_TYPES, WorkflowNodeType } from '../../types/workflow-fixed'
import { SIMPLE_DEEP_RESEARCH, DEEPER_RESEARCH } from '../../types/workflow-predefined'
import '@xyflow/react/dist/style.css'

import AiDomNode from './AiDomNode'
import SplitterNode from './SplitterNode'
import NodeConfigDialog from './NodeConfigDialog'
import ExecutionLogViewer from './ExecutionLogViewer'
import { workflowValidationService } from '../../services/workflowValidationService'
import { useNotifications } from '../../stores/uiStore'
import { ReactFlowWrapper } from '../ui/react-flow-wrapper'
import { applyLayoutWithWorker, LayoutAlgorithm, LayoutOptions } from './layoutAlgorithms'

// MVP Node types - Phase 1: Only AiDomNode
const nodeTypes = {
  ai_dom: AiDomNode,
  splitter: SplitterNode as any,
  gemini_deep_research: AiDomNode, // Reuse for now
  consolidate: AiDomNode,
  // Add more as components created
  ...Object.fromEntries(WORKFLOW_NODE_TYPES.map(n => [n.type, AiDomNode])) // Fallback
};

// Node categories for the palette
const NODE_CATEGORIES = {
  provider: {
    label: 'Providers',
    icon: '🤖',
    color: 'bg-purple-500',
    nodes: WORKFLOW_NODE_TYPES.filter(n => n.category === 'process' && (n.type === 'provider' || n.type === 'ai_dom'))
  },
  action: {
    label: 'Actions',
    icon: '🖱️',
    color: 'bg-blue-500',
    nodes: WORKFLOW_NODE_TYPES.filter(n => n.category === 'action')
  },
  transform: {
    label: 'Transform',
    icon: '🔄',
    color: 'bg-orange-500',
    nodes: WORKFLOW_NODE_TYPES.filter(n => n.category === 'process' && ['transform', 'filter', 'aggregate', 'join', 'union', 'consolidate'].includes(n.type))
  },
  control: {
    label: 'Control',
    icon: '❓',
    color: 'bg-yellow-500',
    nodes: WORKFLOW_NODE_TYPES.filter(n => n.category === 'control')
  },
  output: {
    label: 'Output',
    icon: '💾',
    color: 'bg-red-500',
    nodes: WORKFLOW_NODE_TYPES.filter(n => n.category === 'output')
  }
};

// Node templates
const NODE_TEMPLATES = [
  {
    id: 'simple-research',
    name: 'Simple Research',
    description: 'Basic AI provider research workflow',
    nodes: [
      { type: 'provider', position: { x: 100, y: 100 }, data: { name: 'AI Provider', provider_type: 'gemini_deep_research' } },
      { type: 'export', position: { x: 400, y: 100 }, data: { name: 'Export Results', format: 'json' } }
    ],
    edges: [{ source: 'provider-1', target: 'export-1' }]
  },
  {
    id: 'data-processing',
    name: 'Data Processing',
    description: 'Transform and filter data pipeline',
    nodes: [
      { type: 'transform', position: { x: 100, y: 100 }, data: { name: 'Transform Data', transform_type: 'markdown' } },
      { type: 'filter', position: { x: 400, y: 100 }, data: { name: 'Filter Results', filter_type: 'condition' } },
      { type: 'export', position: { x: 700, y: 100 }, data: { name: 'Export Filtered', format: 'json' } }
    ],
    edges: [
      { source: 'transform-1', target: 'filter-1' },
      { source: 'filter-1', target: 'export-1' }
    ]
  }
];


// Generate a performance test workflow with 50+ nodes
const generatePerformanceTestWorkflow = () => {
  const nodeTypes = ['provider', 'dom_action', 'transform', 'export', 'condition']
  const nodes = []
  const edges = []

  // Generate 60 nodes in a grid pattern
  for (let i = 0; i < 60; i++) {
    const nodeType = nodeTypes[i % nodeTypes.length]
    const row = Math.floor(i / 10)
    const col = i % 10

    nodes.push({
      id: `perf-node-${i}`,
      type: nodeType,
      name: `${nodeType} ${i}`,
      position: { x: col * 200 + 50, y: row * 150 + 50 },
      data: {
        type: nodeType,
        name: `${nodeType} ${i}`,
        ...(nodeType === 'provider' && { provider_type: 'gemini_deep_research' }),
        ...(nodeType === 'dom_action' && { action: 'click', selector_key: `selector-${i}` }),
        ...(nodeType === 'transform' && { transform_type: 'markdown' }),
        ...(nodeType === 'export' && { format: 'json' }),
        ...(nodeType === 'condition' && { expr: `value > ${i}` }),
      }
    })
  }

  // Generate some edges to connect nodes
  for (let i = 0; i < 50; i++) {
    const sourceIndex = i
    const targetIndex = (i + 1) % 60
    edges.push({
      id: `perf-edge-${i}`,
      source: `perf-node-${sourceIndex}`,
      target: `perf-node-${targetIndex}`
    })
  }

  return { nodes, edges }
}

interface WorkflowEditorProps {
  initialNodes?: Node[]
  initialEdges?: Edge[]
  onChange?: (nodes: Node[], edges: Edge[]) => void
  readonly?: boolean
}

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

export const defaultAiDomConfig: AiDomNodeData = {
  name: 'AI DOM Action',
  provider: 'gemini',
  actions: [
    { selector: '[contenteditable="true"]', action: 'type', value: 'Research query here', delayAfter: 1000 },
    { selector: 'div.label:has-text("Deep Research")', action: 'click', delayAfter: 2000 },
    { selector: 'mat-icon[fonticon="send"]', action: 'click', delayAfter: 8000 },
    { selector: 'span.mdc-button__label:has-text("Start research")', action: 'click', delayAfter: 120000 },
    { selector: 'span.mat-mdc-list-item-title:has-text("Copy")', action: 'click' }
  ],
  output: 'clipboard'
}

const WorkflowEditorContent: React.FC<WorkflowEditorProps> = ({
  initialNodes = [],
  initialEdges = [],
  onChange,
  readonly = false,
}) => {
  const params = useParams();
  const workflowId = params.id || params.workflow;
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)
  const { add: addNotification } = useNotifications()

  useEffect(() => {
    if (workflowId) {
      let predefined;
      switch (workflowId) {
        case 'simple-deep':
          predefined = SIMPLE_DEEP_RESEARCH;
          break;
        case 'deeper-research':
          predefined = DEEPER_RESEARCH;
          break;
      }
      if (predefined) {
        setNodes(nds => {
          if (nds.length > 0) return nds; // Avoid overwrite if manual editing
          return predefined.nodes.map((node: any) => ({
            id: node.id,
            type: node.type,
            position: node.position,
            data: node.data
          }));
        });
        setEdges(eds => {
          if (eds.length > 0) return eds;
          return predefined.edges.map((edge: any) => ({
            id: edge.id,
            source: edge.source,
            target: edge.target,
            sourceHandle: edge.sourceHandle || null,
            targetHandle: edge.targetHandle || null
          }));
        });
        addNotification({ type: 'success', title: 'Workflow Loaded', message: `${predefined.name} loaded for editing` });
      }
    }
  }, [workflowId, setNodes, setEdges, addNotification]);

  const [selectedNode, setSelectedNode] = useState<string | null>(null)
  const [selectedNodes, setSelectedNodes] = useState<string[]>([])
  const [isExecuting, setIsExecuting] = useState(false)
  const [configDialogOpen, setConfigDialogOpen] = useState(false)
  const [configNode, setConfigNode] = useState<Node | null>(null)
  const [executionLogVisible, setExecutionLogVisible] = useState(false)
  const [currentExecutionId, setCurrentExecutionId] = useState<string | null>(null)
  const [showExecutionOrder, setShowExecutionOrder] = useState(false)
  const [executionOrder, setExecutionOrder] = useState<string[]>([])
  const [searchTerm, setSearchTerm] = useState('')

  // Layout state with persistence
  const [selectedLayoutAlgorithm, setSelectedLayoutAlgorithm] = useState<LayoutAlgorithm>(() => {
    const saved = localStorage.getItem('workflow-layout-algorithm')
    return (saved as LayoutAlgorithm) || 'force-directed'
  })
  const [isLayoutRunning, setIsLayoutRunning] = useState(false)
  const [layoutProgress, setLayoutProgress] = useState(0)

  // Persist layout algorithm selection
  useEffect(() => {
    localStorage.setItem('workflow-layout-algorithm', selectedLayoutAlgorithm)
  }, [selectedLayoutAlgorithm])

  // Node palette sidebar state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [activeCategory, setActiveCategory] = useState<keyof typeof NODE_CATEGORIES>('provider')
  const [activeTab, setActiveTab] = useState<'nodes' | 'templates'>('nodes')
  const [draggedNodeType, setDraggedNodeType] = useState<WorkflowNodeType | null>(null)

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{
    x: number
    y: number
    nodeId: string
    visible: boolean
  } | null>(null)

  // Undo/Redo system
  const [history, setHistory] = useState<Array<{ nodes: Node[]; edges: Edge[] }>>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [clipboard, setClipboard] = useState<Node[]>([])

  // Save current state to history
  const saveToHistory = useCallback((currentNodes: Node[], currentEdges: Edge[]) => {
    const newHistory = history.slice(0, historyIndex + 1)
    newHistory.push({ nodes: JSON.parse(JSON.stringify(currentNodes)), edges: JSON.parse(JSON.stringify(currentEdges)) })

    // Limit history to 50 operations
    if (newHistory.length > 50) {
      newHistory.shift()
    } else {
      setHistoryIndex(newHistory.length - 1)
    }

    setHistory(newHistory)
  }, [history, historyIndex])

  // Undo function
  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const previousState = history[historyIndex - 1]
      setNodes(() => previousState.nodes)
      setEdges(() => previousState.edges)
      setHistoryIndex(historyIndex - 1)
      setSelectedNodes([])
      setSelectedNode(null)
      addNotification({
        type: 'info',
        title: 'Undo',
        message: 'Last action undone'
      })
    }
  }, [history, historyIndex, setNodes, setEdges, addNotification])

  // Redo function
  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const nextState = history[historyIndex + 1]
      setNodes(() => nextState.nodes)
      setEdges(() => nextState.edges)
      setHistoryIndex(historyIndex + 1)
      setSelectedNodes([])
      setSelectedNode(null)
      addNotification({
        type: 'info',
        title: 'Redo',
        message: 'Action redone'
      })
    }
  }, [history, historyIndex, setNodes, setEdges, addNotification])

  // Copy selected nodes
  const copySelectedNodes = useCallback(() => {
    if (selectedNodes.length > 0) {
      const nodesToCopy = nodes.filter(node => selectedNodes.includes(node.id))
      setClipboard(JSON.parse(JSON.stringify(nodesToCopy)))
      addNotification({
        type: 'success',
        title: 'Copied',
        message: `Copied ${selectedNodes.length} node${selectedNodes.length > 1 ? 's' : ''} to clipboard`
      })
    }
  }, [selectedNodes, nodes, addNotification])

  // Paste nodes with offset
  const pasteNodes = useCallback(() => {
    if (clipboard.length > 0) {
      const offset = 50
      const pastedNodes = clipboard.map((node, index) => ({
        ...JSON.parse(JSON.stringify(node)),
        id: `pasted-${Date.now()}-${index}`,
        position: {
          x: node.position.x + offset,
          y: node.position.y + offset
        },
        selected: false
      }))

      const updatedNodes = [...nodes, ...pastedNodes]
      setNodes(updatedNodes)
      onChange?.(updatedNodes, edges)

      // Select pasted nodes
      const pastedIds = pastedNodes.map(node => node.id)
      setSelectedNodes(pastedIds)
      setSelectedNode(null)

      // Update React Flow selection
      setNodes(nds => nds.map(node =>
        pastedIds.includes(node.id) ? { ...node, selected: true } : { ...node, selected: false }
      ))

      addNotification({
        type: 'success',
        title: 'Pasted',
        message: `Pasted ${pastedNodes.length} node${pastedNodes.length > 1 ? 's' : ''}`
      })
    }
  }, [clipboard, nodes, edges, onChange, setNodes, addNotification])

  // Enhanced keyboard shortcuts with accessibility announcements
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (readonly) return

      // Ctrl+A: Select all nodes
      if (event.ctrlKey && event.key === 'a') {
        event.preventDefault()
        const allNodeIds = nodes.map(node => node.id)
        setSelectedNodes(allNodeIds)
        // Update React Flow selection
        setNodes(nds => nds.map(node => ({
          ...node,
          selected: true
        })))

        // Announce to screen readers
        const announcement = `${allNodeIds.length} nodes selected`
        announceToScreenReader(announcement)
        return
      }

      // Delete: Delete selected nodes
      if (event.key === 'Delete' && selectedNodes.length > 0) {
        event.preventDefault()
        saveToHistory(nodes, edges)
        const nodesToDelete = selectedNodes
        setNodes(nds => nds.filter(node => !nodesToDelete.includes(node.id)))
        setSelectedNodes([])
        setSelectedNode(null)
        addNotification({
          type: 'success',
          title: 'Nodes Deleted',
          message: `Deleted ${nodesToDelete.length} node${nodesToDelete.length > 1 ? 's' : ''}`
        })

        // Announce to screen readers
        const announcement = `${nodesToDelete.length} node${nodesToDelete.length > 1 ? 's' : ''} deleted`
        announceToScreenReader(announcement)
        return
      }

      // Ctrl+C: Copy selected nodes
      if (event.ctrlKey && event.key === 'c') {
        event.preventDefault()
        copySelectedNodes()

        // Announce to screen readers
        const announcement = `${selectedNodes.length} node${selectedNodes.length > 1 ? 's' : ''} copied to clipboard`
        announceToScreenReader(announcement)
        return
      }

      // Ctrl+V: Paste nodes
      if (event.ctrlKey && event.key === 'v') {
        event.preventDefault()
        saveToHistory(nodes, edges)
        pasteNodes()

        // Announce to screen readers
        const pastedCount = clipboard.length
        const announcement = `${pastedCount} node${pastedCount > 1 ? 's' : ''} pasted`
        announceToScreenReader(announcement)
        return
      }

      // Ctrl+Z: Undo
      if (event.ctrlKey && event.key === 'z' && !event.shiftKey) {
        event.preventDefault()
        undo()

        // Announce to screen readers
        announceToScreenReader('Action undone')
        return
      }

      // Ctrl+Y or Ctrl+Shift+Z: Redo
      if ((event.ctrlKey && event.key === 'y') || (event.ctrlKey && event.shiftKey && event.key === 'Z')) {
        event.preventDefault()
        redo()

        // Announce to screen readers
        announceToScreenReader('Action redone')
        return
      }

      // Tab navigation for accessibility
      if (event.key === 'Tab') {
        // Enhanced tab navigation will be handled by React Flow's built-in accessibility
        return
      }

      // Arrow keys for node navigation (when no nodes selected)
      if (!event.ctrlKey && !event.altKey && !event.metaKey &&
          ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key) &&
          selectedNodes.length === 0) {
        event.preventDefault()

        // Find the first selectable node
        const firstNode = nodes[0]
        if (firstNode) {
          setSelectedNodes([firstNode.id])
          setSelectedNode(firstNode.id)
          setNodes(nds => nds.map(node => ({
            ...node,
            selected: node.id === firstNode.id
          })))

          announceToScreenReader(`Selected node: ${firstNode.data?.name || firstNode.type}`)
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [readonly, nodes, edges, selectedNodes, setNodes, addNotification, saveToHistory, copySelectedNodes, pasteNodes, undo, redo, clipboard])

  // Screen reader announcement utility
  const announceToScreenReader = (message: string) => {
    const announcement = document.createElement('div')
    announcement.setAttribute('aria-live', 'polite')
    announcement.setAttribute('aria-atomic', 'true')
    announcement.style.position = 'absolute'
    announcement.style.left = '-10000px'
    announcement.style.width = '1px'
    announcement.style.height = '1px'
    announcement.style.overflow = 'hidden'
    announcement.textContent = message

    document.body.appendChild(announcement)

    // Remove after announcement
    setTimeout(() => {
      document.body.removeChild(announcement)
    }, 1000)
  }

  // Initialize history with current state
  useEffect(() => {
    if (nodes.length > 0 && history.length === 0) {
      saveToHistory(nodes, edges)
    }
  }, [nodes, edges, history.length, saveToHistory])

  // Save to history when nodes or edges change significantly
  useEffect(() => {
    if (history.length > 0) {
      const lastState = history[historyIndex]
      if (lastState && (JSON.stringify(lastState.nodes) !== JSON.stringify(nodes) ||
          JSON.stringify(lastState.edges) !== JSON.stringify(edges))) {
        saveToHistory(nodes, edges)
      }
    }
  }, [nodes, edges, history, historyIndex, saveToHistory])

  // Handle connections with validation
  const onConnect: OnConnect = useCallback(
    (params: Connection) => {
      const sourceNode = nodes.find(n => n.id === params.source)
      const targetNode = nodes.find(n => n.id === params.target)

      if (!sourceNode || !targetNode) {
        addNotification({
          type: 'error',
          title: 'Connection Failed',
          message: 'Invalid source or target node'
        })
        return
      }

      // Support multi-output for branching (e.g., condition true/false, split to parallel)
      const sourceHandles = sourceNode.data?.outputs || sourceNode.data?.output_type ? (Array.isArray(sourceNode.data.outputs) ? sourceNode.data.outputs.length : 1) : 1
      if (sourceHandles < 2 && sourceNode.type !== 'condition') {
        // Single output
        if (params.targetHandle) return // Ignore if trying multi
      }

      // For split/parallel: allow multiple from source if type supports (e.g., splitter node future)
      if (sourceNode.type === 'condition') {
        params.targetHandle = params.targetHandle || (params.data?.branch === 'true' ? 'true' : 'false')
      }

      const newEdge = { ...params, id: `${params.source}-${params.target}-${Date.now()}`, type: 'default' } as Edge
      const updatedEdges = addEdge(newEdge, edges)
      setEdges(updatedEdges)
      onChange?.(nodes, updatedEdges)

      addNotification({
        type: 'success',
        title: 'Connection Created',
        message: `Connected ${sourceNode.data?.name} → ${targetNode.data?.name}${params.targetHandle ? ` (branch: ${params.targetHandle})` : ''}`
      })
    },
    [edges, nodes, onChange, setEdges, addNotification]
  )

  // Handle node selection changes
  const handleNodeSelectionChange = useCallback(
    (changes: NodeChange[]) => {
      const newSelectedNodes: string[] = []

      changes.forEach((change) => {
        if (change.type === 'select') {
          // Update single selected node for backward compatibility
          setSelectedNode(change.selected ? change.id : null)

          // Track all selected nodes for multi-selection
          if (change.selected) {
            newSelectedNodes.push(change.id)
          }
        }
      })

      // Update multi-selection state
      setSelectedNodes(prevSelected => {
        const updated = [...prevSelected]
        changes.forEach((change) => {
          if (change.type === 'select') {
            if (change.selected) {
              if (!updated.includes(change.id)) {
                updated.push(change.id)
              }
            } else {
              const index = updated.indexOf(change.id)
              if (index > -1) {
                updated.splice(index, 1)
              }
            }
          }
        })
        return updated
      })

      onNodesChange(changes)
    },
    [onNodesChange]
  )

  // Handle node double click for configuration
  const handleNodeDoubleClick = useCallback(
    (event: React.MouseEvent, node: Node) => {
      console.log('Node double-clicked:', node)
      setConfigNode(node)
      setConfigDialogOpen(true)
    },
    []
  )

  // Handle saving node configuration
  const handleSaveNodeConfig = useCallback(
    (nodeId: string, data: Record<string, unknown>) => {
      setNodes((nds) =>
        nds.map((node) =>
          node.id === nodeId ? { ...node, data: { ...node.data, ...data } } : node
        )
      )
      setConfigDialogOpen(false)
      setConfigNode(null)
    },
    [setNodes]
  )


  // Add new AiDomNode (Phase 1 MVP)
  const addAiDomNode = useCallback(
    (position: { x: number; y: number }) => {
      console.log('Adding AiDomNode at position:', position)

      const newNode: Node = {
        id: `ai_dom-${Date.now()}`,
        type: 'ai_dom',
        position,
        data: {
          ...defaultAiDomConfig,
          name: `AI DOM Action ${nodes.length + 1}`
        },
      }

      const updatedNodes = [...nodes, newNode]
      setNodes(updatedNodes)
      onChange?.(updatedNodes, edges)

      addNotification({
        type: 'success',
        title: 'Node Added',
        message: 'AI DOM node added to workflow'
      })
    },
    [nodes, edges, onChange, setNodes, addNotification]
  )

  // Add node from palette
  const addNodeFromPalette = useCallback(
    (nodeType: WorkflowNodeType, position: { x: number; y: number }) => {
      const newNode: Node = {
        id: `${nodeType.type}-${Date.now()}`,
        type: nodeType.type,
        position,
        data: {
          ...nodeType.defaultData,
          type: nodeType.type,
          name: nodeType.defaultData.name || nodeType.label
        },
      }

      const updatedNodes = [...nodes, newNode]
      setNodes(updatedNodes)
      onChange?.(updatedNodes, edges)

      addNotification({
        type: 'success',
        title: 'Node Added',
        message: `${nodeType.label} node added to workflow`
      })
    },
    [nodes, edges, onChange, setNodes, addNotification]
  )

  // Load template
  const loadTemplate = useCallback(
    (template: typeof NODE_TEMPLATES[0]) => {
      const offset = { x: 50, y: 50 }
      const templateNodes = template.nodes.map((node, index) => ({
        id: `${node.type}-${Date.now()}-${index}`,
        type: node.type,
        position: {
          x: node.position.x + offset.x,
          y: node.position.y + offset.y
        },
        data: {
          ...node.data,
          name: `${node.data.name} (${index + 1})`
        }
      }))

      const templateEdges = template.edges.map((edge, index) => ({
        id: `template-edge-${Date.now()}-${index}`,
        source: templateNodes.find(n => n.type === edge.source.split('-')[0])?.id || edge.source,
        target: templateNodes.find(n => n.type === edge.target.split('-')[0])?.id || edge.target
      }))

      const updatedNodes = [...nodes, ...templateNodes]
      const updatedEdges = [...edges, ...templateEdges]

      setNodes(updatedNodes)
      setEdges(updatedEdges)
      onChange?.(updatedNodes, updatedEdges)

      addNotification({
        type: 'success',
        title: 'Template Loaded',
        message: `${template.name} template added to workflow`
      })
    },
    [nodes, edges, onChange, setNodes, setEdges, addNotification]
  )

  // Drag handlers
  const handleDragStart = useCallback((e: React.DragEvent, nodeType: WorkflowNodeType) => {
    setDraggedNodeType(nodeType)
    e.dataTransfer.setData('application/json', JSON.stringify(nodeType))
    e.dataTransfer.effectAllowed = 'copy'
  }, [])

  const handleDragEnd = useCallback(() => {
    setDraggedNodeType(null)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const rect = e.currentTarget.getBoundingClientRect()
    const position = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    }

    try {
      const nodeType = JSON.parse(e.dataTransfer.getData('application/json')) as WorkflowNodeType
      addNodeFromPalette(nodeType, position)
    } catch (error) {
      console.error('Failed to parse dropped node data:', error)
    }
  }, [addNodeFromPalette])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
  }, [])

  // Enhanced import with drag-and-drop support
  const handleFileDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const files = Array.from(e.dataTransfer.files)
    const jsonFile = files.find(file => file.type === 'application/json' || file.name.endsWith('.json'))

    if (jsonFile) {
      const reader = new FileReader()
      reader.onload = (e) => {
        const content = e.target?.result as string
        try {
          const workflow = JSON.parse(content)
          if (workflow.nodes && Array.isArray(workflow.nodes)) {
            const reactFlowNodes = workflow.nodes.map((node: Record<string, unknown>) => ({
              id: node.id as string,
              type: node.type as string,
              position: (node.position as { x: number; y: number }) || { x: Math.random() * 400, y: Math.random() * 400 },
              data: node.data as Record<string, unknown> || {}
            }))
            setNodes(reactFlowNodes)

            if (workflow.edges && Array.isArray(workflow.edges)) {
              const reactFlowEdges = workflow.edges.map((edge: Record<string, unknown>) => ({
                id: edge.id as string,
                source: edge.source as string,
                target: edge.target as string,
              }))
              setEdges(reactFlowEdges)
            }

            addNotification({
              type: 'success',
              title: 'Import Successful',
              message: `Workflow imported with ${reactFlowNodes.length} nodes`
            })
          }
        } catch (error) {
          addNotification({
            type: 'error',
            title: 'Import Failed',
            message: 'Invalid JSON file format'
          })
        }
      }
      reader.readAsText(jsonFile)
    }
  }, [setNodes, setEdges, addNotification])

  // Context menu handlers
  const handleNodeContextMenu = useCallback((event: React.MouseEvent, node: Node) => {
    event.preventDefault()
    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      nodeId: node.id,
      visible: true
    })
  }, [])

  const closeContextMenu = useCallback(() => {
    setContextMenu(null)
  }, [])

  const duplicateNode = useCallback(() => {
    if (!contextMenu) return
    const nodeToDuplicate = nodes.find(n => n.id === contextMenu.nodeId)
    if (!nodeToDuplicate) return

    const offset = 50
    const duplicatedNode: Node = {
      ...JSON.parse(JSON.stringify(nodeToDuplicate)),
      id: `${nodeToDuplicate.type}-duplicate-${Date.now()}`,
      position: {
        x: nodeToDuplicate.position.x + offset,
        y: nodeToDuplicate.position.y + offset
      },
      selected: false
    }

    const updatedNodes = [...nodes, duplicatedNode]
    setNodes(updatedNodes)
    onChange?.(updatedNodes, edges)

    addNotification({
      type: 'success',
      title: 'Node Duplicated',
      message: `${nodeToDuplicate.data?.name || nodeToDuplicate.type} duplicated`
    })

    closeContextMenu()
  }, [contextMenu, nodes, edges, onChange, setNodes, addNotification, closeContextMenu])

  const deleteNode = useCallback(() => {
    if (!contextMenu) return
    const nodeToDelete = nodes.find(n => n.id === contextMenu.nodeId)
    if (!nodeToDelete) return

    saveToHistory(nodes, edges)
    const updatedNodes = nodes.filter(n => n.id !== contextMenu.nodeId)
    const updatedEdges = edges.filter(e => e.source !== contextMenu.nodeId && e.target !== contextMenu.nodeId)

    setNodes(updatedNodes)
    setEdges(updatedEdges)
    onChange?.(updatedNodes, updatedEdges)

    addNotification({
      type: 'success',
      title: 'Node Deleted',
      message: `${nodeToDelete.data?.name || nodeToDelete.type} deleted`
    })

    closeContextMenu()
  }, [contextMenu, nodes, edges, onChange, setNodes, setEdges, saveToHistory, addNotification, closeContextMenu])

  const convertNode = useCallback(() => {
    if (!contextMenu) return
    const nodeToConvert = nodes.find(n => n.id === contextMenu.nodeId)
    if (!nodeToConvert) return

    // Simple conversion logic - cycle through compatible node types
    const currentType = nodeToConvert.type || ''
    let newType: string = currentType

    if (currentType === 'provider') newType = 'ai_dom'
    else if (currentType === 'ai_dom') newType = 'dom_action'
    else if (currentType === 'dom_action') newType = 'transform'
    else if (currentType === 'transform') newType = 'export'
    else if (currentType === 'export') newType = 'provider'

    if (newType !== currentType) {
      const updatedNodes = nodes.map(n =>
        n.id === contextMenu.nodeId
          ? {
              ...n,
              type: newType,
              data: {
                ...n.data,
                type: newType,
                name: `${newType.replace('_', ' ').toUpperCase()} ${nodes.length + 1}`
              }
            }
          : n
      )

      setNodes(updatedNodes)
      onChange?.(updatedNodes, edges)

      addNotification({
        type: 'success',
        title: 'Node Converted',
        message: `Converted to ${newType.replace('_', ' ')}`
      })
    }

    closeContextMenu()
  }, [contextMenu, nodes, edges, onChange, setNodes, addNotification, closeContextMenu])

  // Calculate execution order based on topological sort
  const calculateExecutionOrder = useCallback(() => {
    // Simple topological sort implementation
    const edgeMap = new Map<string, string[]>()

    // Build adjacency list
    edges.forEach(edge => {
      if (!edgeMap.has(edge.source)) {
        edgeMap.set(edge.source, [])
      }
      edgeMap.get(edge.source)!.push(edge.target)
    })

    // Calculate indegree
    const indegree = new Map<string, number>()
    nodes.forEach(node => indegree.set(node.id, 0))
    edges.forEach(edge => {
      indegree.set(edge.target, (indegree.get(edge.target) || 0) + 1)
    })

    // Kahn's algorithm
    const queue: string[] = []
    const result: string[] = []

    // Start with nodes that have no incoming edges
    indegree.forEach((deg, nodeId) => {
      if (deg === 0) queue.push(nodeId)
    })

    while (queue.length > 0) {
      const nodeId = queue.shift()!
      result.push(nodeId)

      const neighbors = edgeMap.get(nodeId) || []
      neighbors.forEach(neighbor => {
        indegree.set(neighbor, (indegree.get(neighbor) || 0) - 1)
        if (indegree.get(neighbor) === 0) {
          queue.push(neighbor)
        }
      })
    }

    // Add any remaining nodes (in case of cycles or disconnected nodes)
    nodes.forEach(node => {
      if (!result.includes(node.id)) {
        result.push(node.id)
      }
    })

    return result
  }, [nodes, edges])

  // Handle drag sort for execution order
  const handleExecutionDragStart = useCallback((e: React.DragEvent, index: number) => {
    e.dataTransfer.setData('text/plain', index.toString())
  }, [])

  const handleExecutionDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
  }, [])

  const handleExecutionDrop = useCallback((e: React.DragEvent, dropIndex: number) => {
    e.preventDefault()
    const dragIndex = parseInt(e.dataTransfer.getData('text/plain'))
    if (dragIndex === dropIndex) return

    const newOrder = [...executionOrder]
    const [draggedItem] = newOrder.splice(dragIndex, 1)
    newOrder.splice(dropIndex, 0, draggedItem)
    setExecutionOrder(newOrder)
  }, [executionOrder])

  // Convert workflow nodes to backend format
  const convertToWorkflowFormat = useCallback(() => {
    const workflowNodes = nodes.map((node: Node) => ({
      id: node.id,
      type: node.type,
      name: (node.data as AiDomNodeData)?.name || 'Unnamed',
      position: node.position,
      data: node.data,
    }))

    const workflowEdges = edges.map((edge: Edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
    }))

    return {
      nodes: workflowNodes,
      edges: workflowEdges,
    }
  }, [nodes, edges])

  // Save the current workflow
  const saveWorkflow = useCallback(async () => {
    if (nodes.length === 0) {
      addNotification({
        type: 'warning',
        title: 'No Workflow to Save',
        message: 'Please add some nodes to the workflow before saving.'
      })
      return
    }

    try {
      const workflow = convertToWorkflowFormat()
      const workflowData = {
        id: `workflow-${Date.now()}`,
        name: `Workflow ${Date.now()}`,
        description: 'Created in workflow editor',
        nodes: workflow.nodes,
        edges: workflow.edges,
        metadata: {
          createdAt: new Date().toISOString(),
          version: 1
        }
      }

      // Use fetch directly to call the backend
      const response = await fetch('http://localhost:8000/workflows', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(workflowData),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      addNotification({
        type: 'success',
        title: 'Workflow Saved',
        message: `Workflow saved successfully with ID: ${result.id}`
      })
    } catch (error) {
      console.error('Workflow save error:', error)
      addNotification({
        type: 'error',
        title: 'Save Failed',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      })
    }
  }, [nodes, addNotification, convertToWorkflowFormat])

  // Apply automatic layout
  const applyAutomaticLayout = useCallback(async () => {
    if (nodes.length === 0) {
      addNotification({
        type: 'warning',
        title: 'No Nodes to Layout',
        message: 'Please add some nodes to the workflow before applying layout.'
      })
      return
    }

    setIsLayoutRunning(true)
    setLayoutProgress(0)

    try {
      const layoutOptions: LayoutOptions = {
        algorithm: selectedLayoutAlgorithm,
        iterations: selectedLayoutAlgorithm === 'force-directed' ? 100 : undefined,
        repulsionStrength: 1000,
        attractionStrength: 0.1,
        damping: 0.9,
        centerX: 400,
        centerY: 300,
        spacing: 200,
        respectExecutionOrder: selectedLayoutAlgorithm === 'hierarchical'
      }

      const layoutedNodes = await applyLayoutWithWorker(
        JSON.parse(JSON.stringify(nodes)),
        JSON.parse(JSON.stringify(edges)),
        layoutOptions,
        (progress) => setLayoutProgress(progress)
      )

      // Convert back to React Flow Node format
      const reactFlowNodes = layoutedNodes.map(node => ({
        ...node,
        data: node.data as Record<string, unknown>
      }))

      setNodes(reactFlowNodes)
      onChange?.(reactFlowNodes, edges)

      addNotification({
        type: 'success',
        title: 'Layout Applied',
        message: `${selectedLayoutAlgorithm.replace('-', ' ').toUpperCase()} layout applied successfully`
      })
    } catch (error) {
      console.error('Layout error:', error)
      addNotification({
        type: 'error',
        title: 'Layout Failed',
        message: error instanceof Error ? error.message : 'Unknown layout error occurred'
      })
    } finally {
      setIsLayoutRunning(false)
      setLayoutProgress(0)
    }
  }, [nodes, edges, selectedLayoutAlgorithm, onChange, setNodes, addNotification])

  // Execute the current workflow
  const executeWorkflow = useCallback(async () => {
    if (nodes.length === 0) {
      addNotification({
        type: 'warning',
        title: 'No Workflow to Execute',
        message: 'Please add some nodes to the workflow before executing.'
      })
      return
    }

    setIsExecuting(true)
    try {
      const workflow = convertToWorkflowFormat()
      const workflowId = `workflow-${Date.now()}`

      // Mark all nodes as running with initial progress
      setNodes(nds => nds.map(node => ({
        ...node,
        data: { ...node.data, status: 'running' as const, progress: 0 }
      })))

      // Simulate progress updates for demonstration
      const executionOrder = calculateExecutionOrder()
      let completedCount = 0

      for (const nodeId of executionOrder) {
        // Simulate execution time
        await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000))

        // Update progress for current node
        setNodes(nds => nds.map(node => {
          if (node.id === nodeId) {
            return {
              ...node,
              data: { ...node.data, progress: 100, status: 'completed' as const }
            }
          }
          return node
        }))

        completedCount++
        const overallProgress = (completedCount / executionOrder.length) * 100

        // Update remaining nodes with progress
        setNodes(nds => nds.map(node => {
          if (executionOrder.slice(completedCount).includes(node.id) && node.data.status === 'running') {
            return {
              ...node,
              data: { ...node.data, progress: Math.min(overallProgress + Math.random() * 20, 90) }
            }
          }
          return node
        }))
      }

      // Mark all as completed
      setTimeout(() => {
        setNodes(nds => nds.map(node => ({
          ...node,
          data: { ...node.data, status: 'completed' as const, progress: 100 }
        })))
      }, 500)

      addNotification({
        type: 'success',
        title: 'Workflow Execution Completed',
        message: `Successfully executed ${executionOrder.length} nodes`
      })

      // For now, simulate the API call success
      setCurrentExecutionId(workflowId)
      setExecutionLogVisible(true)

    } catch (error) {
      console.error('Workflow execution error:', error)

      // Mark all nodes as error
      setNodes(nds => nds.map(node => ({
        ...node,
        data: { ...node.data, status: 'error' as const }
      })))

      addNotification({
        type: 'error',
        title: 'Execution Failed',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      })
    } finally {
      setIsExecuting(false)
    }
  }, [nodes, addNotification, convertToWorkflowFormat, calculateExecutionOrder])

  return (
    <div className="w-full h-full flex animate-in fade-in duration-500" role="application" aria-label="Workflow Editor Application">
      {/* Node Palette Sidebar */}
      {!readonly && (
        <aside
          className={`${sidebarCollapsed ? 'w-12' : 'w-80'} bg-white border-r border-gray-200 flex flex-col transition-all duration-300 ease-in-out shadow-sm`}
          role="complementary"
          aria-label="Node palette sidebar"
        >
          {/* Sidebar Header */}
          <header className="p-3 border-b border-gray-200 flex items-center justify-between" role="banner">
            {!sidebarCollapsed && (
              <h2 className="text-sm font-semibold text-gray-700" id="node-palette-title">Node Palette</h2>
            )}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-1 hover:bg-gray-100 rounded text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              aria-label={sidebarCollapsed ? 'Expand node palette sidebar' : 'Collapse node palette sidebar'}
              aria-expanded={!sidebarCollapsed}
            >
              {sidebarCollapsed ? '→' : '←'}
            </button>
          </header>

          {!sidebarCollapsed && (
            <>
              {/* Tabs */}
              <div className="flex border-b border-gray-200">
                <button
                  onClick={() => setActiveTab('nodes')}
                  className={`flex-1 px-3 py-2 text-sm font-medium ${
                    activeTab === 'nodes'
                      ? 'text-blue-600 border-b-2 border-blue-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Nodes
                </button>
                <button
                  onClick={() => setActiveTab('templates')}
                  className={`flex-1 px-3 py-2 text-sm font-medium ${
                    activeTab === 'templates'
                      ? 'text-blue-600 border-b-2 border-blue-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Templates
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto">
                {activeTab === 'nodes' ? (
                  <div className="p-3">
                    {/* Category Navigation */}
                    <div className="flex space-x-1 mb-3">
                      {Object.entries(NODE_CATEGORIES).map(([key, category]) => (
                        <button
                          key={key}
                          onClick={() => setActiveCategory(key as keyof typeof NODE_CATEGORIES)}
                          className={`px-2 py-1 text-xs rounded ${
                            activeCategory === key
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          {category.icon} {category.label}
                        </button>
                      ))}
                    </div>

                    {/* Node List */}
                    <div className="space-y-2">
                      {NODE_CATEGORIES[activeCategory]?.nodes.map((nodeType) => (
                        <div
                          key={nodeType.type}
                          draggable
                          onDragStart={(e) => handleDragStart(e, nodeType)}
                          onDragEnd={handleDragEnd}
                          className="p-3 border border-gray-200 rounded-lg cursor-move hover:bg-gray-50 hover:border-blue-300 hover:shadow-md transition-all duration-200 transform hover:scale-105"
                        >
                          <div className="flex items-center space-x-2">
                            <span className="text-lg">{nodeType.icon}</span>
                            <div className="flex-1">
                              <div className="text-sm font-medium text-gray-900">{nodeType.label}</div>
                              <div className="text-xs text-gray-500">{nodeType.description}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="p-3">
                    <div className="space-y-3">
                      {NODE_TEMPLATES.map((template) => (
                        <div
                          key={template.id}
                          className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                          onClick={() => loadTemplate(template)}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-sm font-medium text-gray-900">{template.name}</div>
                              <div className="text-xs text-gray-500">{template.description}</div>
                              <div className="text-xs text-gray-400 mt-1">
                                {template.nodes.length} nodes, {template.edges.length} connections
                              </div>
                            </div>
                            <button className="text-blue-600 hover:text-blue-800 text-sm">
                              Load
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </aside>
      )}

      {/* Main Content */}
      <main className="flex-1 flex flex-col" role="main" aria-label="Workflow canvas area">
        {/* Phase 1 Toolbar - Only AI DOM node */}
        {!readonly && (
          <div className="flex flex-wrap gap-2 p-4 bg-white border-b border-gray-200 animate-in slide-in-from-top duration-300" role="toolbar" aria-label="Workflow editing tools">
            <span className="text-sm font-medium text-gray-700" id="add-node-label">Add Node:</span>
            <button
              onClick={() => {
                console.log('Add AI DOM Node clicked')
                const centerX = 400
                const centerY = 300
                const offset = nodes.length * 50
                addAiDomNode({ x: centerX + offset, y: centerY + offset })
              }}
              className="px-3 py-1 text-sm rounded border bg-blue-500 text-white border-transparent hover:bg-blue-600 hover:shadow-md hover:scale-105 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex items-center space-x-2"
              title="Add AI DOM Action Node (Gemini/Perplexity/YouTube Transcript integration)"
              aria-describedby="add-node-label"
            >
              <span aria-hidden="true">🤖</span>
              <span>AI DOM Action</span>
            </button>

            <div className="ml-4 flex items-center space-x-2" role="search">
              <label htmlFor="node-search" className="text-sm font-medium text-gray-700">Search:</label>
              <input
                id="node-search"
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Filter nodes..."
                className="px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label="Search and filter workflow nodes"
              />
            </div>

            {/* Layout Controls */}
            <div className="ml-4 flex items-center space-x-2" role="group" aria-label="Layout controls">
              <span className="text-sm font-medium text-gray-700" id="layout-label">Layout:</span>
              <select
                value={selectedLayoutAlgorithm}
                onChange={(e) => setSelectedLayoutAlgorithm(e.target.value as LayoutAlgorithm)}
                className="px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isLayoutRunning}
                aria-labelledby="layout-label"
                aria-describedby={isLayoutRunning ? "layout-progress" : undefined}
              >
                <option value="force-directed">Force Directed</option>
                <option value="hierarchical">Hierarchical</option>
                <option value="grid">Grid</option>
              </select>
              <button
                onClick={applyAutomaticLayout}
                disabled={isLayoutRunning || nodes.length === 0}
                className={`px-3 py-1 text-sm rounded border text-white transition-opacity focus:outline-none focus:ring-2 focus:ring-offset-2 flex items-center space-x-2 ${
                  isLayoutRunning || nodes.length === 0
                    ? 'bg-gray-400 cursor-not-allowed focus:ring-gray-400'
                    : 'bg-green-500 hover:opacity-80 focus:ring-green-500'
                }`}
                title="Apply automatic layout to arrange nodes"
                aria-label={isLayoutRunning ? `Layout in progress: ${layoutProgress}% complete` : 'Apply automatic layout to arrange nodes'}
              >
                <span aria-hidden="true">{isLayoutRunning ? '⏳' : '📐'}</span>
                <span>{isLayoutRunning ? 'Layouting...' : 'Auto Layout'}</span>
              </button>
              {isLayoutRunning && (
                <div className="flex items-center space-x-2" id="layout-progress" role="status" aria-live="polite">
                  <div className="w-20 h-2 bg-gray-200 rounded" role="progressbar" aria-valuenow={layoutProgress} aria-valuemin={0} aria-valuemax={100}>
                    <div
                      className="h-full bg-blue-500 rounded transition-all duration-300"
                      style={{ width: `${layoutProgress}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-500">{layoutProgress}%</span>
                </div>
              )}
            </div>
          </div>
        )}

      {/* Canvas */}
      <div className="flex-1 relative w-full" style={{ width: '100%', height: '600px', minHeight: '400px' }} role="region" aria-label="Workflow canvas">
        {(() => {
          console.log('Rendering ReactFlow with nodes:', nodes.length, 'edges:', edges.length)
          return null
        })()}
        <ReactFlowWrapper
          nodes={searchTerm ? nodes.filter(node => {
            const name = String(node.data?.name || '').toLowerCase()
            const type = String(node.type || '').toLowerCase()
            const id = node.id.toLowerCase()
            const term = searchTerm.toLowerCase()
            return name.includes(term) || type.includes(term) || id.includes(term)
          }) : nodes}
          edges={searchTerm ? edges.filter(edge => {
            const filteredNodes = nodes.filter(node => {
              const name = String(node.data?.name || '').toLowerCase()
              const type = String(node.type || '').toLowerCase()
              const id = node.id.toLowerCase()
              const term = searchTerm.toLowerCase()
              return name.includes(term) || type.includes(term) || id.includes(term)
            })
            const nodeIds = filteredNodes.map(node => node.id)
            return nodeIds.includes(edge.source) && nodeIds.includes(edge.target)
          }) : edges}
          onNodesChange={handleNodeSelectionChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeDoubleClick={handleNodeDoubleClick}
          onNodeContextMenu={handleNodeContextMenu}
          onDrop={(e) => {
            // Check if it's a file drop or node drop
            if (e.dataTransfer.files.length > 0) {
              handleFileDrop(e)
            } else {
              handleDrop(e)
            }
          }}
          onDragOver={handleDragOver}
          nodeTypes={nodeTypes}
          fitView
          attributionPosition="bottom-left"
          className="bg-gray-50"
          nodesDraggable={!readonly}
          nodesConnectable={!readonly}
          elementsSelectable={!readonly}
          selectionOnDrag={!readonly}
          selectionMode={SelectionMode.Full}
          multiSelectionKeyCode="Control"
          enablePerformanceMonitoring={false}
          maxNodesForOptimization={1000}
          defaultViewport={{ x: 0, y: 0, zoom: 1 }}
          minZoom={0.1}
          maxZoom={2.0}
          snapToGrid={true}
          snapGrid={[20, 20]}
        >
          {/* Mini Map */}
          <Panel position="bottom-right">
            <MiniMap
              style={{ width: 200, height: 150 }}
              zoomable
              pannable
              className="border border-gray-300 rounded-md"
            />
          </Panel>

          {/* Controls */}
          <Controls className="bg-white border border-gray-300 rounded-md" />
        </ReactFlowWrapper>
      </div>

      </main>

      {/* Execution Order Panel */}
      {showExecutionOrder && (
        <div className="bg-white border-t border-gray-200 px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-700">Execution Order (Drag to Reorder)</h3>
            <button
              onClick={() => setShowExecutionOrder(false)}
              className="text-gray-400 hover:text-gray-600 text-sm"
            >
              ✕
            </button>
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {(executionOrder.length > 0 ? executionOrder : calculateExecutionOrder()).map((nodeId, index) => {
              const node = nodes.find(n => n.id === nodeId)
              return (
                <div
                  key={nodeId}
                  draggable
                  onDragStart={(e) => handleExecutionDragStart(e, index)}
                  onDragOver={handleExecutionDragOver}
                  onDrop={(e) => handleExecutionDrop(e, index)}
                  className="flex items-center space-x-3 p-2 bg-gray-50 rounded border cursor-move hover:bg-gray-100"
                >
                  <span className="text-xs text-gray-500 w-6">{index + 1}.</span>
                  <span className="text-sm font-medium">{String(node?.data?.name || nodeId)}</span>
                  <span className="text-xs text-gray-500">({node?.type})</span>
                  <div className="ml-auto text-xs text-gray-400">⋮⋮</div>
                </div>
              )
            })}
          </div>
          <div className="mt-3 text-xs text-gray-500">
            Drag nodes to reorder execution sequence. This overrides automatic topological sorting.
          </div>
        </div>
      )}

      {/* Status Bar */}
      <div className="bg-white border-t border-gray-200 px-4 py-2 text-sm text-gray-600">
        <div className="flex justify-between items-center">
          <div>
            Nodes: {nodes.length} | Edges: {edges.length}
            {selectedNodes.length > 0 && ` | Selected: ${selectedNodes.length} node${selectedNodes.length > 1 ? 's' : ''}`}
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => {
                setShowExecutionOrder(!showExecutionOrder)
                if (!showExecutionOrder) {
                  setExecutionOrder(calculateExecutionOrder())
                }
              }}
              className="px-3 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600"
            >
              {showExecutionOrder ? 'Hide' : 'Show'} Execution Order
            </button>
            <button
              onClick={saveWorkflow}
              disabled={nodes.length === 0}
              className={`px-3 py-1 text-white rounded text-xs ${
                nodes.length === 0
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-500 hover:bg-blue-600'
              }`}
            >
              Save Workflow
            </button>
            <button
              onClick={executeWorkflow}
              disabled={isExecuting || nodes.length === 0}
              className={`px-3 py-1 text-white rounded text-xs ${
                isExecuting || nodes.length === 0
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-green-500 hover:bg-green-600'
              }`}
            >
              {isExecuting ? 'Executing...' : 'Execute Workflow'}
            </button>
            <button
              onClick={() => {
                // Generate performance test workflow with 50+ nodes
                const performanceTestWorkflow = generatePerformanceTestWorkflow()
                const reactFlowNodes = performanceTestWorkflow.nodes.map(node => ({
                  id: node.id,
                  type: node.type,
                  position: node.position,
                  data: {
                    ...node.data,
                    type: node.type,
                    name: node.name
                  }
                }))

                const reactFlowEdges = performanceTestWorkflow.edges.map(edge => ({
                  id: edge.id,
                  source: edge.source,
                  target: edge.target
                }))

                setNodes(reactFlowNodes)
                setEdges(reactFlowEdges)

                alert(`Performance test workflow loaded with ${reactFlowNodes.length} nodes!`)
              }}
              className="px-3 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600"
            >
              Load Performance Test (50+ nodes)
            </button>
            <button
              onClick={() => {
                // Load a sample workflow for E2E validation
                const sampleWorkflow = {
                  id: 'sample-workflow-' + Date.now(),
                  name: 'Sample E2E Workflow',
                  description: 'A sample workflow for end-to-end validation testing',
                  nodes: [
                    {
                      id: 'sample-provider-1',
                      type: 'provider',
                      name: 'Sample AI Provider',
                      position: { x: 100, y: 100 },
                      data: {
                        type: 'provider',
                        name: 'Sample AI Provider',
                        provider_type: 'gemini_deep_research',
                        mode: 'research',
                        max_tokens: 2000,
                        temperature: 0.7
                      }
                    },
                    {
                      id: 'sample-dom-action-1',
                      type: 'dom_action',
                      name: 'Sample DOM Action',
                      position: { x: 350, y: 100 },
                      data: {
                        type: 'dom_action',
                        name: 'Sample DOM Action',
                        action: 'click',
                        selector_key: 'google_search_button',
                        timeout: 5000
                      }
                    },
                    {
                      id: 'sample-transform-1',
                      type: 'transform',
                      name: 'Sample Transform',
                      position: { x: 600, y: 100 },
                      data: {
                        type: 'transform',
                        name: 'Sample Transform',
                        transform_type: 'markdown',
                        input_key: 'raw_data',
                        output_key: 'formatted_data'
                      }
                    },
                    {
                      id: 'sample-export-1',
                      type: 'export',
                      name: 'Sample Export',
                      position: { x: 850, y: 100 },
                      data: {
                        type: 'export',
                        name: 'Sample Export',
                        format: 'json',
                        path_key: 'sample-output.json',
                        include_metadata: true
                      }
                    }
                  ],
                  edges: [
                    {
                      id: 'sample-edge-1',
                      source: 'sample-provider-1',
                      target: 'sample-dom-action-1'
                    },
                    {
                      id: 'sample-edge-2',
                      source: 'sample-dom-action-1',
                      target: 'sample-transform-1'
                    },
                    {
                      id: 'sample-edge-3',
                      source: 'sample-transform-1',
                      target: 'sample-export-1'
                    }
                  ]
                }

                // Convert to ReactFlow format and load
                const reactFlowNodes = sampleWorkflow.nodes.map(node => ({
                  id: node.id,
                  type: node.type,
                  position: node.position,
                  data: {
                    ...node.data,
                    type: node.type,
                    name: node.name
                  }
                }))

                const reactFlowEdges = sampleWorkflow.edges.map(edge => ({
                  id: edge.id,
                  source: edge.source,
                  target: edge.target
                }))

                setNodes(reactFlowNodes)
                setEdges(reactFlowEdges)

                alert('Sample workflow loaded for E2E validation!')
              }}
              className="px-3 py-1 bg-purple-500 text-white rounded text-xs hover:bg-purple-600"
            >
              Load Sample Workflow
            </button>
            <button
              onClick={() => {
                const workflow = convertToWorkflowFormat()
                const validation = workflowValidationService.validateWorkflow(workflow)

                if (validation.valid) {
                  const exportResult = workflowValidationService.exportWorkflow(workflow)
                  if (exportResult.valid && exportResult.json) {
                    // Copy to clipboard and show success
                    navigator.clipboard.writeText(exportResult.json).then(() => {
                      addNotification({
                        type: 'success',
                        title: 'Export Successful',
                        message: 'Workflow JSON copied to clipboard'
                      })
                    }).catch(() => {
                      console.log('Workflow JSON:', exportResult.json)
                      addNotification({
                        type: 'warning',
                        title: 'Export Successful',
                        message: 'Workflow JSON logged to console (clipboard not available)'
                      })
                    })
                  } else {
                    addNotification({
                      type: 'error',
                      title: 'Export Failed',
                      message: exportResult.errors.join('; ')
                    })
                  }
                } else {
                  addNotification({
                    type: 'error',
                    title: 'Validation Failed',
                    message: validation.errors.join('; ')
                  })
                  // Also show warnings if any
                  if (validation.warnings.length > 0) {
                    addNotification({
                      type: 'warning',
                      title: 'Validation Warnings',
                      message: validation.warnings.join('; ')
                    })
                  }
                }
              }}
              className="px-3 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600"
            >
              Export JSON
            </button>
            <button
              onClick={() => {
                const workflow = convertToWorkflowFormat()
                const roundTripResult = workflowValidationService.validateRoundTrip(workflow)

                if (roundTripResult.valid) {
                  addNotification({
                    type: 'success',
                    title: 'Round-trip Test Passed',
                    message: 'Export → import produces identical workflow'
                  })
                } else {
                  addNotification({
                    type: 'error',
                    title: 'Round-trip Test Failed',
                    message: roundTripResult.errors.join('; ')
                  })
                  // Log differences for debugging
                  if (roundTripResult.original && roundTripResult.imported) {
                    console.log('Original workflow:', roundTripResult.original)
                    console.log('Imported workflow:', roundTripResult.imported)
                  }
                }
              }}
              className="px-3 py-1 bg-purple-500 text-white rounded text-xs hover:bg-purple-600"
            >
              Test Round-trip
            </button>
            <button
              onClick={() => {
                const input = document.createElement('input')
                input.type = 'file'
                input.accept = '.json'
                input.onchange = (e) => {
                  const file = (e.target as HTMLInputElement).files?.[0]
                  if (file) {
                    const reader = new FileReader()
                    reader.onload = (e) => {
                      const content = e.target?.result as string
                      try {
                        const workflow = JSON.parse(content)
                        if (workflow.nodes && Array.isArray(workflow.nodes)) {
                          const reactFlowNodes = workflow.nodes.map((node: Record<string, unknown>) => ({
                            id: node.id as string,
                            type: node.type as string,
                            position: (node.position as { x: number; y: number }) || { x: Math.random() * 400, y: Math.random() * 400 },
                            data: node.data as AiDomNodeData || {}
                          }))
                          setNodes(reactFlowNodes)

                          if (workflow.edges && Array.isArray(workflow.edges)) {
                            const reactFlowEdges = workflow.edges.map((edge: Record<string, unknown>) => ({
                              id: edge.id as string,
                              source: edge.source as string,
                              target: edge.target as string,
                            }))
                            setEdges(reactFlowEdges)
                          }

                          addNotification({
                            type: 'success',
                            title: 'Import Successful',
                            message: 'Workflow imported successfully'
                          })
                        }
                      } catch (error) {
                        addNotification({
                          type: 'error',
                          title: 'Import Failed',
                          message: 'Invalid JSON file format'
                        })
                      }
                    }
                    reader.readAsText(file)
                  }
                }
                input.click()
              }}
              className="px-3 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600"
            >
              Import JSON
            </button>
          </div>
        </div>
      </div>

      {/* Node Configuration Dialog */}
      <NodeConfigDialog
        node={configNode}
        open={configDialogOpen}
        onOpenChange={setConfigDialogOpen}
        onSave={handleSaveNodeConfig}
      />

      {/* Execution Log Viewer */}
      <ExecutionLogViewer
        executionId={currentExecutionId}
        isVisible={executionLogVisible}
        onClose={() => {
          setExecutionLogVisible(false)
          setCurrentExecutionId(null)
        }}
      />

      {/* Context Menu */}
      {contextMenu && contextMenu.visible && (
        <div
          className="fixed z-50 bg-white border border-gray-300 rounded-lg shadow-lg py-1 min-w-[120px]"
          style={{
            left: contextMenu.x,
            top: contextMenu.y
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={duplicateNode}
            className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 flex items-center space-x-2"
          >
            <span>📋</span>
            <span>Duplicate</span>
          </button>
          <button
            onClick={convertNode}
            className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 flex items-center space-x-2"
          >
            <span>🔄</span>
            <span>Convert</span>
          </button>
          <div className="border-t border-gray-200 my-1"></div>
          <button
            onClick={deleteNode}
            className="w-full text-left px-3 py-2 text-sm hover:bg-red-50 text-red-600 flex items-center space-x-2"
          >
            <span>🗑️</span>
            <span>Delete</span>
          </button>
        </div>
      )}

      {/* Click outside to close context menu */}
      {contextMenu && contextMenu.visible && (
        <div
          className="fixed inset-0 z-40"
          onClick={closeContextMenu}
        />
      )}
    </div>
  )
}

const WorkflowEditor: React.FC<WorkflowEditorProps> = (props) => {
  return (
    <ReactFlowProvider>
      <WorkflowEditorContent {...props} />
    </ReactFlowProvider>
  )
}

export default WorkflowEditor