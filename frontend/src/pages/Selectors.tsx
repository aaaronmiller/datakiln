import React, { useState, useEffect } from "react"
import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card"
import { Badge } from "../components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs"
import { Select } from "../components/ui/select"
import { CheckCircle, XCircle, AlertCircle, Play, Globe, TestTube, BookOpen, Zap, Eye, Plus, Edit, Trash2 } from "lucide-react"

interface SelectorValidationResult {
  valid: boolean
  selector: string
  selector_type: string
  issues: string[]
  match_info: any
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
  const [activeTab, setActiveTab] = useState("inspection")
  const [testUrl, setTestUrl] = useState("")
  const [isLoadingPage, setIsLoadingPage] = useState(false)
  const [pageContent, setPageContent] = useState("")
  const [selector, setSelector] = useState("")
  const [selectorType, setSelectorType] = useState<'css' | 'xpath'>('css')
  const [validationResult, setValidationResult] = useState<SelectorValidationResult | null>(null)
  const [isValidating, setIsValidating] = useState(false)
  const [registry, setRegistry] = useState<SelectorRegistryItem[]>([])
  const [selectedProvider, setSelectedProvider] = useState("gemini")

  // Mock data for demonstration
  useEffect(() => {
    const mockRegistry: SelectorRegistryItem[] = [
      {
        key: "canvasToggle",
        selector: "div.label:has-text(\"Canvas\")",
        selector_type: "css",
        description: "Toggle to switch to Canvas mode",
        provider: "gemini",
        context: "Mode switching",
        fallback_selectors: ["[data-testid=\"canvas-toggle\"]", ".canvas-mode"]
      },
      {
        key: "deepResearchToggle",
        selector: "div.label:has-text(\"Deep Research\")",
        selector_type: "css",
        description: "Toggle to switch to Deep Research mode",
        provider: "gemini",
        context: "Mode switching",
        fallback_selectors: ["[data-testid=\"deep-research-toggle\"]", ".deep-research-mode"]
      },
      {
        key: "promptInput",
        selector: "[contenteditable=\"true\"]",
        selector_type: "css",
        description: "Main prompt input area",
        provider: "gemini",
        context: "Input fields",
        fallback_selectors: ["textarea.prompt-input", ".prompt-editor"]
      }
    ]
    setRegistry(mockRegistry)
  }, [])

  const loadWebPage = async () => {
    if (!testUrl.trim()) return

    setIsLoadingPage(true)
    try {
      // Mock page loading - in real app this would fetch the page
      setTimeout(() => {
        setPageContent(`<html><body><div class="mock-page"><h1>Test Page</h1><div class="content">Mock page content for selector testing</div></div></body></html>`)
        setIsLoadingPage(false)
      }, 1000)
    } catch (error) {
      console.error('Failed to load page:', error)
      setIsLoadingPage(false)
    }
  }

