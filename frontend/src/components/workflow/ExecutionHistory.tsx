import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { ScrollArea } from '../ui/scroll-area'
import { Clock, CheckCircle, XCircle, Trash2, Eye, Download } from 'lucide-react'

interface ExecutionRecord {
  execution_id: string
  workflow_id: string
  workflow_name: string
  timestamp: string
  duration: number
  status: 'success' | 'failed' | 'partial'
  total_nodes: number
  completed_nodes: number
  failed_nodes: number
  error?: string
  logs: LogEntry[]
}

interface LogEntry {
  id: string
  type: 'execution_started' | 'step_started' | 'step_succeeded' | 'step_failed' | 'execution_completed' | 'execution_failed'
  timestamp: string
  data: Record<string, unknown>
}

interface ExecutionHistoryProps {
  isOpen: boolean
  onClose: () => void
}

const STORAGE_KEY = 'datakiln_execution_history'
const MAX_HISTORY_ITEMS = 50

export const ExecutionHistory: React.FC<ExecutionHistoryProps> = ({ isOpen, onClose }) => {
  const [executions, setExecutions] = useState<ExecutionRecord[]>([])
  const [selectedExecution, setSelectedExecution] = useState<ExecutionRecord | null>(null)
  const [filter, setFilter] = useState<'all' | 'success' | 'failed'>('all')

  // Load execution history from localStorage
  useEffect(() => {
    if (isOpen) {
      loadHistory()
    }
  }, [isOpen])

  const loadHistory = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const history = JSON.parse(stored) as ExecutionRecord[]
        setExecutions(history)
      }
    } catch (error) {
      console.error('Failed to load execution history:', error)
    }
  }

  const saveHistory = (history: ExecutionRecord[]) => {
    try {
      // Keep only the most recent MAX_HISTORY_ITEMS
      const trimmed = history.slice(0, MAX_HISTORY_ITEMS)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed))
      setExecutions(trimmed)
    } catch (error) {
      console.error('Failed to save execution history:', error)
    }
  }

  const deleteExecution = (execution_id: string) => {
    const updated = executions.filter(e => e.execution_id !== execution_id)
    saveHistory(updated)
    if (selectedExecution?.execution_id === execution_id) {
      setSelectedExecution(null)
    }
  }

  const clearAllHistory = () => {
    if (confirm('Are you sure you want to clear all execution history?')) {
      localStorage.removeItem(STORAGE_KEY)
      setExecutions([])
      setSelectedExecution(null)
    }
  }

  const exportExecution = (execution: ExecutionRecord) => {
    const dataStr = JSON.stringify(execution, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `execution-${execution.execution_id}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-500" />
      case 'partial':
        return <Clock className="w-5 h-5 text-yellow-500" />
      default:
        return <Clock className="w-5 h-5 text-gray-500" />
    }
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'destructive' | 'secondary'> = {
      success: 'default',
      failed: 'destructive',
      partial: 'secondary'
    }
    return (
      <Badge variant={variants[status] || 'secondary'}>
        {status.toUpperCase()}
      </Badge>
    )
  }

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
    return `${(ms / 60000).toFixed(1)}m`
  }

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString()
  }

  const filteredExecutions = executions.filter(e => {
    if (filter === 'all') return true
    return e.status === filter
  })

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl h-[80vh] p-0">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-6 border-b">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-2xl font-bold">Execution History</DialogTitle>
              <div className="flex items-center space-x-2">
                <Button
                  onClick={clearAllHistory}
                  variant="outline"
                  size="sm"
                  disabled={executions.length === 0}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Clear All
                </Button>
                <Button onClick={onClose} variant="outline" size="sm">
                  Close
                </Button>
              </div>
            </div>
          </div>

          <div className="flex flex-1 overflow-hidden">
            {/* Executions List */}
            <div className="w-2/5 border-r flex flex-col">
              {/* Filter Tabs */}
              <div className="flex border-b p-4 space-x-2">
                <button
                  onClick={() => setFilter('all')}
                  className={`px-3 py-1 text-sm rounded ${
                    filter === 'all'
                      ? 'bg-blue-100 text-blue-700 font-medium'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  All ({executions.length})
                </button>
                <button
                  onClick={() => setFilter('success')}
                  className={`px-3 py-1 text-sm rounded ${
                    filter === 'success'
                      ? 'bg-green-100 text-green-700 font-medium'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Success ({executions.filter(e => e.status === 'success').length})
                </button>
                <button
                  onClick={() => setFilter('failed')}
                  className={`px-3 py-1 text-sm rounded ${
                    filter === 'failed'
                      ? 'bg-red-100 text-red-700 font-medium'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Failed ({executions.filter(e => e.status === 'failed').length})
                </button>
              </div>

              {/* Executions List */}
              <ScrollArea className="flex-1">
                <div className="p-4 space-y-2">
                  {filteredExecutions.length === 0 ? (
                    <div className="text-center text-gray-500 py-8">
                      <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p className="text-sm">No executions found</p>
                      <p className="text-xs mt-1">Execute a workflow to see it here</p>
                    </div>
                  ) : (
                    filteredExecutions.map((execution) => (
                      <div
                        key={execution.execution_id}
                        onClick={() => setSelectedExecution(execution)}
                        className={`p-3 rounded-lg border cursor-pointer transition-all ${
                          selectedExecution?.execution_id === execution.execution_id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            {getStatusIcon(execution.status)}
                            <span className="font-medium text-sm text-gray-900">
                              {execution.workflow_name}
                            </span>
                          </div>
                          {getStatusBadge(execution.status)}
                        </div>
                        <div className="text-xs text-gray-600 space-y-1">
                          <div className="flex items-center justify-between">
                            <span>{formatTimestamp(execution.timestamp)}</span>
                            <span className="text-gray-500">{formatDuration(execution.duration)}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="text-green-600">
                              {execution.completed_nodes}/{execution.total_nodes} nodes
                            </span>
                            {execution.failed_nodes > 0 && (
                              <span className="text-red-600">
                                {execution.failed_nodes} failed
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>

            {/* Execution Details */}
            <div className="flex-1 flex flex-col">
              {selectedExecution ? (
                <>
                  {/* Details Header */}
                  <div className="p-6 border-b bg-gray-50">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {selectedExecution.workflow_name}
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">
                          Execution ID: {selectedExecution.execution_id}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          onClick={() => exportExecution(selectedExecution)}
                          variant="outline"
                          size="sm"
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Export
                        </Button>
                        <Button
                          onClick={() => deleteExecution(selectedExecution.execution_id)}
                          variant="outline"
                          size="sm"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-4">
                      <div>
                        <div className="text-xs text-gray-600 mb-1">Status</div>
                        <div>{getStatusBadge(selectedExecution.status)}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-600 mb-1">Duration</div>
                        <div className="text-sm font-medium">
                          {formatDuration(selectedExecution.duration)}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-600 mb-1">Nodes</div>
                        <div className="text-sm font-medium">
                          {selectedExecution.completed_nodes}/{selectedExecution.total_nodes}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-600 mb-1">Failed</div>
                        <div className="text-sm font-medium text-red-600">
                          {selectedExecution.failed_nodes}
                        </div>
                      </div>
                    </div>

                    {selectedExecution.error && (
                      <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded">
                        <div className="text-xs font-medium text-red-900 mb-1">Error</div>
                        <div className="text-sm text-red-700">{selectedExecution.error}</div>
                      </div>
                    )}
                  </div>

                  {/* Execution Logs */}
                  <ScrollArea className="flex-1 p-6">
                    <div className="space-y-3">
                      <h4 className="text-sm font-semibold text-gray-900 mb-3">Execution Log</h4>
                      {selectedExecution.logs.map((log, index) => (
                        <div key={log.id || index} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                          <div className="flex-shrink-0 mt-0.5">
                            {log.type === 'step_succeeded' && <CheckCircle className="w-4 h-4 text-green-500" />}
                            {log.type === 'step_failed' && <XCircle className="w-4 h-4 text-red-500" />}
                            {log.type === 'step_started' && <Clock className="w-4 h-4 text-blue-500" />}
                            {log.type === 'execution_started' && <Eye className="w-4 h-4 text-blue-600" />}
                            {log.type === 'execution_completed' && <CheckCircle className="w-4 h-4 text-green-600" />}
                            {log.type === 'execution_failed' && <XCircle className="w-4 h-4 text-red-600" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 mb-1">
                              <Badge variant="outline" className="text-xs">
                                {log.type.replace('_', ' ')}
                              </Badge>
                              <span className="text-xs text-gray-500">
                                {new Date(log.timestamp).toLocaleTimeString()}
                              </span>
                            </div>
                            <p className="text-sm text-gray-700 break-words">
                              {log.data.node_name && typeof log.data.node_name === 'string' ? `"${log.data.node_name}" ` : ''}
                              {(log.data.message as string) || (log.data.error as string) || JSON.stringify(log.data)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-gray-500">
                  <div className="text-center">
                    <Eye className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">Select an execution to view details</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Helper function to save execution to history (call this from WorkflowEditor)
export const saveExecutionToHistory = (
  execution_id: string,
  workflow_id: string,
  workflow_name: string,
  startTime: number,
  endTime: number,
  status: 'success' | 'failed' | 'partial',
  total_nodes: number,
  completed_nodes: number,
  failed_nodes: number,
  error?: string,
  logs: LogEntry[] = []
) => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    const history: ExecutionRecord[] = stored ? JSON.parse(stored) : []

    const execution: ExecutionRecord = {
      execution_id,
      workflow_id,
      workflow_name,
      timestamp: new Date().toISOString(),
      duration: endTime - startTime,
      status,
      total_nodes,
      completed_nodes,
      failed_nodes,
      error,
      logs
    }

    // Add to beginning of array (most recent first)
    history.unshift(execution)

    // Keep only most recent MAX_HISTORY_ITEMS
    const trimmed = history.slice(0, MAX_HISTORY_ITEMS)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed))
  } catch (error) {
    console.error('Failed to save execution to history:', error)
  }
}

export default ExecutionHistory
