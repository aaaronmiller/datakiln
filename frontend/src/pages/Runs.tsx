import React, { useState, useEffect, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Select } from '../components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs'
import { Progress } from '../components/ui/progress'
import { Play, Square, Eye, FileText, Clock, Filter, Search, MoreVertical } from "lucide-react"
import sseService from '../services/sseService'

interface RunEvent {
  event: string
  data: Record<string, unknown>
}

interface RunStatus {
  id: string
  status: 'running' | 'completed' | 'failed' | 'cancelled'
  progress: number
  currentNode?: string
  startedAt: string
  completedAt?: string
  error?: string
  nodeProgress: { [nodeId: string]: 'pending' | 'running' | 'completed' | 'failed' }
}

const Runs: React.FC = () => {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState("active")
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [runs, setRuns] = useState<RunStatus[]>([])

  useEffect(() => {
    // Mock data for demonstration
    const mockRuns: RunStatus[] = [
      {
        id: "run-001",
        status: "running",
        progress: 65,
        currentNode: "data-processor-1",
        startedAt: "2024-01-15T14:30:00Z",
        nodeProgress: {
          "data-source-1": "completed",
          "data-processor-1": "running",
          "export-1": "pending"
        }
      },
      {
        id: "run-002",
        status: "completed",
        progress: 100,
        startedAt: "2024-01-15T13:15:00Z",
        completedAt: "2024-01-15T13:45:00Z",
        nodeProgress: {
          "provider-1": "completed",
          "transform-1": "completed",
          "export-1": "completed"
        }
      },
      {
        id: "run-003",
        status: "failed",
        progress: 30,
        startedAt: "2024-01-15T12:00:00Z",
        completedAt: "2024-01-15T12:10:00Z",
        error: "DOM selector not found",
        nodeProgress: {
          "provider-1": "completed",
          "dom-action-1": "failed"
        }
      }
    ]
    setRuns(mockRuns)
  }, [])

  const handleSSEMessage = useCallback((_message: RunEvent) => {
    // SSE handling logic placeholder
  }, [])

  useEffect(() => {
    sseService.on('message', handleSSEMessage)
    return () => sseService.off('message', handleSSEMessage)
  }, [handleSSEMessage])

  const filteredRuns = runs.filter(run => {
    const matchesSearch = run.id.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "all" || run.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const activeRuns = filteredRuns.filter(run => run.status === "running")
  const completedRuns = filteredRuns.filter(run => run.status !== "running")

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'default'
      case 'completed': return 'secondary'
      case 'failed': return 'destructive'
      case 'cancelled': return 'outline'
      default: return 'outline'
    }
  }

  const getNodeStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'bg-blue-500'
      case 'completed': return 'bg-green-500'
      case 'failed': return 'bg-red-500'
      default: return 'bg-gray-300'
    }
  }

  const handleViewLogs = (runId: string) => {
    navigate(`/runs/${runId}/logs`)
  }

  const handleViewResults = (runId: string) => {
    navigate(`/results?run=${runId}`)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Runs</h1>
          <p className="text-gray-600 mt-1">Monitor and manage workflow executions</p>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline" size="sm">
            <Play className="h-4 w-4 mr-2" />
            Batch Execute
          </Button>
          <Button variant="outline" size="sm">
            <Clock className="h-4 w-4 mr-2" />
            Schedule Run
          </Button>
        </div>
      </div>

      {/* Tabs and Filters */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between mb-6">
          <TabsList>
            <TabsTrigger value="active">
              Active Runs ({activeRuns.length})
            </TabsTrigger>
            <TabsTrigger value="history">
              Run History ({completedRuns.length})
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search runs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-64"
              />
            </div>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="pl-10 w-32">
                <option value="all">All Status</option>
                <option value="running">Running</option>
                <option value="completed">Completed</option>
                <option value="failed">Failed</option>
              </Select>
            </div>
          </div>
        </div>

        {/* Active Runs Tab */}
        <TabsContent value="active" className="space-y-4">
          {activeRuns.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Play className="h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Active Runs</h3>
                <p className="text-gray-600 text-center mb-4">
                  Start a workflow to see real-time execution monitoring here.
                </p>
                <Button onClick={() => navigate("/workflows")}>
                  Browse Workflows
                </Button>
              </CardContent>
            </Card>
          ) : (
            activeRuns.map(run => (
              <Card key={run.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">Run {run.id.slice(-8)}</CardTitle>
                      <p className="text-sm text-gray-600">
                        Started {new Date(run.startedAt).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Badge variant={getStatusColor(run.status)}>
                        {run.status.toUpperCase()}
                      </Badge>
                      <Button variant="outline" size="sm">
                        <Square className="h-4 w-4 mr-1" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Progress</span>
                      <span>{Math.round(run.progress)}%</span>
                    </div>
                    <Progress value={run.progress} className="h-2" />
                  </div>

                  {run.currentNode && (
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                      <span>Executing: <span className="font-medium">{run.currentNode}</span></span>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2">
                    {Object.entries(run.nodeProgress).map(([nodeId, status]) => (
                      <div key={nodeId} className="flex items-center space-x-2">
                        <div className={`w-2 h-2 rounded-full ${getNodeStatusColor(status)}`} />
                        <span className="text-xs text-gray-600">{nodeId}</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm" onClick={() => handleViewLogs(run.id)}>
                      <FileText className="h-4 w-4 mr-1" />
                      View Logs
                    </Button>
                    <Button variant="outline" size="sm">
                      <Eye className="h-4 w-4 mr-1" />
                      Monitor Live
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Run History Tab */}
        <TabsContent value="history" className="space-y-4">
          {completedRuns.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileText className="h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Run History</h3>
                <p className="text-gray-600 text-center">
                  Completed runs will appear here.
                </p>
              </CardContent>
            </Card>
          ) : (
            completedRuns.map(run => (
              <Card key={run.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">Run {run.id.slice(-8)}</CardTitle>
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <span>Started: {new Date(run.startedAt).toLocaleString()}</span>
                        {run.completedAt && (
                          <span>Completed: {new Date(run.completedAt).toLocaleString()}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Badge variant={getStatusColor(run.status)}>
                        {run.status.toUpperCase()}
                      </Badge>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Final Progress</span>
                      <span>{Math.round(run.progress)}%</span>
                    </div>
                    <Progress value={run.progress} className="h-2" />
                  </div>

                  {run.error && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                      <p className="text-sm text-red-800">
                        <strong>Error:</strong> {run.error}
                      </p>
                    </div>
                  )}

                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm" onClick={() => handleViewLogs(run.id)}>
                      <FileText className="h-4 w-4 mr-1" />
                      View Logs
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleViewResults(run.id)}>
                      <Eye className="h-4 w-4 mr-1" />
                      View Results
                    </Button>
                    <Button variant="outline" size="sm">
                      Rerun
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default Runs