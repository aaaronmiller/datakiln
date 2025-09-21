import React, { useState, useCallback } from 'react'
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  OnConnect,
  NodeChange,
  EdgeChange,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import WorkflowNode from './WorkflowNode'
import { WORKFLOW_NODE_TYPES } from '../../types/workflow'

// Node types for React Flow
const nodeTypes = {
  dom_action: WorkflowNode,
  prompt: WorkflowNode,
  provider: WorkflowNode,
  transform: WorkflowNode,
  export: WorkflowNode,
  condition: WorkflowNode,
}

interface WorkflowEditorProps {
  initialNodes?: Node[]
  initialEdges?: Edge[]
  onChange?: (nodes: Node[], edges: Edge[]) => void
  readonly?: boolean
}

const WorkflowEditor: React.FC<WorkflowEditorProps> = ({
  initialNodes = [],
  initialEdges = [],
  onChange,
  readonly = false,
}) => {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)

  const [selectedNode, setSelectedNode] = useState<string | null>(null)

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
      onNodesChange(changes)
      const updatedNodes = changes.reduce((acc: Node[], change: NodeChange) => {
        if (change.type === 'select') {
          setSelectedNode(change.selected ? change.id : null)
        }
        return acc
      }, nodes)
      onChange?.(updatedNodes, edges)
    },
    [onNodesChange, nodes, edges, onChange]
  )

  // Handle edges changes
  const handleEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      onEdgesChange(changes)
      const updatedEdges = changes.reduce((acc: Edge[], _change: EdgeChange) => acc, edges)
      onChange?.(nodes, updatedEdges)
    },
    [onEdgesChange, nodes, edges, onChange]
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
    const workflowNodes = nodes.map(node => ({
      id: node.id,
      type: node.data.type,
      name: node.data.name,
      position: node.position,
      data: node.data,
    }))

    const workflowEdges = edges.map(edge => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
    }))

    return {
      nodes: workflowNodes,
      edges: workflowEdges,
    }
  }, [nodes, edges])

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
      <div className="flex-1">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={handleNodesChange}
          onEdgesChange={handleEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          fitView
          attributionPosition="bottom-left"
          className="bg-gray-50"
        >
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
        </ReactFlow>
      </div>

      {/* Status Bar */}
      <div className="bg-white border-t border-gray-200 px-4 py-2 text-sm text-gray-600">
        <div className="flex justify-between items-center">
          <div>
            Nodes: {nodes.length} | Edges: {edges.length}
            {selectedNode && ` | Selected: ${selectedNode}`}
          </div>
          <div>
            <button
              onClick={() => {
                const workflow = convertToWorkflowFormat()
                console.log('Workflow JSON:', JSON.stringify(workflow, null, 2))
              }}
              className="px-3 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600"
            >
              Export JSON
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default WorkflowEditor