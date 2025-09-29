import React, { useState, useEffect } from 'react'
import { Node } from '@xyflow/react'

interface AiDomNodeData {
  name: string
  provider: 'gemini' | 'perplexity' | 'ytt'
  actions: Array<{
    selector: string
    action: 'type' | 'click' | 'wait' | 'select'
    value?: string
    delayAfter?: number
  }>
  output: 'file' | 'screen' | 'clipboard' | 'next'
}

interface NodeConfigDialogProps {
  node: Node<Record<string, any>> | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (nodeId: string, data: AiDomNodeData) => void
}

const NodeConfigDialog: React.FC<NodeConfigDialogProps> = ({
  node,
  open,
  onOpenChange,
  onSave
}) => {
  const [name, setName] = useState('')
  const [provider, setProvider] = useState<AiDomNodeData['provider']>('gemini')
  const [actions, setActions] = useState<AiDomNodeData['actions']>([])
  const [output, setOutput] = useState<AiDomNodeData['output']>('clipboard')

  useEffect(() => {
    if (node?.data) {
      const data = node.data as AiDomNodeData
      setName(data.name || '')
      setProvider(data.provider || 'gemini')
      setActions(data.actions || [])
      setOutput(data.output || 'clipboard')
    }
  }, [node])

  const handleSave = () => {
    if (name.trim()) {
      onSave(node!.id, { name, provider, actions, output })
    }
  }

  const addAction = () => {
    setActions([...actions, { selector: '', action: 'click', delayAfter: 1000 }])
  }

  const updateAction = (index: number, field: string, value: string | number) => {
    const updated = [...actions]
    updated[index] = { ...updated[index], [field]: value }
    setActions(updated)
  }

  const removeAction = (index: number) => {
    setActions(actions.filter((_, i) => i !== index))
  }

  if (!node || !open) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-bold">Configure AI DOM Node</h2>
          <p className="text-sm text-gray-600">Node ID: {node.id}</p>
        </div>

        <div className="p-6 space-y-4">
          {/* Node Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Node Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="Enter node name"
            />
          </div>

          {/* Provider Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">AI Provider</label>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value as AiDomNodeData['provider'])}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="gemini">🧠 Gemini (Deep Research)</option>
              <option value="perplexity">🧐 Perplexity (Multi-source)</option>
              <option value="ytt">📺 YouTube Transcript</option>
            </select>
          </div>

          {/* Actions */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <span className="text-sm font-medium">Actions Sequence</span>
              <button
                onClick={addAction}
                className="px-2 py-1 bg-green-500 text-white rounded text-sm"
              >
                + Add
              </button>
            </div>

            {actions.length === 0 ? (
              <div className="text-center py-4 text-gray-500 bg-gray-50 rounded">
                No actions configured
              </div>
            ) : (
              <div className="space-y-2">
                {actions.map((action, index) => (
                  <div key={index} className="border rounded p-3 bg-gray-50 flex gap-2 items-center">
                    <select
                      value={action.action}
                      onChange={(e) => updateAction(index, 'action', e.target.value)}
                      className="px-2 py-1 text-sm border rounded"
                    >
                      <option value="click">Click</option>
                      <option value="type">Type</option>
                      <option value="wait">Wait</option>
                    </select>

                    <input
                      type="text"
                      placeholder="CSS selector"
                      value={action.selector}
                      onChange={(e) => updateAction(index, 'selector', e.target.value)}
                      className="flex-1 px-2 py-1 text-sm border rounded"
                      disabled={action.action === 'wait'}
                    />

                    {action.action === 'type' && (
                      <input
                        type="text"
                        placeholder="Text to type"
                        value={action.value || ''}
                        onChange={(e) => updateAction(index, 'value', e.target.value)}
                        className="flex-1 px-2 py-1 text-sm border rounded"
                      />
                    )}

                    <input
                      type="number"
                      placeholder="Delay (ms)"
                      value={action.delayAfter || 1000}
                      onChange={(e) => updateAction(index, 'delayAfter', parseInt(e.target.value) || 1000)}
                      className="w-20 px-2 py-1 text-sm border rounded"
                    />

                    <button
                      onClick={() => removeAction(index)}
                      className="px-2 py-1 bg-red-500 text-white rounded"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Output */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Output Method</label>
            <select
              value={output}
              onChange={(e) => setOutput(e.target.value as AiDomNodeData['output'])}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="clipboard">📋 Copy to Clipboard</option>
              <option value="file">📄 Save to File</option>
              <option value="screen">🖥️ Display on Screen</option>
              <option value="next">➡️ Pass to Next Node</option>
            </select>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
          <button
            onClick={() => onOpenChange(false)}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded hover:bg-gray-200"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            disabled={!name.trim()}
          >
            Save Configuration
          </button>
        </div>
      </div>
    </div>
  )
}

export default NodeConfigDialog