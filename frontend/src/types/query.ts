// Import Node type from ReactFlow
import { Node } from '@xyflow/react'

// ReactFlow Node data interface for QueryNode
export interface QueryNodeData extends Record<string, unknown> {
  id: string
  type: QueryNodeType['type']
  position: { x: number; y: number }
  label: string
  source?: string
  condition?: string
  transformation?: string
  aggregation?: string
  joinType?: 'inner' | 'left' | 'right' | 'full'
  joinCondition?: string
  // Advanced node properties
  provider?: string
  connection?: string
  schema?: { tables?: Array<{ name: string; columns: Array<{ name: string; type: string }> }> }
  filterType?: 'basic' | 'advanced' | 'regex'
  columns?: string[]
  operation?: string
  language?: string
  outputSchema?: string
  functions?: string[]
  groupBy?: string[]
  output?: string
  tables?: Array<{ name: string; columns: Array<{ name: string; type: string }> }>
  inputCount?: number
  unionMode?: string
  model?: string
  task?: string
  features?: string[]
  rules?: Array<{ name: string; condition: string }>
  strict?: boolean
  maxIterations?: string
  loopVariable?: string
  expression?: string
  truePath?: string
  falsePath?: string
  customType?: string
  script?: boolean
  inputs?: Array<{ name: string; type: string }>
  outputs?: Array<{ name: string; type: string }>
  // Additional ReactFlow-compatible properties
  status?: 'idle' | 'pending' | 'running' | 'completed' | 'error'
  onParameterChange?: (name: string, value: unknown) => void
  onDelete?: () => void
  onOpenEditor?: () => void
  isSelected?: boolean
  queryGraph?: {
    nodes: QueryNode[]
    connections: QueryEdge[]
  }
}

// ReactFlow-compatible QueryNode interface extending ReactFlow Node
export interface ReactFlowQueryNode extends Node {
  data: QueryNodeData
}

// Legacy QueryNode interface for backward compatibility
export interface QueryNode {
  id: string
  type: QueryNodeType['type']
  position: { x: number; y: number }
  data: {
    label: string
    source?: string
    condition?: string
    transformation?: string
    aggregation?: string
    joinType?: 'inner' | 'left' | 'right' | 'full'
    joinCondition?: string
  }
}

export interface QueryEdge {
  id: string
  source: string
  target: string
  sourceHandle?: string
  targetHandle?: string
}

export interface QueryGraph {
  nodes: QueryNode[]
  edges: QueryEdge[]
}

export interface DataSource {
  id: string
  name: string
  type: 'database' | 'api' | 'file' | 'stream'
  connection?: {
    host?: string
    port?: number
    database?: string
    username?: string
    password?: string
  }
  schema?: {
    tables: Array<{
      name: string
      columns: Array<{
        name: string
        type: string
        nullable: boolean
      }>
    }>
  }
}

export interface QueryExecutionResult {
  success: boolean
  data?: unknown[]
  error?: string
  executionTime: number
  rowsAffected?: number
}

export interface QueryNodeType {
  type: string
  label: string
  icon: string
  color: string
  category: 'input' | 'transform' | 'output'
  description: string
  defaultData: Record<string, unknown>
  inputs: number
  outputs: number
}

export const QUERY_NODE_TYPES: QueryNodeType[] = [
  {
    type: 'dataSource',
    label: 'Data Source',
    icon: '📊',
    color: 'bg-green-500',
    category: 'input',
    description: 'Connect to a data source',
    defaultData: { source: 'Select data source' },
    inputs: 0,
    outputs: 1,
  },
  {
    type: 'filter',
    label: 'Filter',
    icon: '🔍',
    color: 'bg-blue-500',
    category: 'transform',
    description: 'Filter data based on conditions',
    defaultData: { condition: 'Define filter condition' },
    inputs: 1,
    outputs: 1,
  },
  {
    type: 'transform',
    label: 'Transform',
    icon: '⚡',
    color: 'bg-orange-500',
    category: 'transform',
    description: 'Transform data structure',
    defaultData: { transformation: 'Define transformation' },
    inputs: 1,
    outputs: 1,
  },
  {
    type: 'aggregate',
    label: 'Aggregate',
    icon: '📈',
    color: 'bg-purple-500',
    category: 'transform',
    description: 'Aggregate data using functions',
    defaultData: { aggregation: 'Define aggregation' },
    inputs: 1,
    outputs: 1,
  },
  {
    type: 'join',
    label: 'Join',
    icon: '🔗',
    color: 'bg-indigo-500',
    category: 'transform',
    description: 'Join data from multiple sources',
    defaultData: { joinType: 'inner', joinCondition: 'Define join condition' },
    inputs: 2,
    outputs: 1,
  },
  {
    type: 'union',
    label: 'Union',
    icon: '🔀',
    color: 'bg-pink-500',
    category: 'transform',
    description: 'Combine data from multiple sources',
    defaultData: {},
    inputs: 2,
    outputs: 1,
  },
  {
    type: 'ml',
    label: 'ML Analysis',
    icon: '🤖',
    color: 'bg-cyan-500',
    category: 'transform',
    description: 'Machine learning analysis',
    defaultData: {},
    inputs: 1,
    outputs: 1,
  },
  {
    type: 'nlp',
    label: 'NLP Processing',
    icon: '💬',
    color: 'bg-teal-500',
    category: 'transform',
    description: 'Natural language processing',
    defaultData: {},
    inputs: 1,
    outputs: 1,
  },
  {
    type: 'validation',
    label: 'Validation',
    icon: '✅',
    color: 'bg-red-500',
    category: 'transform',
    description: 'Data validation',
    defaultData: {},
    inputs: 1,
    outputs: 1,
  },
  {
    type: 'loop',
    label: 'Loop',
    icon: '🔄',
    color: 'bg-yellow-500',
    category: 'transform',
    description: 'Iterative processing',
    defaultData: {},
    inputs: 1,
    outputs: 1,
  },
  {
    type: 'condition',
    label: 'Condition',
    icon: '⚡',
    color: 'bg-gray-500',
    category: 'transform',
    description: 'Conditional logic',
    defaultData: {},
    inputs: 1,
    outputs: 2,
  },
  {
    type: 'custom',
    label: 'Custom',
    icon: '🛠️',
    color: 'bg-violet-500',
    category: 'transform',
    description: 'Custom node',
    defaultData: {},
    inputs: 1,
    outputs: 1,
  },
]

// Template interface for workflow templates
export interface Template {
  id: string
  name: string
  description?: string
  category?: string
  nodes?: QueryNode[]
  edges?: QueryEdge[]
  nodesCount?: number
}

// Provider interface for AI providers
export interface Provider {
  id: string
  name: string
  description?: string
  status: 'active' | 'inactive' | 'error'
  type?: string
  config?: Record<string, unknown>
  capabilities?: string[]
}
export default QueryNode