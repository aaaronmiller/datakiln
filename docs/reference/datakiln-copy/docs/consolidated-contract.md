# Consolidated Contract Document
## AI Research Automation Platform

## API Contract Specifications

### Workflow Management Endpoints

#### POST /api/v1/workflows
**Purpose**: Create new workflow
```json
{
  "name": "string",
  "description": "string", 
  "nodes": [
    {
      "id": "string",
      "type": "provider|dom_action|transform|filter|condition|export|aggregate|join|union|prompt",
      "position": {"x": 0, "y": 0},
      "data": {
        "params": "object (validated against NODE_REGISTRY_V1.json)"
      }
    }
  ],
  "edges": [
    {
      "id": "string",
      "source": "string", 
      "target": "string",
      "sourceHandle": "string",
      "targetHandle": "string"
    }
  ]
}
```
**Response**: Created workflow object with generated ID

#### GET /api/v1/workflows
**Purpose**: List all workflows
**Response**: Array of workflow objects with metadata

#### GET /api/v1/workflows/{id}
**Purpose**: Get specific workflow
**Response**: Complete workflow definition

#### PUT /api/v1/workflows/{id}
**Purpose**: Update workflow
**Request**: Same as POST with modifications
**Response**: Updated workflow object

#### DELETE /api/v1/workflows/{id}
**Purpose**: Delete workflow
**Response**: Confirmation message

### Workflow Execution Endpoints

#### POST /api/v1/workflows/{id}/execute
**Purpose**: Execute workflow
**Request Body**:
```json
{
  "input_data": "object (optional initial data)",
  "execution_options": {
    "timeout": "integer (seconds)",
    "retry_count": "integer",
    "parallel_limit": "integer"
  }
}
```
**Response**:
```json
{
  "execution_id": "uuid",
  "status": "running|completed|failed|cancelled",
  "message": "Workflow execution started"
}
```

#### GET /api/v1/executions/{execution_id}/status
**Purpose**: Get execution status
**Response**:
```json
{
  "execution_id": "uuid",
  "workflow_id": "string",
  "status": "running|completed|failed|cancelled",
  "progress": "number (0-1)",
  "current_node": "string",
  "started_at": "datetime",
  "completed_at": "datetime",
  "results": "object",
  "error": "string"
}
```

#### POST /api/v1/executions/{execution_id}/cancel
**Purpose**: Cancel running execution
**Response**: Cancellation confirmation

### Results Management Endpoints

#### GET /api/v1/results
**Purpose**: List execution results
**Query Parameters**:
- `workflow_id`: Filter by workflow
- `status`: Filter by execution status
- `limit`: Maximum results (default: 50)
- `offset`: Pagination offset
**Response**: Paginated list of results

#### GET /api/v1/results/{execution_id}
**Purpose**: Get detailed results
**Response**:
```json
{
  "execution_id": "uuid",
  "workflow_id": "string", 
  "results": "object",
  "artifacts": [
    {
      "type": "file|data|log",
      "name": "string",
      "url": "string",
      "size": "integer"
    }
  ],
  "metadata": {
    "execution_time": "number",
    "node_count": "integer",
    "data_processed": "integer"
  }
}
```

#### GET /api/v1/results/{execution_id}/export
**Purpose**: Export results
**Query Parameters**:
- `format`: json|csv|markdown|pdf
**Response**: File download or export URL

### Node Registry Contract

#### GET /api/v1/nodes/types
**Purpose**: Get available node types
**Response**: NODE_REGISTRY_V1.json content

#### POST /api/v1/nodes/validate
**Purpose**: Validate node configuration
**Request**:
```json
{
  "type": "string",
  "params": "object"
}
```
**Response**:
```json
{
  "valid": "boolean",
  "errors": ["string"],
  "warnings": ["string"]
}
```

### Chrome Extension Workflow Activation

#### GET /api/v1/extension/workflows
**Purpose**: Get available workflows for extension
**Response**:
```json
{
  "workflows": [
    {
      "id": "string",
      "name": "string",
      "description": "string",
      "input_type": "url|clipboard|selection|custom",
      "output_destination": "obsidian|screen|both",
      "category": "research|transcription|analysis|extraction"
    }
  ]
}
```

#### POST /api/v1/extension/trigger-workflow
**Purpose**: Trigger workflow from extension
**Request**:
```json
{
  "workflow_id": "string",
  "input_data": {
    "type": "url|clipboard|selection|dom_extraction",
    "content": "string",
    "metadata": {
      "url": "string",
      "title": "string",
      "timestamp": "datetime",
      "dom_selector": "string (optional)"
    }
  },
  "output_config": {
    "destination": "obsidian|screen|both",
    "obsidian_path": "string (optional)",
    "notify_completion": "boolean"
  }
}
```
**Response**:
```json
{
  "execution_id": "uuid",
  "status": "started",
  "estimated_duration": "number (seconds)",
  "output_destination": "string"
}
```

#### POST /api/v1/extension/define-selector
**Purpose**: Define custom DOM selector for extraction
**Request**:
```json
{
  "url_pattern": "string (regex)",
  "selector_name": "string",
  "dom_selector": "string",
  "extraction_type": "text|html|attribute",
  "attribute_name": "string (optional)",
  "description": "string"
}
```
**Response**: Selector definition confirmation with validation

#### GET /api/v1/extension/selectors
**Purpose**: Get saved DOM selectors for current site
**Query Parameters**:
- `url`: Current page URL for pattern matching
**Response**:
```json
{
  "selectors": [
    {
      "id": "string",
      "name": "string", 
      "selector": "string",
      "description": "string",
      "last_used": "datetime"
    }
  ]
}
```

#### GET /api/v1/extension/status
**Purpose**: Get extension integration status
**Response**:
```json
{
  "connected": "boolean",
  "version": "string",
  "permissions": ["string"],
  "available_workflows": "integer",
  "last_activity": "datetime"
}
```

## WebSocket Events Contract

### Connection Endpoint
```
ws://localhost:8000/ws/executions/{execution_id}
```

### Event Types

#### Execution Events
```json
{
  "type": "execution:started",
  "data": {
    "execution_id": "uuid",
    "workflow_id": "string",
    "timestamp": "datetime"
  }
}

{
  "type": "execution:progress", 
  "data": {
    "execution_id": "uuid",
    "progress": "number (0-1)",
    "current_node": "string",
    "message": "string"
  }
}

{
  "type": "execution:completed",
  "data": {
    "execution_id": "uuid", 
    "status": "completed|failed|cancelled",
    "results": "object",
    "duration": "number"
  }
}
```

#### Node Events
```json
{
  "type": "node:started",
  "data": {
    "execution_id": "uuid",
    "node_id": "string",
    "node_type": "string",
    "timestamp": "datetime"
  }
}

{
  "type": "node:completed",
  "data": {
    "execution_id": "uuid",
    "node_id": "string", 
    "status": "success|error",
    "output": "object",
    "duration": "number"
  }
}

{
  "type": "node:error",
  "data": {
    "execution_id": "uuid",
    "node_id": "string",
    "error": "string",
    "retry_count": "integer"
  }
}
```

## Data Schema Contracts

### Workflow Schema (WORKFLOW_SCHEMA_V1.json)
- **Required Fields**: id, name, nodes, edges
- **Node Structure**: id, type, position, data
- **Edge Structure**: id, source, target, handles
- **Validation**: JSON Schema Draft 2020-12 compliant

### Node Registry Schema (NODE_REGISTRY_V1.json)
- **Node Types**: 10 defined types with full parameter schemas
- **Input/Output**: Typed data contracts for each node
- **Validation**: Parameter schema validation for all node configurations
- **Versioning**: Node version compatibility checking

### Provider Configuration (ENDPOINTS.template.json)
- **Provider Types**: llm, dom, hybrid
- **Authentication**: API key, bearer token, custom auth
- **Capabilities**: Defined capability flags per provider
- **Selectors**: DOM selector configurations with fallbacks

## Error Handling Contract

### HTTP Status Codes
- **200**: Success
- **201**: Created
- **400**: Bad Request (validation errors)
- **401**: Unauthorized
- **404**: Not Found
- **422**: Unprocessable Entity (schema validation)
- **500**: Internal Server Error

### Error Response Format
```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message",
    "details": {
      "field": "string",
      "value": "any",
      "constraint": "string"
    },
    "timestamp": "datetime",
    "request_id": "uuid"
  }
}
```

### Error Codes
- `VALIDATION_ERROR`: Request data validation failed
- `NODE_EXECUTION_ERROR`: Node processing failed
- `WORKFLOW_NOT_FOUND`: Workflow ID not found
- `EXECUTION_TIMEOUT`: Execution exceeded timeout
- `PROVIDER_ERROR`: External provider error
- `RATE_LIMITED`: Too many requests

## Security Contract

### Authentication
- **Development**: No authentication required
- **Production**: API key or JWT token required
- **Headers**: `Authorization: Bearer <token>`

### Input Validation
- All inputs validated against JSON schemas
- SQL injection prevention
- XSS protection for web content
- File upload restrictions and scanning

### Rate Limiting
- **Workflow Execution**: 10 per minute per user
- **API Calls**: 100 per minute per endpoint
- **WebSocket Connections**: 5 concurrent per user

## Performance Contract

### Response Time SLAs
- **Workflow CRUD**: < 500ms
- **Execution Start**: < 2 seconds
- **Status Updates**: < 100ms
- **Results Retrieval**: < 1 second

### Throughput Guarantees
- **Concurrent Executions**: 10 workflows simultaneously
- **Node Processing**: 50 nodes per workflow maximum
- **Data Transfer**: 10MB per execution maximum
- **WebSocket Events**: 100 events per second maximum

### Availability
- **Uptime**: 99.9% availability target
- **Maintenance Windows**: Scheduled with 24h notice
- **Failover**: Automatic retry with exponential backoff
- **Monitoring**: Health checks every 30 seconds

## Versioning Contract

### API Versioning
- **Current Version**: v1
- **URL Format**: `/api/v1/`
- **Deprecation Policy**: 6 months notice for breaking changes
- **Backward Compatibility**: Maintained within major versions

### Schema Versioning
- **Workflow Schema**: V1 (current)
- **Node Registry**: V1 (current) 
- **Migration**: Automatic schema upgrades
- **Rollback**: Previous version support for 30 days

This contract defines the immutable interfaces and guarantees for the AI Research Automation Platform, ensuring consistent behavior across all components and integrations.