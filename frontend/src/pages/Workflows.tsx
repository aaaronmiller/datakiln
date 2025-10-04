import * as React from "react"
import { useNavigate } from "react-router-dom"
import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card"
import { Badge } from "../components/ui/badge"
import { Select } from "../components/ui/select"
import { Plus, Search, Filter, Play, Edit, MoreVertical, Download, Upload } from "lucide-react"

interface Workflow {
  id: string
  name: string
  description: string
  status: 'active' | 'draft' | 'archived'
  lastModified: string
  version: string
  tags: string[]
  runCount: number
}

const Workflows: React.FC = () => {
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState<string>("all")
  const [sortBy, setSortBy] = React.useState<string>("lastModified")

  // Mock data - in real app this would come from API
  const workflows: Workflow[] = [
    {
      id: "1",
      name: "Deep Research Pipeline",
      description: "Comprehensive AI research with multiple sources and analysis",
      status: "active",
      lastModified: "2024-01-15T10:30:00Z",
      version: "v2.1",
      tags: ["research", "ai", "analysis"],
      runCount: 45
    },
    {
      id: "2",
      name: "YouTube Transcript Analyzer",
      description: "Extract and analyze YouTube video transcripts",
      status: "active",
      lastModified: "2024-01-14T15:20:00Z",
      version: "v1.3",
      tags: ["youtube", "transcript", "analysis"],
      runCount: 23
    },
    {
      id: "3",
      name: "Data Processing Workflow",
      description: "Process and transform structured data",
      status: "draft",
      lastModified: "2024-01-13T09:15:00Z",
      version: "v0.8",
      tags: ["data", "processing", "transform"],
      runCount: 0
    }
  ]

  const filteredWorkflows = workflows.filter(workflow => {
    const matchesSearch = workflow.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         workflow.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "all" || workflow.status === statusFilter
    return matchesSearch && matchesStatus
  }).sort((a, b) => {
    switch (sortBy) {
      case "name":
        return a.name.localeCompare(b.name)
      case "lastModified":
        return new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime()
      case "runCount":
        return b.runCount - a.runCount
      default:
        return 0
    }
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800"
      case "draft":
        return "bg-yellow-100 text-yellow-800"
      case "archived":
        return "bg-gray-100 text-gray-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const handleCreateWorkflow = () => {
    navigate("/workflows/new")
  }

  const handleEditWorkflow = (workflowId: string) => {
    // For predefined, load them
    let predefined;
    switch (workflowId) {
      case 'simple-deep':
        predefined = SIMPLE_DEEP_RESEARCH;
        break;
      case 'deeper-research':
        predefined = DEEPER_RESEARCH;
        break;
      default:
        navigate(`/workflows/${workflowId}/edit`);
        return;
    }
    // Pass predefined to editor via localStorage or state, but for now navigate with param
    navigate(`/workflows/${workflowId}/edit`);
  }

  const handleRunWorkflow = (workflowId: string) => {
    navigate(`/runs?workflow=${workflowId}`)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Workflows</h1>
          <p className="text-gray-600 mt-1">Create and manage your automation workflows</p>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline" size="sm">
            <Upload className="h-4 w-4 mr-2" />
            Import
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button onClick={handleCreateWorkflow}>
            <Plus className="h-4 w-4 mr-2" />
            New Workflow
          </Button>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search workflows..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="pl-10 w-32 h-10"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="draft">Draft</option>
                <option value="archived">Archived</option>
              </Select>
            </div>
            <Select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-40 h-10"
            >
              <option value="lastModified">Last Modified</option>
              <option value="name">Name</option>
              <option value="runCount">Run Count</option>
            </Select>
          </div>
        </div>
      </div>

      {/* Workflow Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredWorkflows.map((workflow) => (
          <Card key={workflow.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg">{workflow.name}</CardTitle>
                  <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                    {workflow.description}
                  </p>
                </div>
                <Badge className={getStatusColor(workflow.status)}>
                  {workflow.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between text-sm text-gray-500">
                <span>Version {workflow.version}</span>
                <span>{workflow.runCount} runs</span>
              </div>

              <div className="flex flex-wrap gap-1">
                {workflow.tags.map((tag) => (
                  <Badge key={tag} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>

              <div className="text-xs text-gray-500">
                Modified {new Date(workflow.lastModified).toLocaleDateString()}
              </div>

              <div className="flex space-x-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleRunWorkflow(workflow.id)}
                  className="flex-1"
                >
                  <Play className="h-3 w-3 mr-1" />
                  Run
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleEditWorkflow(workflow.id)}
                  className="flex-1"
                >
                  <Edit className="h-3 w-3 mr-1" />
                  Edit
                </Button>
                <Button size="sm" variant="ghost">
                  <MoreVertical className="h-3 w-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredWorkflows.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No workflows found</h3>
          <p className="text-gray-600 mb-4">
            {searchTerm || statusFilter !== "all"
              ? "Try adjusting your search or filters"
              : "Get started by creating your first workflow"
            }
          </p>
          <Button onClick={handleCreateWorkflow}>
            <Plus className="h-4 w-4 mr-2" />
            Create Workflow
          </Button>
        </div>
      )}
    </div>
  )
}

export default Workflows