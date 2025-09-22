import * as React from "react"
import {
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Node,
  NodeTypes,
  OnConnect,
  BackgroundVariant,
  ReactFlowProvider,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { Button } from "../ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog"
import { ErrorBoundary } from "../ui/error-boundary"
import { ReactFlowWrapper } from "../ui/react-flow-wrapper"
import QueryNode, { QueryEdge, QueryGraph, QUERY_NODE_TYPES, QueryNodeType, ReactFlowQueryNode, QueryNodeData, Template, Provider } from "../../types/query"
import { Progress } from "../ui/progress"
import { Badge } from "../ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs"
import { Input } from "../ui/input"
import { Label } from "../ui/label"
import { Select } from "../ui/select"
import { Textarea } from "../ui/textarea"
import { useToast } from "../../hooks/use-toast"

import { WorkflowTemplateService } from "../../services/workflowTemplateService"
import { ProviderManager } from "../../services/providerManager"
import { Separator } from "../ui/separator"
import { ScrollArea } from "../ui/scroll-area"

// Node Component Props Interfaces
interface BaseNodeProps {
  data: Record<string, unknown>
  selected?: boolean
}


interface DataSourceNodeData extends Record<string, unknown> {
  provider?: string
  connection?: string
  schema?: { tables?: Array<{ name: string; columns: Array<{ name: string; type: string }> }> }
  status?: 'connected' | 'disconnected' | 'error'
}

interface FilterNodeData extends Record<string, unknown> {
  condition?: string
  filterType?: 'basic' | 'advanced' | 'regex'
  columns?: string[]
}

interface TransformNodeData extends Record<string, unknown> {
  operation?: string
  language?: string
  outputSchema?: string
}

interface AggregateNodeData extends Record<string, unknown> {
  functions?: string[]
  groupBy?: string[]
  output?: string
}

interface JoinNodeData extends Record<string, unknown> {
  joinType?: string
  condition?: string
  tables?: Array<{ name: string; columns: Array<{ name: string; type: string }> }>
}

interface UnionNodeData extends Record<string, unknown> {
  inputCount?: number
  unionMode?: string
}

interface MLNodeData extends Record<string, unknown> {
  model?: string
  task?: string
  features?: string[]
}

interface NLPNodeData extends Record<string, unknown> {
  task?: string
  language?: string
  output?: string
}

interface ValidationNodeData extends Record<string, unknown> {
  rules?: Array<{ name: string; condition: string }>
  schema?: string
  strict?: boolean
}

interface LoopNodeData extends Record<string, unknown> {
  maxIterations?: string
  condition?: string
  loopVariable?: string
}

interface ConditionNodeData extends Record<string, unknown> {
  expression?: string
  truePath?: string
  falsePath?: string
}

interface CustomNodeData extends Record<string, unknown> {
  customType?: string
  script?: boolean
  inputs?: Array<{ name: string; type: string }>
  outputs?: Array<{ name: string; type: string }>
}

// Advanced Node Components
const DataSourceNode: React.FC<BaseNodeProps & { data: DataSourceNodeData }> = ({ data, selected }) => (
  <Card className={`w-56 border-green-300 bg-green-50 ${selected ? 'ring-2 ring-green-500' : ''}`}>
    <CardHeader className="pb-2">
      <CardTitle className="text-sm text-green-800 flex items-center gap-2">
        <span>📊</span> Data Source
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="text-xs text-gray-600 space-y-1">
        <div><strong>Provider:</strong> {data.provider || 'None'}</div>
        <div><strong>Connection:</strong> {data.connection || 'Not configured'}</div>
        {data.schema && <div><strong>Tables:</strong> {data.schema.tables?.length || 0}</div>}
      </div>
      {data.status && (
        <Badge variant={data.status === 'connected' ? 'default' : 'destructive'} className="mt-2">
          {data.status}
        </Badge>
      )}
    </CardContent>
  </Card>
)

const FilterNode: React.FC<BaseNodeProps & { data: FilterNodeData }> = ({ data, selected }) => (
  <Card className={`w-56 border-blue-300 bg-blue-50 ${selected ? 'ring-2 ring-blue-500' : ''}`}>
    <CardHeader className="pb-2">
      <CardTitle className="text-sm text-blue-800 flex items-center gap-2">
        <span>🔍</span> Filter
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="text-xs text-gray-600 space-y-1">
        <div><strong>Condition:</strong> {data.condition || 'Not set'}</div>
        <div><strong>Type:</strong> {data.filterType || 'Basic'}</div>
        {data.columns && <div><strong>Columns:</strong> {data.columns.join(', ')}</div>}
      </div>
    </CardContent>
  </Card>
)

const TransformNode: React.FC<BaseNodeProps & { data: TransformNodeData }> = ({ data, selected }) => (
  <Card className={`w-56 border-orange-300 bg-orange-50 ${selected ? 'ring-2 ring-orange-500' : ''}`}>
    <CardHeader className="pb-2">
      <CardTitle className="text-sm text-orange-800 flex items-center gap-2">
        <span>⚡</span> Transform
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="text-xs text-gray-600 space-y-1">
        <div><strong>Operation:</strong> {data.operation || 'Not set'}</div>
        <div><strong>Language:</strong> {data.language || 'SQL'}</div>
        {data.outputSchema && <div><strong>Output:</strong> {data.outputSchema}</div>}
      </div>
    </CardContent>
  </Card>
)

const AggregateNode: React.FC<BaseNodeProps & { data: AggregateNodeData }> = ({ data, selected }) => (
  <Card className={`w-56 border-purple-300 bg-purple-50 ${selected ? 'ring-2 ring-purple-500' : ''}`}>
    <CardHeader className="pb-2">
      <CardTitle className="text-sm text-purple-800 flex items-center gap-2">
        <span>📈</span> Aggregate
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="text-xs text-gray-600 space-y-1">
        <div><strong>Functions:</strong> {data.functions?.join(', ') || 'Not set'}</div>
        <div><strong>Group By:</strong> {data.groupBy?.join(', ') || 'None'}</div>
        <div><strong>Output:</strong> {data.output || 'Summary'}</div>
      </div>
    </CardContent>
  </Card>
)

const JoinNode: React.FC<BaseNodeProps & { data: JoinNodeData }> = ({ data, selected }) => (
  <Card className={`w-56 border-indigo-300 bg-indigo-50 ${selected ? 'ring-2 ring-indigo-500' : ''}`}>
    <CardHeader className="pb-2">
      <CardTitle className="text-sm text-indigo-800 flex items-center gap-2">
        <span>🔗</span> Join
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="text-xs text-gray-600 space-y-1">
        <div><strong>Type:</strong> {data.joinType || 'Inner'}</div>
        <div><strong>Condition:</strong> {data.condition || 'Not set'}</div>
        <div><strong>Tables:</strong> {data.tables?.length || 0}</div>
      </div>
    </CardContent>
  </Card>
)

const UnionNode: React.FC<BaseNodeProps & { data: UnionNodeData }> = ({ data, selected }) => (
  <Card className={`w-56 border-pink-300 bg-pink-50 ${selected ? 'ring-2 ring-pink-500' : ''}`}>
    <CardHeader className="pb-2">
      <CardTitle className="text-sm text-pink-800 flex items-center gap-2">
        <span>🔀</span> Union
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="text-xs text-gray-600">
        <div><strong>Inputs:</strong> {data.inputCount || 2}</div>
        <div><strong>Mode:</strong> {data.unionMode || 'All'}</div>
      </div>
    </CardContent>
  </Card>
)

// Advanced Nodes
const MLNode: React.FC<BaseNodeProps & { data: MLNodeData }> = ({ data, selected }) => (
  <Card className={`w-56 border-cyan-300 bg-cyan-50 ${selected ? 'ring-2 ring-cyan-500' : ''}`}>
    <CardHeader className="pb-2">
      <CardTitle className="text-sm text-cyan-800 flex items-center gap-2">
        <span>🤖</span> ML Analysis
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="text-xs text-gray-600 space-y-1">
        <div><strong>Model:</strong> {data.model || 'Auto'}</div>
        <div><strong>Task:</strong> {data.task || 'Classification'}</div>
        <div><strong>Features:</strong> {data.features?.length || 0}</div>
      </div>
    </CardContent>
  </Card>
)

const NLPNode: React.FC<BaseNodeProps & { data: NLPNodeData }> = ({ data, selected }) => (
  <Card className={`w-56 border-teal-300 bg-teal-50 ${selected ? 'ring-2 ring-teal-500' : ''}`}>
    <CardHeader className="pb-2">
      <CardTitle className="text-sm text-teal-800 flex items-center gap-2">
        <span>💬</span> NLP Processing
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="text-xs text-gray-600 space-y-1">
        <div><strong>Task:</strong> {data.task || 'Sentiment'}</div>
        <div><strong>Language:</strong> {data.language || 'Auto'}</div>
        <div><strong>Output:</strong> {data.output || 'Processed'}</div>
      </div>
    </CardContent>
  </Card>
)

const ValidationNode: React.FC<BaseNodeProps & { data: ValidationNodeData }> = ({ data, selected }) => (
  <Card className={`w-56 border-red-300 bg-red-50 ${selected ? 'ring-2 ring-red-500' : ''}`}>
    <CardHeader className="pb-2">
      <CardTitle className="text-sm text-red-800 flex items-center gap-2">
        <span>✅</span> Validation
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="text-xs text-gray-600 space-y-1">
        <div><strong>Rules:</strong> {data.rules?.length || 0}</div>
        <div><strong>Schema:</strong> {data.schema || 'Auto'}</div>
        <div><strong>Strict:</strong> {data.strict ? 'Yes' : 'No'}</div>
      </div>
    </CardContent>
  </Card>
)

const LoopNode: React.FC<BaseNodeProps & { data: LoopNodeData }> = ({ data, selected }) => (
  <Card className={`w-56 border-yellow-300 bg-yellow-50 ${selected ? 'ring-2 ring-yellow-500' : ''}`}>
    <CardHeader className="pb-2">
      <CardTitle className="text-sm text-yellow-800 flex items-center gap-2">
        <span>🔄</span> Loop
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="text-xs text-gray-600 space-y-1">
        <div><strong>Iterations:</strong> {data.maxIterations || '10'}</div>
        <div><strong>Condition:</strong> {data.condition || 'Not set'}</div>
        <div><strong>Variable:</strong> {data.loopVariable || 'i'}</div>
      </div>
    </CardContent>
  </Card>
)

const ConditionNode: React.FC<BaseNodeProps & { data: ConditionNodeData }> = ({ data, selected }) => (
  <Card className={`w-56 border-gray-300 bg-gray-50 ${selected ? 'ring-2 ring-gray-500' : ''}`}>
    <CardHeader className="pb-2">
      <CardTitle className="text-sm text-gray-800 flex items-center gap-2">
        <span>⚡</span> Condition
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="text-xs text-gray-600 space-y-1">
        <div><strong>Expression:</strong> {data.expression || 'Not set'}</div>
        <div><strong>True Path:</strong> {data.truePath || 'Next'}</div>
        <div><strong>False Path:</strong> {data.falsePath || 'End'}</div>
      </div>
    </CardContent>
  </Card>
)

const CustomNode: React.FC<BaseNodeProps & { data: CustomNodeData }> = ({ data, selected }) => (
  <Card className={`w-56 border-violet-300 bg-violet-50 ${selected ? 'ring-2 ring-violet-500' : ''}`}>
    <CardHeader className="pb-2">
      <CardTitle className="text-sm text-violet-800 flex items-center gap-2">
        <span>🛠️</span> Custom
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="text-xs text-gray-600 space-y-1">
        <div><strong>Type:</strong> {data.customType || 'Custom'}</div>
        <div><strong>Script:</strong> {data.script ? 'Defined' : 'Not set'}</div>
        <div><strong>Inputs:</strong> {data.inputs?.length || 0}</div>
        <div><strong>Outputs:</strong> {data.outputs?.length || 0}</div>
      </div>
    </CardContent>
  </Card>
)

const queryNodeTypes: NodeTypes = {
  dataSource: DataSourceNode,
  filter: FilterNode,
  transform: TransformNode,
  aggregate: AggregateNode,
  join: JoinNode,
  union: UnionNode,
  ml: MLNode,
  nlp: NLPNode,
  validation: ValidationNode,
  loop: LoopNode,
  condition: ConditionNode,
  custom: CustomNode,
}

interface EnhancedQueryEditorProps {
  isOpen: boolean
  onClose: () => void
  initialQueryGraph?: QueryGraph
  onSave: (queryGraph: QueryGraph) => void
  onExecute?: (queryGraph: QueryGraph) => Promise<void>
}

const EnhancedQueryEditor: React.FC<EnhancedQueryEditorProps> = ({
  isOpen,
  onClose,
  initialQueryGraph,
  onSave,
  onExecute
}) => {
  const [nodes, setNodes, onNodesChange] = useNodesState<ReactFlowQueryNode>(
    (initialQueryGraph?.nodes || []).map(node => ({
      ...node,
      type: node.type as 'dataSource' | 'filter' | 'transform' | 'aggregate' | 'join' | 'union',
      data: {
        ...node.data,
        id: node.id,
        type: node.type as 'dataSource' | 'filter' | 'transform' | 'aggregate' | 'join' | 'union',
        position: node.position
      }
    }))
  )
  const [edges, setEdges, onEdgesChange] = useEdgesState<QueryEdge>(
    initialQueryGraph?.edges || []
  )
  const [executionProgress, setExecutionProgress] = React.useState(0)
  const [executionStatus, setExecutionStatus] = React.useState<'idle' | 'running' | 'completed' | 'error'>('idle')
  const [selectedNode, setSelectedNode] = React.useState<Node | null>(null)
  const [templates, setTemplates] = React.useState<Template[]>([])
  const [providers, setProviders] = React.useState<Provider[]>([])
  const [activeTab, setActiveTab] = React.useState('builder')

  const { toast } = useToast()

  React.useEffect(() => {
    loadTemplates()
    loadProviders()
  }, [])

  const loadTemplates = async () => {
    try {
      const templateService = new WorkflowTemplateService()
      const availableTemplates = await templateService.getTemplates()
      setTemplates(availableTemplates)
    } catch (error) {
      console.error('Failed to load templates:', error)
    }
  }

  const loadProviders = async () => {
    try {
      const providerManager = new ProviderManager()
      const availableProviders = await providerManager.getProviders()
      setProviders(availableProviders)
    } catch (error) {
      console.error('Failed to load providers:', error)
    }
  }

  const onConnect: OnConnect = (params) => {
    setEdges((eds) => addEdge(params, eds))
  }

  const handleAddNode = (nodeType: QueryNodeType) => {
    const newNode: ReactFlowQueryNode = {
      id: `query-node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: nodeType.type as 'dataSource' | 'filter' | 'transform' | 'aggregate' | 'join' | 'union',
      position: {
        x: Math.random() * 300 + 50,
        y: Math.random() * 300 + 50
      },
      data: {
        id: `query-node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: nodeType.type as 'dataSource' | 'filter' | 'transform' | 'aggregate' | 'join' | 'union',
        position: {
          x: Math.random() * 300 + 50,
          y: Math.random() * 300 + 50
        },
        label: nodeType.label,
        ...nodeType.defaultData,
        status: 'idle'
      },
    }
    setNodes((nds) => nds.concat(newNode))
  }

  const handleExecute = async () => {
    if (!onExecute) return

    setExecutionStatus('running')
    setExecutionProgress(0)

    try {
      const queryGraph: QueryGraph = {
        nodes: nodes as QueryNode[],
        edges: edges as QueryEdge[]
      }
      await onExecute(queryGraph)

      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setExecutionProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            setExecutionStatus('completed')
            return 100
          }
          return prev + 10
        })
      }, 500)

      toast({
        title: "Workflow executed successfully",
        description: "All nodes completed execution",
        type: "success"
      })
    } catch (error) {
      setExecutionStatus('error')
      toast({
        title: "Execution failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      })
    }
  }

  const handleSave = () => {
    const queryGraph: QueryGraph = {
      nodes: nodes as QueryNode[],
      edges: edges as QueryEdge[]
    }
    onSave(queryGraph)
    onClose()
  }

  const handleCancel = () => {
    // Reset to initial state
    setNodes((initialQueryGraph?.nodes || []).map(node => ({
      ...node,
      type: node.type as 'dataSource' | 'filter' | 'transform' | 'aggregate' | 'join' | 'union',
      data: {
        ...node.data,
        id: node.id,
        type: node.type as 'dataSource' | 'filter' | 'transform' | 'aggregate' | 'join' | 'union',
        position: node.position
      }
    })))
    setEdges(initialQueryGraph?.edges || [])
    onClose()
  }

  const handleLoadTemplate = (template: Template) => {
    const reactFlowNodes = (template.nodes || []).map(node => ({
      ...node,
      type: node.type as 'dataSource' | 'filter' | 'transform' | 'aggregate' | 'join' | 'union',
      data: {
        ...node.data,
        id: node.id,
        type: node.type as 'dataSource' | 'filter' | 'transform' | 'aggregate' | 'join' | 'union',
        position: node.position
      }
    }))
    setNodes(reactFlowNodes)
    setEdges(template.edges || [])
    toast({
      title: "Template loaded",
      description: `${template.name} template applied`,
    })
  }

  const handleNodeClick = (event: React.MouseEvent, node: Node) => {
    setSelectedNode(node)
  }

  const handleNodeConfigUpdate = (nodeId: string, config: Record<string, unknown>) => {
    setNodes((nds) =>
      nds.map((node) =>
        node.id === nodeId
          ? { ...node, data: { ...node.data, ...config } }
          : node
      )
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>⚡</span>
            Enhanced Query Editor
          </DialogTitle>
        </DialogHeader>

        <ErrorBoundary>
          <div className="flex h-full">
            {/* Left Sidebar */}
            <div className="w-64 bg-gray-50 border-r border-gray-200 p-4 overflow-y-auto">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="builder">Builder</TabsTrigger>
                  <TabsTrigger value="templates">Templates</TabsTrigger>
                  <TabsTrigger value="providers">Providers</TabsTrigger>
                </TabsList>

                <TabsContent value="builder" className="space-y-4">
                  <div>
                    <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                      <span>📦</span> Node Types
                    </h4>
                    <ScrollArea className="h-96">
                      <div className="space-y-2">
                        {[
                          { category: 'Input', nodes: QUERY_NODE_TYPES.filter(n => n.category === 'input') },
                          { category: 'Transform', nodes: QUERY_NODE_TYPES.filter(n => n.category === 'transform') },
                          { category: 'Advanced', nodes: QUERY_NODE_TYPES.filter(n => ['ml', 'nlp', 'validation', 'loop', 'condition', 'custom'].includes(n.type)) }
                        ].map(({ category, nodes }) => (
                          <div key={category}>
                            <h5 className="text-xs font-medium text-gray-500 mb-2">{category}</h5>
                            <div className="space-y-1">
                              {nodes.map((nodeType) => (
                                <Button
                                  key={nodeType.type}
                                  variant="outline"
                                  size="sm"
                                  className="w-full justify-start text-xs h-8"
                                  onClick={() => handleAddNode(nodeType)}
                                >
                                  <span className="mr-2">{nodeType.icon}</span>
                                  {nodeType.label}
                                </Button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                </TabsContent>

                <TabsContent value="templates" className="space-y-4">
                  <div>
                    <h4 className="text-sm font-semibold mb-3">Workflow Templates</h4>
                    <ScrollArea className="h-96">
                      <div className="space-y-2">
                        {templates.map((template) => (
                          <Card key={template.id} className="cursor-pointer hover:bg-gray-100">
                            <CardContent className="p-3">
                              <div className="flex justify-between items-start">
                                <div>
                                  <h5 className="text-sm font-medium">{template.name}</h5>
                                  <p className="text-xs text-gray-500">{template.description}</p>
                                  <div className="flex gap-1 mt-1">
                                    <Badge variant="secondary" className="text-xs">
                                      {template.category}
                                    </Badge>
                                    <Badge variant="outline" className="text-xs">
                                      {template.nodes?.length || 0} nodes
                                    </Badge>
                                  </div>
                                </div>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleLoadTemplate(template)}
                                >
                                  Load
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                </TabsContent>

                <TabsContent value="providers" className="space-y-4">
                  <div>
                    <h4 className="text-sm font-semibold mb-3">Available Providers</h4>
                    <ScrollArea className="h-96">
                      <div className="space-y-2">
                        {providers.map((provider) => (
                          <Card key={provider.id}>
                            <CardContent className="p-3">
                              <div className="flex justify-between items-center">
                                <div>
                                  <h5 className="text-sm font-medium">{provider.name}</h5>
                                  <p className="text-xs text-gray-500">{provider.description}</p>
                                  <Badge
                                    variant={provider.status === 'active' ? 'default' : 'secondary'}
                                    className="mt-1"
                                  >
                                    {provider.status}
                                  </Badge>
                                </div>
                                <Button size="sm" variant="outline">
                                  Configure
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                </TabsContent>
              </Tabs>
            </div>

            {/* Main Canvas */}
            <div className="flex-1 flex flex-col">
              {/* Execution Controls */}
              <div className="border-b border-gray-200 p-4 bg-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Button
                      onClick={handleExecute}
                      disabled={executionStatus === 'running'}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {executionStatus === 'running' ? '⚡ Executing...' : '▶️ Execute'}
                    </Button>

                    {executionStatus === 'running' && (
                      <div className="flex items-center gap-2">
                        <Progress value={executionProgress} className="w-32" />
                        <span className="text-sm text-gray-600">{executionProgress}%</span>
                      </div>
                    )}

                    <Badge variant={
                      executionStatus === 'completed' ? 'default' :
                      executionStatus === 'error' ? 'destructive' :
                      executionStatus === 'running' ? 'secondary' : 'outline'
                    }>
                      {executionStatus}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      onClick={handleSave}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      💾 Save
                    </Button>
                    <Button
                      onClick={handleCancel}
                      variant="outline"
                    >
                      ❌ Cancel
                    </Button>
                  </div>
                </div>
              </div>

              {/* ReactFlow Canvas */}
              <div className="flex-1">
                <ReactFlowWrapper
                  nodes={nodes}
                  edges={edges}
                  onNodesChange={onNodesChange as any}
                  onEdgesChange={onEdgesChange as any}
                  onConnect={onConnect}
                  onNodeClick={handleNodeClick}
                  nodeTypes={queryNodeTypes}
                  fitView={true}
                  className="bg-gray-50"
                  enablePerformanceMonitoring={true}
                  maxNodesForOptimization={50}
                >
                  <Controls />
                  <MiniMap />
                  <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
                </ReactFlowWrapper>
              </div>
            </div>

            {/* Right Sidebar - Node Configuration */}
            {selectedNode && (
              <div className="w-80 bg-white border-l border-gray-200 p-4 overflow-y-auto">
                <h4 className="text-sm font-semibold mb-4">Node Configuration</h4>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">
                      {(selectedNode.data as QueryNodeData)?.label || 'Node'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {selectedNode.type === 'dataSource' && (
                      <div className="space-y-3">
                        <div>
                          <Label htmlFor="provider">Provider</Label>
                          <Select value={(selectedNode.data as QueryNodeData)?.provider || ''} onChange={(e) => handleNodeConfigUpdate(selectedNode.id, { provider: e.target.value })}>
                            <option value="">Select provider</option>
                            {providers.map((provider) => (
                              <option key={provider.id} value={provider.id}>
                                {provider.name}
                              </option>
                            ))}
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="connection">Connection String</Label>
                          <Input
                            id="connection"
                            placeholder="Database URL or API endpoint"
                            value={(selectedNode.data as QueryNodeData)?.connection || ''}
                            onChange={(e) => handleNodeConfigUpdate(selectedNode.id, { connection: e.target.value })}
                          />
                        </div>
                      </div>
                    )}

                    {selectedNode.type === 'filter' && (
                      <div className="space-y-3">
                        <div>
                          <Label htmlFor="condition">Filter Condition</Label>
                          <Textarea
                            id="condition"
                            placeholder="e.g., age > 18 AND status = 'active'"
                            value={(selectedNode.data as QueryNodeData)?.condition || ''}
                            onChange={(e) => handleNodeConfigUpdate(selectedNode.id, { condition: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label htmlFor="filterType">Filter Type</Label>
                          <Select value={(selectedNode.data as QueryNodeData)?.filterType || ''} onChange={(e) => handleNodeConfigUpdate(selectedNode.id, { filterType: e.target.value })}>
                            <option value="">Select filter type</option>
                            <option value="Basic">Basic</option>
                            <option value="Advanced">Advanced</option>
                            <option value="Regex">Regex</option>
                          </Select>
                        </div>
                      </div>
                    )}

                    {selectedNode.type === 'ml' && (
                      <div className="space-y-3">
                        <div>
                          <Label htmlFor="model">ML Model</Label>
                          <Select value={(selectedNode.data as QueryNodeData)?.model || ''} onChange={(e) => handleNodeConfigUpdate(selectedNode.id, { model: e.target.value })}>
                            <option value="">Select model</option>
                            <option value="Auto-select">Auto-select</option>
                            <option value="Linear Regression">Linear Regression</option>
                            <option value="Random Forest">Random Forest</option>
                            <option value="Neural Network">Neural Network</option>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="task">Task</Label>
                          <Select value={(selectedNode.data as QueryNodeData)?.task || ''} onChange={(e) => handleNodeConfigUpdate(selectedNode.id, { task: e.target.value })}>
                            <option value="">Select task</option>
                            <option value="Classification">Classification</option>
                            <option value="Regression">Regression</option>
                            <option value="Clustering">Clustering</option>
                          </Select>
                        </div>
                      </div>
                    )}

                    <Separator />
                    <Button
                      onClick={() => setSelectedNode(null)}
                      variant="outline"
                      size="sm"
                      className="w-full"
                    >
                      Close Configuration
                    </Button>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </ErrorBoundary>
      </DialogContent>
    </Dialog>
  )
}

// Wrapper component with ReactFlowProvider
const EnhancedQueryEditorWithProvider: React.FC<EnhancedQueryEditorProps> = (props) => (
  <ReactFlowProvider>
    <EnhancedQueryEditor {...props} />
  </ReactFlowProvider>
)

export default EnhancedQueryEditorWithProvider