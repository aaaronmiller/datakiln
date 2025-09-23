import { Template, QueryNode, QueryEdge } from '../types/query'
import { WorkflowNode } from '../stores/workflowStore'

export interface WorkflowTemplate extends Template {
  category: string
  createdAt: string
  updatedAt: string
  parameters?: TemplateParameter[]
}

interface TemplateParameter {
  id: string
  name: string
  type: 'string' | 'number' | 'boolean' | 'array' | 'object'
  defaultValue: any
  description: string
  nodeId: string
  paramKey: string
}

export class WorkflowTemplateService {
  private templates: WorkflowTemplate[] = [
    {
      id: '1',
      name: 'Data Analysis Pipeline',
      description: 'Complete data processing workflow with validation and ML analysis',
      category: 'Analytics',
      nodes: [
        {
          id: '1',
          type: 'dataSource',
          position: { x: 100, y: 100 },
          data: { label: 'Input Data', source: 'Database' }
        },
        {
          id: '2',
          type: 'validation',
          position: { x: 300, y: 100 },
          data: { label: 'Data Validation' }
        },
        {
          id: '3',
          type: 'ml',
          position: { x: 500, y: 100 },
          data: { label: 'ML Analysis' }
        }
      ],
      edges: [
        { id: 'e1-2', source: '1', target: '2' },
        { id: 'e2-3', source: '2', target: '3' }
      ],
      createdAt: '2025-01-01T00:00:00Z',
      updatedAt: '2025-01-01T00:00:00Z'
    },
    {
      id: '2',
      name: 'Research Assistant',
      description: 'Automated research workflow for content analysis',
      category: 'Research',
      nodes: [
        {
          id: '1',
          type: 'dataSource',
          position: { x: 100, y: 100 },
          data: { label: 'Web Content', source: 'API' }
        },
        {
          id: '2',
          type: 'nlp',
          position: { x: 300, y: 100 },
          data: { label: 'Text Processing' }
        }
      ],
      edges: [
        { id: 'e1-2', source: '1', target: '2' }
      ],
      createdAt: '2025-01-01T00:00:00Z',
      updatedAt: '2025-01-01T00:00:00Z'
    }
  ]

  async getTemplates(): Promise<WorkflowTemplate[]> {
    // Simulate API call
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(this.templates)
      }, 100)
    })
  }

  async getTemplate(id: string): Promise<WorkflowTemplate | null> {
    // Simulate API call
    return new Promise((resolve) => {
      setTimeout(() => {
        const template = this.templates.find(t => t.id === id)
        resolve(template || null)
      }, 100)
    })
  }

  async createTemplate(template: Omit<WorkflowTemplate, 'id' | 'createdAt' | 'updatedAt'>): Promise<WorkflowTemplate> {
    // Simulate API call
    return new Promise((resolve) => {
      setTimeout(() => {
        const newTemplate: WorkflowTemplate = {
          ...template,
          id: Date.now().toString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
        this.templates.push(newTemplate)
        resolve(newTemplate)
      }, 100)
    })
  }

  async updateTemplate(id: string, updates: Partial<WorkflowTemplate>): Promise<WorkflowTemplate | null> {
    // Simulate API call
    return new Promise((resolve) => {
      setTimeout(() => {
        const index = this.templates.findIndex(t => t.id === id)
        if (index === -1) {
          resolve(null)
          return
        }

        this.templates[index] = {
          ...this.templates[index],
          ...updates,
          updatedAt: new Date().toISOString()
        }
        resolve(this.templates[index])
      }, 100)
    })
  }

  async deleteTemplate(id: string): Promise<boolean> {
    // Simulate API call
    return new Promise((resolve) => {
      setTimeout(() => {
        const index = this.templates.findIndex(t => t.id === id)
        if (index === -1) {
          resolve(false)
          return
        }

        this.templates.splice(index, 1)
        resolve(true)
      }, 100)
    })
  }

  createTemplateFromWorkflow(
    workflow: { nodes: WorkflowNode[], edges: any[] },
    name: string,
    description: string,
    category: string
  ): WorkflowTemplate {
    // Convert workflow to template format
    const templateNodes = workflow.nodes.map(node => ({
      id: node.id,
      type: node.type,
      position: node.position,
      data: { ...node.data }
    }))

    const template: WorkflowTemplate = {
      id: Date.now().toString(),
      name,
      description,
      category,
      nodes: templateNodes,
      edges: workflow.edges,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      parameters: this.identifyTemplateParameters(workflow.nodes)
    }

    return template
  }

  private identifyTemplateParameters(nodes: WorkflowNode[]): TemplateParameter[] {
    const parameters: TemplateParameter[] = []

    nodes.forEach(node => {
      if (node.data.parameters) {
        Object.entries(node.data.parameters).forEach(([key, value]) => {
          // Identify parameters that should be templated
          // For now, we'll parameterize string values that look like they could be user inputs
          if (typeof value === 'string' && this.shouldParameterizeValue(value, key)) {
            parameters.push({
              id: `${node.id}_${key}`,
              name: `${node.data.label || node.type} ${key}`,
              type: 'string',
              defaultValue: value,
              description: `Parameter for ${key} in ${node.data.label || node.type}`,
              nodeId: node.id,
              paramKey: key
            })
          }
        })
      }
    })

    return parameters
  }

  private shouldParameterizeValue(value: string, key: string): boolean {
    // Simple heuristics to identify values that should be parameters
    const parameterKeys = ['url', 'query', 'path', 'endpoint', 'filename', 'name', 'title', 'prompt']
    const nonParameterPatterns = [
      /^https?:\/\//,  // URLs that are likely API endpoints
      /^\//,           // Absolute paths
      /^[a-zA-Z]:/,    // Windows paths
      /\.(json|csv|txt|md)$/, // File extensions
      /^\d+$/,         // Pure numbers
      /^true|false$/i  // Booleans
    ]

    // If key suggests it's a parameter
    if (parameterKeys.some(p => key.toLowerCase().includes(p))) {
      return true
    }

    // If value doesn't match non-parameter patterns and is reasonably short
    return value.length > 0 &&
           value.length < 100 &&
           !nonParameterPatterns.some(pattern => pattern.test(value))
  }

  instantiateTemplate(template: WorkflowTemplate, parameterValues: Record<string, any>): { nodes: WorkflowNode[], edges: any[] } {
    if (!template.nodes) {
      return { nodes: [], edges: template.edges || [] }
    }

    const nodes = template.nodes.map(node => {
      const nodeParams = { ...(node.data as any).parameters }

      // Apply parameter values
      if (template.parameters) {
        template.parameters.forEach(param => {
          if (param.nodeId === node.id && parameterValues[param.id] !== undefined) {
            nodeParams[param.paramKey] = parameterValues[param.id]
          }
        })
      }

      return {
        ...node,
        data: {
          ...node.data,
          parameters: nodeParams
        }
      } as WorkflowNode
    })

    return {
      nodes,
      edges: template.edges || []
    }
  }
}

export default WorkflowTemplateService