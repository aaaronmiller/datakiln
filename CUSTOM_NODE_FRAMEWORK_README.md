# Custom Node Creation Framework

This document describes the custom node creation framework that allows users to dynamically create and register their own node types for the workflow execution system.

## Overview

The custom node framework provides a complete solution for extending the workflow system with user-defined node types. It includes:

- **Dynamic Node Factory**: Runtime instantiation of custom nodes
- **Node Registry**: Persistent storage and management of node definitions
- **Schema Validation**: JSON Schema-based validation of node definitions
- **Runtime Loading**: Load nodes from files, directories, or programmatic definitions
- **API Endpoints**: RESTful API for node management
- **Frontend Integration**: UI components for managing custom nodes

## Architecture

### Backend Components

#### 1. Node Factory (`backend/nodes/node_factory.py`)
- `DynamicNodeFactory`: Main factory class for creating custom nodes
- `CustomNode`: Generic implementation for custom nodes
- Supports multiple creation methods: classes, functions, definitions

#### 2. Node Registry (`backend/nodes/node_registry.py`)
- `NodeRegistry`: Persistent storage for node definitions
- Tracks metadata, usage statistics, and versioning
- Supports import/export operations

#### 3. Node Validator (`backend/nodes/node_validator.py`)
- `NodeSchemaValidator`: JSON Schema validation for node definitions
- Custom validation rules for security and consistency
- Comprehensive error reporting

#### 4. Node Loader (`backend/nodes/node_loader.py`)
- `NodeLoader`: Runtime loading from various sources
- Supports files, directories, URLs, packages
- Hot-reloading capabilities

#### 5. API Service (`backend/app/services/custom_node_service.py`)
- Business logic for node management
- Integration with registry and factory
- User permission handling

#### 6. API Endpoints (`backend/app/api/v1/endpoints/custom_nodes.py`)
- RESTful endpoints for CRUD operations
- Validation, deployment, and loading endpoints

### Frontend Components

#### 1. Node Registry Service (`frontend/src/services/nodeRegistryService.ts`)
- Extended registry service with custom node support
- API integration for node management
- Validation and caching

#### 2. Custom Node Manager (`frontend/src/components/workflow/CustomNodeManager.tsx`)
- UI for creating and managing custom nodes
- Form-based node definition
- Node listing and management

## Creating Custom Nodes

### Method 1: Configuration File

Create a JSON file with node definitions:

```json
{
  "nodes": [
    {
      "type": "math_operation",
      "name": "Math Operation",
      "description": "Perform mathematical operations",
      "version": "1.0.0",
      "inputs": ["numbers"],
      "outputs": ["result"],
      "params_schema": {
        "type": "object",
        "required": ["operation"],
        "properties": {
          "operation": {
            "type": "string",
            "enum": ["add", "subtract", "multiply", "divide"]
          }
        }
      },
      "implementation": "from nodes.base_node import BaseNode\n\nclass MathNode(BaseNode):\n    async def execute(self, context):\n        # Implementation here\n        return {'result': 42}"
    }
  ]
}
```

### Method 2: Python Class

Create a Python file with node classes:

```python
from nodes.base_node import BaseNode

class MyCustomNode(BaseNode):
    def __init__(self, **kwargs):
        super().__init__(
            name="My Custom Node",
            type="my_custom_node",
            description="Does something custom",
            **kwargs
        )

    async def execute(self, context):
        # Your custom logic here
        return {"output": "result"}

# Node definition for registration
MY_NODE_DEFINITION = {
    "type": "my_custom_node",
    "name": "My Custom Node",
    "description": "Does something custom",
    "version": "1.0.0",
    "inputs": ["input"],
    "outputs": ["output"],
    "params_schema": {
        "type": "object",
        "properties": {
            "param1": {"type": "string"}
        }
    }
}
```

### Method 3: API Endpoint

Use the REST API to create nodes programmatically:

