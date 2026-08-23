import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card"
import { Button } from "../ui/button"
import { Badge } from "../ui/badge"
import { LoadingSpinner } from "../ui/spinner"
import { Search, FileText, Play, CheckCircle, AlertCircle, Zap } from "lucide-react"

interface QuickRunTileProps {
  type: string;
  title?: string;
  description?: string;
  icon?: React.ElementType;
  color?: string;
  onRun: (type: string, data?: Record<string, unknown>) => Promise<void> | void;
}

const QuickRunTile: React.FC<QuickRunTileProps> = ({
  type,
  title,
  description,
  icon,
  color,
  onRun
}) => {
  const [isRunning, setIsRunning] = React.useState(false);
  const [lastRun, setLastRun] = React.useState<string | null>(null);
  const [status, setStatus] = React.useState<'idle' | 'running' | 'success' | 'error'>('idle');

  const handleRun = async () => {
    // Optimistic UI interaction
    const result = onRun(type);

    if (result instanceof Promise) {
      setIsRunning(true);
      setStatus('running');
      try {
        await result;
        setStatus('success');
        setLastRun(new Date().toLocaleTimeString());
      } catch (error) {
        setStatus('error');
      } finally {
        setIsRunning(false);
        setTimeout(() => setStatus('idle'), 3000);
      }
    }
  };

  const getTileConfig = () => {
    if (title) {
      // Dynamic generic icon mapping
      let defaultIcon = Zap
      let colorClass = 'bg-primary text-white' // Default Primary

      if (type === 'deep-research') {
        defaultIcon = Search
        colorClass = 'bg-blue-500 text-white'
      } else if (type.includes('youtube') || type.includes('transcript')) {
        defaultIcon = FileText
        colorClass = 'bg-red-500 text-white'
      }

      return {
        title,
        description: description || 'Automated Workflow',
        icon: icon || defaultIcon,
        colorClass: colorClass
      };
    }
    return {
      title: type,
      description: 'Custom Workflow',
      icon: Play,
      colorClass: 'bg-gray-500 text-white'
    };
  };

  const config = getTileConfig();
  const Icon = config.icon as any;

  return (
    <motion.div
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      whileTap={{ scale: 0.98 }}
      className="h-full"
    >
      <Card className="h-full border-border/60 hover:border-primary/50 transition-colors shadow-sm hover:shadow-glow duration-300 bg-surface">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className={`p-2.5 rounded-xl shadow-inner ${config.colorClass}`}>
              <Icon className="h-5 w-5" strokeWidth={2} />
            </div>

            <AnimatePresence mode="wait">
              {status !== 'idle' && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                >
                  <Badge
                    variant={status === 'success' ? 'default' : status === 'error' ? 'destructive' : 'secondary'}
                    className="text-xs px-2 py-0.5"
                  >
                    {status === 'running' && <LoadingSpinner className="h-3 w-3 mr-1" />}
                    {status === 'success' && <CheckCircle className="h-3 w-3 mr-1" />}
                    {status === 'running' ? 'Running' : status === 'success' ? 'Done' : 'Failed'}
                  </Badge>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <CardTitle className="text-lg font-bold mt-3 tracking-tight">{config.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground line-clamp-2 min-h-[2.5em]">
            {config.description}
          </p>

          <div className="flex items-center justify-between text-xs text-muted-foreground font-mono">
            {lastRun ? (
              <span className="flex items-center gap-1">
                Run: {lastRun}
              </span>
            ) : (
              <span>Ready to run</span>
            )}
          </div>

          <Button
            onClick={handleRun}
            disabled={isRunning}
            className="w-full bg-surface-secondary text-foreground hover:bg-primary hover:text-white border border-border transition-all duration-300 group"
            size="sm"
          >
            {isRunning ? (
              <>
                <LoadingSpinner className="h-4 w-4 mr-2" />
                Processing...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2 text-primary group-hover:text-white transition-colors" />
                Launch
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default QuickRunTile;