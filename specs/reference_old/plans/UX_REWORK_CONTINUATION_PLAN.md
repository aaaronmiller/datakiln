# UX Rework Continuation Plan (Contracts-Aligned)

## Executive Summary

This plan outlines the continuation of the UX rework to fully align the frontend with the established contracts (NODE_REGISTRY_V1.json, WORKFLOW_SCHEMA_V1.json, ENGINE_API_CONTRACT.md). The focus is on binding all UI components to the contracts, ensuring responsive design stability, implementing real-time execution monitoring, and establishing comprehensive testing and CI processes.

## Scope & Objectives

### Primary Objectives
- **Contract Alignment**: Bind all UI components (palette, forms, template wizard, import/export) to NODE_REGISTRY_V1 + WORKFLOW_SCHEMA_V1
- **Real-time Integration**: Wire Runs/Results pages to SSE streams and artifact index
- **Shell Stability**: Confirm 10-route responsive layout with Sidebar/Header/Main
- **Quality Assurance**: Add acceptance tests, CI checks, and performance validation
- **Developer Experience**: Implement spec-ID-in-PR, route smoke tests, and style-guide checks

### Success Criteria
- All UI components validate against contract schemas
- Real-time execution monitoring functional across all node types
- 10-route shell responsive on all target devices (desktop, tablet, mobile)
- CI pipeline blocks invalid PRs and enforces quality standards
- Performance targets met for typical and complex workflows

## Architecture Overview

### Contract Binding Architecture
```
Frontend Components
├── Palette (NODE_REGISTRY_V1)
│   ├── NodeTypeSelector
│   ├── NodeIconRenderer
│   └── NodeDescriptionProvider
├── Forms (paramsSchema auto-generation)
│   ├── DynamicFormGenerator
│   ├── SchemaValidator
│   └── TypeSpecificEditors
├── TemplateWizard (WORKFLOW_SCHEMA_V1)
│   ├── GraphAnalyzer
│   ├── ParameterExtractor
│   └── TemplateSerializer
└── ImportExport (WORKFLOW_SCHEMA_V1 validation)
    ├── JSONValidator
    ├── GraphReconstructor
    └── UI/RuntimePreservation
```

### Real-time Execution Architecture
```
Runs/Results Integration
├── SSE Stream Manager
│   ├── WebSocketConnector
│   ├── EventParser
│   └── StatusAggregator
├── Artifact Index
│   ├── FileSystemScanner
│   ├── MetadataExtractor
│   └── PreviewGenerator
└── Execution Monitor
    ├── NodeStatusTracker
    ├── ProgressVisualizer
    └── ErrorHandler
```

## Detailed Implementation Plan

### 1. Shell & Routing Confirmation

#### 10-Route Structure
Maintain the following routes with responsive Sidebar/Header/Main layout:

1. **`/dashboard`** - System overview, quick actions, recent activity
2. **`/workflows`** - Workflow management, creation, editing
3. **`/runs`** - Active execution monitoring, run history
4. **`/results`** - Execution results, artifact browsing, exports
5. **`/selectors-lab`** - DOM selector testing and management
6. **`/templates`** - Template creation, management, instantiation
7. **`/transcript-analysis`** - YouTube transcript processing workflows
8. **`/extension-capture`** - Chrome extension data capture workflows
9. **`/settings`** - Application configuration, provider setup
10. **`/command-palette`** - Global search and command execution

#### Responsive Layout Requirements
- **Desktop (>1024px)**: Full sidebar, expanded header, main content area
- **Tablet (768-1024px)**: Collapsible sidebar, condensed header, adaptive main
- **Mobile (<768px)**: Hidden sidebar (hamburger menu), minimal header, stacked layout
- **Touch Targets**: Minimum 44px for all interactive elements
- **Typography Scaling**: Fluid typography from 14px-18px base size

### 2. Contract Binding Implementation

#### Node Palette Integration (NODE_REGISTRY_V1)
- **Dynamic Loading**: Load node types from `/specs/contracts/NODE_REGISTRY_V1.json`
- **Icon System**: Map node types to consistent iconography
- **Categorization**: Group nodes by function (Providers, Actions, Transforms, etc.)
- **Search/Filter**: Real-time filtering by name, type, or category

#### Form Auto-Generation (paramsSchema)
- **Schema Parser**: Convert JSON Schema to form fields
- **Field Types**: Support all JSON Schema types (string, number, boolean, enum, object, array)
- **Validation**: Client-side validation matching server-side requirements
- **Conditional Logic**: Show/hide fields based on other field values
- **Default Values**: Pre-populate sensible defaults from schema

#### Template Wizard (WORKFLOW_SCHEMA_V1)
- **Graph Analysis**: Identify parameterizable values in existing workflows
- **Variable Extraction**: Convert hardcoded values to template variables
- **Schema Compliance**: Ensure generated templates validate against WORKFLOW_SCHEMA_V1
- **Instantiation**: Replace variables with user-provided values
- **Preset Management**: Save/load template presets for common use cases

#### Import/Export Validation
- **Export Process**:
  1. Serialize current graph to WORKFLOW_SCHEMA_V1 format
  2. Preserve UI state (positions, collapsed nodes, etc.)
  3. Include runtime metadata (execution history, performance metrics)
  4. Generate downloadable JSON file

- **Import Process**:
  1. Validate JSON against WORKFLOW_SCHEMA_V1
  2. Reconstruct graph with preserved UI state
  3. Restore runtime metadata where applicable
  4. Handle version compatibility and migration

### 3. Real-time Execution Integration

#### SSE Stream Implementation (ENGINE_API_CONTRACT)
- **Connection Management**: Persistent SSE connection to `/api/runs/:id/stream`
- **Event Types**: Handle `nodeStarted`, `nodeFinished`, `executionComplete`, `error`
- **Status Mapping**: Convert backend status to UI states (pending, running, success, error)
- **Progress Visualization**: Real-time node highlighting and progress bars
- **Error Handling**: Display execution errors with actionable information

#### Artifact Index Integration
- **Index Loading**: Fetch artifact metadata from `/api/results/:execution_id`
- **File Type Detection**: Identify and categorize artifacts (JSON, MD, CSV, images, etc.)
- **Preview Generation**: Generate previews for supported file types
- **Download Management**: Secure download links with proper headers
- **Search/Filter**: Filter artifacts by type, size, creation date

#### Runs Page Features
- **Execution List**: Paginated list of all executions with status indicators
- **Real-time Updates**: Live status updates for running executions
- **Filtering**: Filter by status, date range, workflow type
- **Bulk Operations**: Cancel multiple executions, export results
- **Execution Details**: Deep-dive view with node-by-node breakdown

#### Results Page Features
- **Artifact Browser**: File system-like navigation of execution outputs
- **Preview Pane**: Inline preview for text, images, and structured data
- **Export Options**: Download individual files or entire result sets
- **Sharing**: Generate shareable links to specific results
- **Retention Management**: Configure automatic cleanup policies

### 4. Performance Targets

#### Core Performance Metrics
- **Initial Load**: <3 seconds for dashboard with recent data
- **Route Switching**: <1 second for navigation between routes
- **Graph Rendering**: <500ms for graphs up to 50 nodes
- **Form Validation**: <100ms for parameter form validation
- **Real-time Updates**: <50ms latency for SSE status updates

#### Memory & Resource Usage
- **Memory Footprint**: <100MB for typical usage (10-20 workflows)
- **Bundle Size**: <2MB initial bundle, <500KB for route chunks
- **Network Usage**: <1MB/minute for active monitoring
- **CPU Usage**: <5% average during graph editing

#### Scalability Targets
- **Node Limit**: Support 100+ nodes in single workflow
- **Concurrent Executions**: Monitor up to 10 simultaneous runs
- **Artifact Storage**: Handle result sets up to 1GB total
- **User Sessions**: Support 100+ concurrent users

