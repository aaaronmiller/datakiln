import nodeRegistryData from '../../../specs/contracts/NODE_REGISTRY_V1.json'

export interface CustomNodeDefinition {
  type: string
  name: string
  description: string
  version: string
  inputs: string[]
  outputs: string[]
  paramsSchema: Record<string, unknown>
  implementation?: string
  config?: Record<string, unknown>
  metadata?: Record<string, unknown>
}

export interface CustomNodeInfo {
  definition: CustomNodeDefinition
  metadata?: {
    registration_id: string
    created_at: string
    updated_at: string
    user_id?: string
    version: string
    status: string
    usage_count: number
  }
}

export interface NodeRegistryEntry {
  type: string
  version: number
  inputs: string[]
  outputs: string[]
  paramsSchema: {
    type: 'object'
    required?: string[]
    properties: Record<string, unknown>
  }
}

export interface NodeRegistry {
  version: number
  nodes: NodeRegistryEntry[]
}

class NodeRegistryService {
  private registry: NodeRegistry = nodeRegistryData as NodeRegistry
  private nodeTypeMap: Map<string, NodeRegistryEntry> = new Map()
  private customNodes: Map<string, CustomNodeInfo> = new Map()
  private customNodeTypes: Set<string> = new Set()

  constructor() {
    this.initializeNodeTypeMap()
  }

  private initializeNodeTypeMap() {
    this.registry.nodes.forEach(node => {
      this.nodeTypeMap.set(node.type, node)
    })
  }

  getNodeType(type: string): NodeRegistryEntry | undefined {
    // First check built-in nodes
    const builtInNode = this.nodeTypeMap.get(type)
    if (builtInNode) {
      return builtInNode
    }

    // Then check custom nodes
    const customNode = this.getCustomNode(type)
    if (customNode) {
      return {
        type: customNode.definition.type,
        version: 1,
        inputs: customNode.definition.inputs,
        outputs: customNode.definition.outputs,
        paramsSchema: customNode.definition.paramsSchema as any // Type assertion for compatibility
      }
    }

    return undefined
  }

  getAllNodeTypes(): NodeRegistryEntry[] {
    const builtInNodes = this.registry.nodes
    const customNodes = this.getAllCustomNodes().map(nodeInfo => ({
      type: nodeInfo.definition.type,
      version: 1, // Custom nodes start at version 1
      inputs: nodeInfo.definition.inputs,
      outputs: nodeInfo.definition.outputs,
      paramsSchema: nodeInfo.definition.paramsSchema as any // Type assertion for compatibility
    }))

    return [...builtInNodes, ...customNodes]
  }

  getNodeTypesByCategory(): Record<string, NodeRegistryEntry[]> {
    const categories: Record<string, NodeRegistryEntry[]> = {
      provider: [],
      dom_action: [],
      transform: [],
      filter: [],
      aggregate: [],
      join: [],
      union: [],
      condition: [],
      export: [],
      prompt: []
    }

    this.registry.nodes.forEach(node => {
      if (categories[node.type]) {
        categories[node.type].push(node)
      } else {
        // Fallback category
        if (!categories.other) categories.other = []
        categories.other.push(node)
      }
    })

    return categories
  }

  validateNodeParams(nodeType: string, params: Record<string, unknown>): { valid: boolean; errors: string[] } {
    const nodeEntry = this.getNodeType(nodeType)
    if (!nodeEntry) {
      return { valid: false, errors: [`Unknown node type: ${nodeType}`] }
    }

    const errors: string[] = []
    const schema = nodeEntry.paramsSchema

    // Check required fields
    if (schema.required) {
      schema.required.forEach(requiredField => {
        if (!(requiredField in params) || params[requiredField] === undefined || params[requiredField] === null) {
          errors.push(`Missing required field: ${requiredField}`)
        }
      })
    }

    // Validate field types and constraints
    Object.entries(schema.properties).forEach(([fieldName, fieldSchema]) => {
      const value = params[fieldName]
      if (value !== undefined && value !== null) {
        this.validateField(fieldName, value, fieldSchema, errors)
      }
    })

    return { valid: errors.length === 0, errors }
  }

  private validateField(fieldName: string, value: unknown, schema: unknown, errors: string[]) {
    if (typeof schema !== 'object' || schema === null) return

    const fieldSchema = schema as Record<string, unknown>

    // Type validation
    if (fieldSchema.type) {
      const type = fieldSchema.type as string
      if (type === 'string' && typeof value !== 'string') {
        errors.push(`${fieldName} must be a string`)
      } else if (type === 'number' && typeof value !== 'number') {
        errors.push(`${fieldName} must be a number`)
      } else if (type === 'integer' && typeof value === 'number' && !Number.isInteger(value)) {
        errors.push(`${fieldName} must be an integer`)
      } else if (type === 'boolean' && typeof value !== 'boolean') {
        errors.push(`${fieldName} must be a boolean`)
      } else if (type === 'array' && !Array.isArray(value)) {
        errors.push(`${fieldName} must be an array`)
      }
    }

    // Enum validation
    if (fieldSchema.enum && Array.isArray(fieldSchema.enum) && !fieldSchema.enum.includes(value)) {
      errors.push(`${fieldName} must be one of: ${fieldSchema.enum.join(', ')}`)
    }

    // Range validation
    if (typeof value === 'number') {
      const minimum = fieldSchema.minimum as number | undefined
      const maximum = fieldSchema.maximum as number | undefined

      if (minimum !== undefined && value < minimum) {
        errors.push(`${fieldName} must be >= ${minimum}`)
      }
      if (maximum !== undefined && value > maximum) {
        errors.push(`${fieldName} must be <= ${maximum}`)
      }
    }
  }

