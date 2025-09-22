import React, { useState, useEffect } from 'react'
import { Button } from '../ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Textarea } from '../ui/textarea'
import { Badge } from '../ui/badge'
import { nodeRegistryService, CustomNodeDefinition, CustomNodeInfo } from '../../services/nodeRegistryService'

interface CustomNodeManagerProps {
  onNodeCreated?: (nodeType: string) => void
}

export const CustomNodeManager: React.FC<CustomNodeManagerProps> = ({ onNodeCreated }) => {
  const [customNodes, setCustomNodes] = useState<CustomNodeInfo[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newNode, setNewNode] = useState<Partial<CustomNodeDefinition>>({
    type: '',
    name: '',
    description: '',
    version: '1.0.0',
    inputs: [],
    outputs: [],
    paramsSchema: {
      type: 'object',
      properties: {}
    }
  })

  useEffect(() => {
    loadCustomNodes()
  }, [])

  const loadCustomNodes = async () => {
    setIsLoading(true)
    try {
      await nodeRegistryService.loadCustomNodes()
      const nodes = nodeRegistryService.getAllCustomNodes()
      setCustomNodes(nodes)
    } catch (error) {
      console.error('Failed to load custom nodes:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateNode = async () => {
    if (!newNode.type || !newNode.name || !newNode.description) {
      alert('Please fill in all required fields')
      return
    }

    // Validate the node definition
    const validation = await nodeRegistryService.validateCustomNode(newNode as CustomNodeDefinition)
    if (!validation.valid) {
      alert('Validation Error: ' + validation.errors.join(', '))
      return
    }

    setIsLoading(true)
    try {
      const success = await nodeRegistryService.registerCustomNode(newNode as CustomNodeDefinition)
      if (success) {
        alert('Custom node created successfully!')
        setShowCreateForm(false)
        setNewNode({
          type: '',
          name: '',
          description: '',
          version: '1.0.0',
          inputs: [],
          outputs: [],
          paramsSchema: {
            type: 'object',
            properties: {}
          }
        })
        await loadCustomNodes()
        onNodeCreated?.(newNode.type!)
      } else {
        alert('Failed to create custom node')
      }
    } catch (error) {
      alert('Failed to create custom node')
    } finally {
      setIsLoading(false)
    }
  }

  const addInput = () => {
    setNewNode(prev => ({
      ...prev,
      inputs: [...(prev.inputs || []), '']
    }))
  }

  const updateInput = (index: number, value: string) => {
    setNewNode(prev => ({
      ...prev,
      inputs: (prev.inputs || []).map((input, i) => i === index ? value : input)
    }))
  }

  const removeInput = (index: number) => {
    setNewNode(prev => ({
      ...prev,
      inputs: (prev.inputs || []).filter((_, i) => i !== index)
    }))
  }

  const addOutput = () => {
    setNewNode(prev => ({
      ...prev,
      outputs: [...(prev.outputs || []), '']
    }))
  }

  const updateOutput = (index: number, value: string) => {
    setNewNode(prev => ({
      ...prev,
      outputs: (prev.outputs || []).map((output, i) => i === index ? value : output)
    }))
  }

  const removeOutput = (index: number) => {
    setNewNode(prev => ({
      ...prev,
      outputs: (prev.outputs || []).filter((_, i) => i !== index)
    }))
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Custom Node Manager</h2>
        <Button onClick={() => setShowCreateForm(!showCreateForm)}>
          {showCreateForm ? 'Cancel' : 'Create Custom Node'}
        </Button>
      </div>

      {showCreateForm && (
        <Card>
          <CardHeader>
            <CardTitle>Create Custom Node</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="type">Node Type *</Label>
                <Input
                  id="type"
                  value={newNode.type || ''}
                  onChange={(e) => setNewNode(prev => ({ ...prev, type: e.target.value }))}
                  placeholder="e.g., my_custom_node"
                />
              </div>
              <div>
                <Label htmlFor="version">Version</Label>
                <Input
                  id="version"
                  value={newNode.version || ''}
                  onChange={(e) => setNewNode(prev => ({ ...prev, version: e.target.value }))}
                  placeholder="1.0.0"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={newNode.name || ''}
                onChange={(e) => setNewNode(prev => ({ ...prev, name: e.target.value }))}
                placeholder="My Custom Node"
              />
            </div>
            <div>
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={newNode.description || ''}
                onChange={(e) => setNewNode(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe what this node does"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <Label>Inputs</Label>
                <Button type="button" variant="outline" size="sm" onClick={addInput}>
                  Add Input
                </Button>
              </div>
              {(newNode.inputs || []).map((input, index) => (
                <div key={index} className="flex gap-2 mb-2">
                  <Input
                    value={input}
                    onChange={(e) => updateInput(index, e.target.value)}
                    placeholder={`Input ${index + 1}`}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => removeInput(index)}
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <Label>Outputs</Label>
                <Button type="button" variant="outline" size="sm" onClick={addOutput}>
                  Add Output
                </Button>
              </div>
              {(newNode.outputs || []).map((output, index) => (
                <div key={index} className="flex gap-2 mb-2">
                  <Input
                    value={output}
                    onChange={(e) => updateOutput(index, e.target.value)}
                    placeholder={`Output ${index + 1}`}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => removeOutput(index)}
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>

            <div>
              <Label htmlFor="schema">Parameter Schema (JSON)</Label>
              <Textarea
                id="schema"
                value={JSON.stringify(newNode.paramsSchema, null, 2)}
                onChange={(e) => {
                  try {
                    const schema = JSON.parse(e.target.value)
                    setNewNode(prev => ({ ...prev, paramsSchema: schema }))
                  } catch (error) {
                    // Invalid JSON, keep current value
                  }
                }}
                placeholder="JSON schema for node parameters"
                className="font-mono text-sm"
                rows={6}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button onClick={handleCreateNode} disabled={isLoading}>
                {isLoading ? 'Creating...' : 'Create Node'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {customNodes.map((node) => (
          <Card key={node.definition.type}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                {node.definition.name}
                <Badge variant="secondary">{node.definition.version}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-sm text-gray-600">{node.definition.description}</p>
                <div>
                  <span className="text-sm font-medium">Type:</span>
                  <code className="ml-2 text-sm bg-gray-100 px-1 py-0.5 rounded">
                    {node.definition.type}
                  </code>
                </div>
                <div>
                  <span className="text-sm font-medium">Inputs:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {node.definition.inputs.map((input: string) => (
                      <Badge key={input} variant="outline" className="text-xs">
                        {input}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <span className="text-sm font-medium">Outputs:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {node.definition.outputs.map((output: string) => (
                      <Badge key={output} variant="outline" className="text-xs">
                        {output}
                      </Badge>
                    ))}
                  </div>
                </div>
                {node.metadata && (
                  <div className="text-xs text-gray-500">
                    Created: {new Date(node.metadata.created_at).toLocaleDateString()}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {customNodes.length === 0 && !isLoading && (
        <div className="text-center py-8 text-gray-500">
          No custom nodes found. Create your first custom node to get started.
        </div>
      )}
    </div>
  )
}