### 5. Testing & Quality Assurance

#### Acceptance Tests
- **Round-trip Validation**: Export → Import preserves graph structure and UI state
- **Schema Compliance**: All generated JSON validates against contracts
- **SSE Integration**: Real-time updates work across all execution scenarios
- **Form Validation**: All parameter forms enforce contract requirements
- **Responsive Layout**: Shell works correctly on all target screen sizes

#### CI Pipeline Requirements
- **JSON Schema Validation**: All PRs validate against WORKFLOW_SCHEMA_V1 and NODE_REGISTRY_V1
- **Spec ID Enforcement**: PR descriptions must reference specific spec sections
- **Route Smoke Tests**: Automated tests for all 10 routes load without errors
- **Style Guide Checks**: ESLint, Prettier, and accessibility linting
- **Performance Regression**: Automated performance testing against targets

#### Test Coverage Targets
- **Unit Tests**: >90% coverage for contract-binding logic
- **Integration Tests**: Full workflow execution scenarios
- **E2E Tests**: Critical user journeys (create workflow, execute, view results)
- **Visual Regression**: Screenshot comparison for UI consistency
- **Accessibility**: WCAG 2.1 AA compliance for all interactive elements

### 6. Implementation Phases

#### Phase 1: Foundation (Week 1-2)
- Implement contract loading and validation utilities
- Create dynamic form generation system
- Establish SSE connection management
- Set up basic responsive shell testing

#### Phase 2: Core Binding (Week 3-4)
- Bind palette to NODE_REGISTRY_V1
- Implement template wizard with schema compliance
- Wire Runs page to SSE streams
- Complete import/export validation

#### Phase 3: Integration & Testing (Week 5-6)
- Integrate Results page with artifact index
- Implement comprehensive acceptance tests
- Set up CI pipeline with all required checks
- Performance optimization and validation

#### Phase 4: Polish & Documentation (Week 7-8)
- Final responsive layout refinements
- Documentation updates for new features
- User acceptance testing
- Production deployment preparation

### 7. Risk Mitigation

#### Technical Risks
- **Schema Evolution**: Implement version negotiation and migration logic
- **SSE Reliability**: Add reconnection logic and offline handling
- **Performance Degradation**: Implement virtualization for large graphs
- **Browser Compatibility**: Test across Chrome, Firefox, Safari, Edge

#### Operational Risks
- **Contract Changes**: Establish change management process for contracts
- **API Evolution**: Version API endpoints and maintain backward compatibility
- **Data Migration**: Plan for workflow format updates
- **User Training**: Provide migration guides and tutorials

### 8. Success Metrics

#### Functional Completeness
- ✅ All palette items load from NODE_REGISTRY_V1
- ✅ All forms auto-generate from paramsSchema
- ✅ Template wizard creates valid WORKFLOW_SCHEMA_V1 templates
- ✅ Import/export preserves all graph state
- ✅ SSE streams update UI in real-time
- ✅ Artifact index provides full file access

#### Quality Assurance
- ✅ All acceptance tests pass
- ✅ CI pipeline blocks invalid changes
- ✅ Performance targets met
- ✅ Responsive design works on all devices
- ✅ Accessibility standards met

#### Developer Experience
- ✅ Spec IDs required in PR descriptions
- ✅ Route smoke tests prevent broken navigation
- ✅ Style guide enforced automatically
- ✅ Clear error messages for contract violations

## Conclusion

This UX rework continuation plan provides a comprehensive roadmap for aligning the frontend with the established contracts while maintaining high standards for performance, accessibility, and developer experience. The phased approach ensures incremental progress with clear success criteria at each stage.

The plan prioritizes contract compliance as the foundation, builds real-time capabilities for execution monitoring, and establishes robust testing and CI processes to maintain quality as the system evolves.
