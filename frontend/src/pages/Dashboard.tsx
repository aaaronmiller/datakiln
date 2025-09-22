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
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <button
          onClick={fetchDashboardData}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          disabled={isLoading}
        >
          {isLoading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* Quick Run Tiles */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <QuickRunTile
          type="deep-research"
          onRun={handleQuickRun}
        />
        <QuickRunTile
          type="transcript-analysis"
          onRun={handleQuickRun}
        />
      </div>

      {/* Main Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* System Status */}
        <div className="lg:col-span-1">
          <SystemStatusWidget
            systemData={systemStatus || {
              active_runs: 0,
              recent_results: 0,
              system_health: 'unknown',
              uptime: '0d 0h 0m',
              cpu_usage: 0,
              memory_usage: 0,
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
              pending_jobs: 0,
              processing_jobs: 0,
              completed_today: 0,
              failed_today: 0,
              average_processing_time: '0s',
              queue_depth: 0,
              last_updated: new Date().toISOString()
            }}
            isLoading={isLoading}
          />
        </div>
      </div>
    </div>
  )
}

export default Dashboard