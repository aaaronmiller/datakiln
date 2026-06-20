import React, { useState, useEffect, useMemo } from 'react'
import { Node } from '@xyflow/react'
import { Dialog, DialogContent } from '../ui/dialog'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/tabs'
import { Plus, Trash2, GripVertical, Eye } from 'lucide-react'
import { Badge } from '../ui/badge'
import { WORKFLOW_NODE_TYPES, WorkflowNodeType } from '../../types/workflow'

interface Action {
  selector: string
  actionType: string
  value: string
  delay?: number
}

interface SelectorOption {
  key: string
  selector: string
  description?: string
  provider?: string
}

interface SchemaField {
  type: string
  required?: boolean
  options?: string[]
  default?: unknown
  dependsOn?: Record<string, string[]>
  placeholder?: string
}

interface NodeConfigDialogProps {
  node: Node | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (nodeId: string, data: Record<string, unknown>) => void
}

/**
 * Generic config dialog that renders fields from the node type's configSchema.
 * No more hardcoded per-type branches — schema drives the UI.
 */
const NodeConfigDialog: React.FC<NodeConfigDialogProps> = ({
  node,
  open,
  onOpenChange,
  onSave
}) => {
  const [activeTab, setActiveTab] = useState('configuration')
  const [nodeName, setNodeName] = useState('')
  const [formData, setFormData] = useState<Record<string, unknown>>({})
  const [actions, setActions] = useState<Action[]>([])
  const [availableSelectors, setAvailableSelectors] = useState<SelectorOption[]>([])
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

  // Find the matching node type definition
  const nodeTypeDef: WorkflowNodeType | undefined = useMemo(() => {
    return WORKFLOW_NODE_TYPES.find(t => t.type === node?.type)
  }, [node?.type])

  // Reset form when node changes
  useEffect(() => {
    if (node?.data) {
      setNodeName(String(node.data.name || nodeTypeDef?.label || ''))
      // Seed defaults from type definition
      const defaults: Record<string, unknown> = { ...(nodeTypeDef?.defaultData || {}) }
      // Overlay existing data
      const existingData = node.data as Record<string, unknown>
      Object.keys(defaults).forEach(key => {
        if (existingData[key] !== undefined && existingData[key] !== null) {
          defaults[key] = existingData[key]
        }
      })
      setFormData(defaults)

      // Actions are special — they're an array
      if (node.type === 'dom_action' || node.type === 'ai_dom') {
        setActions(Array.isArray(existingData.actions) ? existingData.actions : [])
      } else {
        setActions([])
      }
    }
  }, [node, nodeTypeDef])

  // Load selectors for DOM action nodes
  useEffect(() => {
    const loadSelectors = async () => {
      try {
        const response = await fetch('/api/v1/selectors/registry')
        if (response.ok) {
          const data = await response.json()
          setAvailableSelectors(data.selectors || [])
        }
      } catch {
        // Silently fail
      }
    }
    if (open && (node?.type === 'dom_action' || node?.type === 'ai_dom')) {
      loadSelectors()
    }
  }, [open, node?.type])

  if (!node) return null

  // Check if a field should be shown based on dependsOn
  const shouldShowField = (field: SchemaField, fieldName: string): boolean => {
    if (!field.dependsOn) return true
    for (const [depKey, depValues] of Object.entries(field.dependsOn)) {
      const currentVal = formData[depKey]
      if (!depValues.includes(String(currentVal))) return false
    }
    return true
  }

  // Render a single form field based on schema type
  const renderField = (fieldName: string, field: SchemaField) => {
    if (!shouldShowField(field, fieldName)) return null

    const value = formData[fieldName] ?? field.default ?? ''
    const errorKey = `field_${fieldName}`
    const isError = validationErrors[errorKey]

    const commonLabel = (
      <Label className="text-sm font-medium flex items-center gap-1">
        {fieldName.replace(/_/g, ' ')}
        {field.required && <span className="text-red-500">*</span>}
      </Label>
    )

    switch (field.type) {
      case 'select':
        return (
          <div key={fieldName} className="space-y-1">
            {commonLabel}
            <select
              value={String(value)}
              onChange={(e) => setFormData(prev => ({ ...prev, [fieldName]: e.target.value }))}
              className={`flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${isError ? 'border-red-500' : 'border-input'}`}
            >
              <option value="">Select...</option>
              {(field.options || []).map(opt => (
                <option key={opt} value={opt}>{opt.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>
              ))}
            </select>
            {isError && <p className="text-xs text-red-500">{validationErrors[errorKey]}</p>}
          </div>
        )

      case 'multi-select':
        return (
          <div key={fieldName} className="space-y-2">
            {commonLabel}
            <div className="flex flex-wrap gap-2">
              {(field.options || []).map(opt => {
                const selected = (value as string[])?.includes(opt)
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => {
                      const current = (value as string[]) || []
                      const next = selected ? current.filter(v => v !== opt) : [...current, opt]
                      setFormData(prev => ({ ...prev, [fieldName]: next }))
                    }}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                      selected ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {opt.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                  </button>
                )
              })}
            </div>
          </div>
        )

      case 'boolean':
        return (
          <div key={fieldName} className="space-y-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={Boolean(value)}
                onChange={(e) => setFormData(prev => ({ ...prev, [fieldName]: e.target.checked }))}
                className="rounded border-gray-300"
              />
              <span className="text-sm font-medium">{fieldName.replace(/_/g, ' ')}</span>
            </label>
          </div>
        )

      case 'number':
        return (
          <div key={fieldName} className="space-y-1">
            {commonLabel}
            <Input
              type="number"
              value={String(value)}
              onChange={(e) => setFormData(prev => ({ ...prev, [fieldName]: parseFloat(e.target.value) || 0 }))}
              className={isError ? 'border-red-500' : ''}
              placeholder={field.placeholder}
            />
            {isError && <p className="text-xs text-red-500">{validationErrors[errorKey]}</p>}
          </div>
        )

      case 'text':
        return (
          <div key={fieldName} className="space-y-1">
            {commonLabel}
            <textarea
              value={String(value)}
              onChange={(e) => setFormData(prev => ({ ...prev, [fieldName]: e.target.value }))}
              className={`flex min-h-[80px] w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-y ${isError ? 'border-red-500' : 'border-input'}`}
              placeholder={field.placeholder}
            />
          </div>
        )

      case 'json':
        return (
          <div key={fieldName} className="space-y-1">
            {commonLabel}
            <textarea
              value={typeof value === 'string' ? value : JSON.stringify(value, null, 2)}
              onChange={(e) => {
                try {
                  const parsed = JSON.parse(e.target.value)
                  setFormData(prev => ({ ...prev, [fieldName]: parsed }))
                } catch {
                  setFormData(prev => ({ ...prev, [fieldName]: e.target.value }))
                }
              }}
              className={`flex min-h-[120px] w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-y font-mono text-xs ${isError ? 'border-red-500' : 'border-input'}`}
              placeholder='{"key": "value"}'
            />
          </div>
        )

      case 'array':
        return (
          <div key={fieldName} className="space-y-1">
            {commonLabel}
            <Input
              value={Array.isArray(value) ? value.join(', ') : String(value)}
              onChange={(e) => setFormData(prev => ({ ...prev, [fieldName]: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }))}
              className={isError ? 'border-red-500' : ''}
              placeholder="Comma-separated values"
            />
            <p className="text-xs text-gray-500">Enter comma-separated values</p>
          </div>
        )

      case 'object':
        return (
          <div key={fieldName} className="space-y-1">
            {commonLabel}
            <textarea
              value={typeof value === 'string' ? value : JSON.stringify(value, null, 2)}
              onChange={(e) => {
                try {
                  const parsed = JSON.parse(e.target.value)
                  setFormData(prev => ({ ...prev, [fieldName]: parsed }))
                } catch {
                  setFormData(prev => ({ ...prev, [fieldName]: e.target.value }))
                }
              }}
              className={`flex min-h-[80px] w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-y font-mono text-xs ${isError ? 'border-red-500' : 'border-input'}`}
            />
          </div>
        )

      default: // string
        return (
          <div key={fieldName} className="space-y-1">
            {commonLabel}
            <Input
              value={String(value)}
              onChange={(e) => setFormData(prev => ({ ...prev, [fieldName]: e.target.value }))}
              className={isError ? 'border-red-500' : ''}
              placeholder={field.placeholder}
            />
            {isError && <p className="text-xs text-red-500">{validationErrors[errorKey]}</p>}
          </div>
        )
    }
  }

  const handleSave = () => {
    // Validate required fields
    const errors: Record<string, string> = {}
    if (!nodeName.trim()) errors.nodeName = 'Node name is required'

    if (nodeTypeDef?.configSchema) {
      Object.entries(nodeTypeDef.configSchema).forEach(([key, field]) => {
        if ((field as SchemaField).required && !formData[key]) {
          errors[`field_${key}`] = `${key} is required`
        }
      })
    }

    if (node.type === 'dom_action' && actions.length === 0) {
      errors.actions = 'At least one action is required'
    }

    setValidationErrors(errors)
    if (Object.keys(errors).length > 0) return

    // Build final data object
    const data: Record<string, unknown> = {
      name: nodeName,
      ...formData,
    }

    if (node.type === 'dom_action') {
      data.actions = actions
    }

    onSave(node.id, data)
    onOpenChange(false)
  }

  const addAction = () => {
    setActions([...actions, { selector: '', actionType: 'click', value: '', delay: 0 }])
  }

  const updateAction = (index: number, field: keyof Action, value: string | number) => {
    const updated = [...actions]
    updated[index] = { ...updated[index], [field]: value }
    setActions(updated)
  }

  const removeAction = (index: number) => {
    setActions(actions.filter((_, i) => i !== index))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] p-0">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b">
            <div>
              <h2 className="text-lg font-semibold">
                Configure {nodeTypeDef?.icon} {nodeName || nodeTypeDef?.label || node.type}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {nodeTypeDef?.description || `Type: ${node.type}`}
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button size="sm" onClick={handleSave}>Save</Button>
            </div>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <TabsList className="grid w-full grid-cols-2 mx-5 mt-3">
              <TabsTrigger value="configuration">Configuration</TabsTrigger>
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-hidden">
              {/* Configuration Tab */}
              <TabsContent value="configuration" className="h-full p-5 overflow-y-auto">
                <div className="space-y-5">
                  {/* Node Name (always shown) */}
                  <div className="space-y-1">
                    <Label htmlFor="nodeName" className="text-sm font-medium">
                      Node Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="nodeName"
                      value={nodeName}
                      onChange={(e) => setNodeName(e.target.value)}
                      placeholder="Enter node name"
                      className={validationErrors.nodeName ? 'border-red-500' : ''}
                    />
                    {validationErrors.nodeName && (
                      <p className="text-xs text-red-500">{validationErrors.nodeName}</p>
                    )}
                  </div>

                  {/* Schema-driven fields */}
                  {nodeTypeDef?.configSchema && (
                    <div className="space-y-4">
                      {Object.entries(nodeTypeDef.configSchema).map(([key, field]) =>
                        renderField(key, field as SchemaField)
                      )}
                    </div>
                  )}

                  {/* DOM Action Sequence (special case for dom_action type) */}
                  {node.type === 'dom_action' && (
                    <div className="space-y-3 mt-4 pt-4 border-t">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium">Action Sequence</Label>
                        <Button onClick={addAction} size="sm" variant="outline">
                          <Plus className="h-3 w-3 mr-1" /> Add Action
                        </Button>
                      </div>

                      {validationErrors.actions && (
                        <p className="text-xs text-red-500">{validationErrors.actions}</p>
                      )}

                      <div className="space-y-2">
                        {actions.map((action, index) => (
                          <div key={index} className="border rounded-lg p-3 bg-muted/50">
                            <div className="flex items-center gap-2 mb-2">
                              <GripVertical className="h-3 w-3 text-gray-400 cursor-move" />
                              <Badge variant="outline" className="text-xs">#{index + 1}</Badge>
                              <div className="flex-1" />
                              <Button variant="ghost" size="sm" onClick={() => removeAction(index)} className="h-6 w-6 p-0 text-red-500">
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <select
                                value={action.selector}
                                onChange={(e) => updateAction(index, 'selector', e.target.value)}
                                className="flex h-8 rounded-md border bg-background px-2 py-1 text-xs"
                              >
                                <option value="">Selector...</option>
                                {availableSelectors.map(sel => (
                                  <option key={sel.key} value={sel.key}>{sel.key}</option>
                                ))}
                              </select>
                              <select
                                value={action.actionType}
                                onChange={(e) => updateAction(index, 'actionType', e.target.value)}
                                className="flex h-8 rounded-md border bg-background px-2 py-1 text-xs"
                              >
                                <option value="click">Click</option>
                                <option value="type">Type</option>
                                <option value="wait">Wait</option>
                                <option value="scroll">Scroll</option>
                                <option value="copy">Copy</option>
                                <option value="extract">Extract</option>
                              </select>
                              <Input
                                value={action.value}
                                onChange={(e) => updateAction(index, 'value', e.target.value)}
                                placeholder="Value"
                                className="h-8 text-xs col-span-2"
                              />
                            </div>
                          </div>
                        ))}
                        {actions.length === 0 && (
                          <p className="text-center text-xs text-muted-foreground py-4">
                            No actions defined. Click "Add Action" to get started.
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Output Destination (shown for all types) */}
                  <div className="space-y-2 pt-4 border-t">
                    <Label className="text-sm font-medium">Output Destination</Label>
                    <div className="grid grid-cols-4 gap-2">
                      {['next', 'file', 'screen', 'clipboard'].map((option) => (
                        <button
                          key={option}
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, output: option }))}
                          className={`px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                            formData.output === option
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted hover:bg-muted/80'
                          }`}
                        >
                          {option.charAt(0).toUpperCase() + option.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Timeline Tab */}
              <TabsContent value="timeline" className="h-full p-5 overflow-y-auto">
                <div className="space-y-3">
                  <h3 className="text-sm font-medium">Execution Timeline</h3>
                  {node.type === 'dom_action' && actions.length > 0 ? (
                    <div className="space-y-2">
                      {actions.map((action, index) => (
                        <div key={index} className="flex items-center gap-3">
                          <div className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs shrink-0">
                            {index + 1}
                          </div>
                          <div className="flex-1 border rounded-lg p-2 bg-muted/50">
                            <span className="text-xs font-medium">{action.actionType}</span>
                            {action.selector && <span className="text-xs text-muted-foreground ml-2">→ {action.selector}</span>}
                            {action.value && <span className="text-xs text-muted-foreground ml-2">"{action.value}"</span>}
                          </div>
                          {action.delay ? <span className="text-xs text-muted-foreground">{action.delay}ms</span> : null}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center text-muted-foreground py-8">
                      <Eye className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Execution timeline will appear when the workflow runs.</p>
                    </div>
                  )}
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default NodeConfigDialog
