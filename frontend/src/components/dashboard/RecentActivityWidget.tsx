import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card"
import { Badge } from "../ui/badge"
import { ScrollArea } from "../ui/scroll-area"
import { Activity, CheckCircle, AlertCircle, Clock, Play, Trash2, Eye, XCircle } from "lucide-react"
import { Button } from "../ui/button"


interface ActivityItem {
  id: string
  type: string
  title: string
  description: string
  timestamp: string
  status: 'success' | 'warning' | 'error' | 'info' | 'running' | 'pending'
}

interface RecentActivityWidgetProps {
  activities: ActivityItem[]
  isLoading?: boolean
  onDelete?: (id: string) => void
  onView?: (id: string) => void
  onCancel?: (id: string) => void
}

const RecentActivityWidget: React.FC<RecentActivityWidgetProps> = ({
  activities,
  isLoading = false,
  onDelete,
  onView,
  onCancel
}) => {

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge variant="default" className="text-xs bg-green-500 hover:bg-green-600">Success</Badge>
      case 'error':
        return <Badge variant="destructive" className="text-xs">Error</Badge>
      case 'running':
        return <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800 animate-pulse">Running</Badge>
      case 'pending':
        return <Badge variant="outline" className="text-xs">Pending</Badge>
      default:
        return <Badge variant="outline" className="text-xs">Info</Badge>
    }
  }

  const formatTimestamp = (timestamp: string) => {
    if (!timestamp) return ''
    const date = new Date(timestamp)
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  if (isLoading) {
    return (
      <Card className="h-full border-border/60">
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
            <Activity className="h-5 w-5 mr-2" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="h-full border-border/60 shadow-sm bg-surface">
      <CardHeader>
        <CardTitle className="text-lg flex items-center">
          <Activity className="h-5 w-5 mr-2 text-primary" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-80 pr-4">

          <div className="space-y-4">
            {(!activities || activities.length === 0) ? (
              <div className="text-center text-muted-foreground py-8">
                <p className="text-sm">No recent activity</p>
              </div>
            ) : (
              activities.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start space-x-3 p-3 rounded-xl bg-surface-secondary border border-transparent hover:border-primary/20 transition-all group relative"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-semibold text-foreground truncate">
                        {activity.title}
                      </p>
                      {getStatusBadge(activity.status)}
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      {activity.description}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-[10px] text-muted-foreground font-mono bg-white/50 px-1.5 rounded">
                        {formatTimestamp(activity.timestamp)}
                      </span>
                    </div>
                  </div>

                  {/* Actions overlay on hover */}
                  <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity absolute right-2 top-2 bg-white/90 p-1 rounded-lg backdrop-blur-sm shadow-sm border border-gray-100">
                    {onView && (
                      <Button variant="ghost" size="icon" className="h-6 w-6 hover:text-primary" onClick={() => onView(activity.id)} title="View Details">
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                    )}

                    {(activity.status === 'running' || activity.status === 'pending') && onCancel && (
                      <Button variant="ghost" size="icon" className="h-6 w-6 hover:text-orange-500" onClick={() => onCancel(activity.id)} title="Cancel">
                        <XCircle className="h-3.5 w-3.5" />
                      </Button>
                    )}

                    {onDelete && (
                      <Button variant="ghost" size="icon" className="h-6 w-6 hover:text-red-500" onClick={() => onDelete(activity.id)} title="Delete">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

        </ScrollArea>
      </CardContent>
    </Card >
  )
}

export default RecentActivityWidget