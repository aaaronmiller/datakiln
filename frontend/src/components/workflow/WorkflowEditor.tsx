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
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import '../../../../modern-workflow-node-styles.css'

import WorkflowNode from './WorkflowNode'
import AiDomNode from './AiDomNode'
import NodeConfigDialog from './NodeConfigDialog'
import ExecutionLogViewer from './ExecutionLogViewer'
import { WORKFLOW_NODE_TYPES } from '../../types/workflow-fixed'
import { workflowValidationService } from '../../services/workflowValidationService'
import { useNotifications } from '../../stores/uiStore'
import { ReactFlowWrapper } from '../ui/react-flow-wrapper'

// Node types for React Flow
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
}


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

const WorkflowEditorContent: React.FC<WorkflowEditorProps> = ({
  initialNodes = [],
  initialEdges = [],
  onChange,
  readonly = false,
}) => {
  console.log('WorkflowEditorContent rendering')
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)
  const { add: addNotification } = useNotifications()

  const [selectedNode, setSelectedNode] = useState<string | null>(null)
  const [isExecuting, setIsExecuting] = useState(false)
  const [configDialogOpen, setConfigDialogOpen] = useState(false)
  const [configNode, setConfigNode] = useState<Node | null>(null)
  const [executionLogVisible, setExecutionLogVisible] = useState(false)
  const [currentExecutionId, setCurrentExecutionId] = useState<string | null>(null)
  const [showExecutionOrder, setShowExecutionOrder] = useState(false)
  const [executionOrder, setExecutionOrder] = useState<string[]>([])

  // Handle connections with validation
  const onConnect: OnConnect = useCallback(
    (params: Connection) => {
      // Validate connection: check if source node has 'next' output that can connect to target
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

      // Check if source node has 'next' output capability
      const sourceOutputs = sourceNode.data?.output || sourceNode.data?.outputs
      const canOutputNext = sourceOutputs === 'next' ||
                            (Array.isArray(sourceOutputs) && sourceOutputs.some((o: unknown) => typeof o === 'object' && o !== null && 'destination' in o && (o as { destination: unknown }).destination === 'next')) ||
                            sourceNode.type === 'ai_dom' // ai_dom nodes can output to next

      if (!canOutputNext) {
        addNotification({
          type: 'error',
          title: 'Invalid Connection',
          message: `Node "${sourceNode.data?.name}" does not support "next" output for chaining`
        })
        return
      }

      const newEdge = { ...params, id: `${params.source}-${params.target}` } as Edge
      const updatedEdges = addEdge(newEdge, edges)
      setEdges(updatedEdges)
      onChange?.(nodes, updatedEdges)

      addNotification({
        type: 'success',
        title: 'Connection Created',
        message: `Connected ${sourceNode.data?.name} → ${targetNode.data?.name}`
      })
    },
    [edges, nodes, onChange, setEdges, addNotification]
  )

  // Handle node selection changes
  const handleNodeSelectionChange = useCallback(
    (changes: NodeChange[]) => {
      changes.forEach((change) => {
        if (change.type === 'select') {
          setSelectedNode(change.selected ? change.id : null)
        }
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


  // Add new node
  const addNode = useCallback(
    (type: string, position: { x: number; y: number }) => {
      console.log('Adding node:', type, 'at position:', position)
      const nodeType = WORKFLOW_NODE_TYPES.find(nt => nt.type === type)
      if (!nodeType) {
        console.error('Node type not found:', type)
        return
      }

      const newNode: Node = {
        id: `${type}-${Date.now()}`,
        type,
        position,
        data: {
          label: nodeType.label,
          name: `${nodeType.label} ${nodes.length + 1}`,
          type: nodeType.type,
          ...nodeType.defaultData,
        },
      }

      console.log('Created new node:', newNode)
      const updatedNodes = [...nodes, newNode]
      console.log('Updated nodes count:', updatedNodes.length)
      setNodes(updatedNodes)
      onChange?.(updatedNodes, edges)
    },
    [nodes, edges, onChange, setNodes]
  )

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
  const handleDragStart = useCallback((e: React.DragEvent, index: number) => {
    e.dataTransfer.setData('text/plain', index.toString())
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
  }, [])

  const handleDrop = useCallback((e: React.DragEvent, dropIndex: number) => {
    e.preventDefault()
    const dragIndex = parseInt(e.dataTransfer.getData('text/plain'))
    if (dragIndex === dropIndex) return

    const newOrder = [...executionOrder]
    const [draggedItem] = newOrder.splice(dragIndex, 1)
    newOrder.splice(dropIndex, 0, draggedItem)
    setExecutionOrder(newOrder)
  }, [executionOrder])

  // Convert workflow nodes to React Flow format
  const convertToWorkflowFormat = useCallback(() => {
    const workflowNodes = nodes.map((node: Node) => ({
      id: node.id,
      type: node.data?.type as string,
      name: node.data?.name as string,
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

      // Use the new API endpoint
      const response = await fetch(`http://localhost:8000/api/v1/workflows/${workflowId}/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          workflow,
          execution_options: {}
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()

      if (result.status === 'started') {
        setCurrentExecutionId(result.execution_id)
        setExecutionLogVisible(true)

        addNotification({
          type: 'success',
          title: 'Workflow Execution Started',
          message: `Execution started with ID: ${result.execution_id}`
        })
      } else {
        addNotification({
          type: 'error',
          title: 'Execution Failed',
          message: 'Failed to start workflow execution'
        })
      }
    } catch (error) {
      console.error('Workflow execution error:', error)
      addNotification({
        type: 'error',
        title: 'Execution Failed',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      })
    } finally {
      setIsExecuting(false)
    }
  }, [nodes, addNotification, convertToWorkflowFormat])

  return (
    <div className="w-full h-full flex flex-col">
      {/* Toolbar */}
      {!readonly && (
        <div className="flex flex-wrap gap-2 p-4 bg-white border-b border-gray-200">
          <span className="text-sm font-medium text-gray-700">Add Node:</span>
          {WORKFLOW_NODE_TYPES.map((nodeType) => (
            <button
              key={nodeType.type}
              onClick={() => {
                console.log('Toolbar button clicked for:', nodeType.type)
                const centerX = 400
                const centerY = 300
                const offset = nodes.length * 50
                addNode(nodeType.type, { x: centerX + offset, y: centerY + offset })
              }}
              className={`
                px-3 py-1 text-sm rounded border flex items-center space-x-2
                ${nodeType.color} text-white border-transparent
                hover:opacity-80 transition-opacity
              `}
              title={nodeType.description}
            >
              <span>{nodeType.icon}</span>
              <span>{nodeType.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Canvas */}
      <div className="flex-1 relative w-full" style={{ height: 'calc(100vh - 200px)', minHeight: '400px' }}>
        {(() => {
          console.log('Rendering ReactFlow with nodes:', nodes.length, 'edges:', edges.length)
          return null
        })()}
        <ReactFlowWrapper
          nodes={nodes}
          edges={edges}
          onNodesChange={handleNodeSelectionChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeDoubleClick={handleNodeDoubleClick}
          nodeTypes={nodeTypes}
          fitView
          attributionPosition="bottom-left"
          className="bg-gray-50"
          nodesDraggable={!readonly}
          nodesConnectable={!readonly}
          elementsSelectable={!readonly}
          enablePerformanceMonitoring={false}
          maxNodesForOptimization={1000}
        />
      </div>

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
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, index)}
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
            {selectedNode && ` | Selected: ${selectedNode}`}
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
                        const validation = workflowValidationService.validateWorkflow(workflow)

                        if (validation.valid) {
                          // Import the workflow
                          if (workflow.nodes && Array.isArray(workflow.nodes)) {
                            const reactFlowNodes = workflow.nodes.map((node: Record<string, unknown>) => ({
                              id: node.id as string,
                              type: node.type as string,
                              position: (node.position as { x: number; y: number }) || { x: Math.random() * 400, y: Math.random() * 400 },
                              data: {
                                ...(node.data as Record<string, unknown> || {}),
                                type: node.type,
                                name: (node.name as string) || ((node.data as Record<string, unknown>)?.name as string) || (node.type as string)
                              }
                            }))
                            setNodes(reactFlowNodes)
                          }

                          if (workflow.edges && Array.isArray(workflow.edges)) {
                            const reactFlowEdges = workflow.edges.map((edge: Record<string, unknown>) => ({
                              id: edge.id as string,
                              source: (edge.source || edge.from) as string,
                              target: (edge.target || edge.to) as string,
                            }))
                            setEdges(reactFlowEdges)
                          }

                          addNotification({
                            type: 'success',
                            title: 'Import Successful',
                            message: 'Workflow imported successfully'
                          })

                          // Show warnings if any
                          if (validation.warnings.length > 0) {
                            addNotification({
                              type: 'warning',
                              title: 'Import Warnings',
                              message: validation.warnings.join('; ')
                            })
                          }
                        } else {
                          addNotification({
                            type: 'error',
                            title: 'Import Failed',
                            message: 'Validation errors: ' + validation.errors.join('; ')
                          })
                        }
                      } catch (error) {
                        alert('Import failed - invalid JSON file')
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