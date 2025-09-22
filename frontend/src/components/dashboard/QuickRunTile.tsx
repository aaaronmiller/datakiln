import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card"
import { Button } from "../ui/button"
import { Badge } from "../ui/badge"
import { LoadingSpinner } from "../ui/spinner"
import { Search, FileText, Play, CheckCircle, AlertCircle } from "lucide-react"

interface QuickRunTileProps {
  type: 'deep-research' | 'transcript-analysis';
  onRun: (type: string, data?: Record<string, unknown>) => Promise<void>;
}

const QuickRunTile: React.FC<QuickRunTileProps> = ({ type, onRun }) => {
  const [isRunning, setIsRunning] = React.useState(false);
  const [lastRun, setLastRun] = React.useState<string | null>(null);
  const [status, setStatus] = React.useState<'idle' | 'running' | 'success' | 'error'>('idle');

  const handleRun = async () => {
    setIsRunning(true);
    setStatus('running');

    try {
      await onRun(type);
      setStatus('success');
      setLastRun(new Date().toLocaleTimeString());
    } catch (error) {
      setStatus('error');
      console.error(`Failed to run ${type}:`, error);
    } finally {
      setIsRunning(false);
      // Reset status after 3 seconds
      setTimeout(() => setStatus('idle'), 3000);
    }
  };

  const getTileConfig = () => {
    switch (type) {
      case 'deep-research':
        return {
          title: 'Deep Research',
          description: 'Comprehensive AI-powered research with multiple sources',
          icon: Search,
          color: 'bg-blue-500',
          hoverColor: 'hover:bg-blue-600',
          estimatedTime: '2-5 min'
        };
      case 'transcript-analysis':
        return {
          title: 'Transcript Analysis',
          description: 'Analyze YouTube videos and extract key insights',
          icon: FileText,
          color: 'bg-green-500',
          hoverColor: 'hover:bg-green-600',
          estimatedTime: '1-3 min'
        };
      default:
        return {
          title: 'Unknown',
          description: 'Unknown task type',
          icon: Play,
          color: 'bg-gray-500',
          hoverColor: 'hover:bg-gray-600',
          estimatedTime: 'Unknown'
        };
    }
  };

  const config = getTileConfig();
  const Icon = config.icon;

  return (
    <Card className="h-full transition-all duration-200 hover:shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className={`p-2 rounded-lg ${config.color}`}>
            <Icon className="h-5 w-5 text-white" />
          </div>
          {status !== 'idle' && (
            <Badge
              variant={
                status === 'success' ? 'default' :
                status === 'error' ? 'destructive' :
                'secondary'
              }
              className="text-xs"
            >
              {status === 'running' && <LoadingSpinner className="h-3 w-3 mr-1" />}
              {status === 'success' && <CheckCircle className="h-3 w-3 mr-1" />}
              {status === 'error' && <AlertCircle className="h-3 w-3 mr-1" />}
              {status === 'running' ? 'Running' :
               status === 'success' ? 'Complete' :
               status === 'error' ? 'Failed' : ''}
            </Badge>
          )}
        </div>
        <CardTitle className="text-lg">{config.title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {config.description}
        </p>

        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>Est. time: {config.estimatedTime}</span>
          {lastRun && (
            <span>Last run: {lastRun}</span>
          )}
        </div>

        <Button
          onClick={handleRun}
          disabled={isRunning}
          className={`w-full ${config.hoverColor} transition-colors`}
          size="sm"
        >
          {isRunning ? (
            <>
              <LoadingSpinner className="h-4 w-4 mr-2" />
              Running...
            </>
          ) : (
            <>
              <Play className="h-4 w-4 mr-2" />
              Quick Run
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};

export default QuickRunTile;