  const validateSelector = async () => {
    if (!selector.trim()) return

    setIsValidating(true)
    try {
      // Mock validation - in real app this would call the backend
      setTimeout(() => {
        const isValid = selector.includes('.') || selector.includes('#') || selector.includes('[')
        setValidationResult({
          valid: isValid,
          selector,
          selector_type: selectorType,
          issues: isValid ? [] : ['Invalid selector syntax'],
          match_info: isValid ? { matches: 1, elements: ['div.test'] } : {},
          validation_type: 'syntax'
        })
        setIsValidating(false)
      }, 500)
    } catch (error) {
      setValidationResult({
        valid: false,
        selector,
        selector_type: selectorType,
        issues: ['Validation failed'],
        match_info: {},
        validation_type: 'error',
        error: 'Network error'
      })
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

  const filteredRegistry = registry.filter(item => item.provider === selectedProvider)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Selectors Lab</h1>
          <p className="text-gray-600 mt-1">Test and manage DOM selectors for web automation</p>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline" size="sm">
            <BookOpen className="h-4 w-4 mr-2" />
            Documentation
          </Button>
          <Button variant="outline" size="sm">
            <Zap className="h-4 w-4 mr-2" />
            Optimize All
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="inspection">DOM Inspection</TabsTrigger>
          <TabsTrigger value="testing">Selector Testing</TabsTrigger>
          <TabsTrigger value="library">Selector Library</TabsTrigger>
          <TabsTrigger value="optimization">Optimization</TabsTrigger>
        </TabsList>

        {/* DOM Inspection Tab */}
        <TabsContent value="inspection" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Globe className="h-5 w-5 mr-2" />
                Web Page Inspection
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex space-x-4">
                <Input
                  placeholder="Enter URL to inspect (e.g., https://gemini.google.com)"
                  value={testUrl}
                  onChange={(e) => setTestUrl(e.target.value)}
                  className="flex-1"
                />
                <Button onClick={loadWebPage} disabled={isLoadingPage || !testUrl.trim()}>
                  {isLoadingPage ? 'Loading...' : 'Load Page'}
                </Button>
              </div>

              {pageContent && (
                <div className="border rounded-lg p-4 bg-gray-50">
                  <h4 className="font-medium mb-2">Page Content Preview</h4>
                  <div className="bg-white border rounded p-3 text-sm font-mono max-h-64 overflow-y-auto">
                    <pre>{pageContent}</pre>
                  </div>
                </div>
              )}

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <Eye className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-blue-900">Chrome Extension Integration</h4>
                    <p className="text-sm text-blue-700 mt-1">
                      When connected, the Chrome extension will automatically load pages and provide real-time DOM inspection.
                      Click elements in the browser to generate selectors automatically.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Selector Testing Tab */}
        <TabsContent value="testing" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TestTube className="h-5 w-5 mr-2" />
                  Selector Testing
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Selector Type
                  </label>
                  <Select value={selectorType} onChange={(e) => setSelectorType(e.target.value as 'css' | 'xpath')}>
                    <option value="css">CSS Selector</option>
                    <option value="xpath">XPath</option>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Selector
                  </label>
                  <textarea
                    value={selector}
                    onChange={(e) => setSelector(e.target.value)}
                    placeholder={selectorType === 'css' ? '.class-name, #element-id' : '/html/body/div[1]'}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                    rows={3}
                  />
                </div>

                <Button
                  onClick={validateSelector}
                  disabled={!selector.trim() || isValidating}
                  className="w-full"
                >
                  <Play className="h-4 w-4 mr-2" />
                  {isValidating ? 'Testing...' : 'Test Selector'}
                </Button>
              </CardContent>
            </Card>

            {validationResult && (
              <Card className={getValidationColor(validationResult)}>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    {getValidationIcon(validationResult)}
                    <span className="ml-2">Test Results</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <span className="font-medium">Selector:</span>
                      <code className="ml-2 px-2 py-1 bg-gray-100 rounded text-sm">
                        {validationResult.selector}
                      </code>
                    </div>

                    <div>
                      <span className="font-medium">Status:</span>
                      <Badge variant={validationResult.valid ? "default" : "destructive"} className="ml-2">
                        {validationResult.valid ? 'Valid' : 'Invalid'}
                      </Badge>
                    </div>

                    {validationResult.issues.length > 0 && (
                      <div>
                        <span className="font-medium">Issues:</span>
                        <ul className="ml-4 mt-1 list-disc">
                          {validationResult.issues.map((issue, index) => (
                            <li key={index} className="text-sm">{issue}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {validationResult.match_info && Object.keys(validationResult.match_info).length > 0 && (
                      <div>
                        <span className="font-medium">Matches:</span>
                        <pre className="ml-4 mt-1 text-sm bg-gray-100 p-2 rounded">
                          {JSON.stringify(validationResult.match_info, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Selector Library Tab */}
        <TabsContent value="library" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BookOpen className="h-5 w-5 mr-2" />
                Selector Library
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-4">
                <Select value={selectedProvider} onChange={(e) => setSelectedProvider(e.target.value)}>
                  <option value="gemini">Gemini</option>
                  <option value="perplexity">Perplexity</option>
                  <option value="openai">OpenAI</option>
                </Select>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Selector
                </Button>
              </div>

              <div className="space-y-3">
                {filteredRegistry.map((item) => (
                  <Card key={item.key} className="hover:shadow-md transition-shadow">
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <h4 className="font-medium">{item.key}</h4>
                            <Badge variant="outline">{item.selector_type.toUpperCase()}</Badge>
                          </div>
                          <code className="text-sm bg-gray-100 px-2 py-1 rounded block mb-2">
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
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Optimization Tab */}
        <TabsContent value="optimization" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Zap className="h-5 w-5 mr-2" />
                Selector Optimization
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">95%</div>
                  <div className="text-sm text-green-700">Success Rate</div>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">1.2s</div>
                  <div className="text-sm text-blue-700">Avg Response Time</div>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">47</div>
                  <div className="text-sm text-purple-700">Active Selectors</div>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-medium">Optimization Suggestions</h4>
                <div className="space-y-2">
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
                    <p className="text-sm text-yellow-800">
                      <strong>Performance:</strong> Consider using ID selectors instead of complex CSS paths for better speed.
                    </p>
                  </div>
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                    <p className="text-sm text-blue-800">
                      <strong>Reliability:</strong> Add fallback selectors for 3 selectors that have single points of failure.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default Selectors