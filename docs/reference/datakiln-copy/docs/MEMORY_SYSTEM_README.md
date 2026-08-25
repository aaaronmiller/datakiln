# DataKiln Dual Memory Backend System

## Overview

This project implements a sophisticated dual memory backend system for AI-assisted development, combining **Byterover** (persistent global memory) and **Context Portal** (project-scoped memory) to provide comprehensive knowledge management across sessions and projects.

## Architecture

### Memory Backend Isolation

- **Byterover (Persistent/Global)**: Team-capable, long-term memory with versioning and cross-session recall
  - Scope: Global across sessions and projects
  - Purpose: Reusable knowledge, policies, patterns, and generalized lessons
  - Storage: External MCP server (requires authentication)

- **Context Portal (Project/Local)**: Database-backed project knowledge graph with vector search
  - Scope: Current repository/workspace only
  - Purpose: Project-specific constraints, decisions, interfaces, and artifacts
  - Storage: Local SQLite database via MCP

### Non-Interference Policy

- **No Cross-Layer Mirroring**: Project-specific entries are never stored in global memory
- **Pointer-Based Linking**: Global memory contains only references/pointers to project memory
- **Scope Isolation**: Each backend maintains strict boundaries for its intended use case

## Memory Policy Framework

### Event-Driven Read/Write Gates

**Read Gates** (when memory access is permitted):
- Task start/subtask planning
- Error handling and ambiguity resolution
- Critical decision points requiring context

**Write Gates** (when memory storage is permitted):
- Subtask/task completion
- Interface adoption or dependency addition
- Discovery of reusable knowledge
- Policy or plan changes

### Retrieval Limits
- Task start: Top 7 results, summarized
- Subtask planning: Top 7 results, summarized
- Error handling: Top 5 results, unsummarized
- Ambiguity resolution: Top 3 results, unsummarized

### Graduation Rules
- **Significance Threshold**: 0.7 (knowledge must be significant)
- **Recurrence Threshold**: 3 (knowledge must be used multiple times)
- **Cross-Session Utility**: Must provide value beyond current session
- **Project-Agnostic Value**: Must be generalizable across projects

## Schema Definitions

### Content Types
- `facts`: Verifiable information and observations
- `decisions`: Architectural and implementation choices
- `interfaces`: API contracts and component boundaries
- `artifacts`: Code patterns and implementations
- `constraints`: Rules and limitations
- `glossary`: Domain-specific terminology
- `lessons`: Learned experiences and mitigations

### Tagging System

**Common Tags**:
- `project:{name}` - Project identifier
- `repo:{id}` - Repository identifier
- `task:{id}` - Task or feature identifier
- `tool:{name}` - Tool or technology used
- `date:{YYYY-MM-DD}` - Creation/modification date
- `priority:{low|med|high}` - Importance level

**Byterover-Specific Tags**:
- `scope:global|team|workspace` - Memory scope
- `version:{semver}` - Content versioning
- `policy:{name}` - Policy identification

**Context Portal-Specific Tags**:
- `workspace_id:{id}` - Workspace identifier
- `relation:{entity→entity}` - Entity relationships
- `graph:{subgraph}` - Knowledge graph subsets

## Command System

### Initialization Commands

#### `command.initialize_all(params?)`
Runs system and project memory initialization, creates reciprocal links.

```javascript
// One-command initialization
await memorySystem.initializeAll();

// Three-command initialization
await memorySystem.initSystemMemory();
await memorySystem.initProjectMemory();
// Links created automatically
```

#### `command.init_system_memory(policy_version="v1")`
Ensures persistent global memory policy exists and is auto-loaded.

#### `command.init_project_memory(project_name, repo_id, workspace_id?)`
Seeds project-scoped policies and references global policy.

#### `command.bootstrap_new_project(project_name)`
For empty workspaces: scaffolds project structure, runs initialization, creates architecture plan.

### Operational Commands

#### Knowledge Management
```javascript
// Store new knowledge
await byteroverMCP.storeKnowledge("React Flow requires explicit dimensions to prevent error #004");

// Retrieve relevant knowledge
const results = await byteroverMCP.retrieveKnowledge("React Flow dimensions", 5);
```

#### Plan Management
```javascript
// Save implementation plan
await byteroverMCP.saveImplementationPlan({
  plan_name: "workflow-canvas-fixes",
  implementation: "Fix React Flow rendering issues",
  todo_items: [
    { task_name: "Fix dimensions", is_completed: true },
    { task_name: "Update Puppeteer", is_completed: true }
  ]
});

// Update progress
await byteroverMCP.updatePlanProgress("workflow-canvas-fixes", {
  by_task_position: 2,
  is_completed: true
});
```

#### Module Management
```javascript
// Store module information
await byteroverMCP.storeModule({
  module_name: "datakiln_workflow_canvas",
  description: "React Flow-based workflow editor component",
  technical_details: [
    "Uses ReactFlow library for visual workflow building",
    "Supports drag-and-drop node creation",
    "Implements virtualization for performance"
  ],
  insights: [
    "Requires explicit height to prevent error #004",
    "Debounce state updates to prevent excessive re-renders"
  ]
});
```

## Usage Examples

### Session Start
```javascript
const { byteroverMCP } = require('./scripts/functional_byterover_mcp');

// Initialize memory system
await byteroverMCP.initializeAll();

// Check for existing handbook
const handbookStatus = await byteroverMCP.checkHandbookExistence();
if (!handbookStatus.exists) {
  await byteroverMCP.createHandbook(projectHandbookContent);
}
```

