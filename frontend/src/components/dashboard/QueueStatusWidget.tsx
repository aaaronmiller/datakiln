import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card"
import { Badge } from "../ui/badge"
import { Progress } from "../ui/progress"
import { Clock, CheckCircle, AlertTriangle, Zap } from "lucide-react"

interface QueueStatusWidgetProps {
  queueData: {
    pending_jobs: number
    processing_jobs: number
    completed_today: number
    failed_today: number
    average_processing_time: string
    queue_depth: number
    last_updated: string
  }
  isLoading?: boolean
}

const QueueStatusWidget: React.FC<QueueStatusWidgetProps> = ({
  queueData,
  isLoading = false
}) => {
  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
            <Clock className="h-5 w-5 mr-2" />
            Queue Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-3/4"></div>
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

  const totalJobs = queueData.pending_jobs + queueData.processing_jobs
  const successRate = queueData.completed_today > 0
    ? ((queueData.completed_today / (queueData.completed_today + queueData.failed_today)) * 100)
    : 0

  const getQueueStatusColor = () => {
    if (queueData.pending_jobs > 10) return "text-red-600"
    if (queueData.pending_jobs > 5) return "text-yellow-600"
    return "text-green-600"
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-lg flex items-center">
          <Clock className="h-5 w-5 mr-2" />
          Queue Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Queue Depth Indicator */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Queue Depth</span>
            <Badge variant={queueData.queue_depth > 50 ? "destructive" : "secondary"}>
              {queueData.queue_depth}
            </Badge>
          </div>
          <Progress
            value={Math.min((queueData.queue_depth / 100) * 100, 100)}
            className="h-2"
          />
        </div>

        {/* Job Statistics */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className="flex items-center justify-center mb-1">
              <Clock className="h-4 w-4 text-blue-500 mr-1" />
              <span className="text-sm font-medium">Pending</span>
            </div>
            <div className={`text-2xl font-bold ${getQueueStatusColor()}`}>
              {queueData.pending_jobs}
            </div>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center mb-1">
              <Zap className="h-4 w-4 text-orange-500 mr-1" />
              <span className="text-sm font-medium">Processing</span>
            </div>
            <div className="text-2xl font-bold text-orange-600">
              {queueData.processing_jobs}
            </div>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center mb-1">
              <CheckCircle className="h-4 w-4 text-green-500 mr-1" />
              <span className="text-sm font-medium">Completed</span>
            </div>
            <div className="text-2xl font-bold text-green-600">
              {queueData.completed_today}
            </div>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center mb-1">
              <AlertTriangle className="h-4 w-4 text-red-500 mr-1" />
              <span className="text-sm font-medium">Failed</span>
            </div>
            <div className="text-2xl font-bold text-red-600">
              {queueData.failed_today}
            </div>
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Success Rate</span>
            <span className="text-sm text-gray-600">
              {successRate.toFixed(1)}%
            </span>
          </div>
          <Progress value={successRate} className="h-2 mb-3" />

          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Avg. Processing Time</span>
            <span className="font-medium">{queueData.average_processing_time}</span>
          </div>
        </div>

        <div className="text-xs text-gray-500 text-center">
          Last updated: {new Date(queueData.last_updated).toLocaleTimeString()}
        </div>
      </CardContent>
    </Card>
  )
}

export default QueueStatusWidget