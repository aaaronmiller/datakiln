export interface WorkflowExecution {
  id: string;
  workflow_id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  started_at?: string;
  completed_at?: string;
  results?: WorkflowResults;
}

export interface WorkflowResults {
  [taskId: string]: TaskResult;
}

export interface TaskResult {
  task_id: string;
  task_type: 'deep_research' | 'youtube_transcript' | 'other';
  status: 'success' | 'error';
  data: any;
  error?: string;
  metadata?: {
    execution_time?: number;
    source_url?: string;
    timestamp?: string;
    [key: string]: any;
  };
}

export interface DeepResearchResult {
  query: string;
  mode: 'fast' | 'balanced' | 'comprehensive';
  summary: string;
  findings: Array<{
    title: string;
    content: string;
    sources: string[];
  }>;
  recommendations: string[];
  raw_data?: any;
}

export interface YouTubeAnalysisResult {
  video_url: string;
  video_title: string;
  channel_name: string;
  transcript: Array<{
    timestamp: string;
    text: string;
    speaker?: string;
  }>;
  summary: string;
  key_points: string[];
  analysis: {
    sentiment?: string;
    topics?: string[];
    duration?: string;
  };
  raw_data?: any;
}

export interface ResultDisplayProps {
  execution: WorkflowExecution;
  viewMode: 'summary' | 'detailed' | 'raw';
  onViewModeChange: (mode: 'summary' | 'detailed' | 'raw') => void;
  onExport?: (format: 'json' | 'csv' | 'markdown') => void;
}

export interface ResultCardProps {
  result: TaskResult;
  viewMode: 'summary' | 'detailed' | 'raw';
  isExpanded: boolean;
  onToggleExpand: () => void;
}

export interface ResultFiltersProps {
  filters: {
    workflowType?: string;
    status?: string;
    dateRange?: { start: string; end: string };
  };
  onFiltersChange: (filters: any) => void;
  onSortChange: (sortBy: string, sortOrder: 'asc' | 'desc') => void;
}

export interface ResultExportProps {
  results: WorkflowExecution[];
  onExport: (format: 'json' | 'csv' | 'markdown') => void;
}