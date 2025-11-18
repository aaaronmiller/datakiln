# DataKiln API Documentation

**Version:** 1.0
**Base URL:** `http://localhost:8000`
**Last Updated:** 2025-11-18

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Workflow Execution](#workflow-execution)
4. [Workflow Management](#workflow-management)
5. [Execution Status](#execution-status)
6. [Error Handling](#error-handling)
7. [WebSocket Events](#websocket-events)
8. [CLI Tool](#cli-tool)
9. [Example Workflows](#example-workflows)

---

## Overview

DataKiln is an AI-powered workflow automation platform that enables complex data processing pipelines combining:
- DOM manipulation and web scraping
- AI/LLM integrations (Gemini, Claude, GPT-4)
- Data transformation and aggregation
- Parallel workflow execution

This API allows you to execute pre-defined workflows or create custom workflows programmatically.

---

## Authentication

Currently, the API does not require authentication for local development.

**Production Deployment:** Authentication will be required via API keys or OAuth2.

---

## Workflow Execution

### Execute Workflow by ID

Execute a pre-existing workflow by its identifier.

**Endpoint:** `POST /api/v1/workflows/{workflow_id}/execute`

**Path Parameters:**
- `workflow_id` (string, required): Unique workflow identifier

**Request Body:**
```json
{
  "workflow": {
    "id": "workflow-1731931234567",
    "name": "Deep Research Workflow",
    "start_node": "research-node-1",
    "nodes": {
      "research-node-1": {
        "id": "research-node-1",
        "type": "gemini_deep_research",
        "name": "Deep Research Stream 1",
        "data": {
          "query_prompt": "Research the latest developments in AI",
          "research_depth": "deep",
          "model": "gemini-pro"
        }
      }
    },
    "edges": []
  },
  "execution_options": {
    "timeout": 300,
    "streaming": false
  }
}
```

**Response (Success):**
```json
{
  "success": true,
  "execution_id": "exec-1731931234567",
  "workflow_id": "workflow-1731931234567",
  "start_time": "2025-11-18T12:00:00Z",
  "status": "completed",
  "total_nodes": 4,
  "completed_nodes": 4,
  "failed_nodes": 0,
  "execution_time": 45.3,
  "results": {
    "research-node-1": {
      "output": "Detailed research findings...",
      "metadata": {}
    }
  }
}
```

**Response (Failure):**
```json
{
  "success": false,
  "execution_id": "exec-1731931234567",
  "error": "Node 'research-node-1' failed: API timeout",
  "error_details": {
    "error_type": "TimeoutError",
    "error_message": "Request timed out after 300 seconds",
    "traceback": "Traceback (most recent call last)..."
  },
  "failed_nodes": ["research-node-1"],
  "completed_nodes": 0,
  "execution_time": 300.1
}
```

**Example cURL:**
```bash
curl -X POST http://localhost:8000/api/v1/workflows/workflow-123/execute \
  -H "Content-Type: application/json" \
  -d '{
    "workflow": {
      "id": "workflow-123",
      "name": "Test Workflow",
      "start_node": "node-1",
      "nodes": {
        "node-1": {
          "id": "node-1",
          "type": "data_source",
          "data": {"url": "https://api.example.com/data"}
        }
      },
      "edges": []
    },
    "execution_options": {
      "timeout": 300
    }
  }'
```

---

### Execute Workflow from JSON

Execute a workflow defined in a JSON payload (no prior registration required).

**Endpoint:** `POST /api/v1/workflows/execute`

**Request Body:**
Same structure as workflow execution by ID.

**Response:**
Same structure as workflow execution by ID.

**Example Python:**
```python
import requests
import json

workflow_data = {
    "workflow": {
        "id": f"workflow-{int(time.time() * 1000)}",
        "name": "Dynamic Workflow",
        "start_node": "consolidate-1",
        "nodes": {
            "consolidate-1": {
                "id": "consolidate-1",
                "type": "consolidate",
                "name": "Consolidate Research",
                "data": {
                    "model": "gemini-pro",
                    "prepend_text": "Analyze the following research documents:",
                    "attachments": [
                        "/path/to/research1.txt",
                        "/path/to/research2.txt",
                        "/path/to/research3.txt"
                    ]
                }
            }
        },
        "edges": []
    },
    "execution_options": {
        "timeout": 300,
        "streaming": False
    }
}

response = requests.post(
    "http://localhost:8000/api/v1/workflows/execute",
    json=workflow_data,
    timeout=300
)

result = response.json()
print(f"Execution Status: {result['success']}")
print(f"Execution ID: {result['execution_id']}")
```

---

## Workflow Management

### List All Workflows

Retrieve all saved workflows.

**Endpoint:** `GET /api/v1/workflows`

**Response:**
```json
[
  {
    "id": "simple-deep-research",
    "name": "Simple Deep Research",
    "description": "Single-stream research workflow",
    "node_count": 2,
    "created_at": "2025-11-18T10:00:00Z"
  },
  {
    "id": "deeper-research",
    "name": "Deeper Research",
    "description": "3 parallel research streams with consolidation",
    "node_count": 5,
    "created_at": "2025-11-18T10:05:00Z"
  }
]
```

**Example cURL:**
```bash
curl http://localhost:8000/api/v1/workflows
```

---

### Get Workflow Details

Retrieve detailed information about a specific workflow.

**Endpoint:** `GET /api/v1/workflows/{workflow_id}`

**Response:**
```json
{
  "id": "deeper-research",
  "name": "Deeper Research",
  "description": "3 parallel research streams with consolidation",
  "nodes": {
    "splitter-1": {...},
    "research-1": {...},
    "research-2": {...},
    "research-3": {...},
    "consolidate-1": {...}
  },
  "edges": [...],
  "metadata": {
    "version": 1,
    "created_at": "2025-11-18T10:05:00Z",
    "last_modified": "2025-11-18T10:05:00Z"
  }
}
```

---

### Save Workflow

Save a new workflow to the system.

**Endpoint:** `POST /api/v1/workflows`

**Request Body:**
```json
{
  "id": "my-custom-workflow",
  "name": "My Custom Workflow",
  "description": "Custom automation workflow",
  "nodes": {...},
  "edges": [...],
  "metadata": {
    "version": 1
  }
}
```

**Response:**
```json
{
  "success": true,
  "workflow_id": "my-custom-workflow",
  "message": "Workflow saved successfully"
}
```

---

## Execution Status

### Check Execution Status

Get the current status of a running or completed execution.

**Endpoint:** `GET /api/v1/executions/{execution_id}`

**Response:**
```json
{
  "execution_id": "exec-1731931234567",
  "workflow_id": "workflow-123",
  "status": "running",
  "progress": 0.60,
  "total_nodes": 5,
  "completed_nodes": 3,
  "failed_nodes": 0,
  "current_node": "research-3",
  "elapsed_time": 30.5,
  "estimated_remaining": 20.0
}
```

**Status Values:**
- `pending`: Execution queued
- `running`: Currently executing
- `completed`: Successfully completed
- `failed`: Failed with errors
- `cancelled`: Cancelled by user

---

## Error Handling

### Error Response Format

All error responses follow this structure:

```json
{
  "success": false,
  "error": "Human-readable error message",
  "error_details": {
    "error_type": "ErrorClassName",
    "error_message": "Detailed error message",
    "traceback": "Full Python traceback (development only)"
  },
  "timestamp": "2025-11-18T12:00:00Z"
}
```

### Common Error Codes

| HTTP Code | Meaning | Example |
|-----------|---------|---------|
| 400 | Bad Request | Invalid workflow JSON structure |
| 404 | Not Found | Workflow ID does not exist |
| 408 | Request Timeout | Execution exceeded timeout limit |
| 500 | Internal Server Error | Unexpected server error |
| 503 | Service Unavailable | Backend services unavailable |

---

## WebSocket Events

Connect to real-time execution events via WebSocket.

**WebSocket Endpoint:** `ws://localhost:8000/ws/executions/{execution_id}`

**Event Types:**

### execution_started
```json
{
  "type": "execution_started",
  "execution_id": "exec-123",
  "workflow_name": "Deep Research",
  "start_time": "2025-11-18T12:00:00Z"
}
```

### step_started
```json
{
  "type": "step_started",
  "execution_id": "exec-123",
  "node_id": "research-1",
  "node_name": "Deep Research Stream 1",
  "node_type": "gemini_deep_research",
  "timestamp": "2025-11-18T12:00:05Z"
}
```

### step_succeeded
```json
{
  "type": "step_succeeded",
  "execution_id": "exec-123",
  "node_id": "research-1",
  "node_name": "Deep Research Stream 1",
  "node_type": "gemini_deep_research",
  "result": {...},
  "timestamp": "2025-11-18T12:00:45Z"
}
```

### step_failed
```json
{
  "type": "step_failed",
  "execution_id": "exec-123",
  "node_id": "research-1",
  "node_name": "Deep Research Stream 1",
  "node_type": "gemini_deep_research",
  "error": "API request failed",
  "retry_count": 2,
  "timestamp": "2025-11-18T12:00:45Z"
}
```

### execution_completed
```json
{
  "type": "execution_completed",
  "execution_id": "exec-123",
  "execution_time": 45.3,
  "timestamp": "2025-11-18T12:00:45Z"
}
```

### execution_failed
```json
{
  "type": "execution_failed",
  "execution_id": "exec-123",
  "error": "Workflow execution failed",
  "execution_time": 30.1,
  "timestamp": "2025-11-18T12:00:30Z"
}
```

**Example WebSocket Client (JavaScript):**
```javascript
const ws = new WebSocket('ws://localhost:8000/ws/executions/exec-123')

ws.onopen = () => {
  console.log('Connected to execution stream')
}

ws.onmessage = (event) => {
  const message = JSON.parse(event.data)
  console.log(`Event: ${message.type}`, message)
}

ws.onerror = (error) => {
  console.error('WebSocket error:', error)
}

ws.onclose = () => {
  console.log('Disconnected from execution stream')
}
```

---

## CLI Tool

DataKiln provides a command-line tool for workflow execution.

**Location:** `scripts/workflow_cli.py`

### Usage

```bash
# Execute a workflow by ID
python scripts/workflow_cli.py execute <workflow_id>

# Execute a workflow from JSON file
python scripts/workflow_cli.py execute --json workflow.json

# List all available workflows
python scripts/workflow_cli.py list

# Check execution status
python scripts/workflow_cli.py status <execution_id>

# Specify custom API base URL
python scripts/workflow_cli.py execute workflow-123 --api http://production.example.com
```

### Examples

```bash
# Execute the deeper research workflow
python scripts/workflow_cli.py execute deeper-research

# Execute from a custom workflow file
python scripts/workflow_cli.py execute --json /path/to/my-workflow.json

# List all workflows
python scripts/workflow_cli.py list

# Check execution status
python scripts/workflow_cli.py status exec-1731931234567
```

---

## Example Workflows

### Simple Deep Research

Single-stream AI research workflow.

```json
{
  "id": "simple-deep-research",
  "name": "Simple Deep Research",
  "start_node": "research-1",
  "nodes": {
    "research-1": {
      "id": "research-1",
      "type": "gemini_deep_research",
      "name": "Research Stream",
      "data": {
        "query_prompt": "Research the latest developments in renewable energy",
        "research_depth": "balanced",
        "model": "gemini-pro"
      }
    },
    "export-1": {
      "id": "export-1",
      "type": "export",
      "name": "Export Results",
      "data": {
        "format": "markdown",
        "path_key": "research_output.md"
      }
    }
  },
  "edges": [
    {"id": "e1", "source": "research-1", "target": "export-1"}
  ]
}
```

### Deeper Research (Parallel Streams)

3 parallel research streams with consolidation.

```json
{
  "id": "deeper-research",
  "name": "Deeper Research",
  "start_node": "splitter-1",
  "nodes": {
    "splitter-1": {
      "id": "splitter-1",
      "type": "splitter",
      "name": "Split Query",
      "data": {"num_splits": 3}
    },
    "research-1": {
      "id": "research-1",
      "type": "gemini_deep_research",
      "name": "Deep Research Stream 1",
      "data": {
        "query_prompt": "Focus on technical innovations",
        "research_depth": "deep"
      }
    },
    "research-2": {
      "id": "research-2",
      "type": "gemini_deep_research",
      "name": "Deep Research Stream 2",
      "data": {
        "query_prompt": "Focus on market trends",
        "research_depth": "deep"
      }
    },
    "research-3": {
      "id": "research-3",
      "type": "gemini_deep_research",
      "name": "Deep Research Stream 3",
      "data": {
        "query_prompt": "Focus on policy and regulations",
        "research_depth": "deep"
      }
    },
    "consolidate-1": {
      "id": "consolidate-1",
      "type": "consolidate",
      "name": "Consolidate Findings",
      "data": {
        "model": "gemini-pro",
        "prepend_text": "Synthesize the following research findings:",
        "append_text": "Provide a comprehensive summary in markdown format.",
        "attachments": [
          "/tmp/research-1-output.txt",
          "/tmp/research-2-output.txt",
          "/tmp/research-3-output.txt"
        ]
      }
    }
  },
  "edges": [
    {"source": "splitter-1", "target": "research-1"},
    {"source": "splitter-1", "target": "research-2"},
    {"source": "splitter-1", "target": "research-3"},
    {"source": "research-1", "target": "consolidate-1"},
    {"source": "research-2", "target": "consolidate-1"},
    {"source": "research-3", "target": "consolidate-1"}
  ]
}
```

### YouTube Transcript Analysis

Extract and analyze YouTube video transcripts.

```json
{
  "id": "youtube-analysis",
  "name": "YouTube Transcript Analysis",
  "start_node": "dom-1",
  "nodes": {
    "dom-1": {
      "id": "dom-1",
      "type": "dom_action",
      "name": "Extract Transcript",
      "data": {
        "url": "https://www.youtube.com/watch?v=VIDEO_ID",
        "actions": [
          {"selector": "transcript-button", "actionType": "click", "delay": 1000},
          {"selector": "transcript-text", "actionType": "extract", "value": "text"}
        ]
      }
    },
    "analyze-1": {
      "id": "analyze-1",
      "type": "gemini_deep_research",
      "name": "Analyze Content",
      "data": {
        "query_prompt": "Summarize and extract key insights from this transcript",
        "model": "gemini-pro"
      }
    }
  },
  "edges": [
    {"source": "dom-1", "target": "analyze-1"}
  ]
}
```

---

## Node Types

### Available Node Types

| Type | Description | Key Parameters |
|------|-------------|----------------|
| `data_source` | Fetch data from URL | `url`, `method`, `headers` |
| `gemini_deep_research` | AI research via Gemini | `query_prompt`, `research_depth`, `model` |
| `consolidate` | Combine multiple inputs | `model`, `prepend_text`, `attachments` |
| `splitter` | Split data into parallel streams | `num_splits` |
| `dom_action` | Browser automation | `url`, `actions` |
| `transform` | Data transformation | `transform_type`, `input_key`, `output_key` |
| `filter` | Filter data | `condition`, `field` |
| `export` | Export results | `format`, `path_key` |
| `condition` | Conditional branching | `expr`, `true_output`, `false_output` |
| `aggregate` | Aggregate data | `operation`, `field` |
| `join` | Join datasets | `join_type`, `on_field` |
| `union` | Union datasets | `union_type` |

---

## Best Practices

1. **Timeout Management**: Set appropriate timeouts based on workflow complexity (default: 300s)
2. **Error Handling**: Always check `success` field in responses
3. **WebSocket Connections**: Use WebSocket for real-time monitoring of long-running workflows
4. **Workflow Validation**: Validate workflow JSON before execution
5. **Retry Logic**: Implement exponential backoff for failed executions
6. **Rate Limiting**: Limit concurrent workflow executions to avoid resource exhaustion

---

## Support

For issues, feature requests, or questions:
- GitHub Issues: `https://github.com/yourusername/datakiln/issues`
- Documentation: `https://docs.datakiln.io`

---

**Last Updated:** 2025-11-18
**API Version:** 1.0
