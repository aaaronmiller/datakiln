import React, { useState, useCallback } from 'react'
import {
  addEdge,
  Connection,
  Edge,
  Node,
  OnConnect,
  NodeChange,
  EdgeChange,
  ReactFlowProvider,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import WorkflowNode from './WorkflowNode'
import { WORKFLOW_NODE_TYPES } from '../../types/workflow-fixed'
import { workflowValidationService } from '../../services/workflowValidationService'
import WorkflowExecutionService from '../../services/workflowExecutionService'
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
  const [nodes, setNodes] = useState<Node[]>(initialNodes)
  const [edges, setEdges] = useState<Edge[]>(initialEdges)
  const { add: addNotification } = useNotifications()
  const executionService = React.useMemo(() => new WorkflowExecutionService(), [])

  const [selectedNode, setSelectedNode] = useState<string | null>(null)
  const [isExecuting, setIsExecuting] = useState(false)

  // Handle connections
  const onConnect: OnConnect = useCallback(
    (params: Connection) => {
      const newEdge = { ...params, id: `${params.source}-${params.target}` } as Edge
      const updatedEdges = addEdge(newEdge, edges)
      setEdges(updatedEdges)
      onChange?.(nodes, updatedEdges)
    },
    [edges, nodes, onChange, setEdges]
  )

  // Handle node changes
  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      setNodes((nds) => {
        const updatedNodes = changes.reduce((acc, change) => {
          if (change.type === 'select') {
            setSelectedNode(change.selected ? change.id : null)
          }
          // Apply the change to the nodes array
          switch (change.type) {
            case 'add':
              return [...acc, change.item]
            case 'remove':
              return acc.filter((node) => node.id !== change.id)
            case 'replace':
              return acc.map((node) =>
                node.id === change.id ? change.item : node
              )
            case 'position':
              return acc.map((node) =>
                node.id === change.id
                  ? { ...node, position: change.position || node.position, dragging: change.dragging }
                  : node
              )
            case 'select':
              return acc.map((node) =>
                node.id === change.id
                  ? { ...node, selected: change.selected }
                  : node
              )
            default:
              return acc
          }
        }, nds)
        onChange?.(updatedNodes, edges)
        return updatedNodes
      })
    },
    [edges, onChange]
  )

  // Handle edges changes
  const handleEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      setEdges((eds) => {
        const updatedEdges = changes.reduce((acc, change) => {
          switch (change.type) {
            case 'add':
              return [...acc, change.item]
            case 'remove':
              return acc.filter((edge) => edge.id !== change.id)
            case 'replace':
              return acc.map((edge) =>
                edge.id === change.id ? change.item : edge
              )
            case 'select':
              return acc.map((edge) =>
                edge.id === change.id
                  ? { ...edge, selected: change.selected }
                  : edge
              )
            default:
              return acc
          }
        }, eds)
        onChange?.(nodes, updatedEdges)
        return updatedEdges
      })
    },
    [nodes, onChange]
  )

  // Add new node
  const addNode = useCallback(
    (type: string, position: { x: number; y: number }) => {
      const nodeType = WORKFLOW_NODE_TYPES.find(nt => nt.type === type)
      if (!nodeType) return

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

      const updatedNodes = [...nodes, newNode]
      setNodes(updatedNodes)
      onChange?.(updatedNodes, edges)
    },
    [nodes, edges, onChange, setNodes]
  )

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
      const result = await executionService.executeWorkflow(workflow)

      if (result.success) {
        addNotification({
          type: 'success',
          title: 'Workflow Execution Started',
          message: `Execution started with run ID: ${result.run_id || result.execution_id}`
        })
      } else {
        addNotification({
          type: 'error',
          title: 'Execution Failed',
          message: result.error || 'Unknown error occurred'
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
  }, [nodes, executionService, addNotification, convertToWorkflowFormat])

  return (
    <div className="w-full h-full flex flex-col">
      {/* Toolbar */}
      {!readonly && (
        <div className="flex flex-wrap gap-2 p-4 bg-white border-b border-gray-200">
          <span className="text-sm font-medium text-gray-700">Add Node:</span>
          {WORKFLOW_NODE_TYPES.map((nodeType) => (
            <button
              key={nodeType.type}
              onClick={() => addNode(nodeType.type, { x: 100, y: 100 })}
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
      <div className="flex-1" style={{ height: '100%', minHeight: '400px' }}>
        <ReactFlowWrapper
          nodes={nodes}
          edges={edges}
          onNodesChange={handleNodesChange}
          onEdgesChange={handleEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          fitView
          attributionPosition="bottom-left"
          className="bg-gray-50"
          nodesDraggable={!readonly}
          nodesConnectable={!readonly}
          elementsSelectable={!readonly}
          enablePerformanceMonitoring={true}
          maxNodesForOptimization={50}
        />
      </div>

      {/* Status Bar */}
      <div className="bg-white border-t border-gray-200 px-4 py-2 text-sm text-gray-600">
        <div className="flex justify-between items-center">
          <div>
            Nodes: {nodes.length} | Edges: {edges.length}
            {selectedNode && ` | Selected: ${selectedNode}`}
          </div>
          <div className="flex space-x-2">
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