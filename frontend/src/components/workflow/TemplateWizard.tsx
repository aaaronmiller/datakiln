import React, { useState } from 'react'
import { Node, Edge } from '@xyflow/react'
import { Button } from '../ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Textarea } from '../ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'

export interface WorkflowTemplate {
  id: string
  name: string
  description: string
  category: string
  icon: string
  nodes: Node[]
  edges: Edge[]
  tags: string[]
}

interface TemplateWizardProps {
  isOpen: boolean
  onClose: () => void
  onCreateWorkflow: (nodes: Node[], edges: Edge[], name: string, description: string) => void
}

const SAMPLE_TEMPLATES: WorkflowTemplate[] = [
  {
    id: 'web-scraping-basic',
    name: 'Basic Web Scraping',
    description: 'A simple workflow to scrape content from a webpage',
    category: 'Web Scraping',
    icon: '🕷️',
    tags: ['scraping', 'web', 'basic'],
    nodes: [
      {
        id: 'provider-1',
        type: 'provider',
        position: { x: 100, y: 100 },
        data: {
          type: 'provider',
          name: 'AI Provider',
          provider_type: 'gemini_deep_research',
          mode: 'research',
          max_tokens: 4000
        }
      },
      {
        id: 'dom-action-1',
        type: 'dom_action',
        position: { x: 300, y: 100 },
        data: {
          type: 'dom_action',
          name: 'Extract Content',
          action: 'extract',
          selector_key: 'main-content'
        }
      },
      {
        id: 'export-1',
        type: 'export',
        position: { x: 500, y: 100 },
        data: {
          type: 'export',
          name: 'Save Results',
          format: 'json',
          path_key: 'scraped-data.json'
        }
      }
    ],
    edges: [
      {
        id: 'edge-1',
        source: 'provider-1',
        target: 'dom-action-1'
      },
      {
        id: 'edge-2',
        source: 'dom-action-1',
        target: 'export-1'
      }
    ]
  },
  {
    id: 'ai-content-generation',
    name: 'AI Content Generation',
    description: 'Generate content using AI with custom prompts',
    category: 'Content Generation',
    icon: '✍️',
    tags: ['ai', 'content', 'generation'],
    nodes: [
      {
        id: 'prompt-1',
        type: 'prompt',
        position: { x: 100, y: 100 },
        data: {
          type: 'prompt',
          name: 'Content Prompt',
          template_id: 'blog-post',
          max_tokens: 1000,
          temperature: 0.7
        }
      },
      {
        id: 'provider-2',
        type: 'provider',
        position: { x: 300, y: 100 },
        data: {
          type: 'provider',
          name: 'AI Generator',
          provider_type: 'gemini_canvas',
          mode: 'create',
          max_tokens: 2000
        }
      },
      {
        id: 'transform-1',
        type: 'transform',
        position: { x: 500, y: 100 },
        data: {
          type: 'transform',
          name: 'Format Content',
          transform_type: 'markdown'
        }
      }
    ],
    edges: [
      {
        id: 'edge-1',
        source: 'prompt-1',
        target: 'provider-2'
      },
      {
        id: 'edge-2',
        source: 'provider-2',
        target: 'transform-1'
      }
    ]
  },
  {
    id: 'data-processing-pipeline',
    name: 'Data Processing Pipeline',
    description: 'Process and transform data through multiple steps',
    category: 'Data Processing',
    icon: '🔄',
    tags: ['data', 'processing', 'pipeline'],
    nodes: [
      {
        id: 'data-source-1',
        type: 'provider',
        position: { x: 100, y: 100 },
        data: {
          type: 'provider',
          name: 'Data Source',
          provider_type: 'perplexity'
        }
      },
      {
        id: 'transform-2',
        type: 'transform',
        position: { x: 300, y: 100 },
        data: {
          type: 'transform',
          name: 'Clean Data',
          transform_type: 'text_clean'
        }
      },
      {
        id: 'condition-1',
        type: 'condition',
        position: { x: 500, y: 100 },
        data: {
          type: 'condition',
          name: 'Quality Check',
          expr: 'len(data) > 100'
        }
      },
      {
        id: 'export-2',
        type: 'export',
        position: { x: 700, y: 50 },
        data: {
          type: 'export',
          name: 'Save Processed Data',
          format: 'json'
        }
      }
    ],
    edges: [
      {
        id: 'edge-1',
        source: 'data-source-1',
        target: 'transform-2'
      },
      {
        id: 'edge-2',
        source: 'transform-2',
        target: 'condition-1'
      },
      {
        id: 'edge-3',
        source: 'condition-1',
        target: 'export-2'
      }
    ]
  }
]

