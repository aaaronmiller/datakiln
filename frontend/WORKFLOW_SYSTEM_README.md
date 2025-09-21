# DataKiln Workflow System

This document describes the new node-based workflow system implemented in Phase 2 of the DataKiln project.

## Overview

The workflow system enables users to create complex AI-powered workflows using a visual node editor. Workflows can include DOM automation, AI prompts, data transformation, and export operations.

## Components

### Backend Components

#### Node Types (`backend/nodes/`)
- **BaseNode**: Abstract base class for all workflow nodes
- **DomActionNode**: DOM interactions (click, fill, wait, extract)
- **PromptNode**: Template-based AI prompts with variable substitution
- **ProviderNode**: AI provider abstraction (Gemini, Perplexity)
- **TransformNode**: Data transformation operations
- **ExportNode**: Output formatting and file generation
- **ConditionNode**: Branching logic for conditional workflows

#### Core Systems
- **SelectorsRegistry** (`backend/selectors.py`): Manages DOM selectors with provider-specific mappings
- **WorkflowExecutor** (`backend/executor.py`): State machine for workflow execution
- **Multi-Provider Integration** (`backend/providers/`): Gemini (Deep Research + Canvas) and Perplexity
- **QueryEngine** (`backend/query_engine.py`): Enhanced query engine with workflow support

#### API Endpoints (`backend/main.py`)
- `POST /workflow/execute` - Execute workflows
- `POST /workflow/validate` - Validate workflow structure
- `GET /selectors/registry` - Get available selectors
- `POST /providers/test` - Test provider connections
- `GET /providers/status` - Get provider status
- `GET /execution/history` - Get execution history
- `POST /workflow/optimize` - Optimize workflows
- `POST /workflow/create` - Create custom workflows

### Frontend Components

#### Workflow Types (`frontend/src/types/workflow.ts`)
- Complete TypeScript definitions for all workflow components
- Node type definitions matching backend implementation
- Workflow graph structures
- API request/response types

#### React Flow Components (`frontend/src/components/workflow/`)
- **WorkflowNode**: Custom React Flow node component for each node type
- **WorkflowEditor**: Visual workflow editor with drag-and-drop functionality
- **WorkflowDemo**: Demo component showing how to use the system

#### Services (`frontend/src/services/`)
- **WorkflowService**: Frontend service for communicating with backend APIs
- Enhanced integration with existing workflow execution service

## Usage

### Creating a Workflow

```typescript
import { WorkflowDemo } from './components/workflow'

// Use the demo component for a complete workflow editor
<WorkflowDemo />
```

### Programmatic Workflow Creation

```typescript
import { workflowService } from './services/workflowService'

const workflow = {
  name: 'My Research Workflow',
  start_node: 'research_node',
  nodes: {
    research_node: {
      id: 'research_node',
      type: 'provider',
      name: 'Research Query',
      provider_type: 'gemini_deep_research',
      research_depth: 'balanced'
    },
    export_node: {
      id: 'export_node',
      type: 'export',
      name: 'Save Results',
      format: 'md_yaml',
      path_key: 'research_output.md'
    }
  }
}

// Execute the workflow
const result = await workflowService.executeWorkflow(workflow)
```

### Node Types

#### DOM Action Node
```typescript
{
  id: 'dom_action',
  type: 'dom_action',
  name: 'Click Button',
  selector_key: 'submit_button',
  action: 'click',
  timeout: 10000
}
```

#### AI Prompt Node
```typescript
{
  id: 'prompt_node',
  type: 'prompt',
  name: 'Process Results',
  template_id: 'analysis_template',
  vars: { topic: 'AI research' },
  max_tokens: 1000
}
```

#### Provider Node
```typescript
{
  id: 'provider_node',
  type: 'provider',
  name: 'Deep Research',
  provider_type: 'gemini_deep_research',
  research_depth: 'comprehensive'
}
```