```bash
curl -X POST http://localhost:8000/api/v1/custom-nodes/register \
  -H "Content-Type: application/json" \
  -d '{
    "type": "api_node",
    "name": "API Node",
    "description": "Node created via API",
    "version": "1.0.0",
    "inputs": ["data"],
    "outputs": ["result"],
    "params_schema": {
      "type": "object",
      "properties": {
        "endpoint": {"type": "string"}
      }
    }
  }'
```

## Node Definition Schema

### Required Fields

- `type`: Unique identifier (lowercase, underscores only)
- `name`: Human-readable name
- `description`: Node description
- `version`: Semantic version string
- `inputs`: Array of input parameter names
- `outputs`: Array of output parameter names
- `params_schema`: JSON Schema for node parameters

### Optional Fields

- `implementation`: Python code string for custom logic
- `config`: Additional configuration object
- `metadata`: Metadata for categorization and display

## Validation Rules

### Schema Validation
- JSON Schema compliance for `params_schema`
- Required fields validation
- Type constraints and enums

### Custom Rules
- Node type naming conventions
- Reserved type prevention
- Implementation security checks
- Input/output consistency

## API Endpoints

### Node Management
- `POST /api/v1/custom-nodes/validate` - Validate node definition
- `POST /api/v1/custom-nodes/register` - Register new node
- `PUT /api/v1/custom-nodes/{node_type}` - Update existing node
- `DELETE /api/v1/custom-nodes/{node_type}` - Delete node
- `GET /api/v1/custom-nodes/{node_type}` - Get node details
- `GET /api/v1/custom-nodes/` - List all nodes

### Advanced Operations
- `POST /api/v1/custom-nodes/{node_type}/deploy` - Deploy node
- `POST /api/v1/custom-nodes/load` - Load nodes from source
- `POST /api/v1/custom-nodes/export` - Export node definitions
- `POST /api/v1/custom-nodes/import` - Import node definitions

## Frontend Integration

### Using Custom Nodes in Workflows

```typescript
import { nodeRegistryService } from '../../services/nodeRegistryService'

// Load custom nodes
await nodeRegistryService.loadCustomNodes()

// Get node definition
const nodeDef = nodeRegistryService.getNodeType('my_custom_node')

// Create node instance (handled by workflow system)
```

### Managing Custom Nodes

```tsx
import { CustomNodeManager } from '../components/workflow/CustomNodeManager'

function WorkflowPage() {
  return (
    <div>
      <CustomNodeManager onNodeCreated={(type) => console.log('Created:', type)} />
    </div>
  )
}
```

## Examples

See `backend/nodes/examples/` for complete examples:

- `math_node.py` - Mathematical operations node
- `custom_nodes_config.json` - Configuration-based nodes
- Text processor, data validator examples

## Security Considerations

### Implementation Validation
- Dangerous code patterns are blocked
- Required imports are enforced
- Execution in restricted environment

### Permission System
- User-based node ownership
- Permission checks for operations
- Audit logging

## Testing

Run the test suite:

```bash
# Backend tests
pytest backend/tests/test_custom_nodes.py

# Frontend tests
npm test -- --testPathPattern=CustomNodeManager
```

## Deployment

### Loading Custom Nodes at Startup

```python
from nodes.node_loader import node_loader

# Load from directory
await node_loader.load_from_directory("custom_nodes/")

# Load from config file
await node_loader.load_from_file("my_nodes.json")
```

### API Integration

The framework automatically integrates with the existing workflow execution system. Custom nodes are treated identically to built-in nodes during execution.

## Troubleshooting

### Common Issues

1. **Validation Errors**: Check schema compliance and custom rules
2. **Import Errors**: Verify Python syntax and required imports
3. **Execution Errors**: Check implementation logic and context usage
4. **Permission Errors**: Verify user permissions for operations

### Debug Mode

Enable debug logging:

```python
import logging
logging.getLogger('custom_nodes').setLevel(logging.DEBUG)
```

## Future Enhancements

- Node versioning and migration
- Visual node builder UI
- Node marketplace
- Advanced execution monitoring
- Performance profiling
- Node templates and wizards