# Traceability Matrix (Spec → Code/Tests)

| Spec Section (Doc#) | Acceptance Criterion | Module/Route/Test | Status | Owner | Notes |
|---------------------|----------------------|-------------------|--------|-------|-------|
| UX-Plan §1.1 (Routing) | /dashboard route renders with Sidebar/Header | frontend/src/pages/Dashboard.tsx, frontend/src/components/core/MainLayout.tsx, frontend/src/components/core/Sidebar.tsx, frontend/src/components/core/Header.tsx | implemented | Frontend Team | Basic dashboard layout functional |
| UX-Plan §1.1 (Routing) | /workflows route renders with Sidebar/Header | frontend/src/pages/Workflows.tsx, frontend/src/components/core/MainLayout.tsx, frontend/src/components/core/Sidebar.tsx, frontend/src/components/core/Header.tsx, frontend/src/components/workflow/WorkflowBuilder.tsx | partial | Frontend Team | WorkflowBuilder has ReactFlow issues |
| UX-Plan §1.1 (Routing) | /runs route renders with Sidebar/Header | frontend/src/pages/Runs.tsx, frontend/src/components/core/MainLayout.tsx, frontend/src/components/core/Sidebar.tsx, frontend/src/components/core/Header.tsx | partial | Frontend Team | SSE streaming not implemented |
| UX-Plan §1.1 (Routing) | /results route renders with Sidebar/Header | frontend/src/pages/Results.tsx, frontend/src/components/core/MainLayout.tsx, frontend/src/components/core/Sidebar.tsx, frontend/src/components/core/Header.tsx | partial | Frontend Team | Artifact download not implemented |
| UX-Plan §1.1 (Routing) | /selectors-lab route renders with Sidebar/Header | frontend/src/pages/Selectors.tsx, frontend/src/components/core/MainLayout.tsx, frontend/src/components/core/Sidebar.tsx, frontend/src/components/core/Header.tsx | implemented | Frontend Team | Basic selector interface functional |
| UX-Plan §1.1 (Routing) | /templates route renders with Sidebar/Header | frontend/src/pages/Templates.tsx, frontend/src/components/core/MainLayout.tsx, frontend/src/components/core/Sidebar.tsx, frontend/src/components/core/Header.tsx | partial | Frontend Team | Template creation not implemented |
| UX-Plan §1.1 (Routing) | /transcript-analysis route renders with Sidebar/Header | frontend/src/pages/Transcript.tsx, frontend/src/components/core/MainLayout.tsx, frontend/src/components/core/Sidebar.tsx, frontend/src/components/core/Header.tsx | partial | Frontend Team | YouTube transcript processing incomplete |
| UX-Plan §1.1 (Routing) | /extension-capture route renders with Sidebar/Header | frontend/src/pages/Extension.tsx, frontend/src/components/core/MainLayout.tsx, frontend/src/components/core/Sidebar.tsx, frontend/src/components/core/Header.tsx | implemented | Frontend Team | Basic extension interface functional |
| UX-Plan §1.1 (Routing) | /settings route renders with Sidebar/Header | frontend/src/pages/Settings.tsx, frontend/src/components/core/MainLayout.tsx, frontend/src/components/core/Sidebar.tsx, frontend/src/components/core/Header.tsx | implemented | Frontend Team | Basic settings interface functional |
| UX-Plan §1.1 (Routing) | /command-palette route renders with Sidebar/Header | frontend/src/components/core/CommandPalette.tsx, frontend/src/components/core/MainLayout.tsx, frontend/src/components/core/Sidebar.tsx, frontend/src/components/core/Header.tsx | partial | Frontend Team | Command palette component exists but no dedicated route |
| UX-Tasks §2.1 (Palette) | Palette lists all registry node types | frontend/src/components/workflow/WorkflowBuilder.tsx, specs/contracts/NODE_REGISTRY_V1.json | partial | Frontend Team | Node types defined but palette rendering incomplete |
| UX-Tasks §2.2 (Forms) | Node editors auto-generate forms from paramsSchema | frontend/src/components/core/TaskNode.tsx, specs/contracts/NODE_REGISTRY_V1.json | missing | Frontend Team | Form generation from schema not implemented |
| UX-Tasks §2.3 (Import/Export) | Import/Export validates against WORKFLOW_SCHEMA_V1.json | frontend/src/components/workflow/WorkflowBuilder.tsx, specs/contracts/WORKFLOW_SCHEMA_V1.json | missing | Frontend Team | JSON validation and import/export not implemented |
| UX-Tasks §2.4 (Runs) | POST /api/workflows/execute returns runId | backend/app/api/v1/endpoints/workflows.py, specs/contracts/ENGINE_API_CONTRACT.md | missing | Backend Team | Workflow execution endpoint not implemented |
| UX-Tasks §2.4 (Runs) | GET /api/runs/:id/stream emits SSE events | backend/app/api/v1/endpoints/workflows.py, specs/contracts/ENGINE_API_CONTRACT.md | missing | Backend Team | SSE streaming not implemented |
| UX-Tasks §2.5 (Results) | GET /api/results/:id returns artifact index | backend/app/api/v1/endpoints/results.py, specs/contracts/ENGINE_API_CONTRACT.md | partial | Backend Team | Results endpoint exists but artifact handling incomplete |
| UX-Tasks §2.6 (Templates) | Create templates from existing graphs | frontend/src/pages/Templates.tsx, specs/contracts/WORKFLOW_SCHEMA_V1.json | missing | Frontend Team | Template creation workflow not implemented |
| Acceptance Tests §3.1 (Round-trip) | Export → import returns identical graph | frontend/src/components/workflow/WorkflowBuilder.tsx, specs/contracts/WORKFLOW_SCHEMA_V1.json | missing | Frontend Team | Deep equality validation not implemented |
| Acceptance Tests §3.2 (SSE Smoke) | Engine emits nodeStarted/nodeFinished on 3-node demo under 10s | backend/nodes/base_node.py, backend/app/services/workflow_service.py | missing | Backend Team | Node execution engine not implemented |
| Acceptance Tests §3.3 (UI Validation) | Palette renders all registry node types and forms validate required params | frontend/src/components/workflow/WorkflowBuilder.tsx, specs/contracts/NODE_REGISTRY_V1.json | partial | Frontend Team | Palette rendering partial, form validation missing |
| Node Registry §1.1 (dataSource) | dataSource node type implemented with paramsSchema validation | backend/nodes/provider_node.py, specs/contracts/NODE_REGISTRY_V1.json | partial | Backend Team | Provider node exists but full dataSource implementation incomplete |
| Node Registry §1.2 (domQuery) | domQuery node type implemented with selector functionality | backend/nodes/dom_action_node.py, specs/contracts/NODE_REGISTRY_V1.json | partial | Backend Team | DOM action node exists but domQuery specific logic missing |
| Node Registry §1.3 (domAction) | domAction node type implemented with action execution | backend/nodes/dom_action_node.py, specs/contracts/NODE_REGISTRY_V1.json | implemented | Backend Team | DOM action node fully implemented |
| Node Registry §1.4 (transform) | transform node type implemented with operation support | backend/nodes/transform_node.py, specs/contracts/NODE_REGISTRY_V1.json | implemented | Backend Team | Transform node fully implemented |
| Node Registry §1.5 (filter) | filter node type implemented with predicate logic | backend/nodes/condition_node.py, specs/contracts/NODE_REGISTRY_V1.json | partial | Backend Team | Condition node exists but filter-specific logic incomplete |
| Node Registry §1.6 (urlTemplate) | urlTemplate node type implemented with variable substitution | backend/nodes/export_node.py, specs/contracts/NODE_REGISTRY_V1.json | partial | Backend Team | Export node exists but urlTemplate functionality missing |
| Workflow Schema §1.1 (Validation) | Workflow JSON validates against schema | backend/app/services/workflow_service.py, specs/contracts/WORKFLOW_SCHEMA_V1.json | missing | Backend Team | Schema validation not implemented |
| Engine API §1.1 (Execute) | POST /execute validates workflow and returns runId | backend/app/api/v1/endpoints/workflows.py, specs/contracts/ENGINE_API_CONTRACT.md | missing | Backend Team | Execute endpoint not implemented |
| Engine API §1.2 (Stream) | GET /runs/:id/stream provides SSE events | backend/app/services/workflow_service.py, specs/contracts/ENGINE_API_CONTRACT.md | missing | Backend Team | SSE streaming infrastructure missing |
| Engine API §1.3 (Results) | GET /results/:id provides artifact index with download URLs | backend/app/api/v1/endpoints/results.py, specs/contracts/ENGINE_API_CONTRACT.md | partial | Backend Team | Results endpoint exists but artifact storage incomplete |
| Open Question Q1: Node Versioning | How to handle node type version mismatches during execution? | backend/nodes/base_node.py, backend/app/services/workflow_service.py, test_node_versioning.py | missing | Backend Team | Closure test: Validate version mismatch returns 400 with offending nodes list |
| Open Question Q2: Error Handling | What happens when node execution fails mid-workflow? | backend/app/services/workflow_service.py, backend/nodes/base_node.py, test_workflow_error_handling.py | missing | Backend Team | Closure test: Failed node execution stops workflow and emits error event |
| Open Question Q3: State Persistence | How are workflow states persisted across sessions? | backend/app/models/workflow.py, backend/app/services/workflow_service.py, test_workflow_persistence.py | missing | Backend Team | Closure test: Workflow save/load preserves all node params, edges, and UI state |
| Open Question Q4: Real-time Collaboration | How to handle concurrent workflow editing? | frontend/src/stores/workflowStore.ts, backend/app/services/workflow_service.py, test_collaboration_conflicts.py | missing | Full Stack Team | Closure test: Multiple users editing same workflow shows conflict resolution |
| Open Question Q5: Performance Scaling | What are performance limits for large workflows (100+ nodes)? | frontend/src/components/ui/react-flow-wrapper.tsx, backend/app/services/workflow_service.py, test_performance_scaling.py | missing | Full Stack Team | Closure test: 100-node workflow executes in <30s with <500MB memory usage |
| Open Question Q6: Data Source Reliability | How to handle unreliable external data sources? | backend/providers/base_provider.py, backend/nodes/provider_node.py, test_provider_reliability.py | missing | Backend Team | Closure test: Provider timeout/failure gracefully degrades with retry logic |
| Open Question Q7: Template Parameterization | How to parameterize workflows for template creation? | frontend/src/pages/Templates.tsx, specs/contracts/WORKFLOW_SCHEMA_V1.json, test_template_parameterization.py | missing | Frontend Team | Closure test: Template creation identifies and parameterizes node-specific values |
| Open Question Q8: Extension Integration | How does chrome extension data flow into workflows? | chrome-extension/content.js, frontend/src/pages/Extension.tsx, backend/app/services/obsidian_service.py, test_extension_integration.py | missing | Full Stack Team | Closure test: Extension-captured data appears in workflow dataSource nodes |
| Open Question Q9: Transcript Processing | How to handle different YouTube transcript formats? | scripts/youtube_transcript.py, frontend/src/pages/Transcript.tsx, test_transcript_processing.py | missing | Backend Team | Closure test: Multiple YouTube video formats processed into unified markdown |
| Open Question Q10: Selector Lab Validation | How to validate CSS selectors against live DOM? | frontend/src/pages/Selectors.tsx, backend/dom_selectors.py, test_selector_validation.py | missing | Full Stack Team | Closure test: Invalid selectors highlighted with live DOM feedback |

## Implementation Status Summary
- **Implemented**: 6/39 items (15%)
- **Partial**: 8/39 items (21%)
- **Missing**: 25/39 items (64%)

## Priority Implementation Order
1. ReactFlow performance fixes (blocks workflow editing)
2. Basic node execution engine (core functionality)
3. API endpoints for workflow execution
4. Form generation from schema
5. Import/export validation
6. SSE streaming for runs
7. Template creation workflow
8. Artifact storage and download
9. Schema validation
10. Error handling and reliability features
