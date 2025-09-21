import React, { useCallback, useState } from 'react'
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
  ReactFlowProvider,
  ReactFlowInstance,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import WorkflowNode from './WorkflowNode'
import { WORKFLOW_NODE_TYPES } from '../../types/workflow-fixed'

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
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null)

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
                      const viewport = reactFlowInstance.getViewport()
                      onNodeAdd(nodeType.type, {
                        x: viewport.x + 100,
                        y: viewport.y + 100
                      })
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
interface WorkflowCanvasWrapperProps {
  nodes: Node[]
  edges: Edge[]
  onNodesChange?: OnNodesChange
  onEdgesChange?: OnEdgesChange
  onConnect?: OnConnect
  selectedNode?: string
  onNodeSelect?: (nodeId: string | null) => void
  onNodeAdd?: (type: string, position: { x: number; y: number }) => void
  readonly?: boolean
  showMinimap?: boolean
  showControls?: boolean
}

const WorkflowCanvasWrapper: React.FC<WorkflowCanvasWrapperProps> = (props) => {
  // Provide default handlers for required props to fix TypeScript errors
  const defaultNodesChange: OnNodesChange = () => {}
  const defaultEdgesChange: OnEdgesChange = () => {}
  const defaultConnect: OnConnect = () => {}

  return (
    <ReactFlowProvider>
      <WorkflowCanvas
        nodes={props.nodes}
        edges={props.edges}
        onNodesChange={props.onNodesChange || defaultNodesChange}
        onEdgesChange={props.onEdgesChange || defaultEdgesChange}
        onConnect={props.onConnect || defaultConnect}
        selectedNode={props.selectedNode}
        onNodeSelect={props.onNodeSelect}
        onNodeAdd={props.onNodeAdd}
        readonly={props.readonly}
        showMinimap={props.showMinimap}
        showControls={props.showControls}
      />
    </ReactFlowProvider>
  )
}

export default WorkflowCanvasWrapper