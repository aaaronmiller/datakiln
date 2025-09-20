import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card"
import { Button } from "../ui/button"

interface ResultItem {
  id: string
  title: string
  content: string
  type: string
  timestamp: string
  metadata?: Record<string, any>
}

interface ResultsDisplayProps {
  results?: ResultItem[]
  isLoading?: boolean
  onExport?: (format: string) => void
  onClear?: () => void
}

const ResultsDisplay: React.FC<ResultsDisplayProps> = ({
  results = [],
  isLoading = false,
  onExport,
  onClear
}) => {
  const getResultIcon = (type: string) => {
    const icons: Record<string, string> = {
      search: "🔍",
      analysis: "📊",
      report: "📋",
      data: "📄"
    }
    return icons[type] || "📄"
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Processing results...</p>
        </div>
      </div>
    )
  }

  if (results.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center text-gray-500">
          <div className="text-4xl mb-4">📊</div>
          <h3 className="text-lg font-medium mb-2">No Results Yet</h3>
          <p className="text-sm">Run a workflow to see results here</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Research Results</h2>
        <div className="space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onExport?.("json")}
          >
            Export JSON
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onExport?.("csv")}
          >
            Export CSV
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClear}
          >
            Clear
          </Button>
        </div>
      </div>

      <div className="grid gap-4">
        {results.map((result) => (
          <Card key={result.id}>
            <CardHeader>
              <div className="flex items-center space-x-3">
                <span className="text-lg">{getResultIcon(result.type)}</span>
                <div className="flex-1">
                  <CardTitle className="text-base">{result.title}</CardTitle>
                  <p className="text-xs text-gray-500">
                    {new Date(result.timestamp).toLocaleString()}
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm max-w-none">
                <p className="text-gray-700 whitespace-pre-wrap">{result.content}</p>
              </div>
              {result.metadata && Object.keys(result.metadata).length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Metadata</h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {Object.entries(result.metadata).map(([key, value]) => (
                      <div key={key}>
                        <span className="font-medium">{key}:</span> {String(value)}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

export default ResultsDisplay