import * as React from "react"
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  NodeTypes,
  OnConnect,
  OnEdgesChange,
  OnNodesChange,
  BackgroundVariant,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { Button } from "../ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card"
import TaskNode from "./TaskNode"
import QueryNode from "./QueryNode"
import QueryEditor from "./QueryEditor"
import { useWorkflowStore, WorkflowNode, WorkflowEdge } from "../../stores/workflowStore"

const nodeTypes: NodeTypes = {
  taskNode: TaskNode,
  queryNode: QueryNode,
}

const WorkflowBuilder: React.FC = () => {
  const {
    nodes: storeNodes,
    edges: storeEdges,
    addNode,
    updateNode,
    deleteNode,
    addEdge: storeAddEdge,
    deleteEdge,
    setSelectedNode,
    saveWorkflow,
    loadWorkflow,
    executeWorkflow,
    selectedNodeId,
  } = useWorkflowStore()

  const [nodes, setNodes, onNodesChange] = useNodesState(
    storeNodes.map((node) => ({
      id: node.id,
      type: node.type === 'query-builder' ? 'queryNode' : 'taskNode',
      position: node.position,
      data: {
        ...node.data,
        onParameterChange: (paramName: string, value: any) => {
          updateNode(node.id, {
            data: {
              ...node.data,
              parameters: {
                ...node.data.parameters,
                [paramName]: value,
              },
            },
          })
        },
        onDelete: () => deleteNode(node.id),
        onOpenEditor: node.type === 'query-builder' ? () => handleOpenQueryEditor(node.id) : undefined,
        isSelected: selectedNodeId === node.id,
      },
    }))
  )

  const [edges, setEdges, onEdgesChange] = useEdgesState(storeEdges)

  // Query Editor state
  const [queryEditorOpen, setQueryEditorOpen] = React.useState(false)
  const [currentQueryNodeId, setCurrentQueryNodeId] = React.useState<string | null>(null)
  const [currentQueryGraph, setCurrentQueryGraph] = React.useState<{ nodes: any[], connections: any[] } | undefined>()

  const availableNodeTypes = [
    { type: "deep-research", label: "Deep Research", icon: "🔬" },
    { type: "youtube-analysis", label: "YouTube Analysis", icon: "📺" },
    { type: "web-search", label: "Web Search", icon: "🔍" },
    { type: "data-analysis", label: "Data Analysis", icon: "📊" },
    { type: "content-generation", label: "Content Generation", icon: "✍️" },
    { type: "export", label: "Export Results", icon: "📤" },
    { type: "query-builder", label: "Query Builder", icon: "🕸️" }
  ]

  const onConnect: OnConnect = (params) => {
    if (params.source && params.target) {
      const newEdge = {
        ...params,
        id: `edge-${Date.now()}`,
        source: params.source,
        target: params.target,
      }
      setEdges((eds) => addEdge(newEdge, eds))
      storeAddEdge(newEdge)
    }
  }

  const handleAddNode = (type: string) => {
    const newNode: Omit<WorkflowNode, 'id'> = {
      type,
      position: { x: Math.random() * 400, y: Math.random() * 400 },
      data: {
        label: `${type.charAt(0).toUpperCase() + type.slice(1)} Task`,
        parameters: getDefaultParameters(type),
        status: 'pending',
      },
    }
    addNode(newNode)
  }

  const getDefaultParameters = (type: string) => {
    const defaults: Record<string, Record<string, any>> = {
      'deep-research': { query: '', depth: 3, sources: 10 },
      'youtube-analysis': { videoUrl: '', analysisType: 'transcript' },
      'web-search': { query: '', maxResults: 10 },
      'data-analysis': { dataSource: '', analysisType: 'summary' },
      'content-generation': { prompt: '', format: 'text' },
      'export': { format: 'json', destination: '' },
      'query-builder': {}
    }
    return defaults[type] || {}
  }

  const handleSaveWorkflow = () => {
    saveWorkflow()
    alert('Workflow saved successfully!')
  }

  const handleLoadWorkflow = () => {
    const saved = localStorage.getItem('workflow')
    if (saved) {
      const workflow = JSON.parse(saved)
      loadWorkflow(workflow)
      setNodes(workflow.nodes.map((node: WorkflowNode) => ({
        id: node.id,
        type: node.type === 'query-builder' ? 'queryNode' : 'taskNode',
        position: node.position,
        data: {
          ...node.data,
          onParameterChange: (paramName: string, value: any) => {
            updateNode(node.id, {
              data: {
                ...node.data,
                parameters: {
                  ...node.data.parameters,
                  [paramName]: value,
                },
              },
            })
          },
          onDelete: () => deleteNode(node.id),
          onOpenEditor: node.type === 'query-builder' ? () => handleOpenQueryEditor(node.id) : undefined,
          isSelected: selectedNodeId === node.id,
        },
      })))
      setEdges(workflow.edges)
      alert('Workflow loaded successfully!')
    } else {
      alert('No saved workflow found.')
    }
  }

  const handleExecuteWorkflow = async () => {
    try {
      await executeWorkflow()
      alert('Workflow executed successfully!')
    } catch (error) {
      alert('Workflow execution failed. Please check the console for details.')
    }
  }

  const handleOpenQueryEditor = (nodeId: string) => {
    const node = storeNodes.find(n => n.id === nodeId)
    if (node) {
      setCurrentQueryNodeId(nodeId)
      setCurrentQueryGraph((node.data as any).queryGraph)
      setQueryEditorOpen(true)
    }
  }

  const handleSaveQuery = (queryGraph: { nodes: any[], connections: any[] }) => {
    if (currentQueryNodeId) {
      const node = storeNodes.find(n => n.id === currentQueryNodeId)
      if (node) {
        updateNode(currentQueryNodeId, {
          data: {
            ...node.data,
            queryGraph
          } as any
        })
      }
    }
    setQueryEditorOpen(false)
    setCurrentQueryNodeId(null)
    setCurrentQueryGraph(undefined)
  }

  return (
    <div className="flex h-full">
      {/* Toolbar */}
      <div className="w-64 bg-gray-50 border-r border-gray-200 p-4 overflow-y-auto">
        <h3 className="text-lg font-semibold mb-4">Available Tasks</h3>
        <div className="space-y-2 mb-6">
          {availableNodeTypes.map((nodeType) => (
            <Button
              key={nodeType.type}
              variant="outline"
              className="w-full justify-start"
              onClick={() => handleAddNode(nodeType.type)}
            >
              <span className="mr-2">{nodeType.icon}</span>
              {nodeType.label}
            </Button>
          ))}
        </div>

        <div className="space-y-2">
          <Button
            variant="default"
            className="w-full"
            onClick={handleSaveWorkflow}
          >
            💾 Save Workflow
          </Button>
          <Button
            variant="outline"
            className="w-full"
            onClick={handleLoadWorkflow}
          >
            📁 Load Workflow
          </Button>
          <Button
            variant="default"
            className="w-full bg-green-600 hover:bg-green-700"
            onClick={handleExecuteWorkflow}
          >
            ▶️ Execute Workflow
          </Button>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          fitView
          attributionPosition="top-right"
        >
          <Controls />
          <MiniMap />
          <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
        </ReactFlow>
      </div>

      <QueryEditor
        isOpen={queryEditorOpen}
        onClose={() => setQueryEditorOpen(false)}
        initialQueryGraph={currentQueryGraph}
        onSave={handleSaveQuery}
      />
    </div>
  )
}

export default WorkflowBuilder