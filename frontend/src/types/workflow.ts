// Import Node type from ReactFlow
import { Node } from '@xyflow/react'

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
    vars?: Record<string, unknown>
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
    // Runtime status
    status?: 'pending' | 'running' | 'completed' | 'error'
    parameters?: Record<string, unknown>
  } & Record<string, unknown>
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
   browser_context?: unknown
   [key: string]: unknown
 }

export interface WorkflowExecutionResult {
   success: boolean
   execution_id?: string
   execution_time?: number
   result?: unknown
   error?: string
   performance?: unknown
   timestamp?: string
   artifacts?: Array<{
     node_id: string
     node_type: string
     outputs: Record<string, unknown>
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
   defaultData: Record<string, unknown>
   inputs: number
   outputs: number
   configSchema: Record<string, unknown>
 }

export const WORKFLOW_NODE_TYPES: WorkflowNodeType[] = [
  {
    type: 'dataSource',
    label: 'Data Source',
    icon: '📡',
    color: 'bg-cyan-500',
    category: 'input',
    description: 'Fetch data from URLs, files, APIs, databases, or use mock data for testing',
    defaultData: {
      name: 'Data Source',
      source_type: 'mock',
      output_key: 'data'
    },
    inputs: 0,
    outputs: 1,
    configSchema: {
      source_type: {
        type: 'select', required: true,
        options: ['mock', 'url', 'file', 'api'],
        default: 'mock'
      },
      url: { type: 'string', dependsOn: { source_type: ['url', 'api'] } },
      file_path: { type: 'string', dependsOn: { source_type: ['file'] } },
      method: { type: 'select', options: ['GET', 'POST', 'PUT', 'DELETE'], default: 'GET', dependsOn: { source_type: ['url', 'api'] } },
      headers: { type: 'object', dependsOn: { source_type: ['url', 'api'] } },
      body: { type: 'text', dependsOn: { source_type: ['url', 'api'] } },
      mock_data: { type: 'json', dependsOn: { source_type: ['mock'] } },
      output_key: { type: 'string', default: 'data' }
    }
  },
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
        type: 'select', required: true,
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
        type: 'select', required: true,
        options: ['markdown', 'extract_citations', 'merge', 'filter', 'json_transform', 'text_clean']
      },
      input_key: { type: 'string' },
      output_key: { type: 'string', default: 'transformed' },
      regex_pattern: { type: 'string', dependsOn: { transform_type: ['json_transform'] } },
      replacement: { type: 'string', dependsOn: { transform_type: ['json_transform'] } }
    }
  },
  {
    type: 'filter',
    label: 'Filter',
    icon: '🔍',
    color: 'bg-teal-500',
    category: 'process',
    description: 'Filter data based on conditions, regex, JSONPath, or range checks',
    defaultData: {
      name: 'Filter Data',
      filter_type: 'condition'
    },
    inputs: 1,
    outputs: 1,
    configSchema: {
      filter_type: {
        type: 'select', required: true,
        options: ['condition', 'regex', 'jsonpath', 'range', 'type', 'exists']
      },
      condition: { type: 'string', dependsOn: { filter_type: ['condition'] } },
      regex_pattern: { type: 'string', dependsOn: { filter_type: ['regex'] } },
      regex_field: { type: 'string', dependsOn: { filter_type: ['regex'] } },
      jsonpath_query: { type: 'string', dependsOn: { filter_type: ['jsonpath'] } },
      range_field: { type: 'string', dependsOn: { filter_type: ['range'] } },
      min_value: { type: 'number', dependsOn: { filter_type: ['range'] } },
      max_value: { type: 'number', dependsOn: { filter_type: ['range'] } },
      input_key: { type: 'string' },
      output_key: { type: 'string', default: 'filtered' }
    }
  },
  {
    type: 'aggregate',
    label: 'Aggregate',
    icon: '📊',
    color: 'bg-indigo-500',
    category: 'process',
    description: 'Aggregate and group data with functions like count, sum, avg, min, max',
    defaultData: {
      name: 'Aggregate Data',
      functions: ['count'],
      output_key: 'aggregated'
    },
    inputs: 1,
    outputs: 1,
    configSchema: {
      functions: {
        type: 'multi-select',
        options: ['count', 'sum', 'avg', 'min', 'max', 'first', 'last', 'concat'],
        default: ['count']
      },
      group_by: { type: 'array' },
      input_key: { type: 'string' },
      output_key: { type: 'string', default: 'aggregated' },
      field_mappings: { type: 'object' }
    }
  },
  {
    type: 'join',
    label: 'Join',
    icon: '🔗',
    color: 'bg-violet-500',
    category: 'process',
    description: 'Join two data streams on matching keys (inner, left, right, outer)',
    defaultData: {
      name: 'Join Data',
      join_type: 'inner',
      output_key: 'joined'
    },
    inputs: 2,
    outputs: 1,
    configSchema: {
      join_type: {
        type: 'select', required: true,
        options: ['inner', 'left', 'right', 'outer'],
        default: 'inner'
      },
      left_join_key: { type: 'string', default: 'id' },
      right_join_key: { type: 'string', default: 'id' },
      left_input_key: { type: 'string', default: 'left' },
      right_input_key: { type: 'string', default: 'right' },
      output_key: { type: 'string', default: 'joined' },
      select_fields: { type: 'array' }
    }
  },
  {
    type: 'union',
    label: 'Union',
    icon: '➕',
    color: 'bg-pink-500',
    category: 'process',
    description: 'Combine multiple data arrays into a single array',
    defaultData: {
      name: 'Union Data',
      union_mode: 'distinct',
      output_key: 'unioned'
    },
    inputs: 2,
    outputs: 1,
    configSchema: {
      input_keys: { type: 'array' },
      output_key: { type: 'string', default: 'unioned' },
      union_mode: {
        type: 'select', options: ['distinct', 'all'],
        default: 'distinct'
      },
      align_fields: { type: 'boolean', default: true }
    }
  },
  {
    type: 'condition',
    label: 'Condition',
    icon: '❓',
    color: 'bg-yellow-500',
    category: 'control',
    description: 'Branch workflow execution based on DKEL conditions',
    defaultData: {
      name: 'Condition Check',
      condition_type: 'simple'
    },
    inputs: 1,
    outputs: 2,
    configSchema: {
      expr: { type: 'string', required: true },
      condition_type: { type: 'select', options: ['simple', 'python', 'jsonpath', 'regex'] },
      true_next: { type: 'string' },
      false_next: { type: 'string' }
    }
  },
  {
    type: 'export',
    label: 'Export',
    icon: '💾',
    color: 'bg-red-500',
    category: 'output',
    description: 'Export data to JSON, CSV, Markdown, YAML, or text files',
    defaultData: {
      name: 'Export Data',
      format: 'json',
      include_metadata: true
    },
    inputs: 1,
    outputs: 0,
    configSchema: {
      format: {
        type: 'select', required: true,
        options: ['json', 'csv', 'markdown', 'yaml', 'txt']
      },
      path_key: { type: 'string', required: true, placeholder: '/path/to/output.json' },
      input_key: { type: 'string' },
      pretty_print: { type: 'boolean', default: true },
      include_timestamp: { type: 'boolean', default: true },
      include_metadata: { type: 'boolean', default: true },
      md_title: { type: 'string', dependsOn: { format: ['markdown'] } },
      csv_delimiter: { type: 'string', default: ',', dependsOn: { format: ['csv'] } }
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
   attributes?: Record<string, unknown>
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
   providers: Record<string, unknown>
   usage_stats: Record<string, unknown>
   default_provider?: string
 }

// Execution history types
export interface ExecutionHistoryItem {
   execution_id: string
   timestamp: string
   success: boolean
   execution_time: number
   workflow_name?: string
   details?: unknown
 }

// Workflow validation types
export interface WorkflowValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
  timestamp: string
}

// ReactFlow-compatible WorkflowNode interface extending ReactFlow Node
export interface ReactFlowWorkflowNode extends Node {
  data: WorkflowNode['data']
}

export default WorkflowNode