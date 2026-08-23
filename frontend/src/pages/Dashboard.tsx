import * as React from "react"
import axios from "axios"
import { useNavigate } from "react-router-dom"
import { motion } from "framer-motion"
import { QuickRunTile, RecentActivityWidget, QueueStatusWidget, SystemStatusWidget } from "../components/dashboard"
import { useToast } from "../hooks/use-toast"
import websocketService from "../services/websocketService"
import resultsService from "../services/resultsService"
import nodeRegistryService from "../services/nodeRegistryService"
import WorkflowRunDialog from "../components/workflow/WorkflowRunDialog"
import { Plus, BarChart2 } from "lucide-react"

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

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
}

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1 }
}

const Dashboard: React.FC = () => {
  const navigate = useNavigate()
  const [systemStatus, setSystemStatus] = React.useState<SystemStatus | null>(null)
  const [recentActivity, setRecentActivity] = React.useState<ActivityItem[]>([])
  const [queueStatus, setQueueStatus] = React.useState<QueueStatus | null>(null)
  const [topWorkflows, setTopWorkflows] = React.useState<Array<{ id: string, count: number, name?: string, description?: string }>>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const { toast } = useToast()

  const [runDialog, setRunDialog] = React.useState<{ isOpen: boolean, id: string, name?: string }>({
    isOpen: false,
    id: ''
  })

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return "Good morning"
    if (hour < 18) return "Good afternoon"
    return "Good evening"
  }

  const fetchDashboardData = React.useCallback(async () => {
    try {
      // Parallel Fetch
      const [systemRes, activityRes, queueRes, topWfRes] = await Promise.all([
        axios.get('/api/v1/dashboard/system-status'),
        axios.get('/api/v1/dashboard/recent-activity'),
        axios.get('/api/v1/dashboard/queue-status'),
        resultsService.getTopWorkflows(4)
      ])

      setSystemStatus(systemRes.data)
      setRecentActivity(activityRes.data.activities)
      setQueueStatus(queueRes.data)

      await nodeRegistryService.loadCustomNodes()
      const customNodes = nodeRegistryService.getAllCustomNodes()

      const enrichedWorkflows = topWfRes.map(wf => {
        const customNode = customNodes.find(n => n.definition.type === wf.workflow_id)
        return {
          id: wf.workflow_id,
          count: wf.count,
          name: customNode?.definition.name || wf.workflow_id,
          description: customNode?.definition.description
        }
      })

      // Default System Workflows if list is empty
      if (!enrichedWorkflows.find(w => w.id === 'deep-research')) {
        enrichedWorkflows.unshift({ id: 'deep-research', count: 0, name: 'Deep Research', description: 'Comprehensive AI-powered research' })
      }

      setTopWorkflows(enrichedWorkflows.slice(0, 4))
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
      toast({
        title: "Connection Error",
        description: "Could not sync with DataKiln engine.",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }, [toast])

  const handleTileClick = async (id: string) => {
    const wf = topWorkflows.find(w => w.id === id)
    setRunDialog({
      isOpen: true,
      id: id,
      name: wf?.name
    })
  }

  const handleExecuteWorkflow = async (inputs: Record<string, unknown>) => {
    const type = runDialog.id
    try {
      let endpoint = `/api/v1/workflows/execute`
      let requestData: any = {
        workflow_id: type,
        inputs: inputs
      }

      if (type === 'deep-research') {
        endpoint = '/api/v1/dashboard/quick-run/deep-research'
        requestData = {
          topic: inputs.query || inputs.input || 'Research Topic',
          mode: inputs.depth || 'balanced',
          concurrency: 3,
          retries: 2,
          selector_profile: 'balanced'
        }
      }

      await axios.post(endpoint, requestData)
      toast({
        title: "Workflow Initiated",
        description: `Sequence ${type} has started.`,
      })
      setTimeout(fetchDashboardData, 2000)
    } catch (error) {
      console.error(`Failed to start ${type}:`, error)
      toast({
        title: "Execution Failed",
        description: `Could not start workflow. Check logs.`,
        variant: "destructive"
      })
      throw error
    }
  }

  const handleDeleteActivity = async (id: string) => {
    try {
      await resultsService.deleteResult(id)
      fetchDashboardData()
      toast({ title: "Record Deleted", description: "Activity log removed." })
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete record.", variant: "destructive" })
    }
  }

  const handleViewActivity = (id: string) => {
    navigate(`/results/${id}`)
  }

  const handleCancelActivity = async (id: string) => {
    try {
      await resultsService.cancelRun(id)
      toast({ title: "Run Cancelled", description: "Cancellation request sent." })
      fetchDashboardData()
    } catch (e) {
      toast({ title: "Error", description: "Failed to cancel run.", variant: "destructive" })
    }
  }

  React.useEffect(() => {
    websocketService.connect().catch(console.error)
    const handleSystem = (data: unknown) => setSystemStatus(data as SystemStatus)
    const handleActivity = (data: unknown) => setRecentActivity(prev => [data as ActivityItem, ...prev.slice(0, 9)])
    const handleQueue = (data: unknown) => setQueueStatus(data as QueueStatus)

    websocketService.on('system_status_update', handleSystem)
    websocketService.on('activity_update', handleActivity)
    websocketService.on('queue_status_update', handleQueue)

    return () => {
      websocketService.off('system_status_update', handleSystem)
      websocketService.off('activity_update', handleActivity)
      websocketService.off('queue_status_update', handleQueue)
    }
  }, [])

  React.useEffect(() => {
    fetchDashboardData()
    const interval = setInterval(fetchDashboardData, 30000)
    return () => clearInterval(interval)
  }, [fetchDashboardData])

  return (
    <motion.div
      className="space-y-8 p-6 max-w-7xl mx-auto"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Hero Section */}
      <motion.div variants={itemVariants} className="flex flex-col md:flex-row justify-between items-end md:items-center pb-6 border-b border-border/50">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-foreground mb-2">
            {getGreeting()}, Explorer.
          </h1>
          <p className="text-lg text-muted-foreground">
            The Kiln is ready. define a new Virtual API or run an existing sequence.
          </p>
        </div>
        <div className="mt-4 md:mt-0">
          <div className="flex items-center space-x-2 text-sm font-mono text-muted-foreground bg-surface-secondary px-3 py-1 rounded-full border border-border">
            <span className={`w-2 h-2 rounded-full ${systemStatus?.system_health === 'healthy' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-red-500'}`}></span>
            <span>Engine: {systemStatus?.system_health?.toUpperCase() || 'OFFLINE'}</span>
          </div>
        </div>
      </motion.div>

      {/* Quick Launchpad */}
      <motion.div variants={itemVariants}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <span className="w-1 h-6 bg-accent rounded-full"></span>
            Launchpad
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {topWorkflows.map((wf) => (
            <QuickRunTile
              key={wf.id}
              type={wf.id}
              title={wf.name}
              description={wf.description}
              onRun={() => handleTileClick(wf.id)}
            />
          ))}

          {/* Action Tiles */}
          <motion.div whileHover={{ y: -4 }} whileTap={{ scale: 0.98 }} className="h-full">
            <div
              className="bg-surface rounded-xl border border-border/60 p-5 hover:border-primary/50 hover:shadow-glow transition-all cursor-pointer h-full flex flex-col justify-center items-center gap-3 group"
              onClick={() => navigate('/workflows/new')}
            >
              <div className="p-3 bg-primary/10 rounded-full group-hover:bg-primary/20 transition-colors">
                <Plus className="h-6 w-6 text-primary" />
              </div>
              <span className="font-semibold text-foreground">New Workflow</span>
            </div>
          </motion.div>

          <motion.div whileHover={{ y: -4 }} whileTap={{ scale: 0.98 }} className="h-full">
            <div
              className="bg-surface rounded-xl border border-border/60 p-5 hover:border-primary/50 hover:shadow-glow transition-all cursor-pointer h-full flex flex-col justify-center items-center gap-3 group"
              onClick={() => navigate('/results')}
            >
              <div className="p-3 bg-accent/10 rounded-full group-hover:bg-accent/20 transition-colors">
                <BarChart2 className="h-6 w-6 text-accent" />
              </div>
              <span className="font-semibold text-foreground">View Results</span>
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* Data Grid */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <SystemStatusWidget
            systemData={systemStatus || {
              active_runs: 0,
              recent_results: 0,
              system_health: 'healthy',
              uptime: '0s',
              cpu_usage: 0,
              memory_usage: 0,
              last_updated: new Date().toISOString()
            }}
            isLoading={isLoading}
          />
        </div>
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
        <div className="lg:col-span-1">
          <RecentActivityWidget
            activities={recentActivity}
            isLoading={isLoading}
            onDelete={handleDeleteActivity}
            onView={handleViewActivity}
            onCancel={handleCancelActivity}
          />
        </div>
      </motion.div>

      <WorkflowRunDialog
        isOpen={runDialog.isOpen}
        onClose={() => setRunDialog(prev => ({ ...prev, isOpen: false }))}
        onRun={handleExecuteWorkflow}
        workflowId={runDialog.id}
        workflowName={runDialog.name}
      />
    </motion.div>
  )
}

export default Dashboard