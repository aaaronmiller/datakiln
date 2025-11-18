import React, { useState, useEffect, useCallback } from 'react'
import { Node } from '@xyflow/react'
import { Dialog, DialogContent } from '../ui/dialog'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Slider } from '../ui/slider'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/tabs'
import { Plus, Trash2, AlertCircle, CheckCircle, GripVertical, Eye } from 'lucide-react'
import { Badge } from '../ui/badge'

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
  const [activeTab, setActiveTab] = useState('configuration')
  const [nodeName, setNodeName] = useState('')
  const [provider, setProvider] = useState('')
  const [actions, setActions] = useState<Action[]>([])
  const [output, setOutput] = useState('')

  // Consolidate node specific fields
  const [researchDepth, setResearchDepth] = useState('balanced')
  const [queryPrompt, setQueryPrompt] = useState('')
  const [searchMode, setSearchMode] = useState('quick')
  const [transformType, setTransformType] = useState('')
  const [inputKey, setInputKey] = useState('')
  const [outputKey, setOutputKey] = useState('')
  const [exportFormat, setExportFormat] = useState('json')
  const [filePath, setFilePath] = useState('')
  const [saveIntermittently, setSaveIntermittently] = useState(false)
  const [conditionExpr, setConditionExpr] = useState('')
  const [trueOutput, setTrueOutput] = useState('true_branch')
  const [falseOutput, setFalseOutput] = useState('false_branch')
  const [model, setModel] = useState('gemini-pro')
  const [prependText, setPrependText] = useState('')
  const [appendText, setAppendText] = useState('')
  const [attachments, setAttachments] = useState<string[]>([])

  const [availableSelectors, setAvailableSelectors] = useState<SelectorOption[]>([])
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
  const [draggedActionIndex, setDraggedActionIndex] = useState<number | null>(null)

  useEffect(() => {
    if (node?.data) {
      setNodeName(String(node.data.name || ''))
      setProvider(String(node.data.provider || node.data.provider_type || ''))
      setActions(Array.isArray(node.data.actions) ? node.data.actions : [])
      setOutput(String(node.data.output || ''))

      // Type-specific fields
      setResearchDepth(String(node.data.research_depth || ''))
      setQueryPrompt(String(node.data.query_prompt || ''))
      setSearchMode(String(node.data.search_mode || ''))
      setTransformType(String(node.data.transform_type || ''))
      setInputKey(String(node.data.input_key || ''))
      setOutputKey(String(node.data.output_key || ''))
      setExportFormat(String(node.data.format || ''))
      setFilePath(String(node.data.path_key || ''))
      setSaveIntermittently(Boolean(node.data.save_intermittently))
      setConditionExpr(String(node.data.expr || ''))
      setTrueOutput(String(node.data.true_output || ''))
      setFalseOutput(String(node.data.false_output || ''))
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
      // Common fields
      output: output,
    }

    // Type-specific fields
    switch (node?.type) {
      case 'provider':
        data.provider_type = provider
        data.research_depth = researchDepth
        data.query_prompt = queryPrompt
        data.search_mode = searchMode
        break
      case 'transform':
        data.transform_type = transformType
        data.input_key = inputKey
        data.output_key = outputKey
        break
      case 'export':
        data.format = exportFormat
        data.path_key = filePath
        data.save_intermittently = saveIntermittently
        break
      case 'condition':
        data.expr = conditionExpr
        data.true_output = trueOutput
        data.false_output = falseOutput
        break
      case 'consolidate':
        data.model = model
        data.prepend_text = prependText
        data.append_text = appendText
        data.attachments = attachments
        break
      case 'gemini_deep_research':
      case 'prompt':
        data.query_prompt = queryPrompt
        data.prepend_text = prependText
        data.append_text = appendText
        break
      default: // ai_dom and others
        data.provider = provider
        data.actions = actions
        break
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


  // Validation function
  const validateConfiguration = useCallback(() => {
    const errors: Record<string, string> = {}

    if (!nodeName.trim()) {
      errors.nodeName = 'Node name is required'
    }

    if (node?.type === 'provider' && !provider) {
      errors.provider = 'Provider type is required'
    }

    if (node?.type === 'ai_dom' && actions.length === 0) {
      errors.actions = 'At least one action is required'
    }

    actions.forEach((action, index) => {
      if (!action.selector) {
        errors[`action_${index}_selector`] = 'Selector is required'
      }
      if (!action.actionType) {
        errors[`action_${index}_actionType`] = 'Action type is required'
      }
    })

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }, [nodeName, provider, actions, node?.type])

  // Drag and drop handlers for actions
  const handleActionDragStart = useCallback((e: React.DragEvent, index: number) => {
    setDraggedActionIndex(index)
    e.dataTransfer.effectAllowed = 'move'
  }, [])

  const handleActionDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }, [])

  const handleActionDrop = useCallback((e: React.DragEvent, dropIndex: number) => {
    e.preventDefault()
    if (draggedActionIndex === null || draggedActionIndex === dropIndex) return

    const newActions = [...actions]
    const [draggedAction] = newActions.splice(draggedActionIndex, 1)
    newActions.splice(dropIndex, 0, draggedAction)
    setActions(newActions)
    setDraggedActionIndex(null)
  }, [draggedActionIndex, actions])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-full h-screen p-0">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b">
            <div>
              <h2 className="text-2xl font-bold">Configure {String(node?.data?.name || 'Node')}</h2>
              <p className="text-sm text-gray-600">Type: {node?.type}</p>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (validateConfiguration()) {
                    handleSave()
                  }
                }}
                disabled={!nodeName.trim()}
              >
                Save Changes
              </Button>
            </div>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <TabsList className="grid w-full grid-cols-4 mx-6 mt-4">
              <TabsTrigger value="configuration">Configuration</TabsTrigger>
              <TabsTrigger value="timeline">Execution Timeline</TabsTrigger>
              <TabsTrigger value="preview">Canvas Preview</TabsTrigger>
              <TabsTrigger value="validation">Validation</TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-hidden">
              {/* Configuration Tab */}
              <TabsContent value="configuration" className="h-full p-6 overflow-y-auto">
                <div className="space-y-6 max-w-4xl mx-auto">
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
                      className={validationErrors.nodeName ? 'border-red-500' : ''}
                    />
                    {validationErrors.nodeName && (
                      <p className="text-sm text-red-500">{validationErrors.nodeName}</p>
                    )}
                  </div>

                  {/* Node-specific configuration */}
                  {node?.type === 'provider' && (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">
                          Provider Type <span className="text-red-500">*</span>
                        </Label>
                        <select
                          value={provider}
                          onChange={(e) => setProvider(e.target.value)}
                          className="flex h-10 w-[200px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        >
                          <option value="">Select Provider</option>
                          <option value="gemini">Gemini (Deep Research)</option>
                          <option value="perplexity">Perplexity</option>
                          <option value="ytt">YouTube Transcript</option>
                        </select>
                        {validationErrors.provider && (
                          <p className="text-sm text-red-500">{validationErrors.provider}</p>
                        )}
                      </div>

                      {provider === 'gemini' && (
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label className="text-sm font-medium">Research Depth</Label>
                            <select
                              value={researchDepth}
                              onChange={(e) => setResearchDepth(e.target.value)}
                              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                            >
                              <option value="shallow">Shallow (Fast)</option>
                              <option value="balanced">Balanced (Recommended)</option>
                              <option value="deep">Deep (Comprehensive)</option>
                            </select>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-sm font-medium">Query Prompt Template</Label>
                            <textarea
                              value={queryPrompt}
                              onChange={(e) => setQueryPrompt(e.target.value)}
                              placeholder="Enter your research query or prompt here..."
                              className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            />
                            <p className="text-xs text-gray-500">This prompt will be sent to Gemini Deep Research</p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Consolidate Node Configuration */}
                  {node?.type === 'consolidate' && (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Model</Label>
                        <select
                          value={model}
                          onChange={(e) => setModel(e.target.value)}
                          className="flex h-10 w-[300px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        >
                          <option value="gemini-pro">Gemini Pro</option>
                          <option value="gemini-flash">Gemini Flash</option>
                          <option value="gpt-4">GPT-4</option>
                          <option value="claude-3">Claude 3</option>
                        </select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Prepend Text (Instruction)</Label>
                        <textarea
                          value={prependText}
                          onChange={(e) => setPrependText(e.target.value)}
                          placeholder="Instructions to prepend before attached documents (e.g., 'Analyze the following research documents and synthesize key findings...')"
                          className="flex min-h-[150px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        />
                        <p className="text-xs text-gray-500">This text will appear before the attached file contents in the AI prompt</p>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Append Text (Follow-up)</Label>
                        <textarea
                          value={appendText}
                          onChange={(e) => setAppendText(e.target.value)}
                          placeholder="Additional instructions to append after documents (e.g., 'Provide a comprehensive summary in markdown format...')"
                          className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        />
                        <p className="text-xs text-gray-500">This text will appear after the attached file contents</p>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Attachments (File Paths)</Label>
                        <div className="space-y-2">
                          {attachments.map((attachment, index) => (
                            <div key={index} className="flex items-center space-x-2">
                              <Input
                                value={attachment}
                                onChange={(e) => {
                                  const newAttachments = [...attachments]
                                  newAttachments[index] = e.target.value
                                  setAttachments(newAttachments)
                                }}
                                placeholder="/path/to/document.txt"
                                className="flex-1"
                              />
                              <Button
                                onClick={() => {
                                  setAttachments(attachments.filter((_, i) => i !== index))
                                }}
                                size="sm"
                                variant="ghost"
                                className="text-red-500"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                          <Button
                            onClick={() => setAttachments([...attachments, ''])}
                            size="sm"
                            variant="outline"
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Add Attachment
                          </Button>
                        </div>
                        <p className="text-xs text-gray-500">File paths to documents that will be consolidated</p>
                      </div>
                    </div>
                  )}

                  {/* Gemini Deep Research Node Configuration */}
                  {(node?.type === 'gemini_deep_research' || node?.type === 'prompt') && (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Research Query / Prompt</Label>
                        <textarea
                          value={queryPrompt}
                          onChange={(e) => setQueryPrompt(e.target.value)}
                          placeholder="Enter your research query or prompt here..."
                          className="flex min-h-[200px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        />
                        <p className="text-xs text-gray-500">This is the main prompt that will be sent to the AI model</p>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Prepend Text (Optional)</Label>
                        <textarea
                          value={prependText}
                          onChange={(e) => setPrependText(e.target.value)}
                          placeholder="Text to prepend before the main prompt..."
                          className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Append Text (Optional)</Label>
                        <textarea
                          value={appendText}
                          onChange={(e) => setAppendText(e.target.value)}
                          placeholder="Text to append after the main prompt..."
                          className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        />
                      </div>
                    </div>
                  )}

                  {/* Transform Node Configuration */}
                  {node?.type === 'transform' && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Transform Type</Label>
                          <select
                            value={transformType}
                            onChange={(e) => setTransformType(e.target.value)}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                          >
                            <option value="">Select Transform</option>
                            <option value="markdown">Markdown</option>
                            <option value="json">JSON</option>
                            <option value="xml">XML</option>
                            <option value="csv">CSV</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Input Key</Label>
                          <Input
                            value={inputKey}
                            onChange={(e) => setInputKey(e.target.value)}
                            placeholder="input_data"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Output Key</Label>
                        <Input
                          value={outputKey}
                          onChange={(e) => setOutputKey(e.target.value)}
                          placeholder="transformed_data"
                        />
                      </div>
                    </div>
                  )}

                  {/* Export Node Configuration */}
                  {node?.type === 'export' && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Export Format</Label>
                          <select
                            value={exportFormat}
                            onChange={(e) => setExportFormat(e.target.value)}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                          >
                            <option value="json">JSON</option>
                            <option value="markdown">Markdown</option>
                            <option value="txt">Text</option>
                            <option value="csv">CSV</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">File Path</Label>
                          <Input
                            value={filePath}
                            onChange={(e) => setFilePath(e.target.value)}
                            placeholder="output.json"
                          />
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={saveIntermittently}
                          onChange={(e) => setSaveIntermittently(e.target.checked)}
                          className="rounded"
                        />
                        <Label className="text-sm">Save Intermittently</Label>
                      </div>
                    </div>
                  )}

                  {/* Condition Node Configuration */}
                  {node?.type === 'condition' && (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Condition Expression</Label>
                        <Input
                          value={conditionExpr}
                          onChange={(e) => setConditionExpr(e.target.value)}
                          placeholder="value > 10"
                        />
                        <p className="text-xs text-gray-500">Python expression to evaluate</p>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">True Output</Label>
                          <Input
                            value={trueOutput}
                            onChange={(e) => setTrueOutput(e.target.value)}
                            placeholder="true_branch"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">False Output</Label>
                          <Input
                            value={falseOutput}
                            onChange={(e) => setFalseOutput(e.target.value)}
                            placeholder="false_branch"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Action Sequence with Drag & Drop */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-lg font-medium">Action Sequence</Label>
                      <Button onClick={addAction} size="sm" variant="outline">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Action
                      </Button>
                    </div>

                    {validationErrors.actions && (
                      <p className="text-sm text-red-500">{validationErrors.actions}</p>
                    )}

                    <div className="border rounded-lg p-4 space-y-3 min-h-[200px]">
                      {actions.map((action, index) => (
                        <div
                          key={index}
                          draggable
                          onDragStart={(e) => handleActionDragStart(e, index)}
                          onDragOver={handleActionDragOver}
                          onDrop={(e) => handleActionDrop(e, index)}
                          className={`border rounded-lg p-4 bg-white shadow-sm cursor-move hover:shadow-md transition-shadow ${
                            draggedActionIndex === index ? 'opacity-50' : ''
                          }`}
                        >
                          <div className="flex items-center space-x-4">
                            <div className="flex items-center space-x-2">
                              <GripVertical className="h-4 w-4 text-gray-400" />
                              <Badge variant="outline">{index + 1}</Badge>
                            </div>

                            <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4">
                              <div className="space-y-1">
                                <Label className="text-xs text-gray-600">Selector</Label>
                                <select
                                  value={action.selector}
                                  onChange={(e) => updateAction(index, 'selector', e.target.value)}
                                  className="flex h-8 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                >
                                  <option value="">Select Selector</option>
                                  {availableSelectors
                                    .filter(sel => !sel.provider || sel.provider === provider)
                                    .map(sel => (
                                      <option key={sel.key} value={sel.key}>
                                        {sel.key}
                                      </option>
                                    ))}
                                </select>
                                {validationErrors[`action_${index}_selector`] && (
                                  <p className="text-xs text-red-500">{validationErrors[`action_${index}_selector`]}</p>
                                )}
                              </div>

                              <div className="space-y-1">
                                <Label className="text-xs text-gray-600">Action</Label>
                                <select
                                  value={action.actionType}
                                  onChange={(e) => updateAction(index, 'actionType', e.target.value)}
                                  className="flex h-8 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                >
                                  <option value="click">Click</option>
                                  <option value="type">Type</option>
                                  <option value="wait">Wait</option>
                                  <option value="scroll">Scroll</option>
                                </select>
                                {validationErrors[`action_${index}_actionType`] && (
                                  <p className="text-xs text-red-500">{validationErrors[`action_${index}_actionType`]}</p>
                                )}
                              </div>

                              <div className="space-y-1">
                                <Label className="text-xs text-gray-600">Value</Label>
                                <Input
                                  value={action.value}
                                  onChange={(e) => updateAction(index, 'value', e.target.value)}
                                  placeholder="Value"
                                  className="h-8"
                                />
                              </div>

                              <div className="space-y-1">
                                <Label className="text-xs text-gray-600">Delay: {action.delay || 0}ms</Label>
                                <Slider
                                  value={action.delay || 0}
                                  onChange={(value) => updateAction(index, 'delay', value)}
                                  min={0}
                                  max={5000}
                                  step={100}
                                  className="mt-1"
                                />
                              </div>
                            </div>

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
                      ))}

                      {actions.length === 0 && (
                        <div className="text-center text-gray-500 py-8">
                          <p>No actions defined. Click "Add Action" to get started.</p>
                          <p className="text-sm mt-2">Drag and drop actions to reorder execution sequence.</p>
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
              </TabsContent>

              {/* Timeline Tab */}
              <TabsContent value="timeline" className="h-full p-6 overflow-y-auto">
                <div className="max-w-4xl mx-auto">
                  <h3 className="text-lg font-medium mb-4">Execution Timeline</h3>
                  <div className="space-y-4">
                    {actions.map((action, index) => (
                      <div key={index} className="flex items-center space-x-4">
                        <div className="flex flex-col items-center">
                          <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm font-medium">
                            {index + 1}
                          </div>
                          {index < actions.length - 1 && (
                            <div className="w-0.5 h-8 bg-gray-300 mt-2"></div>
                          )}
                        </div>
                        <div className="flex-1 border rounded-lg p-4 bg-white">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-medium">{action.actionType}</h4>
                              <p className="text-sm text-gray-600">
                                Selector: {action.selector || 'Not set'}
                              </p>
                              {action.value && (
                                <p className="text-sm text-gray-600">Value: {action.value}</p>
                              )}
                            </div>
                            <div className="text-right">
                              <p className="text-sm text-gray-500">
                                Delay: {action.delay || 0}ms
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    {actions.length === 0 && (
                      <div className="text-center text-gray-500 py-8">
                        No actions to display in timeline.
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>

              {/* Preview Tab */}
              <TabsContent value="preview" className="h-full p-6">
                <div className="max-w-4xl mx-auto">
                  <h3 className="text-lg font-medium mb-4">Canvas Preview</h3>
                  <div className="border rounded-lg h-96 bg-gray-50 flex items-center justify-center">
                    <div className="text-center text-gray-500">
                      <Eye className="h-12 w-12 mx-auto mb-4" />
                      <p>Mini canvas preview will be implemented here</p>
                      <p className="text-sm">Showing node connections and flow</p>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Validation Tab */}
              <TabsContent value="validation" className="h-full p-6 overflow-y-auto">
                <div className="max-w-4xl mx-auto">
                  <h3 className="text-lg font-medium mb-4">Configuration Validation</h3>
                  <div className="space-y-4">
                    <div className="border rounded-lg p-4">
                      <div className="flex items-center space-x-2 mb-2">
                        {Object.keys(validationErrors).length === 0 ? (
                          <>
                            <CheckCircle className="h-5 w-5 text-green-500" />
                            <span className="font-medium text-green-700">Configuration Valid</span>
                          </>
                        ) : (
                          <>
                            <AlertCircle className="h-5 w-5 text-red-500" />
                            <span className="font-medium text-red-700">
                              {Object.keys(validationErrors).length} Validation Error{Object.keys(validationErrors).length > 1 ? 's' : ''}
                            </span>
                          </>
                        )}
                      </div>
                      {Object.keys(validationErrors).length === 0 ? (
                        <p className="text-sm text-green-600">All configuration requirements are met.</p>
                      ) : (
                        <div className="space-y-2">
                          {Object.entries(validationErrors).map(([key, error]) => (
                            <div key={key} className="flex items-center space-x-2 text-sm text-red-600">
                              <AlertCircle className="h-4 w-4" />
                              <span>{error}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
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