import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card"
import { Badge } from "../ui/badge"
import { Progress } from "../ui/progress"
import { Server, Activity, Cpu, HardDrive, CheckCircle, AlertTriangle } from "lucide-react"

interface SystemStatusWidgetProps {
  systemData: {
    active_runs: number
    recent_results: number
    system_health: string
    uptime: string
    cpu_usage: number
    memory_usage: number
    last_updated: string
  }
  isLoading?: boolean
}

const SystemStatusWidget: React.FC<SystemStatusWidgetProps> = ({
  systemData,
  isLoading = false
}) => {
  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
            <Server className="h-5 w-5 mr-2" />
            System Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-3 bg-gray-200 rounded w-1/2 mb-1"></div>
                  <div className="h-6 bg-gray-200 rounded w-full"></div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const getHealthStatusColor = (health: string) => {
    if (!health) return 'text-gray-600'
    switch (health.toLowerCase()) {
      case 'healthy':
        return 'text-green-600'
      case 'warning':
        return 'text-yellow-600'
      case 'critical':
        return 'text-red-600'
      default:
        return 'text-gray-600'
    }
  }

  const getHealthIcon = (health: string) => {
    if (!health) return <Activity className="h-4 w-4 text-gray-500" />
    switch (health.toLowerCase()) {
      case 'healthy':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'warning':
      case 'critical':
        return <AlertTriangle className="h-4 w-4 text-red-500" />
      default:
        return <Activity className="h-4 w-4 text-gray-500" />
    }
  }

  const getResourceColor = (usage: number) => {
    if (usage >= 90) return 'text-red-600'
    if (usage >= 70) return 'text-yellow-600'
    return 'text-green-600'
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-lg flex items-center">
          <Server className="h-5 w-5 mr-2" />
          System Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* System Health */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {getHealthIcon(systemData.system_health)}
            <span className="text-sm font-medium">System Health</span>
          </div>
          <Badge
            variant={(systemData.system_health || 'unknown') === 'healthy' ? 'default' : 'destructive'}
            className={`capitalize ${getHealthStatusColor(systemData.system_health)}`}
          >
            {systemData.system_health || 'unknown'}
          </Badge>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className="flex items-center justify-center mb-1">
              <Activity className="h-4 w-4 text-blue-500 mr-1" />
              <span className="text-sm font-medium">Active Runs</span>
            </div>
            <div className="text-2xl font-bold text-blue-600">
              {systemData.active_runs || 0}
            </div>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center mb-1">
              <CheckCircle className="h-4 w-4 text-green-500 mr-1" />
              <span className="text-sm font-medium">Recent Results</span>
            </div>
            <div className="text-2xl font-bold text-green-600">
              {systemData.recent_results || 0}
            </div>
          </div>
        </div>

        {/* Resource Usage */}
        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center">
                <Cpu className="h-4 w-4 text-purple-500 mr-1" />
                <span className="text-sm font-medium">CPU Usage</span>
              </div>
              <span className={`text-sm font-medium ${getResourceColor(systemData.cpu_usage || 0)}`}>
                {(systemData.cpu_usage || 0).toFixed(1)}%
              </span>
            </div>
            <Progress value={systemData.cpu_usage || 0} className="h-2" />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center">
                <HardDrive className="h-4 w-4 text-orange-500 mr-1" />
                <span className="text-sm font-medium">Memory Usage</span>
              </div>
              <span className={`text-sm font-medium ${getResourceColor(systemData.memory_usage || 0)}`}>
                {(systemData.memory_usage || 0).toFixed(1)}%
              </span>
            </div>
            <Progress value={systemData.memory_usage || 0} className="h-2" />
          </div>
        </div>

        {/* System Info */}
        <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Uptime</span>
            <span className="font-medium">{systemData.uptime || '0d 0h 0m'}</span>
          </div>
        </div>

        <div className="text-xs text-gray-500 text-center">
           Last updated: {new Date(systemData.last_updated || new Date()).toLocaleTimeString()}
         </div>
      </CardContent>
    </Card>
  )
}

export default SystemStatusWidget