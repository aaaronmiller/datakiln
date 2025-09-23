import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "../ui/dialog"
import { Button } from "../ui/button"
import { Label } from "../ui/label"
import { Textarea } from "../ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card"
import { Badge } from "../ui/badge"
import { RadioGroup, RadioGroupItem } from "../ui/radio-group"
import { Alert, AlertDescription } from "../ui/alert"
import { Loader2, Lightbulb, Clock, Target } from "lucide-react"
import axios from "axios"

interface QueryStructuringDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (structuredQuery: StructuredQueryData) => void
  initialQuery?: string
}

interface StructuredQueryData {
  originalQuery: string
  selectedOption: string
  structuredQuery: string
  mode: string
  preferences: Record<string, unknown>
}

interface QueryOption {
  key: string
  title: string
  description: string
  structuredQuery: string
  approach: string
  estimatedTime: string
}

interface QueryRecommendation {
  type: 'expansion' | 'specificity' | 'depth'
  priority: 'high' | 'medium' | 'low'
  message: string
  suggestion: string
}

interface EnhancementSuggestion {
  category: string
  suggestions: string[]
}

const QueryStructuringDialog: React.FC<QueryStructuringDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  initialQuery = ""
}) => {
  const [query, setQuery] = React.useState(initialQuery)
  const [mode, setMode] = React.useState("balanced")
  const [isLoading, setIsLoading] = React.useState(false)
  const [structuredOptions, setStructuredOptions] = React.useState<Record<string, QueryOption>>({})
  const [recommendations, setRecommendations] = React.useState<QueryRecommendation[]>([])
  const [enhancementSuggestions, setEnhancementSuggestions] = React.useState<EnhancementSuggestion[]>([])
  const [selectedOption, setSelectedOption] = React.useState<string>("")
  const [customQuery, setCustomQuery] = React.useState("")

  // Reset state when dialog opens
  React.useEffect(() => {
    if (isOpen) {
      setQuery(initialQuery)
      setSelectedOption("")
      setCustomQuery("")
      setStructuredOptions({})
      setRecommendations([])
      setEnhancementSuggestions([])
    }
  }, [isOpen, initialQuery])

  const handleQueryChange = async (newQuery: string) => {
    setQuery(newQuery)

    if (newQuery.trim().length > 0) {
      setIsLoading(true)
      try {
        const response = await axios.post('/api/v1/dashboard/query/structure', {
          query: newQuery,
          mode: mode,
          preferences: {}
        })

        setStructuredOptions(response.data.structured_options || {})
        setRecommendations(response.data.recommendations || [])
        setEnhancementSuggestions(response.data.enhancement_suggestions || [])

        // Auto-select first option if available
        const optionKeys = Object.keys(response.data.structured_options || {})
        if (optionKeys.length > 0) {
          setSelectedOption(optionKeys[0])
        }
      } catch (error) {
        console.error('Failed to structure query:', error)
      } finally {
        setIsLoading(false)
      }
    }
  }

  const handleConfirm = () => {
    if (!query.trim()) return

    const structuredQuery: StructuredQueryData = {
      originalQuery: query,
      selectedOption,
      structuredQuery: selectedOption === 'custom'
        ? customQuery || query
        : structuredOptions[selectedOption]?.structuredQuery || query,
      mode,
      preferences: {}
    }

    onConfirm(structuredQuery)
    onClose()
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive'
      case 'medium': return 'default'
      case 'low': return 'secondary'
      default: return 'secondary'
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Target className="h-5 w-5" />
            <span>Structure Your Research Query</span>
          </DialogTitle>
          <DialogDescription>
            Refine your research query for better results. We'll suggest different approaches based on your needs.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Query Input */}
          <div className="space-y-2">
            <Label htmlFor="query">Research Query</Label>
            <Textarea
              id="query"
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              placeholder="Enter your research topic or question..."
              className="min-h-[80px]"
            />
          </div>

          {/* Mode Selection */}
          <div className="space-y-2">
            <Label>Research Mode</Label>
            <RadioGroup value={mode} onValueChange={setMode} className="flex space-x-4">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="fast" id="fast" />
                <Label htmlFor="fast" className="text-sm">Fast (1-2 min)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="balanced" id="balanced" />
                <Label htmlFor="balanced" className="text-sm">Balanced (2-5 min)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="comprehensive" id="comprehensive" />
                <Label htmlFor="comprehensive" className="text-sm">Comprehensive (5-8 min)</Label>
              </div>
            </RadioGroup>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              <span>Analyzing your query...</span>
            </div>
          )}

          {/* Recommendations */}
          {recommendations.length > 0 && (
            <div className="space-y-2">
              <Label className="flex items-center space-x-2">
                <Lightbulb className="h-4 w-4" />
                <span>Recommendations</span>
              </Label>
              <div className="space-y-2">
                {recommendations.map((rec, index) => (
                  <Alert key={index}>
                    <AlertDescription className="flex items-start space-x-2">
                      <Badge variant={getPriorityColor(rec.priority)} className="text-xs">
                        {rec.priority}
                      </Badge>
                      <div className="flex-1">
                        <p className="text-sm">{rec.message}</p>
                        <p className="text-xs text-muted-foreground mt-1">{rec.suggestion}</p>
                      </div>
                    </AlertDescription>
                  </Alert>
                ))}
              </div>
            </div>
          )}

          {/* Structured Options */}
          {Object.keys(structuredOptions).length > 0 && (
            <div className="space-y-4">
              <Label>Choose Research Approach</Label>
              <RadioGroup value={selectedOption} onValueChange={setSelectedOption}>
                <div className="grid gap-3">
                  {Object.entries(structuredOptions).map(([key, option]) => (
                    <Card
                      key={key}
                      className={`cursor-pointer transition-colors ${
                        selectedOption === key ? 'ring-2 ring-blue-500' : 'hover:bg-gray-50'
                      }`}
                      onClick={() => setSelectedOption(key)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start space-x-3">
                          <RadioGroupItem value={key} className="mt-1" />
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-medium">{option.title}</h4>
                              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                                <Clock className="h-3 w-3" />
                                <span>{option.estimatedTime}</span>
                              </div>
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">{option.description}</p>
                            <p className="text-sm font-medium mb-1">Approach: {option.approach}</p>
                            <p className="text-xs bg-gray-100 p-2 rounded font-mono">{option.structuredQuery}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                  {/* Custom Option */}
                  <Card
                    className={`cursor-pointer transition-colors ${
                      selectedOption === 'custom' ? 'ring-2 ring-blue-500' : 'hover:bg-gray-50'
                    }`}
                    onClick={() => setSelectedOption('custom')}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start space-x-3">
                        <RadioGroupItem value="custom" className="mt-1" />
                        <div className="flex-1">
                          <h4 className="font-medium mb-2">Custom Query</h4>
                          <p className="text-sm text-muted-foreground mb-2">Write your own structured query</p>
                          <Textarea
                            value={customQuery}
                            onChange={(e) => setCustomQuery(e.target.value)}
                            placeholder="Enter your custom structured query..."
                            className="min-h-[60px] font-mono text-sm"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </RadioGroup>
            </div>
          )}

          {/* Enhancement Suggestions */}
          {enhancementSuggestions.length > 0 && (
            <div className="space-y-2">
              <Label>Enhancement Suggestions</Label>
              <div className="grid gap-3">
                {enhancementSuggestions.map((category, index) => (
                  <Card key={index}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm capitalize">{category.category}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-1">
                        {category.suggestions.map((suggestion, idx) => (
                          <li key={idx} className="text-sm text-muted-foreground flex items-start space-x-2">
                            <span className="text-blue-500 mt-1">•</span>
                            <span>{suggestion}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!query.trim() || (!selectedOption && Object.keys(structuredOptions).length > 0)}
          >
            Start Research
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default QueryStructuringDialog