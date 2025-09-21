import React, { useCallback, useMemo, useRef, useEffect } from 'react'
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  BackgroundVariant,
  ReactFlowProvider,
  Node,
  Edge,
  OnNodesChange,
  OnEdgesChange,
  OnConnect,
  NodeTypes,
  EdgeTypes,
  Viewport,
  ReactFlowInstance,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { ErrorBoundary } from './error-boundary'

interface ReactFlowWrapperProps {
  nodes: Node[]
  edges: Edge[]
  onNodesChange: OnNodesChange
  onEdgesChange: OnEdgesChange
  onConnect: OnConnect
  nodeTypes?: NodeTypes
  edgeTypes?: EdgeTypes
  fitView?: boolean
  attributionPosition?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
  className?: string
  onInit?: (instance: ReactFlowInstance) => void
  children?: React.ReactNode
}

const ReactFlowWrapper: React.FC<ReactFlowWrapperProps> = ({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
  nodeTypes,
  edgeTypes,
  fitView = true,
  attributionPosition = 'top-right',
  className = '',
  onInit,
  children,
}) => {
  const reactFlowWrapper = useRef<HTMLDivElement>(null)
  const [reactFlowInstance, setReactFlowInstance] = React.useState<ReactFlowInstance | null>(null)

  const onInitHandler = useCallback((instance: ReactFlowInstance) => {
    setReactFlowInstance(instance)
    onInit?.(instance)

    // Fit view on initialization if requested
    if (fitView && nodes.length > 0) {
      setTimeout(() => {
        instance.fitView({ padding: 0.1 })
      }, 100)
    }
  }, [onInit, fitView, nodes.length])

  // Memoize nodes and edges to prevent unnecessary re-renders
  const memoizedNodes = useMemo(() => nodes, [JSON.stringify(nodes)])
  const memoizedEdges = useMemo(() => edges, [JSON.stringify(edges)])

  // Performance optimization: limit node updates
  const throttledOnNodesChange = useMemo(() => {
    let timeoutId: NodeJS.Timeout
    return (changes: any[]) => {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(() => {
        onNodesChange(changes)
      }, 16) // ~60fps
    }
  }, [onNodesChange])

  const throttledOnEdgesChange = useMemo(() => {
    let timeoutId: NodeJS.Timeout
    return (changes: any[]) => {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(() => {
        onEdgesChange(changes)
      }, 16) // ~60fps
    }
  }, [onEdgesChange])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // ReactFlow handles cleanup automatically
      // No manual cleanup needed for the instance
    }
  }, [])

  return (
    <ErrorBoundary
      fallback={
        <div className="flex items-center justify-center h-full bg-gray-100 rounded">
          <div className="text-center p-4">
            <p className="text-gray-600 mb-2">Unable to load workflow canvas</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Reload Page
            </button>
          </div>
        </div>
      }
    >
      <div ref={reactFlowWrapper} className={`w-full h-full ${className}`}>
        <ReactFlow
          nodes={memoizedNodes}
          edges={memoizedEdges}
          onNodesChange={throttledOnNodesChange}
          onEdgesChange={throttledOnEdgesChange}
          onConnect={onConnect}
          onInit={onInitHandler}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView={fitView}
          attributionPosition={attributionPosition}
          proOptions={{ hideAttribution: true }}
          nodesDraggable={true}
          nodesConnectable={true}
          elementsSelectable={true}
          minZoom={0.1}
          maxZoom={2}
          defaultViewport={{ x: 0, y: 0, zoom: 1 }}
        >
          <Controls
            position="top-left"
            showZoom={true}
            showFitView={true}
            showInteractive={true}
          />
          <MiniMap
            position="bottom-left"
            nodeStrokeColor={(n) => {
              if (n.type === 'taskNode') return '#0041d0'
              if (n.type === 'queryNode') return '#7c3aed'
              return '#ff0072'
            }}
            nodeColor={(n) => {
              if (n.type === 'taskNode') return '#0041d0'
              if (n.type === 'queryNode') return '#7c3aed'
              return '#ff0072'
            }}
            nodeBorderRadius={2}
          />
          <Background
            variant={BackgroundVariant.Dots}
            gap={12}
            size={1}
            color="#aaa"
          />
          {children}
        </ReactFlow>
      </div>
    </ErrorBoundary>
  )
}

// HOC wrapper with ReactFlowProvider
export const ReactFlowProviderWrapper: React.FC<{
  children: React.ReactNode
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
}> = ({ children, onError }) => {
  return (
    <ErrorBoundary onError={onError}>
      <ReactFlowProvider>
        {children}
      </ReactFlowProvider>
    </ErrorBoundary>
  )
}

export default ReactFlowWrapper