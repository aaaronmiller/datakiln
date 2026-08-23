import * as React from "react"
import { useNavigate } from "react-router-dom"
import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card"
import { Badge } from "../components/ui/badge"
import { Select } from "../components/ui/select"
import { Plus, Search, Filter, Play, Edit, MoreVertical, Download, Upload } from "lucide-react"
import workflowService, { WorkflowMetadata } from "../services/workflowService"
import WorkflowRunDialog from "../components/workflow/WorkflowRunDialog"
import { useToast } from "../hooks/use-toast"

const Workflows: React.FC = () => {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [searchTerm, setSearchTerm] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState<string>("all")
  const [sortBy, setSortBy] = React.useState<string>("lastModified")
  const [workflows, setWorkflows] = React.useState<WorkflowMetadata[]>([])
  const [isLoading, setIsLoading] = React.useState(true)

  // Run Dialog State
  const [runDialog, setRunDialog] = React.useState<{ isOpen: boolean, id: string, name?: string }>({
    isOpen: false,
    id: ''
  })

  // Load workflows
  const loadWorkflows = React.useCallback(async () => {
    try {
      setIsLoading(true)
      let data = await workflowService.getAllWorkflows()

      // Ensure system workflows are visible if not returned by backend list (depending on backend implementation)
      // This mirrors Dashboard logic to ensure critical tools are available
      const systemWorkflows: WorkflowMetadata[] = [
        {
          id: 'deep-research',
          name: 'Deep Research Pipeline',
          description: 'Comprehensive AI research with multiple sources and analysis',
          status: 'active',
          last_modified: new Date().toISOString(),
          version: '1.0',
          tags: ['system', 'research'],
          run_count: 0
        },
        // We removed transcript-analysis as a hardcoded UI feature, but if it exists as a generic workflow in backend
        // it will appear naturally. If not, we don't force it unless user wants it.
        // But for "legacy" support if backend doesn't list it yet:
        // { ... transcript ... } - Omitted as per user instruction to remove hardcoded stuff.
        // If the backend lists it, it will show up.
      ]

      // Merge system workflows if missing
      systemWorkflows.forEach(sw => {
        if (!data.find(w => w.id === sw.id)) {
          data.unshift(sw)
        }
      })

      setWorkflows(data)
    } catch (error) {
      console.error('Failed to load workflows:', error)
      toast({
        title: "Error",
        description: "Failed to load workflows",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }, [toast])

  React.useEffect(() => {
    loadWorkflows()
  }, [loadWorkflows])

  const filteredWorkflows = workflows.filter(workflow => {
    const matchesSearch = workflow.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      workflow.description?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "all" || workflow.status === statusFilter
    return matchesSearch && matchesStatus
  }).sort((a, b) => {
    switch (sortBy) {
      case "name":
        return a.name.localeCompare(b.name)
      case "lastModified":
        return new Date(b.last_modified || 0).getTime() - new Date(a.last_modified || 0).getTime()
      case "runCount":
        return (b.run_count || 0) - (a.run_count || 0)
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
    // If system workflow, warn or disable? For now allow navigation, Editor might handle read-only.
    navigate(`/workflows/${workflowId}/edit`)
  }

  const handleRunClick = (workflowId: string, workflowName: string) => {
    setRunDialog({
      isOpen: true,
      id: workflowId,
      name: workflowName
    })
  }

  const handleExecuteWorkflow = async (inputs: Record<string, unknown>) => {
    const type = runDialog.id
    try {
      // Use generic execute endpoint via service (which we fixed to use /api/v1/workflows/execute)
      // Special case for deep-research if needed, but ideally backend handles it.
      // Dashboard used a direct axios call. Here we adhere to Service pattern.
      // But we need to ensure inputs format matches what backend expects.

      // If service is generic:
      // await workflowService.executeWorkflow(workflowGraph, inputs) - Wait, executeWorkflow takes Graph?
      // The executeWorkflow method in service expects `workflow: WorkflowGraph`.
      // But we are running by ID!
      // The `WorkflowRunDialog` is running by ID.
      // The `workflowService` currently expects a FULL GRAPH to execute.
      // This is a mismatch. The backend has logic to execute by ID if we use a different endpoint?
      // `POST /api/v1/workflows/execute` in backend takes `WorkflowExecutionRequest`.
      // Let's check backend `workflows.py`.

      // If the service relies on passing the full graph, we need to fetch it first.
      // OR we update `workflowService` to allow executing by ID.
      // `Dashboard.tsx` uses `axios.post('/api/v1/workflows/execute', { workflow_id: type, inputs })`.
      // This implies the endpoint supports `workflow_id`.

      // `workflowService.executeWorkflow` in my previous view:
      // body: JSON.stringify({ workflow, execution_options: options })
      // It sends `workflow` object.

      // I should update `workflowService` to support `executeWorkflowById`.
      // Or just usage generic Axios here like Dashboard for now to be safe.
      // I'll generic Axios here to match Dashboard logic which is tested/assumed working.
      // Actually I should allow the service to handle it.

      // I will use direct fetch/axios here to match Dashboard pattern for "Quick Run", or add `executeWorkflowById` to service.
      // Adding to service is cleaner but risky if I mess up signature.
      // I'll use `workflowService` but hack the argument or simple axios. 
      // I'll use simple fetch pattern here to ensure `workflow_id` is sent.

      // og backend expects full workflow graph, not workflow_id — fetch then execute
      const wfRes = await fetch(`/api/v1/workflows/${type}`)
      if (!wfRes.ok) throw new Error(`Workflow ${type} not found`)
      const workflowGraph = await wfRes.json()
      const execRes = await fetch('/api/v1/workflows/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workflow: workflowGraph, execution_options: inputs, validate_workflow: true })
      })
      if (!execRes.ok) {
        const txt = await execRes.text()
        throw new Error(`Execution failed: ${execRes.status} ${txt}`)
      }
      const execData = await execRes.json()
      const response = { ok: true, json: async () => execData } as Response

      toast({
        title: "Success",
        description: `Workflow ${runDialog.name} started`
      })

      // Optionally navigate to runs
      // navigate('/runs') 
    } catch (error) {
      console.error(`Failed to start ${type}:`, error)
      toast({
        title: "Error",
        description: `Failed to start workflow`,
        variant: "destructive"
      })
      throw error
    }
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
      {isLoading ? (
        <div className="flex justify-center p-12">Loading workflows...</div>
      ) : (
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
                  <span>{workflow.run_count} runs</span>
                </div>

                <div className="flex flex-wrap gap-1">
                  {workflow.tags?.map((tag) => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>

                <div className="text-xs text-gray-500">
                  Modified {new Date(workflow.last_modified).toLocaleDateString()}
                </div>

                <div className="flex space-x-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleRunClick(workflow.id, workflow.name)}
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
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!isLoading && filteredWorkflows.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            {/* Icon */}
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

      {/* Run Dialog */}
      <WorkflowRunDialog
        isOpen={runDialog.isOpen}
        onClose={() => setRunDialog(prev => ({ ...prev, isOpen: false }))}
        onRun={handleExecuteWorkflow}
        workflowId={runDialog.id}
        workflowName={runDialog.name}
      />
    </div>
  )
}

export default Workflows