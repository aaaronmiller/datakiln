import React, { useState, useEffect } from 'react'
import { Node } from '@xyflow/react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Select } from '../ui/select'
import { Slider } from '../ui/slider'
import { Plus, Trash2 } from 'lucide-react'

interface Action {
  selector: string
  actionType: string
  value: string
  delay?: number
  timingOverride?: {
    default_delay_ms?: number
    wait_for_selector_timeout_ms?: number
    action_timeout_ms?: number
  }
}

interface SelectorOption {
  key: string
  selector: string
  description?: string
  provider?: string
  timing_policy?: {
    default_delay_ms: number
    wait_for_selector_timeout_ms: number
    action_timeout_ms: number
  }
}

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
  const [nodeName, setNodeName] = useState('')
  const [provider, setProvider] = useState('')
  const [actions, setActions] = useState<Action[]>([])
  const [output, setOutput] = useState('')

  // Consolidate node specific fields
  const [model, setModel] = useState('')
  const [prependText, setPrependText] = useState('')
  const [appendText, setAppendText] = useState('')
  const [attachments, setAttachments] = useState<string[]>([])

  const [availableSelectors, setAvailableSelectors] = useState<SelectorOption[]>([])

  useEffect(() => {
    if (node?.data) {
      setNodeName(String(node.data.name || ''))
      setProvider(String(node.data.provider || ''))
      setActions(Array.isArray(node.data.actions) ? node.data.actions : [])
      setOutput(String(node.data.output || ''))

      // Consolidate node fields
      setModel(String(node.data.model || ''))
      setPrependText(String(node.data.prepend_text || ''))
      setAppendText(String(node.data.append_text || ''))
      setAttachments(Array.isArray(node.data.attachments) ? node.data.attachments : [])
    }
  }, [node])

  useEffect(() => {
    const loadSelectors = async () => {
      try {
        const response = await fetch('/api/v1/selectors/registry')
        if (response.ok) {
          const data = await response.json()
          setAvailableSelectors(data.selectors)
        }
      } catch (error) {
        console.error('Failed to load selectors:', error)
      }
    }
    if (open) {
      loadSelectors()
    }
  }, [open])

  if (!node) return null

  const handleSave = () => {
    const data: Record<string, unknown> = {
      name: nodeName,
    }

    if (node?.type === 'consolidate') {
      data.model = model
      data.prepend_text = prependText
      data.append_text = appendText
      data.attachments = attachments
    } else {
      // ai_dom node
      data.provider = provider
      data.actions = actions
      data.output = output
    }

    onSave(node.id, data)
    onOpenChange(false)
  }

  const addAction = () => {
    setActions([...actions, { selector: '', actionType: 'click', value: '', delay: 0 }])
  }

  const updateAction = (index: number, field: keyof Action, value: string | number) => {
    const updatedActions = [...actions]
    updatedActions[index] = { ...updatedActions[index], [field]: value }
    setActions(updatedActions)
  }

  const removeAction = (index: number) => {
    setActions(actions.filter((_, i) => i !== index))
  }


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configure Node</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Node Name */}
          <div className="space-y-2">
            <Label htmlFor="nodeName" className="text-sm font-medium">
              Node Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="nodeName"
              value={nodeName}
              onChange={(e) => setNodeName(e.target.value)}
              placeholder="Enter node name"
            />
          </div>

          {node?.type === 'consolidate' ? (
            <>
              {/* Model Selection */}
              <div className="space-y-2">
                <Label htmlFor="model" className="text-sm font-medium">
                  AI Model <span className="text-red-500">*</span>
                </Label>
                <Select value={model} onChange={(e) => setModel(e.target.value)}>
                  <option value="">Select Model</option>
                  <option value="gpt-4">GPT-4</option>
                  <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                  <option value="claude-3">Claude 3</option>
                  <option value="gemini-pro">Gemini Pro</option>
                </Select>
              </div>

              {/* Prepend Text */}
              <div className="space-y-2">
                <Label htmlFor="prependText" className="text-sm font-medium">
                  Prepend Text
                </Label>
                <Input
                  id="prependText"
                  value={prependText}
                  onChange={(e) => setPrependText(e.target.value)}
                  placeholder="Text to prepend to input"
                />
              </div>

              {/* Append Text */}
              <div className="space-y-2">
                <Label htmlFor="appendText" className="text-sm font-medium">
                  Append Text
                </Label>
                <Input
                  id="appendText"
                  value={appendText}
                  onChange={(e) => setAppendText(e.target.value)}
                  placeholder="Text to append to input"
                />
              </div>

              {/* File Attachments */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">File Attachments</Label>
                <div className="border rounded-lg p-4 space-y-3">
                  <input
                    type="file"
                    multiple
                    onChange={(e) => {
                      const files = Array.from(e.target.files || [])
                      const filePaths = files.map(file => file.name) // In real implementation, upload files and get URLs
                      setAttachments([...attachments, ...filePaths])
                    }}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                  {attachments.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-xs text-gray-600">Attached Files:</Label>
                      {attachments.map((file, index) => (
                        <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                          <span className="text-sm">{file}</span>
                          <Button
                            onClick={() => setAttachments(attachments.filter((_, i) => i !== index))}
                            size="sm"
                            variant="ghost"
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Provider Dropdown */}
              <div className="space-y-2">
                <Label htmlFor="provider" className="text-sm font-medium">
                  Provider
                </Label>
                <Select value={provider} onChange={(e) => setProvider(e.target.value)}>
                  <option value="">Select Provider</option>
                  <option value="gemini">Gemini</option>
                  <option value="perp">Perp</option>
                  <option value="ytt">YTT</option>
                </Select>
              </div>
            </>
          )}

          {/* Action Sequence List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Action Sequence</Label>
              <Button onClick={addAction} size="sm" variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Add Action
              </Button>
            </div>
            <div className="border rounded-lg p-4 space-y-3">
              {actions.map((action, index) => (
                <div key={index} className="border rounded p-3 bg-gray-50">
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                    <div>
                      <Label className="text-xs text-gray-600">Selector</Label>
                      <Select
                        value={action.selector}
                        onChange={(e) => updateAction(index, 'selector', e.target.value)}
                        className="mt-1"
                      >
                        <option value="">Select Selector</option>
                        {availableSelectors
                          .filter(sel => !sel.provider || sel.provider === provider)
                          .map(sel => (
                            <option key={sel.key} value={sel.key}>
                              {sel.key} - {sel.description || sel.selector}
                            </option>
                          ))
                        }
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-600">Action Type</Label>
                      <Select
                        value={action.actionType}
                        onChange={(e) => updateAction(index, 'actionType', e.target.value)}
                        className="mt-1"
                      >
                        <option value="click">Click</option>
                        <option value="type">Type</option>
                        <option value="wait">Wait</option>
                        <option value="scroll">Scroll</option>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-600">Value</Label>
                      <Input
                        value={action.value}
                        onChange={(e) => updateAction(index, 'value', e.target.value)}
                        placeholder="Value"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-gray-600">Delay: {action.delay || 0}ms</Label>
                      <Slider
                        value={action.delay || 0}
                        onChange={(value) => updateAction(index, 'delay', value)}
                        min={0}
                        max={5000}
                        step={100}
                        className="mt-1"
                      />
                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>0ms</span>
                        <span>5000ms</span>
                      </div>
                    </div>
                    <div className="flex items-end">
                      <Button
                        onClick={() => removeAction(index)}
                        size="sm"
                        variant="ghost"
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
              {actions.length === 0 && (
                <div className="text-center text-gray-500 py-4">
                  No actions defined. Click "Add Action" to get started.
                </div>
              )}
            </div>
          </div>

          {/* Output Options */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Output</Label>
            <div className="grid grid-cols-2 gap-2">
              {['file', 'screen', 'clipboard', 'next'].map((option) => (
                <label key={option} className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name="output"
                    value={option}
                    checked={output === option}
                    onChange={(e) => setOutput(e.target.value)}
                    className="rounded"
                  />
                  <span className="text-sm capitalize">{option}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!nodeName.trim()}>
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default NodeConfigDialog