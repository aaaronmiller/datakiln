import React, { useState, useEffect } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card"
import { Badge } from "../components/ui/badge"
import { Select } from "../components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs"
import { Download, Search, Filter, Eye, Bookmark, BarChart3, FileText, Calendar, MoreVertical } from "lucide-react"

interface Result {
  id: string
  title: string
  runId: string
  workflowName: string
  provider: string
  mode: string
  createdAt: string
  size: number
  type: string
  tags: string[]
  bookmarked: boolean
}

const Results: React.FC = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [results, setResults] = useState<Result[]>([])
  const [filteredResults, setFilteredResults] = useState<Result[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [providerFilter, setProviderFilter] = useState("all")
  const [typeFilter, setTypeFilter] = useState("all")
  const [dateFilter, setDateFilter] = useState("all")
  const [activeTab, setActiveTab] = useState("browse")

  // Mock data for demonstration
  useEffect(() => {
    const mockResults: Result[] = [
      {
        id: "result-001",
        title: "Deep Research: AI Trends 2024",
        runId: "run-001",
        workflowName: "Deep Research Pipeline",
        provider: "gemini",
        mode: "comprehensive",
        createdAt: "2024-01-15T14:30:00Z",
        size: 245760,
        type: "markdown",
        tags: ["research", "ai", "trends"],
        bookmarked: true
      },
      {
        id: "result-002",
        title: "YouTube Transcript Analysis",
        runId: "run-002",
        workflowName: "Transcript Analyzer",
        provider: "gemini",
        mode: "balanced",
        createdAt: "2024-01-14T16:45:00Z",
        size: 189440,
        type: "json",
        tags: ["youtube", "transcript", "analysis"],
        bookmarked: false
      },
      {
        id: "result-003",
        title: "Data Processing Results",
        runId: "run-003",
        workflowName: "Data Processor",
        provider: "perplexity",
        mode: "fast",
        createdAt: "2024-01-13T11:20:00Z",
        size: 98752,
        type: "csv",
        tags: ["data", "processing", "export"],
        bookmarked: false
      }
    ]
    setResults(mockResults)
    setFilteredResults(mockResults)
  }, [])

  // Handle URL params for run filtering
  useEffect(() => {
    const runFilter = searchParams.get('run')
    if (runFilter) {
      setFilteredResults(results.filter(r => r.runId === runFilter))
    }
  }, [searchParams, results])

  // Apply filters
  useEffect(() => {
    let filtered = results.filter(result => {
      const matchesSearch = result.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           result.workflowName.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesProvider = providerFilter === "all" || result.provider === providerFilter
      const matchesType = typeFilter === "all" || result.type === typeFilter

      let matchesDate = true
      if (dateFilter !== "all") {
        const resultDate = new Date(result.createdAt)
        const now = new Date()
        const daysDiff = Math.floor((now.getTime() - resultDate.getTime()) / (1000 * 60 * 60 * 24))

        switch (dateFilter) {
          case "today":
            matchesDate = daysDiff === 0
            break
          case "week":
            matchesDate = daysDiff <= 7
            break
          case "month":
            matchesDate = daysDiff <= 30
            break
        }
      }

      return matchesSearch && matchesProvider && matchesType && matchesDate
    })

    setFilteredResults(filtered)
  }, [results, searchTerm, providerFilter, typeFilter, dateFilter])

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "markdown":
        return "📝"
      case "json":
        return "📄"
      case "csv":
        return "📊"
      case "pdf":
        return "📕"
      default:
        return "📁"
    }
  }

  const handleViewResult = (resultId: string) => {
    navigate(`/results/${resultId}`)
  }


  const handleBookmark = (resultId: string) => {
    setResults(prev =>
      prev.map(r => r.id === resultId ? { ...r, bookmarked: !r.bookmarked } : r)
    )
  }

  const handleCompare = () => {
    // Mock comparison functionality
    console.log("Comparing selected results")
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Results</h1>
          <p className="text-gray-600 mt-1">Browse, analyze, and export your workflow results</p>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline" size="sm" onClick={handleCompare}>
            <BarChart3 className="h-4 w-4 mr-2" />
            Compare
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export All
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="browse">Browse Results</TabsTrigger>
          <TabsTrigger value="bookmarks">Bookmarks</TabsTrigger>
          <TabsTrigger value="visualizations">Visualizations</TabsTrigger>
        </TabsList>

        {/* Browse Tab */}
        <TabsContent value="browse" className="space-y-6">
          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search results..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={providerFilter} onChange={(e) => setProviderFilter(e.target.value)}>
                  <option value="all">All Providers</option>
                  <option value="gemini">Gemini</option>
                  <option value="perplexity">Perplexity</option>
                  <option value="openai">OpenAI</option>
                </Select>
                <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
                  <option value="all">All Types</option>
                  <option value="markdown">Markdown</option>
                  <option value="json">JSON</option>
                  <option value="csv">CSV</option>
                  <option value="pdf">PDF</option>
                </Select>
                <Select value={dateFilter} onChange={(e) => setDateFilter(e.target.value)}>
                  <option value="all">All Dates</option>
                  <option value="today">Today</option>
                  <option value="week">This Week</option>
                  <option value="month">This Month</option>
                </Select>
                <Button variant="outline" size="sm">
                  <Filter className="h-4 w-4 mr-2" />
                  More Filters
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Results Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredResults.map((result) => (
              <Card key={result.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg line-clamp-2">{result.title}</CardTitle>
                      <p className="text-sm text-gray-600 mt-1">
                        {result.workflowName} • Run {result.runId.slice(-8)}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline">{result.provider}</Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleBookmark(result.id)}
                        className={result.bookmarked ? "text-yellow-500" : "text-gray-400"}
                      >
                        <Bookmark className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <span className="flex items-center">
                      <span className="mr-2">{getTypeIcon(result.type)}</span>
                      {result.type.toUpperCase()}
                    </span>
                    <span>{formatFileSize(result.size)}</span>
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {result.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>

                  <div className="text-xs text-gray-500">
                    <Calendar className="h-3 w-3 inline mr-1" />
                    {new Date(result.createdAt).toLocaleDateString()}
                  </div>

                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewResult(result.id)}
                      className="flex-1"
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      View
                    </Button>
                    <Button variant="outline" size="sm">
                      <Download className="h-3 w-3 mr-1" />
                      Download
                    </Button>
                    <Button variant="ghost" size="sm">
                      <MoreVertical className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredResults.length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileText className="h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No results found</h3>
                <p className="text-gray-600 text-center mb-4">
                  {searchTerm || providerFilter !== "all" || typeFilter !== "all" || dateFilter !== "all"
                    ? "Try adjusting your search or filters"
                    : "Run some workflows to see results here"
                  }
                </p>
                <Button onClick={() => navigate("/workflows")}>
                  Browse Workflows
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Bookmarks Tab */}
        <TabsContent value="bookmarks" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {results.filter(r => r.bookmarked).map((result) => (
              <Card key={result.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle className="text-lg">{result.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 mb-4">{result.workflowName}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewResult(result.id)}
                    className="w-full"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View Result
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Visualizations Tab */}
        <TabsContent value="visualizations" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Results Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600 mb-2">{results.length}</div>
                  <div className="text-sm text-gray-600">Total Results</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600 mb-2">
                    {results.filter(r => r.bookmarked).length}
                  </div>
                  <div className="text-sm text-gray-600">Bookmarked</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-600 mb-2">
                    {Math.round(results.reduce((sum, r) => sum + r.size, 0) / 1024)} KB
                  </div>
                  <div className="text-sm text-gray-600">Total Size</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default Results