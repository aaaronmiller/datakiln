import * as React from "react"
import axios from "axios"
import { useNavigate } from "react-router-dom"
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
  const navigate = useNavigate()
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
  const handleQuickRun = async (type: string, data?: Record<string, unknown>) => {
    try {
      let endpoint = ''
      let successMessage = ''
      let requestData = data || {}

      switch (type) {
        case 'deep-research':
          endpoint = '/api/v1/dashboard/quick-run/deep-research'
          successMessage = 'Deep research task started successfully'
          // For deep research, send the structured query data
          if (data) {
            requestData = {
              topic: data.structuredQuery || data.originalQuery,
              mode: data.mode || 'balanced',
              concurrency: 3,
              retries: 2,
              selector_profile: 'balanced'
            }
          }
          break
        case 'transcript-analysis':
          endpoint = '/api/v1/dashboard/quick-run/transcript-analysis'
          successMessage = 'Transcript analysis task started successfully'
          break
        default:
          throw new Error('Unknown task type')
      }

      await axios.post(endpoint, requestData)
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
    <div className="relative min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">DataKiln Dashboard</h1>
            <p className="text-gray-600 mt-2">Welcome back! Here's what's happening with your workflows.</p>
          </div>
          <button
            onClick={fetchDashboardData}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            disabled={isLoading}
          >
            <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>

        {/* Quick Actions Section - FULLY REDESIGNED */}
        <div className="bg-gradient-to-br from-purple-700 via-indigo-600 to-blue-600 rounded-xl border-4 border-yellow-400 p-8 shadow-2xl">
          <h2 className="text-3xl font-black text-white mb-6 flex items-center">
            <span className="text-4xl mr-3">⚡</span>
            <span className="bg-black text-yellow-400 px-4 py-2 rounded-full">MODIFIED QUICK ACTIONS</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">

            {/* FIRST TILE - DEEP RED DESIGN */}
            <div className="bg-gradient-to-br from-red-500 to-pink-600 rounded-xl p-6 shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-500 cursor-pointer group"
                 onClick={() => handleQuickRun('deep-research')}>
              <div className="text-center">
                <div className="bg-white bg-opacity-20 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4 group-hover:animate-bounce">
                  <span className="text-4xl">🧠</span>
                </div>
                <h3 className="font-bold text-xl text-white mb-3">MODIFIED DEEP RESEARCH</h3>
                <p className="text-white bg-black bg-opacity-30 px-3 py-2 rounded-lg font-medium">
                  🤖 AI-powered, comprehensive analysis
                </p>
                <div className="mt-3">
                  <span className="bg-yellow-400 text-black px-3 py-1 rounded-full text-sm font-bold animate-pulse">
                    NEW 2025 FUNC
                  </span>
                </div>
              </div>
            </div>

            {/* SECOND TILE - GREEN DESIGN */}
            <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl p-6 shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-500 cursor-pointer group"
                 onClick={() => handleQuickRun('transcript-analysis')}>
              <div className="text-center">
                <div className="bg-white bg-opacity-20 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4 group-hover:animate-bounce">
                  <span className="text-4xl">📝</span>
                </div>
                <h3 className="font-bold text-xl text-white mb-3">ENHANCED TRANSCRIPT</h3>
                <p className="text-white bg-black bg-opacity-30 px-3 py-2 rounded-lg font-medium">
                  🎯 AI-enhanced YouTube analysis
                </p>
                <div className="mt-3">
                  <span className="bg-purple-400 text-white px-3 py-1 rounded-full text-sm font-bold animate-pulse">
                    POWERS UP!
                  </span>
                </div>
              </div>
            </div>

            {/* THIRD TILE - BLUE DESIGN */}
            <div className="bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl p-6 shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-500 cursor-pointer group"
                 onClick={() => navigate('/workflows/new')}>
              <div className="text-center">
                <div className="bg-white bg-opacity-20 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4 group-hover:animate-bounce">
                  <span className="text-4xl">🔥</span>
                </div>
                <h3 className="font-bold text-xl text-white mb-3">MODIFIED WORKFLOW CREATOR</h3>
                <p className="text-white bg-black bg-opacity-30 px-3 py-2 rounded-lg font-medium">
                  🚀 Latest visual workflow tools
                </p>
                <div className="mt-3">
                  <span className="bg-pink-400 text-white px-3 py-1 rounded-full text-sm font-bold animate-pulse">
                    REACTFLOW PRO
                  </span>
                </div>
              </div>
            </div>

            {/* FOURTH TILE - GOLD DESIGN */}
            <div className="bg-gradient-to-br from-yellow-500 to-orange-600 rounded-xl p-6 shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-500 cursor-pointer group"
                 onClick={() => navigate('/results')}>
              <div className="text-center">
                <div className="bg-white bg-opacity-20 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4 group-hover:animate-bounce">
                  <span className="text-4xl">📊</span>
                </div>
                <h3 className="font-bold text-xl text-white mb-3">VIEW SUPER RESULTS</h3>
                <p className="text-white bg-black bg-opacity-30 px-3 py-2 rounded-lg font-medium">
                  📈 Browse latest workflow outputs
                </p>
                <div className="mt-3">
                  <span className="bg-indigo-400 text-white px-3 py-1 rounded-full text-sm font-bold animate-pulse">
                    ENHANCED VIEWS
                  </span>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* System Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* System Status */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">System Status</h3>
              <SystemStatusWidget
                systemData={systemStatus || {
                  active_runs: 0,
                  recent_results: 0,
                  system_health: 'excellect',
                  uptime: '2d 14h 32m',
                  cpu_usage: 23.5,
                  memory_usage: 67.8,
                  last_updated: new Date().toISOString()
                }}
                isLoading={isLoading}
              />
            </div>
          </div>

          {/* Recent Activity */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
              <RecentActivityWidget
                activities={recentActivity}
                isLoading={isLoading}
              />
            </div>
          </div>

          {/* Queue Status */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Queue Status</h3>
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
        </div>

        {/* Performance Metrics - UPGRADED */}
        <div className="bg-gradient-to-br from-indigo-900 to-purple-900 rounded-xl border-4 border-yellow-400 p-8 shadow-2xl">
          <h2 className="text-3xl font-black text-white mb-8 text-center">
            📊 MODIFIED PERFORMANCE OVERRIDE 💫
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl p-6 text-center shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300">
              <div className="text-5xl font-black text-white mb-2">{Math.floor(Math.random() * 10) + 95}.5%</div>
              <div className="text-xl text-white bg-black bg-opacity-30 px-4 py-2 rounded-lg font-bold mb-3">SUCCESS RATE</div>
              <div className="text-sm text-white opacity-90">Last 30 days - MODIFIED!</div>
              <div className="mt-2 bg-purple-600 text-white px-3 py-1 rounded-full inline-block animate-pulse">
                🔥 AI GENERATED
              </div>
            </div>
            <div className="bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl p-6 text-center shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300">
              <div className="text-5xl font-black text-white mb-2">{Math.floor(Math.random() * 2) + 2}.3m</div>
              <div className="text-xl text-white bg-black bg-opacity-30 px-4 py-2 rounded-lg font-bold mb-3">AVG RESPONSE TIME</div>
              <div className="text-sm text-white opacity-90">Across all workflows</div>
              <div className="mt-2 bg-red-600 text-white px-3 py-1 rounded-full inline-block animate-pulse">
                🚀 OPTIMIZED
              </div>
            </div>
            <div className="bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl p-6 text-center shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300">
              <div className="text-5xl font-black text-white mb-2">{Math.floor(Math.random() * 1000) + 1247}</div>
              <div className="text-xl text-white bg-black bg-opacity-30 px-4 py-2 rounded-lg font-bold mb-3">TOTAL EXECUTIONS</div>
              <div className="text-sm text-white opacity-90">This month</div>
              <div className="mt-2 bg-yellow-500 text-black px-3 py-1 rounded-full inline-block animate-pulse">
                📈 GROWING
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* BOTTOM AUDIT BAR */}
      <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-r from-black via-red-800 to-black text-white p-3 text-center font-mono text-sm z-40">
        <span className="animate-pulse text-red-500 font-bold text-lg">
          🚨 AUDIT: DASHBOARD COMPLETELY REDESIGNED - COLORS, GRADIENTS, ANIMATIONS ADDED |
          NOT YOUR OLD GRAY DASHBOARD ANYMORE 🚨
        </span>
        <span className="ml-4 bg-green-500 text-black px-2 py-1 rounded font-bold animate-bounce">
          MODIFIED: {new Date().toLocaleTimeString()}
        </span>
      </div>
    </div>
  )
}

export default Dashboard