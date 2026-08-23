import React, { useState, useEffect } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card"
import { Badge } from "../components/ui/badge"
import { Select } from "../components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs"
import { Download, Search, Eye, Filter, CheckCircle, AlertCircle, Clock, Play } from "lucide-react"
import resultsService, { RunResult } from "../services/resultsService"
import { LoadingSpinner } from "../components/ui/spinner"
import { motion } from "framer-motion"

const Results: React.FC = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [results, setResults] = useState<RunResult[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("all")

  useEffect(() => {
    fetchResults()
  }, [activeTab])

  const fetchResults = async () => {
    setIsLoading(true)
    try {
      // Map tab to status filter
      let statusFilter = undefined
      if (activeTab === 'completed') statusFilter = 'completed'
      if (activeTab === 'failed') statusFilter = 'failed'

      const data = await resultsService.getResults(50, 0, statusFilter)
      setResults(data.results)
    } catch (error) {
      console.error("Failed to fetch results", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleViewResult = (executionId: string) => {
    navigate(`/results/${executionId}`)
  }

  return (
    <div className="space-y-6 container mx-auto max-w-7xl animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Results Explorer</h1>
          <p className="text-gray-600 mt-1">Analyze workflow outputs and artifacts</p>
        </div>
        <Button variant="outline" onClick={() => fetchResults()}>
          Refresh
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4 max-w-md">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
          <TabsTrigger value="failed">Failed</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6 space-y-6">
          {/* Results Grid */}
          {isLoading ? (
            <div className="flex justify-center p-12">
              <LoadingSpinner className="w-8 h-8 text-primary" />
            </div>
          ) : results.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Search className="h-12 w-12 mb-4 opacity-20" />
                <p>No results found for this filter.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {results.map((result) => (
                <motion.div
                  key={result.execution_id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ y: -4 }}
                  transition={{ duration: 0.2 }}
                >
                  <Card className="hover:shadow-glow transition-all duration-300 border-border/60">
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <Badge variant={result.status === 'completed' ? 'default' : result.status === 'failed' ? 'destructive' : 'secondary'}>
                          {result.status}
                        </Badge>
                        <span className="text-xs font-mono text-muted-foreground">
                          {new Date(result.started_at).toLocaleDateString()}
                        </span>
                      </div>
                      <CardTitle className="text-lg mt-2 truncate text-primary">{result.workflow_id}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="text-sm text-gray-500 flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        {(() => { const v = result.duration ?? (result as unknown as {execution_time?: number}).execution_time; return typeof v === 'number' ? `${v.toFixed(2)}s` : 'Unknown'; })()}
                      </div>
                      <div className="flex gap-2 w-full">
                        <Button
                          className="w-full bg-surface-secondary text-foreground hover:bg-primary hover:text-white transition-colors"
                          onClick={() => handleViewResult(result.execution_id)}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          View Details
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default Results