import React, { useState, useEffect, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Select } from '../components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs'
import { Progress } from '../components/ui/progress'
import { Play, Square, Eye, FileText, Clock, Filter, Search, MoreVertical, Trash2, RefreshCw } from "lucide-react"
import resultsService, { RunResult } from '../services/resultsService'
import { useNotifications } from '../stores/uiStore'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu"

const Runs: React.FC = () => {
  const navigate = useNavigate()
  const { add: addNotification } = useNotifications()
  const [activeTab, setActiveTab] = useState("active")
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [runs, setRuns] = useState<RunResult[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const loadRuns = useCallback(async () => {
    setIsLoading(true)
    try {
      // Fetch separate lists for active vs history might be better, but for now fetch all
      // We'll fetch a larger limit to simulate "all" for this view
      const data = await resultsService.getResults(100, 0, statusFilter === 'all' ? undefined : statusFilter)
      setRuns(data.results)
    } catch (error) {
      console.error("Failed to load runs:", error)
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to load runs'
      })
    } finally {
      setIsLoading(false)
    }
  }, [statusFilter, addNotification])

  useEffect(() => {
    loadRuns()
    // Poll every 5 seconds for updates if there are active runs
    const interval = setInterval(loadRuns, 5000)
    return () => clearInterval(interval)
  }, [loadRuns])

  const handleCancelRun = async (runId: string) => {
    try {
      await resultsService.cancelRun(runId)
      addNotification({
        type: 'success',
        title: 'Run Cancelled',
        message: 'Cancellation request sent'
      })
      loadRuns()
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to cancel run'
      })
    }
  }

  const handleDeleteRun = async (runId: string) => {
    if (!confirm('Are you sure you want to delete this run history?')) return

    try {
      await resultsService.deleteResult(runId)
      addNotification({
        type: 'success',
        title: 'Run Deleted',
        message: 'Run history deleted successfully'
      })
      loadRuns()
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to delete run'
      })
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'default'
      case 'completed': return 'secondary'
      case 'failed': return 'destructive'
      case 'cancelled': return 'outline'
      default: return 'outline'
    }
  }

  const handleViewLogs = (runId: string) => {
    // navigate(`/runs/${runId}/logs`) // Log viewer not implemented yet?
    // Use results view for now
    navigate(`/results?run=${runId}`)
  }

  const handleViewResults = (runId: string) => {
    navigate(`/results?run=${runId}`)
  }

  // Filter client-side for search term (server-side search would be better)
  const filteredRuns = runs.filter(run => {
    const searchString = `${run.execution_id} ${run.workflow_id}`.toLowerCase()
    return searchString.includes(searchTerm.toLowerCase())
  })

  // Split into active and history
  const activeRuns = filteredRuns.filter(run => run.status === 'running')
  const completedRuns = filteredRuns.filter(run => run.status !== 'running')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Runs</h1>
          <p className="text-gray-600 mt-1">Monitor and manage workflow executions</p>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline" size="sm" onClick={loadRuns} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate('/workflows')}>
            <Play className="h-4 w-4 mr-2" />
            New Run
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
                placeholder="Search ID or Workflow..."
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
                <option value="cancelled">Cancelled</option>
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
              <Card key={run.execution_id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">Run {run.execution_id.slice(0, 8)}</CardTitle>
                      <p className="text-sm text-gray-600">
                        Workflow: {run.workflow_id} • Started {new Date(run.started_at).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Badge variant={getStatusColor(run.status)}>
                        {run.status.toUpperCase()}
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCancelRun(run.execution_id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Square className="h-4 w-4 mr-1" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    {/* Progress bar placeholder - need granular progress from backend if available */}
                    <div className="flex justify-between text-sm mb-2">
                      <span>Status</span>
                      <span>Running</span>
                    </div>
                    <Progress value={50} className="h-2 animate-pulse" />
                  </div>

                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm" onClick={() => handleViewResults(run.execution_id)}>
                      <Eye className="h-4 w-4 mr-1" />
                      View Details
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
              <Card key={run.execution_id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">Run {run.execution_id.slice(0, 8)}</CardTitle>
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <span>Started: {new Date(run.started_at).toLocaleString()}</span>
                        {run.completed_at && (
                          <span>Completed: {new Date(run.completed_at).toLocaleString()}</span>
                        )}
                        {run.duration && (
                          <span>Duration: {run.duration.toFixed(2)}s</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Badge variant={getStatusColor(run.status)}>
                        {run.status.toUpperCase()}
                      </Badge>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleViewResults(run.execution_id)}>
                            <Eye className="mr-2 h-4 w-4" />
                            View
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDeleteRun(run.execution_id)} className="text-red-600">
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">

                  {run.error && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                      <p className="text-sm text-red-800">
                        <strong>Error:</strong> {run.error}
                      </p>
                    </div>
                  )}

                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm" onClick={() => handleViewResults(run.execution_id)}>
                      <Eye className="h-4 w-4 mr-1" />
                      View Results
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteRun(run.execution_id)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
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