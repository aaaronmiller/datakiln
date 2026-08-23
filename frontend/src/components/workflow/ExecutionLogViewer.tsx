import React, { useState, useEffect, useRef } from 'react'
import { ScrollArea } from '../ui/scroll-area'
import { Badge } from '../ui/badge'
import { Clock, CheckCircle, XCircle, PlayCircle } from 'lucide-react'

interface LogEntry {
  id: string
  type: 'execution_started' | 'step_started' | 'step_succeeded' | 'step_failed' | 'execution_completed' | 'execution_failed'
  timestamp: string
  data: Record<string, unknown>
}

interface ExecutionLogViewerProps {
  executionId: string | null
  isVisible: boolean
  onClose: () => void
}

const ExecutionLogViewer: React.FC<ExecutionLogViewerProps> = ({
  executionId,
  isVisible,
  onClose
}) => {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const websocketRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    if (!executionId || !isVisible) {
      disconnectWebSocket()
      return
    }

    connectWebSocket()

    return () => {
      disconnectWebSocket()
    }
  }, [executionId, isVisible]) // eslint-disable-line react-hooks/exhaustive-deps

  const connectWebSocket = () => {
    if (!executionId) return

    try {
      const wsUrl = `ws://localhost:8000/ws/executions/${executionId}`
      const ws = new WebSocket(wsUrl)
      websocketRef.current = ws

      ws.onopen = () => {
        console.log('Connected to execution WebSocket')
        setIsConnected(true)
        addLogEntry({
          id: `connection-${Date.now()}`,
          type: 'execution_started',
          timestamp: new Date().toISOString(),
          data: { message: 'Connected to execution stream' }
        })
      }

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data)
          addLogEntry({
            id: `${message.type}-${Date.now()}`,
            type: message.type,
            timestamp: message.timestamp,
            data: message.data
          })
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error)
        }
      }

      ws.onclose = () => {
        console.log('Disconnected from execution WebSocket')
        setIsConnected(false)
      }

      ws.onerror = (error) => {
        console.error('WebSocket error:', error)
        setIsConnected(false)
      }
    } catch (error) {
      console.error('Failed to connect to WebSocket:', error)
    }
  }

  const disconnectWebSocket = () => {
    if (websocketRef.current) {
      websocketRef.current.close()
      websocketRef.current = null
      setIsConnected(false)
    }
  }

  const addLogEntry = (entry: LogEntry) => {
    setLogs(prev => [...prev, entry])

    // Auto-scroll to bottom
    setTimeout(() => {
      if (scrollAreaRef.current) {
        const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]')
        if (scrollContainer) {
          scrollContainer.scrollTop = scrollContainer.scrollHeight
        }
      }
    }, 100)
  }

  const getLogIcon = (type: string) => {
    switch (type) {
      case 'execution_started':
        return <PlayCircle className="w-4 h-4 text-blue-500" />
      case 'step_started':
        return <Clock className="w-4 h-4 text-yellow-500" />
      case 'step_succeeded':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'step_failed':
        return <XCircle className="w-4 h-4 text-red-500" />
      case 'execution_completed':
        return <CheckCircle className="w-4 h-4 text-green-600" />
      case 'execution_failed':
        return <XCircle className="w-4 h-4 text-red-600" />
      default:
        return <Clock className="w-4 h-4 text-gray-500" />
    }
  }

  const getLogBadgeVariant = (type: string) => {
    switch (type) {
      case 'execution_started':
        return 'default'
      case 'step_started':
        return 'secondary'
      case 'step_succeeded':
        return 'default'
      case 'step_failed':
        return 'destructive'
      case 'execution_completed':
        return 'default'
      case 'execution_failed':
        return 'destructive'
      default:
        return 'outline'
    }
  }

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString()
  }

  const formatLogData = (type: string, data: Record<string, unknown>) => {
    switch (type) {
      case 'execution_started':
        return `Execution started for workflow: ${data.workflow_name || 'Unknown'}`
      case 'step_started':
        return `Started executing ${data.node_type || 'node'}: ${data.node_id || 'unknown'}`
      case 'step_succeeded': {
        const timingInfo = data.timing_policy ? ` (timing: ${JSON.stringify(data.timing_policy)})` : ''
        const selectorInfo = data.selector_used ? ` [selector: ${data.selector_used}]` : ''
        return `Successfully executed ${data.node_type || 'node'}: ${data.node_id || 'unknown'}${selectorInfo}${timingInfo}`
      }
      case 'step_failed':
        return `Failed to execute ${data.node_type || 'node'}: ${data.node_id || 'unknown'} - ${data.error || 'Unknown error'}`
      case 'execution_completed':
        return `Execution completed successfully in ${typeof data.execution_time === 'number' ? data.execution_time.toFixed(2) : '0'}s`
      case 'execution_failed':
        return `Execution failed: ${data.error || 'Unknown error'}`
      default:
        return JSON.stringify(data, null, 2)
    }
  }

  if (!isVisible) return null

  return (
    <div className="fixed right-0 top-0 h-full w-96 bg-white border-l border-gray-200 shadow-lg z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <h3 className="font-semibold text-gray-900">Execution Logs</h3>
          <Badge variant={isConnected ? 'default' : 'secondary'} className="text-xs">
            {isConnected ? 'Connected' : 'Disconnected'}
          </Badge>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600"
        >
          ✕
        </button>
      </div>

      {/* Logs */}
      <div className="flex-1 overflow-hidden">
        <ScrollArea ref={scrollAreaRef} className="h-full">
          <div className="p-4 space-y-3">
            {logs.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>Waiting for execution events...</p>
              </div>
            ) : (
              logs.map((log) => (
                <div key={log.id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                  <div className="flex-shrink-0 mt-0.5">
                    {getLogIcon(log.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <Badge variant={getLogBadgeVariant(log.type)} className="text-xs">
                        {log.type.replace('_', ' ')}
                      </Badge>
                      <span className="text-xs text-gray-500">
                        {formatTimestamp(log.timestamp)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 break-words">
                      {formatLogData(log.type, log.data)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  )
}

export default ExecutionLogViewer