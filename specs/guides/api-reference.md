# API Reference

## Overview

The DataKiln API provides RESTful endpoints for workflow management, research execution, and system administration. All endpoints return JSON responses and use standard HTTP status codes.

## Base URL
```
http://localhost:8000/api/v1
```

## Authentication
Currently, authentication is not required for local development. In production deployments, implement appropriate authentication mechanisms.

## Endpoints

### Workflows

#### List Workflows
```http
GET /workflows
```

**Response:**
```json
{
  "workflows": [
    {
      "id": "string",
      "name": "string",
      "description": "string",
      "created_at": "2023-01-01T00:00:00Z",
      "updated_at": "2023-01-01T00:00:00Z",
      "nodes": [],
      "edges": []
    }
  ]
}
```

#### Create Workflow
```http
POST /workflows
```

**Request Body:**
```json
{
  "name": "string",
  "description": "string",
  "nodes": [
    {
      "id": "string",
      "type": "string",
      "position": {"x": 0, "y": 0},
      "data": {}
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

#### Get Workflow
```http
GET /workflows/{id}
```

#### Update Workflow
```http
PUT /workflows/{id}
```

#### Delete Workflow
```http
DELETE /workflows/{id}
```

### Research Execution

#### Execute Research Query
```http
POST /research/execute
```

**Request Body:**
```json
{
  "query": "string",
  "mode": "fast|balanced|comprehensive",
  "provider": "gemini|perplexity",
  "options": {
    "max_queries": 10,
    "timeout": 300
  }
}
```

**Response:**
```json
{
  "execution_id": "string",
  "status": "running|completed|failed",
  "progress": 0.0,
  "results": {},
  "research_tree": {},
  "created_at": "2023-01-01T00:00:00Z"
}
```

#### Get Execution Status
```http
GET /research/executions/{execution_id}
```

#### Cancel Execution
```http
POST /research/executions/{execution_id}/cancel
```

### Results

#### List Results
```http
GET /results
```

**Query Parameters:**
- `workflow_id`: Filter by workflow
- `limit`: Maximum number of results (default: 50)
- `offset`: Pagination offset (default: 0)

#### Get Result
```http
GET /results/{id}
```

#### Export Result
```http
GET /results/{id}/export
```

**Query Parameters:**
- `format`: `json|csv|markdown|pdf`

### Nodes

#### List Node Types
```http
GET /nodes/types
```

**Response:**
```json
{
  "node_types": [
    {
      "type": "DataSource",
      "name": "Data Source",
      "description": "Import data from various sources",
      "inputs": [],
      "outputs": ["data"],
      "parameters": {
        "source_type": {
          "type": "select",
          "options": ["file", "url", "api"],
          "required": true
        }
      }
    }
  ]
}
```

#### Validate Node Configuration
```http
POST /nodes/validate
```

**Request Body:**
```json
{
  "type": "string",
  "parameters": {}
}
```

### System

#### Health Check
```http
GET /health
```

**Response:**
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "uptime": 3600,
  "services": {
    "database": "connected",
    "providers": ["gemini", "perplexity"]
  }
}
```

#### System Information
```http
GET /system/info
```

**Response:**
```json
{
  "version": "1.0.0",
  "build_date": "2023-01-01T00:00:00Z",
  "environment": "development|production",
  "features": ["research", "workflows", "chrome_extension"]
}
```

### Chrome Extension

#### Register Extension
```http
POST /extension/register
```

**Request Body:**
```json
{
  "extension_id": "string",
  "version": "string",
  "permissions": ["downloads", "activeTab"]
}
```

#### Process Captured Content
```http
POST /extension/process
```

**Request Body:**
```json
{
  "content": "string",
  "metadata": {
    "url": "string",
    "title": "string",
    "timestamp": "2023-01-01T00:00:00Z"
  },
  "format": "markdown|html"
}
```

## WebSocket Events

### Connection
```javascript
const ws = new WebSocket('ws://localhost:8000/ws');
```

### Workflow Events
```javascript
// Workflow execution started
{
  "type": "workflow:start",
  "data": {
    "workflow_id": "string",
    "execution_id": "string"
  }
}

// Progress update
{
  "type": "workflow:progress",
  "data": {
    "execution_id": "string",
    "progress": 0.75,
    "current_step": "Executing research query",
    "node_id": "string"
  }
}

// Workflow completed
{
  "type": "workflow:complete",
  "data": {
    "execution_id": "string",
    "results": {},
    "duration": 45.2
  }
}

// Workflow error
{
  "type": "workflow:error",
  "data": {
    "execution_id": "string",
    "error": "string",
    "node_id": "string"
  }
}
```

