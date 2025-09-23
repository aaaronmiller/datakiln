import React, { useState, useEffect } from 'react'
import { Node } from '@xyflow/react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Select } from '../ui/select'
import { Textarea } from '../ui/textarea'
import { WORKFLOW_NODE_TYPES } from '../../types/workflow-fixed'

interface NodeConfigDialogProps {
  node: Node | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (nodeId: string, data: Record<string, unknown>) => void
}

const NodeConfigDialog: React.FC<NodeConfigDialogProps> = ({
  node,
  open,
  onOpenChange,
  onSave
}) => {
  const [formData, setFormData] = useState<Record<string, unknown>>({})

  useEffect(() => {
    if (node?.data) {
      setFormData({ ...node.data })
    }
  }, [node])

  if (!node) return null

  const nodeType = WORKFLOW_NODE_TYPES.find(type => type.type === node.data?.type)
  if (!nodeType) return null

  const handleSave = () => {
    onSave(node.id, formData)
    onOpenChange(false)
  }

  const handleInputChange = (key: string, value: unknown) => {
    setFormData(prev => ({ ...prev, [key]: value }))
  }

  const renderField = (key: string, schema: Record<string, unknown>) => {
    const value = formData[key]
    const isRequired = schema.required === true

    switch (schema.type) {
      case 'string':
      case 'select':
        if (schema.options && Array.isArray(schema.options)) {
          return (
            <div key={key} className="space-y-2">
              <Label htmlFor={key} className="text-sm font-medium">
                {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                {isRequired && <span className="text-red-500 ml-1">*</span>}
              </Label>
              <Select value={String(value || '')} onChange={(e) => handleInputChange(key, e.target.value)}>
                <option value="" disabled>Select {key}</option>
                {schema.options.map((option: string) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </Select>
            </div>
          )
        }
        return (
          <div key={key} className="space-y-2">
            <Label htmlFor={key} className="text-sm font-medium">
              {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
              {isRequired && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Input
              id={key}
              value={String(value || '')}
              onChange={(e) => handleInputChange(key, e.target.value)}
              placeholder={`Enter ${key}`}
            />
          </div>
        )

      case 'number':
        return (
          <div key={key} className="space-y-2">
            <Label htmlFor={key} className="text-sm font-medium">
              {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
              {isRequired && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Input
              id={key}
              type="number"
              value={Number(value || 0)}
              onChange={(e) => handleInputChange(key, Number(e.target.value))}
              placeholder={`Enter ${key}`}
            />
          </div>
        )

      case 'boolean':
        return (
          <div key={key} className="space-y-2">
            <Label htmlFor={key} className="text-sm font-medium">
              {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
              {isRequired && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Select value={String(Boolean(value))} onChange={(e) => handleInputChange(key, e.target.value === 'true')}>
              <option value="true">True</option>
              <option value="false">False</option>
            </Select>
          </div>
        )

      case 'array':
        return (
          <div key={key} className="space-y-2">
            <Label htmlFor={key} className="text-sm font-medium">
              {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
              {isRequired && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Textarea
              id={key}
              value={Array.isArray(value) ? value.join(', ') : String(value || '')}
              onChange={(e) => handleInputChange(key, e.target.value.split(',').map(s => s.trim()))}
              placeholder={`Enter ${key} as comma-separated values`}
              rows={3}
            />
          </div>
        )

      case 'object':
        return (
          <div key={key} className="space-y-2">
            <Label htmlFor={key} className="text-sm font-medium">
              {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
              {isRequired && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Textarea
              id={key}
              value={typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value || '')}
              onChange={(e) => {
                try {
                  handleInputChange(key, JSON.parse(e.target.value))
                } catch {
                  handleInputChange(key, e.target.value)
                }
              }}
              placeholder={`Enter ${key} as JSON`}
              rows={4}
            />
          </div>
        )

      default:
        return (
          <div key={key} className="space-y-2">
            <Label htmlFor={key} className="text-sm font-medium">
              {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
              {isRequired && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Input
              id={key}
              value={String(value || '')}
              onChange={(e) => handleInputChange(key, e.target.value)}
              placeholder={`Enter ${key}`}
            />
          </div>
        )
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Configure {nodeType.label}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4 max-h-96 overflow-y-auto">
          {/* Basic fields */}
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm font-medium">
              Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              value={String(formData.name || '')}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="Enter node name"
            />
          </div>

          {/* Type-specific fields */}
          {Object.entries(nodeType.configSchema).map(([key, schema]) =>
            renderField(key, schema as Record<string, unknown>)
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default NodeConfigDialog