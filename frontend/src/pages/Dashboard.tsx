import * as React from "react"
import axios from "axios"
import { QuickRunTile, RecentActivityWidget, QueueStatusWidget, SystemStatusWidget } from "../components/dashboard"
import { useToast } from "../hooks/use-toast"
import websocketService from "../services/websocketService"

interface SystemStatus {
  active_runs: number
  recent_results: number
  system_health: string
  uptime: string
  cpu_usage: number
  memory_usage: number
  last_updated: string
}

interface ActivityItem {
  id: string
  type: 'workflow_completed' | 'research_started' | 'transcript_analyzed' | 'error_occurred'
  title: string
  description: string
  timestamp: string
  status: 'success' | 'warning' | 'error' | 'info'
}

interface QueueStatus {
  pending_jobs: number
  processing_jobs: number
  completed_today: number
  failed_today: number
  average_processing_time: string
  queue_depth: number
  last_updated: string
}

const Dashboard: React.FC = () => {
  const [systemStatus, setSystemStatus] = React.useState<SystemStatus | null>(null)
  const [recentActivity, setRecentActivity] = React.useState<ActivityItem[]>([])
  const [queueStatus, setQueueStatus] = React.useState<QueueStatus | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const { toast } = useToast()

  // Fetch dashboard data
  const fetchDashboardData = React.useCallback(async () => {
    try {
      const [systemRes, activityRes, queueRes] = await Promise.all([
        axios.get('/api/v1/dashboard/system-status'),
        axios.get('/api/v1/dashboard/recent-activity'),
        axios.get('/api/v1/dashboard/queue-status')
      ])

      setSystemStatus(systemRes.data)
      setRecentActivity(activityRes.data.activities)
      setQueueStatus(queueRes.data)
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
      toast({
        title: "Error",
        description: "Failed to load dashboard data",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }, [toast])

  // Handle quick run actions
  const handleQuickRun = async (type: string) => {
    try {
      let endpoint = ''
      let successMessage = ''

      switch (type) {
        case 'deep-research':
          endpoint = '/api/v1/dashboard/quick-run/deep-research'
          successMessage = 'Deep research task started successfully'
          break
        case 'transcript-analysis':
          endpoint = '/api/v1/dashboard/quick-run/transcript-analysis'
          successMessage = 'Transcript analysis task started successfully'
          break
        default:
          throw new Error('Unknown task type')
      }

      const _response = await axios.post(endpoint)
      toast({
        title: "Success",
        description: successMessage,
      })

      // Refresh data after a short delay
      setTimeout(fetchDashboardData, 2000)
    } catch (error) {
      console.error(`Failed to start ${type}:`, error)
      toast({
        title: "Error",
        description: `Failed to start ${type.replace('-', ' ')}`,
        variant: "destructive"
      })
    }
  }

  // WebSocket connection and real-time updates
  React.useEffect(() => {
    // Connect to WebSocket
    websocketService.connect().catch((error) => {
      console.error('Failed to connect to WebSocket:', error)
    })

    // Listen for real-time updates
    const handleSystemStatusUpdate = (data: unknown) => {
      setSystemStatus(data as SystemStatus)
    }

    const handleActivityUpdate = (data: unknown) => {
      setRecentActivity(prev => [data as ActivityItem, ...prev.slice(0, 9)]) // Keep only 10 most recent
    }

    const handleQueueStatusUpdate = (data: unknown) => {
      setQueueStatus(data as QueueStatus)
    }

    websocketService.on('system_status_update', handleSystemStatusUpdate)
    websocketService.on('activity_update', handleActivityUpdate)
    websocketService.on('queue_status_update', handleQueueStatusUpdate)

    return () => {
      websocketService.off('system_status_update', handleSystemStatusUpdate)
      websocketService.off('activity_update', handleActivityUpdate)
      websocketService.off('queue_status_update', handleQueueStatusUpdate)
    }
  }, [])

  // Initial data fetch
  React.useEffect(() => {
    fetchDashboardData()

    // Set up periodic refresh every 30 seconds (fallback for when WebSocket is not available)
    const interval = setInterval(fetchDashboardData, 30000)

    return () => clearInterval(interval)
  }, [fetchDashboardData])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">Welcome back! Here's what's happening with your workflows.</p>
        </div>
        <button
          onClick={fetchDashboardData}
          className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          disabled={isLoading}
        >
          <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {isLoading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* Quick Actions Section */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <QuickRunTile
            type="deep-research"
            onRun={handleQuickRun}
          />
          <QuickRunTile
            type="transcript-analysis"
            onRun={handleQuickRun}
          />

          {/* Additional Quick Actions */}
          <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <svg className="h-5 w-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
                </svg>
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Create Workflow</h3>
                <p className="text-sm text-gray-600">Build a new automation</p>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h3 className="font-medium text-gray-900">View Results</h3>
                <p className="text-sm text-gray-600">Browse recent outputs</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* System Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* System Status */}
        <div className="lg:col-span-1">
          <SystemStatusWidget
            systemData={systemStatus || {
              active_runs: 0,
              recent_results: 0,
              system_health: 'healthy',
              uptime: '2d 14h 32m',
              cpu_usage: 23.5,
              memory_usage: 67.8,
              last_updated: new Date().toISOString()
            }}
            isLoading={isLoading}
          />
        </div>

        {/* Recent Activity */}
        <div className="lg:col-span-1">
          <RecentActivityWidget
            activities={recentActivity}
            isLoading={isLoading}
          />
        </div>

        {/* Queue Status */}
        <div className="lg:col-span-1">
          <QueueStatusWidget
            queueData={queueStatus || {
              pending_jobs: 3,
              processing_jobs: 2,
              completed_today: 15,
              failed_today: 1,
              average_processing_time: '45s',
              queue_depth: 5,
              last_updated: new Date().toISOString()
            }}
            isLoading={isLoading}
          />
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Performance Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600 mb-2">98.5%</div>
            <div className="text-sm text-gray-600">Success Rate</div>
            <div className="text-xs text-gray-500 mt-1">Last 30 days</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600 mb-2">2.3m</div>
            <div className="text-sm text-gray-600">Avg Response Time</div>
            <div className="text-xs text-gray-500 mt-1">Across all workflows</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-600 mb-2">1,247</div>
            <div className="text-sm text-gray-600">Total Executions</div>
            <div className="text-xs text-gray-500 mt-1">This month</div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard