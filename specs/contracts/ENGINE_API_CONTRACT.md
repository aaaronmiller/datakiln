---
Type: Contract | Status: Active | Completion: 95%
---

# Engine API Contract

## Workflow Management

### POST /workflows
- Body: Workflow JSON as per specs/contracts/WORKFLOW_SCHEMA_V1.json
- Returns: Created workflow object

### GET /workflows
- Returns: Array of all workflows

### GET /workflows/{workflow_id}
- Returns: Single workflow by ID

### PUT /workflows/{workflow_id}
- Body: Updated workflow JSON
- Returns: Updated workflow object

### DELETE /workflows/{workflow_id}
- Returns: { "message": "Workflow deleted successfully" }

## Workflow Execution

### POST /workflows/{workflow_id}/execute
- Returns: { "execution_id": "uuid", "message": "Workflow execution started" }

### GET /workflows/executions/{execution_id}/status
- Returns: WorkflowExecution object with status, results, timestamps

### GET /workflow-results/{execution_id}
- Returns: Detailed execution results including status, timing, and output data

## Results & Storage

### POST /save-research-report
- Body: Research report data
- Returns: { "message": "Research report saved to Obsidian", "filepath": "path" }

### POST /save-youtube-analysis
- Body: YouTube analysis data
- Returns: { "message": "YouTube analysis saved to Obsidian", "filepath": "path" }

### POST /save-chat-capture
- Body: Chat capture data
- Returns: { "message": "Chat capture saved to Obsidian", "filepath": "path" }

### GET /obsidian-status
- Returns: { "status": "configured|not_configured|error", "vault_path": "path" }

## Data Flow & Processing

### Node Execution Flow
1. Workflow submitted via POST /workflows/{id}/execute
2. Execution tracked via GET /workflows/executions/{execution_id}/status
3. Results retrieved via GET /workflow-results/{execution_id}
4. Optional: Results saved to Obsidian via save-* endpoints

### Node Types Supported
- provider: AI provider interactions (gemini, perplexity)
- dom_action: DOM manipulation via Playwright
- transform: Data transformation operations
- condition: Conditional branching logic
- export: Data export in various formats
- prompt: Template-based prompt execution

## Error Handling
- 404: Workflow/execution not found
- 500: Internal server errors with descriptive messages
- All endpoints return JSON responses with error details

## Versioning & Validation
- Workflows validated against WORKFLOW_SCHEMA_V1.json
- Node parameters validated against NODE_REGISTRY_V1.json
- Provider configurations validated against ENDPOINTS.template.json
- Version mismatches result in validation errors

## Future Extensions (TODO)
- Real-time SSE streaming for execution progress
- Artifact storage and retrieval system
- Workflow versioning and history
- Collaborative editing support