  getDefaultNodeData(nodeType: string): Record<string, unknown> {
    const nodeEntry = this.getNodeType(nodeType)
    if (!nodeEntry) return {}

    const defaults: Record<string, unknown> = {}

    Object.entries(nodeEntry.paramsSchema.properties).forEach(([fieldName, fieldSchema]) => {
      if (typeof fieldSchema === 'object' && fieldSchema !== null && 'default' in fieldSchema) {
        defaults[fieldName] = (fieldSchema as Record<string, unknown>).default
      }
    })

    return defaults
  }

  getNodeDisplayInfo(nodeType: string): { label: string; icon: string; color: string; description: string } {
    const displayMap: Record<string, { label: string; icon: string; color: string; description: string }> = {
      provider: {
        label: 'AI Provider',
        icon: '🤖',
        color: 'bg-purple-500',
        description: 'Use AI providers like Gemini or Perplexity'
      },
      dom_action: {
        label: 'DOM Action',
        icon: '🖱️',
        color: 'bg-blue-500',
        description: 'Perform DOM interactions like clicking or extracting'
      },
      transform: {
        label: 'Transform',
        icon: '🔄',
        color: 'bg-orange-500',
        description: 'Transform and process data'
      },
      filter: {
        label: 'Filter',
        icon: '🔍',
        color: 'bg-cyan-500',
        description: 'Filter data based on conditions'
      },
      aggregate: {
        label: 'Aggregate',
        icon: '📊',
        color: 'bg-purple-500',
        description: 'Aggregate and summarize data'
      },
      join: {
        label: 'Join',
        icon: '🔗',
        color: 'bg-indigo-500',
        description: 'Join multiple data sources'
      },
      union: {
        label: 'Union',
        icon: '➕',
        color: 'bg-pink-500',
        description: 'Combine multiple data sources'
      },
      condition: {
        label: 'Condition',
        icon: '❓',
        color: 'bg-yellow-500',
        description: 'Branch execution based on conditions'
      },
      export: {
        label: 'Export',
        icon: '💾',
        color: 'bg-red-500',
        description: 'Export data to various formats'
      },
      prompt: {
        label: 'AI Prompt',
        icon: '💬',
        color: 'bg-green-500',
        description: 'Generate AI responses using templates'
      }
    }

    return displayMap[nodeType] || {
      label: nodeType,
      icon: '📦',
      color: 'bg-gray-500',
      description: 'Custom node type'
    }
  }

  // Custom node management methods
  async loadCustomNodes(): Promise<void> {
    try {
      const response = await fetch('/api/v1/custom-nodes/')
      if (response.ok) {
        const customNodes = await response.json()
        this.customNodes.clear()
        this.customNodeTypes.clear()

        customNodes.forEach((node: CustomNodeInfo) => {
          this.customNodes.set(node.definition.type, node)
          this.customNodeTypes.add(node.definition.type)
        })
      }
    } catch (error) {
      console.error('Failed to load custom nodes:', error)
    }
  }

  getCustomNode(type: string): CustomNodeInfo | undefined {
    return this.customNodes.get(type)
  }

  getAllCustomNodes(): CustomNodeInfo[] {
    return Array.from(this.customNodes.values())
  }

  isCustomNode(type: string): boolean {
    return this.customNodeTypes.has(type)
  }

  async registerCustomNode(definition: CustomNodeDefinition): Promise<boolean> {
    try {
      const response = await fetch('/api/v1/custom-nodes/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(definition)
      })

      if (response.ok) {
        await this.loadCustomNodes() // Refresh the cache
        return true
      }
      return false
    } catch (error) {
      console.error('Failed to register custom node:', error)
      return false
    }
  }

  async validateCustomNode(definition: CustomNodeDefinition): Promise<{ valid: boolean; errors: string[] }> {
    try {
      const response = await fetch('/api/v1/custom-nodes/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(definition)
      })

      if (response.ok) {
        return await response.json()
      }
      return { valid: false, errors: ['Validation request failed'] }
    } catch (error) {
      console.error('Failed to validate custom node:', error)
      return { valid: false, errors: ['Network error during validation'] }
    }
  }

}

export const nodeRegistryService = new NodeRegistryService()
export default nodeRegistryService