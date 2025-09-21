export interface QueryNode {
  id: string
  type: 'dataSource' | 'filter' | 'transform' | 'aggregate' | 'join' | 'union'
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
  data?: any[]
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
  defaultData: Record<string, any>
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
]

export default QueryNode