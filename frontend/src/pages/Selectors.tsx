import React, { useState, useEffect } from "react"
import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card"
import { Badge } from "../components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs"
import { Select } from "../components/ui/select"
import { CheckCircle, XCircle, AlertCircle, Play, Globe, TestTube, BookOpen, Zap, Eye, Plus, Edit, Trash2 } from "lucide-react"

interface MatchInfo {
  matches_found?: number
  match_type?: string
  confidence?: string
  attribute?: string
  note?: string
  url_provided?: string
  error?: string
}

interface SelectorValidationResult {
  valid: boolean
  selector: string
  selector_type: string
  issues: string[]
  match_info: MatchInfo
  validation_type: string
  error?: string
}

interface SelectorRegistryItem {
  key: string
  selector: string
  selector_type: string
  description?: string
  provider?: string
  context?: string
  fallback_selectors: string[]
}

const Selectors: React.FC = () => {
  const [activeTab, setActiveTab] = useState("registry")
  const [testHtml, setTestHtml] = useState("")
  const [selector, setSelector] = useState("")
  const [selectorType, setSelectorType] = useState<'css' | 'xpath'>('css')
  const [validationResult, setValidationResult] = useState<SelectorValidationResult | null>(null)
  const [isValidating, setIsValidating] = useState(false)
  const [registry, setRegistry] = useState<SelectorRegistryItem[]>([])
  const [selectedProvider, setSelectedProvider] = useState("all")

  // Load selector registry from backend
  useEffect(() => {
    const loadRegistry = async () => {
      try {
        const response = await fetch('/api/v1/selectors/registry')
        if (response.ok) {
          const data = await response.json()
          setRegistry(data.selectors || [])
        }
      } catch (error) {
        console.error('Failed to load selector registry:', error)
      }
    }
    loadRegistry()
  }, [])

  const validateSelector = async () => {
    if (!selector.trim()) return

    setIsValidating(true)
    try {
      const response = await fetch('/api/v1/selectors/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          selector,
          selector_type: selectorType,
          html_content: testHtml || undefined
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      setValidationResult(data.validation)
    } catch (error) {
      setValidationResult({
        valid: false,
        selector,
        selector_type: selectorType,
        issues: ['Validation failed'],
        match_info: {},
        validation_type: 'error',
        error: error instanceof Error ? error.message : 'Network error'
      })
    } finally {
      setIsValidating(false)
    }
  }

  const getValidationIcon = (result: SelectorValidationResult) => {
    if (result.error) return <XCircle className="w-5 h-5 text-red-500" />
    if (result.valid) return <CheckCircle className="w-5 h-5 text-green-500" />
    return <AlertCircle className="w-5 h-5 text-yellow-500" />
  }

  const getValidationColor = (result: SelectorValidationResult) => {
    if (result.error) return 'border-red-200 bg-red-50'
    if (result.valid) return 'border-green-200 bg-green-50'
    return 'border-yellow-200 bg-yellow-50'
  }

  const filteredRegistry = selectedProvider === 'all'
    ? registry
    : registry.filter(item => item.provider === selectedProvider)

  // Extract unique providers
  const providers = Array.from(new Set(registry.map(item => item.provider).filter(Boolean)))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Selectors Lab</h1>
          <p className="text-gray-600 mt-1">Manage and validate DOM selectors for your Virtual APIs</p>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline" size="sm">
            <BookOpen className="h-4 w-4 mr-2" />
            Documentation
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="registry">Selector Registry</TabsTrigger>
          <TabsTrigger value="validator">Validator</TabsTrigger>
          <TabsTrigger value="optimization">Optimization</TabsTrigger>
        </TabsList>

        {/* Selector Registry Tab */}
        <TabsContent value="registry" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Globe className="h-5 w-5 mr-2" />
                Registry
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-4">
                <Select value={selectedProvider} onChange={(e) => setSelectedProvider(e.target.value)}>
                  <option value="all">All Providers</option>
                  {providers.map(p => <option key={p} value={p}>{p}</option>)}
                </Select>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Manual Selector
                </Button>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-blue-800">
                  <strong>Tip:</strong> Use the DataKiln Chrome Extension to automatically capture and save selectors to this registry while browsing.
                </p>
              </div>

              <div className="space-y-3">
                {filteredRegistry.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No selectors found. Capture some using the Chrome Extension!
                  </div>
                ) : (
                  filteredRegistry.map((item) => (
                    <Card key={item.key} className="hover:shadow-md transition-shadow">
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <h4 className="font-medium">{item.key}</h4>
                              <Badge variant="outline">{item.selector_type.toUpperCase()}</Badge>
                              {item.provider && <Badge variant="secondary">{item.provider}</Badge>}
                            </div>
                            <code className="text-sm bg-gray-100 px-2 py-1 rounded block mb-2 font-mono">
                              {item.selector}
                            </code>
                            <p className="text-sm text-gray-600">{item.description}</p>
                            {item.fallback_selectors.length > 0 && (
                              <div className="mt-2">
                                <span className="text-xs text-gray-500">Fallbacks:</span>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {item.fallback_selectors.map((fallback, index) => (
                                    <code key={index} className="text-xs bg-gray-50 px-1 py-0.5 rounded">
                                      {fallback}
                                    </code>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                          <div className="flex space-x-2">
                            <Button variant="ghost" size="sm">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Validator Tab */}
        <TabsContent value="validator" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TestTube className="h-5 w-5 mr-2" />
                  Offline Validation
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    HTML Snippet
                  </label>
                  <textarea
                    value={testHtml}
                    onChange={(e) => setTestHtml(e.target.value)}
                    placeholder="Paste raw HTML here to test your selector logic..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-xs"
                    rows={6}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Selector
                  </label>
                  <Input
                    value={selector}
                    onChange={(e) => setSelector(e.target.value)}
                    placeholder=".class-name or #id"
                  />
                  <div className="mt-2 text-right">
                    <select
                      value={selectorType}
                      onChange={(e) => setSelectorType(e.target.value as 'css' | 'xpath')}
                      className="text-sm border rounded p-1"
                    >
                      <option value="css">CSS</option>
                      <option value="xpath">XPath</option>
                    </select>
                  </div>
                </div>

                <Button
                  onClick={validateSelector}
                  disabled={!selector.trim() || isValidating}
                  className="w-full"
                >
                  <Play className="h-4 w-4 mr-2" />
                  {isValidating ? 'Validating...' : 'Check Match'}
                </Button>
              </CardContent>
            </Card>

            {validationResult && (
              <Card className={getValidationColor(validationResult)}>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    {getValidationIcon(validationResult)}
                    <span className="ml-2">Result</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <span className="font-medium">Selector:</span>
                      <code className="ml-2 px-2 py-1 bg-white/50 rounded text-sm">
                        {validationResult.selector}
                      </code>
                    </div>

                    <div>
                      <span className="font-medium">Status:</span>
                      <Badge variant={validationResult.valid ? "default" : "destructive"} className="ml-2">
                        {validationResult.valid ? 'Valid Matches' : 'No Match / Invalid'}
                      </Badge>
                    </div>

                    {validationResult.issues.length > 0 && (
                      <div>
                        <span className="font-medium">Issues:</span>
                        <ul className="ml-4 mt-1 list-disc text-sm">
                          {validationResult.issues.map((issue, index) => (
                            <li key={index}>{issue}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Optimization Tab */}
        <TabsContent value="optimization" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Zap className="h-5 w-5 mr-2" />
                Optimization Insights
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500">
                Select selectors in the Registry to analyze their resilience and performance history.
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default Selectors