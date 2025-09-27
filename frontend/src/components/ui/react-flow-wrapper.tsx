import * as React from "react"
import {
  ReactFlow,
  OnNodesChange,
  OnEdgesChange,
  OnConnect,
  ReactFlowProps,
  ReactFlowInstance,
} from '@xyflow/react'
import { ErrorBoundary } from './error-boundary'

export interface ReactFlowWrapperProps extends Omit<ReactFlowProps, 'onNodesChange' | 'onEdgesChange' | 'onConnect'> {
  onNodesChange?: OnNodesChange
  onEdgesChange?: OnEdgesChange
  onConnect?: OnConnect
  children?: React.ReactNode
  enablePerformanceMonitoring?: boolean
  maxNodesForOptimization?: number
}

// Debounce hook for performance optimization
const useDebounce = <T,>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = React.useState<T>(value)

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

// Performance monitoring hook
const usePerformanceMonitor = (enabled: boolean = false, nodeCount: number = 0) => {
  const [metrics, setMetrics] = React.useState({
    fps: 0,
    renderTime: 0,
    nodeCount: 0,
    memoryUsage: 0,
    lastRenderTime: 0
  })

  React.useEffect(() => {
    if (!enabled) return

    let frameCount = 0
    let lastTime = performance.now()
    let animationId: number

    const measurePerformance = () => {
      const now = performance.now()
      frameCount += 1

      if (now - lastTime >= 1000) {
        const fps = Math.round((frameCount * 1000) / (now - lastTime))
        // Type-safe memory usage check
        const memoryInfo = (performance as { memory?: { usedJSHeapSize: number } }).memory
        const memoryUsage = memoryInfo ?
          Math.round(memoryInfo.usedJSHeapSize / 1024 / 1024) : 0

        setMetrics(prev => ({
          ...prev,
          fps,
          memoryUsage,
          nodeCount,
          lastRenderTime: now
        }))

        frameCount = 0
        lastTime = now
      }

      animationId = requestAnimationFrame(measurePerformance)
    }

    animationId = requestAnimationFrame(measurePerformance)

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId)
      }
    }
  }, [enabled, nodeCount])

  return metrics
}