const TemplateWizard: React.FC<TemplateWizardProps> = ({
  isOpen,
  onClose,
  onCreateWorkflow
}) => {
  const [selectedTemplate, setSelectedTemplate] = useState<WorkflowTemplate | null>(null)
  const [workflowName, setWorkflowName] = useState('')
  const [workflowDescription, setWorkflowDescription] = useState('')
  const [currentStep, setCurrentStep] = useState<'select' | 'configure' | 'preview'>('select')

  const categories = Array.from(new Set(SAMPLE_TEMPLATES.map(t => t.category)))

  const handleTemplateSelect = (template: WorkflowTemplate) => {
    setSelectedTemplate(template)
    setWorkflowName(template.name)
    setWorkflowDescription(template.description)
    setCurrentStep('configure')
  }

  const handleCreateWorkflow = () => {
    if (!selectedTemplate) return

    // Create a copy of the template nodes and edges with new IDs to avoid conflicts
    const newNodes = selectedTemplate.nodes.map(node => ({
      ...node,
      id: `${node.type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      data: {
        ...node.data,
        name: `${node.data.name} ${Date.now()}`
      }
    }))

    const newEdges = selectedTemplate.edges.map(edge => ({
      ...edge,
      id: `edge-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      source: newNodes.find(n => n.data.type === selectedTemplate.nodes.find(tn => tn.id === edge.source)?.data.type)?.id || edge.source,
      target: newNodes.find(n => n.data.type === selectedTemplate.nodes.find(tn => tn.id === edge.target)?.data.type)?.id || edge.target
    }))

    onCreateWorkflow(newNodes, newEdges, workflowName, workflowDescription)
    handleClose()
  }

  const handleClose = () => {
    setSelectedTemplate(null)
    setWorkflowName('')
    setWorkflowDescription('')
    setCurrentStep('select')
    onClose()
  }

  const filteredTemplates = SAMPLE_TEMPLATES

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl h-[80vh]">
        <DialogHeader>
          <DialogTitle>
            {currentStep === 'select' && 'Choose a Template'}
            {currentStep === 'configure' && 'Configure Workflow'}
            {currentStep === 'preview' && 'Preview Workflow'}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          {currentStep === 'select' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <Label htmlFor="category-filter">Filter by Category:</Label>
                <Select defaultValue="all">
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map(category => (
                      <SelectItem key={category} value={category.toLowerCase()}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredTemplates.map((template) => (
                  <Card
                    key={template.id}
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => handleTemplateSelect(template)}
                  >
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg flex items-center space-x-2">
                        <span className="text-2xl">{template.icon}</span>
                        <span>{template.name}</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-600 mb-2">{template.description}</p>
                      <div className="flex flex-wrap gap-1">
                        {template.tags.map(tag => (
                          <span
                            key={tag}
                            className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                      <div className="mt-2 text-xs text-gray-500">
                        {template.nodes.length} nodes • {template.edges.length} connections
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {currentStep === 'configure' && selectedTemplate && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="workflow-name">Workflow Name</Label>
                  <Input
                    id="workflow-name"
                    value={workflowName}
                    onChange={(e) => setWorkflowName(e.target.value)}
                    placeholder="Enter workflow name"
                  />
                </div>
                <div>
                  <Label htmlFor="workflow-category">Category</Label>
                  <Input
                    id="workflow-category"
                    value={selectedTemplate.category}
                    readOnly
                    className="bg-gray-50"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="workflow-description">Description</Label>
                <Textarea
                  id="workflow-description"
                  value={workflowDescription}
                  onChange={(e) => setWorkflowDescription(e.target.value)}
                  placeholder="Describe your workflow"
                  rows={3}
                />
              </div>

              <div>
                <h4 className="text-sm font-medium mb-2">Template Preview</h4>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="text-xl">{selectedTemplate.icon}</span>
                    <span className="font-medium">{selectedTemplate.name}</span>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{selectedTemplate.description}</p>
                  <div className="text-xs text-gray-500">
                    Nodes: {selectedTemplate.nodes.map(n => n.data.name).join(', ')}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-between pt-4 border-t">
          <Button
            variant="outline"
            onClick={currentStep === 'select' ? handleClose : () => setCurrentStep('select')}
          >
            {currentStep === 'select' ? 'Cancel' : 'Back'}
          </Button>

          {currentStep === 'configure' && (
            <Button onClick={handleCreateWorkflow} disabled={!workflowName.trim()}>
              Create Workflow
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default TemplateWizard