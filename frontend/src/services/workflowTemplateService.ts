interface WorkflowTemplate {
  id: string
  name: string
  description: string
  category: string
  nodes: any[]
  edges: any[]
  createdAt: string
  updatedAt: string
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
}

export default WorkflowTemplateService