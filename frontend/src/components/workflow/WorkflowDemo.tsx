import React, { useState, useCallback } from 'react'
import { useNodesState, useEdgesState, Edge, Node } from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import WorkflowEditor from './WorkflowEditor'
import { workflowService } from '../../services/workflowService'
import { WorkflowGraph, WorkflowNode } from '../../types/workflow-fixed'

interface ValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
}

interface ExecutionResult {
  success: boolean
  execution_time?: number
  execution_id?: string
  error?: string
}

const WorkflowDemo: React.FC = () => {
  const [nodes, setNodes, _onNodesChange] = useNodesState([] as Node[])
  const [edges, setEdges, _onEdgesChange] = useEdgesState([] as Edge[])

  const [isExecuting, setIsExecuting] = useState(false)
  const [executionResult, setExecutionResult] = useState<ExecutionResult | null>(null)
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null)

  // Handle connections - removed as WorkflowEditor handles its own connections

  // Handle workflow changes
  const handleWorkflowChange = useCallback((newNodes: Node[], newEdges: Edge[]) => {
    setNodes(newNodes)
    setEdges(newEdges)
  }, [setNodes, setEdges])

  // Create sample workflow
  const createSampleWorkflow = useCallback(() => {
    const sampleNodes: Node[] = [
      {
        id: '1',
        type: 'provider',
        position: { x: 100, y: 100 },
        data: {
          label: 'AI Research',
          name: 'Research Query',
          type: 'provider',
          provider_type: 'gemini_deep_research',
          research_depth: 'balanced',
          max_tokens: 2000,
        },
      },
      {
        id: '2',
        type: 'transform',
        position: { x: 400, y: 100 },
        data: {
          label: 'Transform Results',
          name: 'Format Output',
          type: 'transform',
          transform_type: 'markdown',
          output_key: 'formatted_content',
        },
      },
      {
        id: '3',
        type: 'export',
        position: { x: 700, y: 100 },
        data: {
          label: 'Export Results',
          name: 'Save Results',
          type: 'export',
          format: 'md_yaml',
          path_key: 'research_output.md',
          include_metadata: true,
        },
      },
    ]

    const sampleEdges: Edge[] = [
      {
        id: '1-2',
        source: '1',
        target: '2',
      },
      {
        id: '2-3',
        source: '2',
        target: '3',
      },
    ]

    setNodes(sampleNodes)
    setEdges(sampleEdges)
  }, [setNodes, setEdges])

  // Execute workflow
  const executeWorkflow = useCallback(async () => {
    if (nodes.length === 0) {
      alert('Please create a workflow first!')
      return
    }

    setIsExecuting(true)
    setExecutionResult(null)

    try {
      // Convert React Flow nodes to workflow format
      const workflowNodes = nodes.map(node => ({
        id: node.id,
        type: node.data.type as WorkflowNode['type'],
        name: node.data.name as string,
        position: node.position,
        data: node.data as WorkflowNode['data'],
      }))

      const workflowEdges = edges.map(edge => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
      }))

      const workflow: WorkflowGraph = {
        name: 'Demo Workflow',
        description: 'Sample workflow created in the demo',
        start_node: nodes[0]?.id || '1',
        nodes: Object.fromEntries(
          workflowNodes.map(node => [node.id, node])
        ),
        edges: workflowEdges,
      }

      // Validate workflow first
      const validation = await workflowService.validateWorkflow(workflow)
      setValidationResult(validation)

      if (!validation.valid) {
        alert(`Workflow validation failed: ${validation.errors.join(', ')}`)
        return
      }

      // Execute workflow
      const result = await workflowService.executeWorkflow(workflow, {
        query: 'Sample research query for demo',
      })

      setExecutionResult(result)

      if (result.success) {
        alert(`Workflow executed successfully! Execution time: ${result.execution_time}s`)
      } else {
        alert(`Workflow execution failed: ${result.error}`)
      }

    } catch (error) {
      console.error('Workflow execution error:', error)
      alert(`Error: ${error}`)
    } finally {
      setIsExecuting(false)
    }
  }, [nodes, edges])

  // Clear workflow
  const clearWorkflow = useCallback(() => {
    setNodes([])
    setEdges([])
    setExecutionResult(null)
    setValidationResult(null)
  }, [setNodes, setEdges])

  return (
    <div className="w-full h-screen flex flex-col bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 p-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">DataKiln Workflow Demo</h1>
            <p className="text-gray-600">
              Create and execute AI workflows with the new node-based system
            </p>
          </div>

          <div className="flex space-x-2">
            <button
              onClick={createSampleWorkflow}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Load Sample
            </button>
            <button
              onClick={executeWorkflow}
              disabled={isExecuting}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
            >
              {isExecuting ? 'Executing...' : 'Execute Workflow'}
            </button>
            <button
              onClick={clearWorkflow}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
            >
              Clear
            </button>
          </div>
        </div>
      </div>

      {/* Workflow Editor */}
      <div className="flex-1">
        <WorkflowEditor
          initialNodes={nodes}
          initialEdges={edges}
          onChange={handleWorkflowChange}
        />
      </div>

      {/* Status Panel */}
      <div className="bg-white border-t border-gray-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Validation Results */}
          {validationResult && (
            <div className="bg-white border border-gray-300 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-2">Validation Results</h3>
              <div className="text-sm">
                <div className={`font-medium ${validationResult.valid ? 'text-green-600' : 'text-red-600'}`}>
                  {validationResult.valid ? '✓ Valid' : '✗ Invalid'}
                </div>
                {validationResult.errors.length > 0 && (
                  <div className="text-red-600 mt-1">
                    Errors: {validationResult.errors.join(', ')}
                  </div>
                )}
                {validationResult.warnings.length > 0 && (
                  <div className="text-yellow-600 mt-1">
                    Warnings: {validationResult.warnings.join(', ')}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Execution Results */}
          {executionResult && (
            <div className="bg-white border border-gray-300 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-2">Execution Results</h3>
              <div className="text-sm">
                <div className={`font-medium ${executionResult.success ? 'text-green-600' : 'text-red-600'}`}>
                  {executionResult.success ? '✓ Success' : '✗ Failed'}
                </div>
                {executionResult.execution_time && (
                  <div className="text-gray-600">
                    Execution Time: {executionResult.execution_time}s
                  </div>
                )}
                {executionResult.execution_id && (
                  <div className="text-gray-600">
                    ID: {executionResult.execution_id}
                  </div>
                )}
                {executionResult.error && (
                  <div className="text-red-600 mt-1">
                    Error: {executionResult.error}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default WorkflowDemo