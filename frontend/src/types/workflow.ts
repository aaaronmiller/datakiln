// Workflow Node Types matching backend implementation
export interface WorkflowNode {
  id: string
  type: 'dom_action' | 'prompt' | 'provider' | 'transform' | 'export' | 'condition'
  position: { x: number; y: number }
  data: {
    label: string
    description?: string
    // Common properties
    name: string
    retries?: number
    timeout?: number
    tags?: string[]
    // Node-specific properties
    selector_key?: string
    action?: 'click' | 'fill' | 'waitForVisible' | 'copy' | 'extract'
    value?: string
    assert_type?: 'visible' | 'hidden' | 'text' | 'value'
    assert_value?: string
    template_id?: string
    vars?: Record<string, any>
    provider_type?: 'gemini_deep_research' | 'gemini_canvas' | 'perplexity'
    mode?: string
    transform_type?: 'markdown' | 'extract_citations' | 'merge' | 'filter' | 'json_transform' | 'text_clean'
    format?: 'md_yaml' | 'json' | 'markdown' | 'yaml' | 'csv' | 'txt'
    path_key?: string
    expr?: string
    true_next?: string | string[]
    false_next?: string | string[]
    // UI properties
    color?: string
    icon?: string
  }
}

export interface WorkflowEdge {
  id: string
  source: string
  target: string
  sourceHandle?: string
  targetHandle?: string
}

export interface WorkflowGraph {
  name: string
  description?: string
  start_node: string
  nodes: Record<string, WorkflowNode>
  edges?: WorkflowEdge[]
  connections?: Array<{from: string, to: string}>
  created_at?: string
}

export interface WorkflowExecutionOptions {
  execution_id?: string
  query?: string
  start_time?: string
  browser_context?: any
  [key: string]: any
}

export interface WorkflowExecutionResult {
  success: boolean
  execution_id?: string
  execution_time?: number
  result?: any
  error?: string
  performance?: any
  timestamp?: string
  artifacts?: Array<{
    node_id: string
    node_type: string
    outputs: Record<string, any>
    execution_time?: number
    timestamp: string
  }>
}

export interface WorkflowNodeType {
  type: string
  label: string
  icon: string
  color: string
  category: 'input' | 'action' | 'process' | 'output' | 'control'
  description: string
  defaultData: Record<string, any>
  inputs: number
  outputs: number
  configSchema: Record<string, any>
}

export const WORKFLOW_NODE_TYPES: WorkflowNodeType[] = [
  {
    type: 'dom_action',
    label: 'DOM Action',
    icon: '🖱️',
    color: 'bg-blue-500',
    category: 'action',
    description: 'Perform DOM interactions like clicking, filling, or extracting content',
    defaultData: {
      name: 'DOM Action',
      action: 'click',
      retries: 3,
      timeout: 10000
    },
    inputs: 1,
    outputs: 1,
    configSchema: {
      selector_key: { type: 'string', required: true },
      action: { type: 'select', options: ['click', 'fill', 'waitForVisible', 'copy', 'extract'] },
      value: { type: 'string' },
      assert_type: { type: 'select', options: ['visible', 'hidden', 'text', 'value'] },
      assert_value: { type: 'string' }
    }
  },
  {
    type: 'prompt',
    label: 'AI Prompt',
    icon: '💬',
    color: 'bg-green-500',
    category: 'process',
    description: 'Generate AI responses using templates and variables',
    defaultData: {
      name: 'AI Prompt',
      max_tokens: 1000,
      temperature: 0.7
    },
    inputs: 1,
    outputs: 1,
    configSchema: {
      template_id: { type: 'string', required: true },
      vars: { type: 'object' },
      system_message: { type: 'string' },
      max_tokens: { type: 'number', default: 1000 },
      temperature: { type: 'number', default: 0.7 },
      model: { type: 'string' }
    }
  },
  {
    type: 'provider',
    label: 'AI Provider',
    icon: '🤖',
    color: 'bg-purple-500',
    category: 'process',
    description: 'Use AI providers like Gemini or Perplexity with specific modes',
    defaultData: {
      name: 'AI Provider',
      provider_type: 'gemini_deep_research',
      max_tokens: 4000,
      temperature: 0.7
    },
    inputs: 1,
    outputs: 1,
    configSchema: {
      provider_type: {
        type: 'select',
        required: true,
        options: ['gemini_deep_research', 'gemini_canvas', 'perplexity']
      },
      mode: { type: 'string' },
      model: { type: 'string' },
      research_depth: { type: 'select', options: ['fast', 'balanced', 'comprehensive'] },
      canvas_mode: { type: 'select', options: ['create', 'edit', 'analyze'] }
    }
  },
  {
    type: 'transform',
    label: 'Transform',
    icon: '🔄',
    color: 'bg-orange-500',
    category: 'process',
    description: 'Transform and process data in various ways',
    defaultData: {
      name: 'Transform Data',
      transform_type: 'markdown'
    },
    inputs: 1,
    outputs: 1,
    configSchema: {
      transform_type: {
        type: 'select',
        required: true,
        options: ['markdown', 'extract_citations', 'merge', 'filter', 'json_transform', 'text_clean']
      },
      input_key: { type: 'string' },
      output_key: { type: 'string', default: 'transformed' }
    }
  },
  {
    type: 'export',
    label: 'Export',
    icon: '💾',
    color: 'bg-red-500',
    category: 'output',
    description: 'Export data to various formats and destinations',
    defaultData: {
      name: 'Export Data',
      format: 'json',
      include_metadata: true
    },
    inputs: 1,
    outputs: 0,
    configSchema: {
      format: {
        type: 'select',
        required: true,
        options: ['md_yaml', 'json', 'markdown', 'yaml', 'csv', 'txt']
      },
      path_key: { type: 'string', required: true },
      pretty_print: { type: 'boolean', default: true },
      include_timestamp: { type: 'boolean', default: true }
    }
  },
  {
    type: 'condition',
    label: 'Condition',
    icon: '❓',
    color: 'bg-yellow-500',
    category: 'control',
    description: 'Branch workflow execution based on conditions',
    defaultData: {
      name: 'Condition Check',
      condition_type: 'simple'
    },
    inputs: 1,
    outputs: 2, // true and false branches
    configSchema: {
      expr: { type: 'string', required: true },
      condition_type: { type: 'select', options: ['simple', 'python', 'jsonpath', 'regex'] },
      true_next: { type: 'string' },
      false_next: { type: 'string' }
    }
  }
]

// Selector types for DOM actions
export interface SelectorDefinition {
  key: string
  selector: string
  selector_type: 'css' | 'xpath'
  description?: string
  provider?: string
  context?: string
  fallback_selectors?: string[]
  attributes?: Record<string, any>
}

export interface SelectorsRegistry {
  selectors: Record<string, SelectorDefinition>
  provider_mappings: Record<string, string[]>
  context_mappings: Record<string, string[]>
  total_selectors: number
}

// Template types for prompt nodes
export interface PromptTemplate {
  id: string
  name: string
  template: string
  description?: string
  variables: string[]
  category: string
  created_at: string
}

// Provider status types
export interface ProviderStatus {
  providers: Record<string, any>
  usage_stats: Record<string, any>
  default_provider?: string
}

// Execution history types
export interface ExecutionHistoryItem {
  execution_id: string
  timestamp: string
  success: boolean
  execution_time: number
  workflow_name?: string
  details?: any
}

// Workflow validation types
export interface WorkflowValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
  timestamp: string
}

export default WorkflowNode