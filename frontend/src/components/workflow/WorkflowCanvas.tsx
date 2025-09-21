import React, { useCallback, useMemo, useState } from 'react'
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Node,
  Edge,
  OnNodesChange,
  OnEdgesChange,
  OnConnect,
  NodeTypes,
  MiniMap,
  Controls,
  Panel,
  useReactFlow,
  ReactFlowProvider,
} from 'reactflow'
import 'reactflow/dist/style.css'

import WorkflowNode from './WorkflowNode'
import { WorkflowNode as WorkflowNodeType, WorkflowEdge, WORKFLOW_NODE_TYPES } from '../../types/workflow'

// Node types for React Flow
const nodeTypes: NodeTypes = {
  dom_action: WorkflowNode,
  prompt: WorkflowNode,
  provider: WorkflowNode,
  transform: WorkflowNode,
  export: WorkflowNode,
  condition: WorkflowNode,
}

interface WorkflowCanvasProps {
  nodes: Node[]
  edges: Edge[]
  onNodesChange: OnNodesChange
  onEdgesChange: OnEdgesChange
  onConnect: OnConnect
  selectedNode?: string
  onNodeSelect?: (nodeId: string | null) => void
  onNodeAdd?: (type: string, position: { x: number; y: number }) => void
  readonly?: boolean
  showMinimap?: boolean
  showControls?: boolean
}

const WorkflowCanvas: React.FC<WorkflowCanvasProps> = ({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
  selectedNode,
  onNodeSelect,
  onNodeAdd,
  readonly = false,
  showMinimap = true,
  showControls = true,
}) => {
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null)

  // Handle node selection
  const handleNodeClick = useCallback(
    (event: React.MouseEvent, node: Node) => {
      if (onNodeSelect) {
        onNodeSelect(node.id)
      }
    },
    [onNodeSelect]
  )

  // Handle pane click (deselect)
  const handlePaneClick = useCallback(() => {
    if (onNodeSelect) {
      onNodeSelect(null)
    }
  }, [onNodeSelect])

  // Handle node add (for future drag and drop functionality)
  const handlePaneDoubleClick = useCallback(
    (event: React.MouseEvent) => {
      if (readonly || !onNodeAdd) return

      const reactFlowBounds = (reactFlowInstance as any)?.getBoundingClientRect?.()
      if (!reactFlowBounds) return

      const position = (reactFlowInstance as any)?.screenToFlowPosition?.({
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      })

      if (position) {
        // Default to adding a provider node
        onNodeAdd('provider', position)
      }
    },
    [onNodeAdd, readonly, reactFlowInstance]
  )

  return (
    <div className="w-full h-full relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={handleNodeClick}
        onPaneClick={handlePaneClick}
        onPaneDoubleClick={handlePaneDoubleClick}
        onInit={setReactFlowInstance}
        nodeTypes={nodeTypes}
        fitView
        attributionPosition="bottom-left"
        className="bg-gray-50"
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} />

        {/* Mini Map */}
        {showMinimap && (
          <MiniMap
            nodeColor={(node) => {
              const nodeType = WORKFLOW_NODE_TYPES.find(type => type.type === node.type)
              return nodeType?.color.replace('bg-', '#') || '#6366f1'
            }}
            nodeStrokeWidth={3}
            zoomable
            pannable
            className="border border-gray-300 rounded-md"
          />
        )}

        {/* Controls */}
        {showControls && <Controls className="bg-white border border-gray-300 rounded-md" />}

        {/* Toolbar Panel */}
        {!readonly && (
          <Panel position="top-left" className="bg-white p-2 rounded-md shadow-md border border-gray-300">
            <div className="flex flex-wrap gap-1">
              <span className="text-sm font-medium text-gray-700 mr-2">Add Node:</span>
              {WORKFLOW_NODE_TYPES.map((nodeType) => (
                <button
                  key={nodeType.type}
                  onClick={() => {
                    if (onNodeAdd && reactFlowInstance) {
                      const center = (reactFlowInstance as any)?.getViewport?.()
                      if (center) {
                        onNodeAdd(nodeType.type, {
                          x: (center.x || 0) + 100,
                          y: (center.y || 0) + 100
                        })
                      }
                    }
                  }}
                  className={`
                    px-2 py-1 text-xs rounded border flex items-center space-x-1
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
          </Panel>
        )}

        {/* Status Panel */}
        {selectedNode && (
          <Panel position="top-right" className="bg-white p-3 rounded-md shadow-md border border-gray-300">
            <div className="text-sm">
              <div className="font-medium text-gray-700">Selected Node</div>
              <div className="text-gray-600">ID: {selectedNode}</div>
              <div className="text-xs text-gray-500 mt-1">
                Double-click on canvas to add nodes
              </div>
            </div>
          </Panel>
        )}
      </ReactFlow>
    </div>
  )
}

// Wrapper component with React Flow Provider
const WorkflowCanvasWrapper: React.FC<Omit<WorkflowCanvasProps, 'onNodesChange' | 'onEdgesChange' | 'onConnect'> & {
  onNodesChange?: OnNodesChange
  onEdgesChange?: OnEdgesChange
  onConnect?: OnConnect
}> = (props) => {
  return (
    <ReactFlowProvider>
      <WorkflowCanvas {...props} />
    </ReactFlowProvider>
  )
}

export default WorkflowCanvasWrapper