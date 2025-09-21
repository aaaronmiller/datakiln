import * as React from "react"
import {
  ReactFlow,
  OnNodesChange,
  OnEdgesChange,
  OnConnect,
  ReactFlowProps,
} from '@xyflow/react'

export interface ReactFlowWrapperProps extends Omit<ReactFlowProps, 'onNodesChange' | 'onEdgesChange' | 'onConnect'> {
  onNodesChange?: OnNodesChange
  onEdgesChange?: OnEdgesChange
  onConnect?: OnConnect
  children?: React.ReactNode
}

const ReactFlowWrapper = React.forwardRef<HTMLDivElement, ReactFlowWrapperProps>(
  ({ children, className, ...props }, ref) => {
    return (
      <div ref={ref} className={`w-full h-full ${className}`}>
        <ReactFlow {...props}>
          {children}
        </ReactFlow>
      </div>
    )
  }
)
ReactFlowWrapper.displayName = "ReactFlowWrapper"

export { ReactFlowWrapper }
