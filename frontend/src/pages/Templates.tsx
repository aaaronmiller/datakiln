import React, { useState, useEffect } from 'react'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import WorkflowTemplateService, { WorkflowTemplate } from '../services/workflowTemplateService'
import { useWorkflowStore } from '../stores/workflowStore'

const Templates: React.FC = () => {
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([])
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [templateName, setTemplateName] = useState('')
  const [templateDescription, setTemplateDescription] = useState('')
  const [templateCategory, setTemplateCategory] = useState('General')
  const { nodes, edges } = useWorkflowStore()

  const templateService = new WorkflowTemplateService()

  useEffect(() => {
    loadTemplates()
  }, [])

  const loadTemplates = async () => {
    const loadedTemplates = await templateService.getTemplates()
    setTemplates(loadedTemplates)
  }

  const handleCreateTemplate = async () => {
    if (!templateName.trim() || !templateDescription.trim()) {
      alert('Please provide a name and description for the template.')
      return
    }

    if (nodes.length === 0) {
      alert('Cannot create template from empty workflow. Please add some nodes first.')
      return
    }

    try {
      const newTemplate = (templateService as any).createTemplateFromWorkflow(
        { nodes, edges },
        templateName,
        templateDescription,
        templateCategory
      )

      await templateService.createTemplate({
        name: newTemplate.name,
        description: newTemplate.description,
        category: newTemplate.category,
        nodes: newTemplate.nodes,
        edges: newTemplate.edges,
        parameters: newTemplate.parameters
      })

      await loadTemplates()
      setShowCreateForm(false)
      setTemplateName('')
      setTemplateDescription('')
      setTemplateCategory('General')
      alert('Template created successfully!')
    } catch (error) {
      alert(`Failed to create template: ${error}`)
    }
  }

  const handleUseTemplate = (template: WorkflowTemplate) => {
    // For now, just show the template details
    alert(`Template "${template.name}" selected. Template instantiation will be implemented next.`)
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Templates</h1>
        <Button onClick={() => setShowCreateForm(!showCreateForm)}>
          {showCreateForm ? 'Cancel' : 'Create Template from Current Workflow'}
        </Button>
      </div>

      {showCreateForm && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Create New Template</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Template Name</label>
              <input
                type="text"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="Enter template name"
                className="w-full p-2 border rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <textarea
                value={templateDescription}
                onChange={(e) => setTemplateDescription(e.target.value)}
                placeholder="Describe what this template does"
                rows={3}
                className="w-full p-2 border rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Category</label>
              <select
                value={templateCategory}
                onChange={(e) => setTemplateCategory(e.target.value)}
                className="w-full p-2 border rounded"
              >
                <option value="General">General</option>
                <option value="Analytics">Analytics</option>
                <option value="Research">Research</option>
                <option value="Automation">Automation</option>
                <option value="Data Processing">Data Processing</option>
              </select>
            </div>
            <Button onClick={handleCreateTemplate}>
              Create Template
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates.map((template) => (
          <Card key={template.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="text-lg">{template.name}</CardTitle>
              <div className="text-sm text-gray-500">{template.category}</div>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">{template.description}</p>
              <div className="flex justify-between items-center text-sm text-gray-500 mb-4">
                <span>{template.nodes?.length || 0} nodes</span>
                <span>{template.edges?.length || 0} connections</span>
              </div>
              {template.parameters && template.parameters.length > 0 && (
                <div className="mb-4">
                  <div className="text-sm font-medium text-gray-700">Parameters:</div>
                  <div className="text-sm text-gray-600">
                    {template.parameters.length} configurable values
                  </div>
                </div>
              )}
              <Button
                onClick={() => handleUseTemplate(template)}
                className="w-full"
                variant="outline"
              >
                Use Template
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {templates.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">No templates available yet.</p>
          <p className="text-gray-400">Create your first template from a workflow in the Workflow Builder.</p>
        </div>
      )}
    </div>
  )
}

export default Templates