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
  ReactFlowProvider,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { Button } from "../ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog"
import { ErrorBoundary } from "../ui/error-boundary"
import { ReactFlowWrapper } from "../ui/react-flow-wrapper"
import { QueryNode as QueryNodeType, QueryGraph, QUERY_NODE_TYPES } from "../../types/query"
import { Progress } from "../ui/progress"
import { Badge } from "../ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs"
import { Input } from "../ui/input"
import { Label } from "../ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select"
import { Textarea } from "../ui/textarea"
import { useToast } from "../../hooks/use-toast"
import { WorkflowExecutionService } from "../../services/workflowExecutionService"
import { WorkflowTemplateService } from "../../services/workflowTemplateService"
import { ProviderManager } from "../../services/providerManager"
import { Separator } from "../ui/separator"
import { ScrollArea } from "../ui/scroll-area"

// Advanced Node Components
const DataSourceNode: React.FC<any> = ({ data, selected }) => (
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

const FilterNode: React.FC<any> = ({ data, selected }) => (
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

const TransformNode: React.FC<any> = ({ data, selected }) => (
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

const AggregateNode: React.FC<any> = ({ data, selected }) => (
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

const JoinNode: React.FC<any> = ({ data, selected }) => (
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

const UnionNode: React.FC<any> = ({ data, selected }) => (
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
const MLNode: React.FC<any> = ({ data, selected }) => (
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

const NLPNode: React.FC<any> = ({ data, selected }) => (
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

const ValidationNode: React.FC<any> = ({ data, selected }) => (
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

const LoopNode: React.FC<any> = ({ data, selected }) => (
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

const ConditionNode: React.FC<any> = ({ data, selected }) => (
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

const CustomNode: React.FC<any> = ({ data, selected }) => (
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
  const [nodes, setNodes, onNodesChange] = useNodesState(
    initialQueryGraph?.nodes || []
  )
  const [edges, setEdges, onEdgesChange] = useEdgesState(
    initialQueryGraph?.edges || []
  )
  const [executionProgress, setExecutionProgress] = React.useState(0)
  const [executionStatus, setExecutionStatus] = React.useState<'idle' | 'running' | 'completed' | 'error'>('idle')
  const [executionResults, setExecutionResults] = React.useState<any>(null)
  const [selectedNode, setSelectedNode] = React.useState<Node | null>(null)
  const [templates, setTemplates] = React.useState<any[]>([])
  const [providers, setProviders] = React.useState<any[]>([])
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
    const newNode: Node = {
      id: `query-node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: nodeType.type,
      position: {
        x: Math.random() * 300 + 50,
        y: Math.random() * 300 + 50
      },
      data: {
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
      const queryGraph: QueryGraph = { nodes, edges }
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
      nodes,
      edges
    }
    onSave(queryGraph)
    onClose()
  }

  const handleCancel = () => {
    // Reset to initial state
    setNodes(initialQueryGraph?.nodes || [])
    setEdges(initialQueryGraph?.edges || [])
    onClose()
  }

  const handleLoadTemplate = (template: any) => {
    setNodes(template.nodes || [])
    setEdges(template.edges || [])
    toast({
      title: "Template loaded",
      description: `${template.name} template applied`,
    })
  }

  const handleNodeClick = (event: React.MouseEvent, node: Node) => {
    setSelectedNode(node)
  }

  const handleNodeConfigUpdate = (nodeId: string, config: any) => {
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
                          { category: 'Advanced', nodes: [
                            { type: 'ml', label: 'ML Analysis', icon: '🤖', color: 'bg-cyan-500', category: 'transform', description: 'Machine learning analysis', defaultData: {}, inputs: 1, outputs: 1 },
                            { type: 'nlp', label: 'NLP Processing', icon: '💬', color: 'bg-teal-500', category: 'transform', description: 'Natural language processing', defaultData: {}, inputs: 1, outputs: 1 },
                            { type: 'validation', label: 'Validation', icon: '✅', color: 'bg-red-500', category: 'transform', description: 'Data validation', defaultData: {}, inputs: 1, outputs: 1 },
                            { type: 'loop', label: 'Loop', icon: '🔄', color: 'bg-yellow-500', category: 'transform', description: 'Iterative processing', defaultData: {}, inputs: 1, outputs: 1 },
                            { type: 'condition', label: 'Condition', icon: '⚡', color: 'bg-gray-500', category: 'transform', description: 'Conditional logic', defaultData: {}, inputs: 1, outputs: 2 },
                            { type: 'custom', label: 'Custom', icon: '🛠️', color: 'bg-violet-500', category: 'transform', description: 'Custom node', defaultData: {}, inputs: 1, outputs: 1 },
                          ]}
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
                  onNodesChange={onNodesChange}
                  onEdgesChange={onEdgesChange}
                  onConnect={onConnect}
                  onNodeClick={handleNodeClick}
                  nodeTypes={queryNodeTypes}
                  fitView={true}
                  className="bg-gray-50"
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
                      {selectedNode.data?.label || 'Node'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {selectedNode.type === 'dataSource' && (
                      <div className="space-y-3">
                        <div>
                          <Label htmlFor="provider">Provider</Label>
                          <Select onValueChange={(value) => handleNodeConfigUpdate(selectedNode.id, { provider: value })}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select provider" />
                            </SelectTrigger>
                            <SelectContent>
                              {providers.map((provider) => (
                                <SelectItem key={provider.id} value={provider.id}>
                                  {provider.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="connection">Connection String</Label>
                          <Input
                            id="connection"
                            placeholder="Database URL or API endpoint"
                            value={selectedNode.data?.connection || ''}
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
                            value={selectedNode.data?.condition || ''}
                            onChange={(e) => handleNodeConfigUpdate(selectedNode.id, { condition: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label htmlFor="filterType">Filter Type</Label>
                          <Select onValueChange={(value) => handleNodeConfigUpdate(selectedNode.id, { filterType: value })}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select filter type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="basic">Basic</SelectItem>
                              <SelectItem value="advanced">Advanced</SelectItem>
                              <SelectItem value="regex">Regex</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    )}

                    {selectedNode.type === 'ml' && (
                      <div className="space-y-3">
                        <div>
                          <Label htmlFor="model">ML Model</Label>
                          <Select onValueChange={(value) => handleNodeConfigUpdate(selectedNode.id, { model: value })}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select model" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="auto">Auto-select</SelectItem>
                              <SelectItem value="linear">Linear Regression</SelectItem>
                              <SelectItem value="random_forest">Random Forest</SelectItem>
                              <SelectItem value="neural_net">Neural Network</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="task">Task</Label>
                          <Select onValueChange={(value) => handleNodeConfigUpdate(selectedNode.id, { task: value })}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select task" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="classification">Classification</SelectItem>
                              <SelectItem value="regression">Regression</SelectItem>
                              <SelectItem value="clustering">Clustering</SelectItem>
                            </SelectContent>
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