### During Development
```javascript
// Before implementing a feature, retrieve relevant knowledge
const context = await byteroverMCP.retrieveKnowledge("workflow canvas dimensions", 3);

// Assess context quality
const assessment = await byteroverMCP.assessContext("Implementing workflow canvas fixes");

// Store implementation knowledge
await byteroverMCP.storeKnowledge("Fixed React Flow error #004 by setting explicit height: 800px");
```

### Plan Management
```javascript
// Create and track implementation plans
await byteroverMCP.saveImplementationPlan({
  plan_name: "memory-system-implementation",
  implementation: "Implement dual memory backend system",
  todo_items: [
    { task_name: "Create memory policy framework", is_completed: true },
    { task_name: "Implement Byterover interface", is_completed: true },
    { task_name: "Set up Context Portal integration", is_completed: true }
  ]
});
```

## Implementation Files

- `scripts/memory_policy.js` - Core memory policy and command implementations
- `scripts/functional_byterover_mcp.js` - Functional Byterover MCP interface with fallbacks
- `scripts/mcp_tool_interface.js` - Unified MCP tool calling interface
- `scripts/memory_initialization_bootstrap.js` - Initialization and bootstrap behaviors for memory systems
- `scripts/test_memory_initialization_bootstrap.js` - Integration tests for initialization functions

## Context Portal Integration

The system integrates with Context Portal for project-scoped memory:

- **Product Context**: Project goals, features, and architecture
- **Glossary**: Core concepts and terminology
- **Constraints**: Development rules and limitations
- **Decisions**: Architectural choices and rationales

## Byterover Integration

When authenticated, the system uses Byterover for:

- **Persistent Knowledge**: Cross-session and cross-project knowledge
- **Implementation Plans**: Long-term planning and tracking
- **Module Documentation**: Reusable component knowledge
- **Reflection & Assessment**: Context quality analysis

## Fallback Behavior

When Byterover authentication is unavailable, the system provides:

- Local storage fallbacks for all operations
- Console logging of intended Byterover operations
- Graceful degradation without losing functionality
- Clear indicators of authentication requirements

## Memory Initialization and Bootstrap System

The system provides comprehensive initialization and bootstrap behaviors that prepare the memory system for operations across different availability scenarios.

### Initialization Functions

#### System Readiness Assessment
- **`assessMemorySystemReadiness()`** - Checks what memory systems are available and their current state
- **`loadPersistentPolicies()`** - Loads any persistent policies or configurations that govern memory usage
- **`initializeSessionState()`** - Establishes in-session state tracking when memory systems are unavailable

#### Project Context Loading
- **`loadProjectContext(workspaceId)`** - Loads current objectives, active constraints, recent decisions, and open issues
- **`establishProjectBaseline()`** - For new projects: goals, scope, initial architectural decisions
- **`validateProjectState()`** - Ensures loaded context is consistent and up-to-date

#### Cross-System Linking
- **`establishMemoryRelationships()`** - Creates relationships between available memory systems
- **`createAuditTrails()`** - Maintains records that allow tracing decisions across memory layers
- **`synchronizeMemoryLayers()`** - Ensures consistency across memory layers

#### Fallback Strategies
- **`establishFallbackTracking()`** - Sets up alternative approaches when memory systems fail
- **`createCheckpointFiles()`** - Structured logging that can be imported into memory systems later
- **`implementGracefulDegradation()`** - Continues operations using available tools when memory fails

### Initialization Usage Examples

```javascript
const { assessMemorySystemReadiness, loadProjectContext } = require('./scripts/memory_initialization_bootstrap');

// Check system readiness
const readiness = await assessMemorySystemReadiness();
console.log(`System readiness: ${readiness.overallReadiness}`);

// Load project context
const context = await loadProjectContext('/path/to/workspace');
console.log(`Loaded ${context.objectives.length} objectives`);
```

### CLI Usage

```bash
# Initialize memory system
node scripts/memory_policy.js init-all

# Check handbook status
node scripts/functional_byterover_mcp.js check-handbook

# View storage statistics
node scripts/functional_byterover_mcp.js stats

# Export local storage
node scripts/functional_byterover_mcp.js export

# Test initialization functions
node scripts/test_memory_initialization_bootstrap.js

# Run individual initialization functions
node scripts/memory_initialization_bootstrap.js assess
node scripts/memory_initialization_bootstrap.js load-context
node scripts/memory_initialization_bootstrap.js baseline
```

## Best Practices

### Memory Management
1. **Read Before Write**: Always check existing knowledge before adding new entries
2. **Gradual Graduation**: Promote knowledge from project to global scope based on utility
3. **Consistent Tagging**: Use standardized tags for better retrieval
4. **Regular Cleanup**: Review and consolidate duplicate or outdated entries

### Development Workflow
1. **Initialize Early**: Run memory initialization at session start
2. **Context Assessment**: Use reflection tools before major decisions
3. **Knowledge Capture**: Store significant learnings and patterns
4. **Plan Tracking**: Use implementation plans for complex features

### Integration Guidelines
1. **Scope Awareness**: Respect backend boundaries and isolation policies
2. **Authentication Handling**: Gracefully handle authentication requirements
3. **Error Recovery**: Implement fallbacks for service unavailability
4. **Performance Consideration**: Use appropriate retrieval limits and caching

## Security Considerations

- **Secrets Handling**: Never store secrets in memory backends
- **Access Control**: Respect authentication and authorization boundaries
- **Data Sanitization**: Clean sensitive information before storage
- **Audit Trail**: Maintain logs of memory operations for accountability

## Future Enhancements

- **Semantic Search**: Enhanced retrieval using vector similarity
- **Knowledge Graphs**: Relationship mapping and inference
- **Collaborative Features**: Multi-user memory sharing and conflict resolution
- **Automated Graduation**: ML-based promotion of knowledge between scopes
- **Integration APIs**: REST and GraphQL interfaces for external tools