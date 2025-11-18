import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Button } from "./ui/button"

interface QuickRunTileProps {
  title: string
  description: string
  icon: React.ReactNode
  onRun: () => void
  isLoading?: boolean
}

export const QuickRunTile: React.FC<QuickRunTileProps> = ({ title, description, icon, onRun, isLoading }) => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        {icon}
        {title}
      </CardTitle>
    </CardHeader>
    <CardContent>
      <p className="text-sm text-gray-600 mb-4">{description}</p>
      <Button onClick={onRun} disabled={isLoading}>
        {isLoading ? 'Running...' : 'Run'}
      </Button>
    </CardContent>
  </Card>
)

interface RecentActivityWidgetProps {
  activities: Array<{
    id: string
    title: string
    description: string
    timestamp: string
    status: string
  }>
  isLoading?: boolean
}

export const RecentActivityWidget: React.FC<RecentActivityWidgetProps> = ({ activities, isLoading }) => (
  <Card>
    <CardHeader>
      <CardTitle>Recent Activity</CardTitle>
    </CardHeader>
    <CardContent>
      {isLoading ? (
        <p>Loading...</p>
      ) : activities.length === 0 ? (
        <p className="text-sm text-gray-500">No recent activity</p>
      ) : (
        <ul className="space-y-2">
          {activities.map(activity => (
            <li key={activity.id} className="text-sm">
              <div className="font-medium">{activity.title}</div>
              <div className="text-gray-500">{activity.description}</div>
              <div className="text-xs text-gray-400">{activity.timestamp}</div>
            </li>
          ))}
        </ul>
      )}
    </CardContent>
  </Card>
)

interface QueueStatusWidgetProps {
  queueData: {
    pending_jobs: number
    processing_jobs: number
    completed_today: number
    failed_today: number
  }
  isLoading?: boolean
}

export const QueueStatusWidget: React.FC<QueueStatusWidgetProps> = ({ queueData, isLoading }) => (
  <Card>
    <CardHeader>
      <CardTitle>Queue Status</CardTitle>
    </CardHeader>
    <CardContent>
      {isLoading ? (
        <p>Loading...</p>
      ) : (
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-sm">Pending:</span>
            <span className="font-medium">{queueData.pending_jobs || 0}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm">Processing:</span>
            <span className="font-medium">{queueData.processing_jobs || 0}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm">Completed Today:</span>
            <span className="font-medium">{queueData.completed_today || 0}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm">Failed Today:</span>
            <span className="font-medium">{queueData.failed_today || 0}</span>
          </div>
        </div>
      )}
    </CardContent>
  </Card>
)

interface SystemStatusWidgetProps {
  systemData: {
    active_runs: number
    recent_results: number
    system_health: string
    uptime: string
    cpu_usage: number
    memory_usage: number
  } | null
  isLoading?: boolean
}

export const SystemStatusWidget: React.FC<SystemStatusWidgetProps> = ({ systemData, isLoading }) => (
  <Card>
    <CardHeader>
      <CardTitle>System Status</CardTitle>
    </CardHeader>
    <CardContent>
      {isLoading || !systemData ? (
        <p>Loading...</p>
      ) : (
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-sm">Health:</span>
            <span className={`font-medium ${systemData.system_health === 'healthy' ? 'text-green-600' : 'text-red-600'}`}>
              {systemData.system_health}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm">Active Runs:</span>
            <span className="font-medium">{systemData.active_runs}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm">Uptime:</span>
            <span className="font-medium">{systemData.uptime}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm">CPU Usage:</span>
            <span className="font-medium">{systemData.cpu_usage}%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm">Memory:</span>
            <span className="font-medium">{systemData.memory_usage}%</span>
          </div>
        </div>
      )}
    </CardContent>
  </Card>
)