### Research Events
```javascript
// Research started
{
  "type": "research:start",
  "data": {
    "execution_id": "string",
    "query": "string",
    "mode": "string"
  }
}

// Research progress
{
  "type": "research:progress",
  "data": {
    "execution_id": "string",
    "progress": 0.5,
    "current_query": "string",
    "queries_completed": 3,
    "total_queries": 7
  }
}

// Research completed
{
  "type": "research:complete",
  "data": {
    "execution_id": "string",
    "results": "string",
    "research_tree": {},
    "citations": []
  }
}
```

## Data Models

### Workflow
```typescript
interface Workflow {
  id: string;
  name: string;
  description?: string;
  nodes: Node[];
  edges: Edge[];
  created_at: string;
  updated_at: string;
  tags?: string[];
}
```

### Node
```typescript
interface Node {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: Record<string, any>;
  style?: Record<string, any>;
}
```

### Edge
```typescript
interface Edge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  type?: string;
  data?: Record<string, any>;
}
```

### Research Execution
```typescript
interface ResearchExecution {
  id: string;
  query: string;
  mode: 'fast' | 'balanced' | 'comprehensive';
  provider: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  results?: any;
  research_tree?: any;
  error?: string;
  created_at: string;
  completed_at?: string;
  duration?: number;
}
```

## Error Handling

### HTTP Status Codes
- `200`: Success
- `201`: Created
- `400`: Bad Request
- `401`: Unauthorized
- `403`: Forbidden
- `404`: Not Found
- `422`: Unprocessable Entity
- `500`: Internal Server Error

### Error Response Format
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request parameters",
    "details": {
      "field": "query",
      "reason": "Query cannot be empty"
    }
  }
}
```

### Common Error Codes
- `VALIDATION_ERROR`: Invalid request data
- `NOT_FOUND`: Resource not found
- `PERMISSION_DENIED`: Insufficient permissions
- `PROVIDER_ERROR`: AI provider error
- `EXECUTION_FAILED`: Workflow execution failed
- `RATE_LIMITED`: Too many requests

## Rate Limiting

### Endpoints with Rate Limits
- `/research/execute`: 10 requests per minute
- `/workflows`: 100 requests per minute
- `/results/export`: 20 requests per minute

### Rate Limit Headers
```
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 9
X-RateLimit-Reset: 1638360000
```

## SDK Examples

### JavaScript/TypeScript
```javascript
// Initialize client
const client = new DataKilnClient('http://localhost:8000/api/v1');

// Execute research
const result = await client.research.execute({
  query: 'What is machine learning?',
  mode: 'balanced'
});

// Monitor progress
client.on('research:progress', (data) => {
  console.log(`Progress: ${data.progress * 100}%`);
});
```

### Python
```python
import requests

# Execute research
response = requests.post('http://localhost:8000/api/v1/research/execute', json={
  'query': 'What is machine learning?',
  'mode': 'balanced'
})

result = response.json()
print(f"Execution ID: {result['execution_id']}")
```

## Best Practices

### Error Handling
```javascript
try {
  const result = await api.executeResearch(query);
  // Handle success
} catch (error) {
  if (error.code === 'RATE_LIMITED') {
    // Wait and retry
    await delay(error.retry_after);
    return api.executeResearch(query);
  }
  // Handle other errors
}
```

### Pagination
```javascript
let allResults = [];
let offset = 0;
const limit = 50;

while (true) {
  const response = await api.getResults({ offset, limit });
  allResults.push(...response.results);

  if (response.results.length < limit) break;
  offset += limit;
}
```

### WebSocket Connection Management
```javascript
class WorkflowMonitor {
  constructor() {
    this.ws = null;
    this.reconnectAttempts = 0;
  }

  connect() {
    this.ws = new WebSocket('ws://localhost:8000/ws');

    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
    };

    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this.handleEvent(data);
    };

    this.ws.onclose = () => {
      if (this.reconnectAttempts < 5) {
        setTimeout(() => this.connect(), 1000 * Math.pow(2, this.reconnectAttempts));
        this.reconnectAttempts++;
      }
    };
  }
}
```

## Changelog

### Version 1.0.0
- Initial API release
- Basic workflow CRUD operations
- Research execution endpoints
- WebSocket real-time updates
- Chrome extension integration

This API reference is automatically updated with each release. Check the changelog for breaking changes.