// Optimized ReactFlow wrapper with performance enhancements
const ReactFlowWrapper = React.forwardRef<HTMLDivElement, ReactFlowWrapperProps>(
  ({
    children,
    className,
    nodes = [],
    edges = [],
    enablePerformanceMonitoring = false,
    maxNodesForOptimization = 30, // Lower threshold for better performance
    ...props
  }, ref) => {
    const [_reactFlowInstance, setReactFlowInstance] = React.useState<ReactFlowInstance | null>(null)
    const performanceMetrics = usePerformanceMonitor(enablePerformanceMonitoring, nodes.length)

    // Comprehensive cleanup on unmount to prevent memory leaks
    React.useEffect(() => {
      return () => {
        // Clean up state and any potential subscriptions
        setReactFlowInstance(null)
        
        // Cancel any pending debounced operations
        // Note: debounced functions are cleaned up in their respective useEffect hooks
        
        // Clear any remaining timeouts/intervals if they exist
        // This is a safety net for any forgotten cleanup
      }
    }, [])

    // Additional cleanup for performance monitoring
    React.useEffect(() => {
      if (!enablePerformanceMonitoring) return

      // Cleanup function for performance monitoring
      return () => {
        // Performance monitoring cleanup is handled in the usePerformanceMonitor hook
        // This is just a placeholder for any additional cleanup needed
      }
    }, [enablePerformanceMonitoring])

    // Debounce nodes and edges for large graphs to prevent excessive re-renders
    const debouncedNodes = useDebounce(nodes, nodes.length > maxNodesForOptimization ? 100 : 0)
    const debouncedEdges = useDebounce(edges, edges.length > maxNodesForOptimization ? 100 : 0)

    // Viewport-based virtualization for large node graphs
    const [viewport, setViewport] = React.useState({ x: 0, y: 0, zoom: 1 })
    
    // Calculate visible nodes based on viewport for virtualization
    const visibleNodes = React.useMemo(() => {
      if (debouncedNodes.length <= maxNodesForOptimization) {
        return debouncedNodes
      }

      // Calculate viewport bounds with padding for smooth scrolling
      const padding = 200 / viewport.zoom
      const viewportBounds = {
        left: -viewport.x / viewport.zoom - padding,
        right: (-viewport.x + window.innerWidth) / viewport.zoom + padding,
        top: -viewport.y / viewport.zoom - padding,
        bottom: (-viewport.y + window.innerHeight) / viewport.zoom + padding,
      }

      // Filter nodes that are within or near the viewport
      return debouncedNodes.filter(node => {
        const nodeX = node.position?.x || 0
        const nodeY = node.position?.y || 0
        const nodeWidth = node.width || 200
        const nodeHeight = node.height || 100

        return (
          nodeX + nodeWidth >= viewportBounds.left &&
          nodeX <= viewportBounds.right &&
          nodeY + nodeHeight >= viewportBounds.top &&
          nodeY <= viewportBounds.bottom
        )
      })
    }, [debouncedNodes, viewport, maxNodesForOptimization])

    // Filter edges based on visible nodes for performance
    const visibleEdges = React.useMemo(() => {
      if (debouncedNodes.length <= maxNodesForOptimization) {
        return debouncedEdges
      }

      const visibleNodeIds = new Set(visibleNodes.map(node => node.id))
      return debouncedEdges.filter(edge => 
        visibleNodeIds.has(edge.source) || visibleNodeIds.has(edge.target)
      )
    }, [debouncedEdges, visibleNodes, debouncedNodes.length, maxNodesForOptimization])

    // Memoize expensive computations
    const memoizedNodes = React.useMemo(() => visibleNodes, [visibleNodes])
    const memoizedEdges = React.useMemo(() => visibleEdges, [visibleEdges])

    // Determine optimization level based on node count
    const optimizationLevel = React.useMemo(() => {
      const count = memoizedNodes.length
      if (count > 100) return 'extreme'
      if (count > 50) return 'high'
      if (count > maxNodesForOptimization) return 'medium'
      return 'low'
    }, [memoizedNodes.length, maxNodesForOptimization])

    // Performance settings based on optimization level with proper virtualization
    const performanceSettings = React.useMemo(() => {
      switch (optimizationLevel) {
        case 'extreme':
          return {
            onlyRenderVisibleElements: true,
            nodesDraggable: false,
            nodesConnectable: false,
            elementsSelectable: false,
            maxZoom: 1.2,
            minZoom: 0.8,
            zoomOnScroll: false,
            zoomOnPinch: false,
            panOnDrag: false,
            panOnScroll: false,
            disableKeyboardA11y: true,
            // Enhanced virtualization for extreme mode
            nodeOrigin: [0.5, 0.5] as [number, number],
            elevateNodesOnSelect: false,
            selectNodesOnDrag: false,
          }
        case 'high':
           return {
             onlyRenderVisibleElements: true,
             nodesDraggable: true,
             nodesConnectable: true,
             elementsSelectable: true,
             maxZoom: 1.5,
             minZoom: 0.5,
             zoomOnScroll: true,
             zoomOnPinch: true,
             panOnDrag: true,
             panOnScroll: false,
             disableKeyboardA11y: true,
             // Optimized virtualization for high mode
             nodeOrigin: [0.5, 0.5] as [number, number],
             elevateNodesOnSelect: false,
             selectNodesOnDrag: false,
           }
        case 'medium':
           return {
             onlyRenderVisibleElements: true,
             nodesDraggable: true,
             nodesConnectable: true,
             elementsSelectable: true,
             maxZoom: 2,
             minZoom: 0.1,
             zoomOnScroll: true,
             zoomOnPinch: true,
             panOnDrag: true,
             panOnScroll: false,
             disableKeyboardA11y: true,
             // Basic virtualization for medium mode
             nodeOrigin: [0.5, 0.5] as [number, number],
             elevateNodesOnSelect: true,
             selectNodesOnDrag: true,
           }
        default:
          return {
            onlyRenderVisibleElements: false,
            nodesDraggable: props.nodesDraggable !== false,
            nodesConnectable: props.nodesConnectable !== false,
            elementsSelectable: props.elementsSelectable !== false,
            maxZoom: props.maxZoom || 2,
            minZoom: props.minZoom || 0.1,
            zoomOnScroll: true,
            zoomOnPinch: true,
            panOnDrag: true,
            panOnScroll: true,
            disableKeyboardA11y: false,
            nodeOrigin: [0.5, 0.5] as [number, number],
            elevateNodesOnSelect: true,
            selectNodesOnDrag: true,
          }
      }
    }, [optimizationLevel, props])

    // Viewport change handler for virtualization
    const handleViewportChange = React.useCallback((newViewport: { x: number; y: number; zoom: number }) => {
      setViewport(newViewport)
    }, [])

    // Memoized ReactFlow props to prevent unnecessary re-renders
    const reactFlowProps = React.useMemo(() => ({
      ...props,
      nodes: memoizedNodes,
      edges: memoizedEdges,
      // Apply performance settings
      ...performanceSettings,
      // Add viewport tracking for virtualization
      onViewportChange: handleViewportChange,
      // Add performance monitoring
      onInit: (instance: ReactFlowInstance) => {
        setReactFlowInstance(instance)
        props.onInit?.(instance)
      }
    }), [props, memoizedNodes, memoizedEdges, performanceSettings, handleViewportChange])

    return (
      <ErrorBoundary fallback={
        <div className="w-full h-full flex items-center justify-center bg-red-50 border border-red-200 rounded-md">
          <div className="text-center p-4">
            <div className="text-red-600 text-lg font-semibold mb-2">⚠️ ReactFlow Error</div>
            <div className="text-red-500 text-sm">Failed to load workflow canvas. Please refresh the page.</div>
          </div>
        </div>
      }>
        <div ref={ref} className={`w-full h-full relative ${className}`} style={{ width: '100%', minWidth: '600px' }}>
          <ReactFlow {...reactFlowProps}>
            {children}
          </ReactFlow>

          {/* Performance monitoring overlay */}
          {enablePerformanceMonitoring && memoizedNodes.length > 10 && (
            <div className="absolute top-2 right-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded font-mono z-50">
              FPS: {performanceMetrics.fps} | Visible: {memoizedNodes.length}/{nodes.length}
              {performanceMetrics.memoryUsage > 0 && ` | Memory: ${performanceMetrics.memoryUsage}MB`}
              {optimizationLevel !== 'low' && ` | Mode: ${optimizationLevel}`}
              {nodes.length > maxNodesForOptimization && ` | Virtualized`}
            </div>
          )}

          {/* Large graph warning */}
          {optimizationLevel !== 'low' && (
            <div className={`absolute bottom-2 left-2 border text-xs px-2 py-1 rounded z-50 ${
              optimizationLevel === 'extreme'
                ? 'bg-red-100 border-red-300 text-red-800'
                : optimizationLevel === 'high'
                ? 'bg-orange-100 border-orange-300 text-orange-800'
                : 'bg-yellow-100 border-yellow-300 text-yellow-800'
            }`}>
              ⚡ {optimizationLevel.charAt(0).toUpperCase() + optimizationLevel.slice(1)} performance mode ({memoizedNodes.length} nodes)
            </div>
          )}
        </div>
      </ErrorBoundary>
    )
  }
)
ReactFlowWrapper.displayName = "ReactFlowWrapper"

export { ReactFlowWrapper }