#### Transform Node
```typescript
{
  id: 'transform_node',
  type: 'transform',
  name: 'Format Output',
  transform_type: 'markdown',
  output_key: 'formatted_content'
}
```

#### Export Node
```typescript
{
  id: 'export_node',
  type: 'export',
  name: 'Save File',
  format: 'md_yaml',
  path_key: 'output_{timestamp}.md'
}
```

#### Condition Node
```typescript
{
  id: 'condition_node',
  type: 'condition',
  name: 'Check Results',
  expr: 'data.length > 0',
  true_next: 'success_node',
  false_next: 'error_node'
}
```

## Features

### Visual Workflow Editor
- Drag-and-drop node creation
- Real-time workflow validation
- Visual connection management
- Node configuration panels

### Multi-Provider Support
- **Gemini Deep Research**: Comprehensive research with multiple depth levels
- **Gemini Canvas**: Visual canvas generation and editing
- **Perplexity**: Research-optimized responses with citations

### Advanced Workflow Features
- Conditional branching logic
- Parallel execution support
- Retry mechanisms with exponential backoff
- Performance monitoring and optimization
- Artifact persistence and history tracking

### DOM Automation
- Selector-based DOM interactions
- Content extraction and processing
- Form filling and button clicking
- Wait conditions and assertions

### Data Processing
- Multiple export formats (JSON, YAML, Markdown, CSV)
- Data transformation and filtering
- Citation extraction
- Template-based content generation

## API Integration

### Backend Setup
1. Install dependencies: `pip install -r requirements.txt`
2. Set API keys:
   ```bash
   export GEMINI_API_KEY="your-gemini-api-key"
   export PERPLEXITY_API_KEY="your-perplexity-api-key"
   ```
3. Start the server: `uvicorn main:app --reload`

### Frontend Setup
1. Install dependencies: `npm install` or `yarn install`
2. Start development server: `npm run dev` or `yarn dev`

### Testing the Integration
1. Navigate to the workflow demo page
2. Create a sample workflow
3. Execute the workflow to test API integration
4. Check the execution results and logs

## Examples

### Basic Research Workflow
```typescript
const researchWorkflow = {
  name: 'Research Workflow',
  start_node: 'research',
  nodes: {
    research: {
      id: 'research',
      type: 'provider',
      name: 'AI Research',
      provider_type: 'gemini_deep_research',
      research_depth: 'balanced'
    },
    export: {
      id: 'export',
      type: 'export',
      name: 'Export Results',
      format: 'md_yaml',
      path_key: 'research_output.md'
    }
  }
}
```

### DOM Automation Workflow
```typescript
const domWorkflow = {
  name: 'Web Automation',
  start_node: 'navigate',
  nodes: {
    navigate: {
      id: 'navigate',
      type: 'dom_action',
      name: 'Go to Search',
      selector_key: 'search_input',
      action: 'fill',
      value: 'AI research'
    },
    click: {
      id: 'click',
      type: 'dom_action',
      name: 'Submit Search',
      selector_key: 'search_button',
      action: 'click'
    }
  }
}
```

## Troubleshooting

### Common Issues
1. **API Connection Errors**: Ensure backend server is running on port 8000
2. **Provider Errors**: Check API keys are properly configured
3. **Workflow Validation Errors**: Check node connections and required fields
4. **TypeScript Errors**: Ensure all node types are properly imported

### Debug Mode
Enable debug logging by setting the log level:
```python
import logging
logging.basicConfig(level=logging.DEBUG)
```

## Future Enhancements

- Real-time workflow execution monitoring
- Advanced debugging tools
- Workflow templates and sharing
- Integration with external APIs
- Performance analytics dashboard
- Mobile-responsive workflow editor

## Support

For issues or questions about the workflow system, please check:
1. API documentation at `/docs` when running the backend
2. Component documentation in the source code
3. Test files for usage examples