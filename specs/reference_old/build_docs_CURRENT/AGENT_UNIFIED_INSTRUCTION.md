<start>

TITLE: DATAKILN — CONTRACT CHECKPOINT + UX CONTINUATION (Unified, Final, Path-Aware, Strict Superset — Ultimate XL)

ROLES (Roo Code)

Orchestrator: split tasks, hand planning/spec authoring to Architect, and implementation to Code; exchange boomerang summaries across subtasks to keep context tight.

Architect: authoritative for contracts and plans; Code: authoritative for engine scaffolding and UI bindings; Orchestrator merges outputs and opens PR.

PREFLIGHT (path/name normalization — REQUIRED)

If present, rename: specs/bulild_docs_CURRENT → specs/build_docs_CURRENT.

If present, rename: specs/contracts/NODE_REGISTRY_V1.json.json → specs/contracts/NODE_REGISTRY_V1.json.

If present, move: specs/contracts/UX_REWORK_CONTINUATION_PLAN.md → specs/plans/UX_REWORK_CONTINUATION_PLAN.md.

Ensure folders exist: specs/build_docs_CURRENT, specs/contracts, specs/plans, specs/UXplan, specs/matrix.

Align path: move specs/INTEGRATED_PROJECT_PLAN.md → specs/plans/INTEGRATED_PROJECT_PLAN.md to match SOURCE DOCS references.

SOURCE DOCS (read-only; do not modify)

specs/build_docs_CURRENT/PRD-NEW.MD.

specs/plans/INTEGRATED_PROJECT_PLAN.md.

specs/UXplan/UX_RESTRUCTURING_PLAN.md.

specs/UXplan/UX_IMPLEMENTATION_TASKS.md.

CONTEXT ANCHORS (must remain true in outputs)

Ten routes and features: dashboard, workflows, runs, results, selectors-lab, templates, transcript-analysis, extension-capture, settings, command-palette as previously defined.

Performance targets: ReactFlow ≥50 nodes with smooth interactions Phase 1; ≥100 nodes optimized Phase 3; node add/link median <50ms; pan/zoom ≥55 FPS on M1.

Transcript pipeline: URL validation → transcript fetch (YouTube tool) → structured analysis (“Gem”) → optional deep research pass with generated questions; artifacts saved with YAML; downstream into results/workflows.

Extension capture: provider detection, HTML→Markdown conversion with cleaned code blocks, YAML frontmatter, deterministic download, mover/launcher integration for Obsidian vault.

Selectors (core examples): [contenteditable='true'] prompt input; Canvas/Deep Research labels; mat-icon[fonticon='send'] submit; span.mdc-button__label:has-text('Start research'); span.mat-mdc-list-item-title:has-text('Copy'); ytt span#copy-span.

Non-functional guardrails: provider-agnostic endpoints.json (providerRef), JSON-defined workflows with import/export/versioning, robust logging/provenance (research_tree.json), retry/backoff and queue discipline, accessibility (WCAG 2.1 AA).

CONTRACTS (machine-readable — generate/confirm)

specs/contracts/WORKFLOW_SCHEMA_V1.json (JSON Schema Draft 2020‑12) for a provider‑agnostic DAG: nodes, edges, params, ui, runtime, metadata, version.

specs/contracts/NODE_REGISTRY_V1.json for node types: dataSource, domQuery, domAction, transform, filter, urlTemplate (inputs/outputs, paramsSchema, version).

specs/contracts/ENDPOINTS.template.json (providerRef → baseUrl/authRef/capabilities/selector packs), include provider examples perplexity, gemini, genericDom, no secrets committed.

specs/contracts/ENGINE_API_CONTRACT.md (POST /api/workflows/execute, GET /api/runs/:id/stream, GET /api/results/:id; artifact/log conventions; SSE events: nodeStarted/nodeFinished/error/progress; versioning policy: version, deprecatedSince, replacedBy; schemas/upgrade script TODO).

SUBTASK A (Architect) — Traceability [REQUIRED]

Write specs/matrix/TRACEABILITY_MATRIX.md mapping acceptance criteria/page→modules/routes/tests with status (implemented | partial | missing) and owner. 

SUBTASK B (Architect) — Contracts [REQUIRED]

Emit/confirm machine-readable contracts above; validate round‑trip between UI and schema and param conformance to registry entries.

SUBTASK C (Architect) — UX plan bound to contracts [REQUIRED]

Write specs/plans/UX_REWORK_CONTINUATION_PLAN.md that confirms the 10‑route shell and responsive layout with Sidebar/Header/Main; binds palette/forms/template wizard/import/export to NODE_REGISTRY_V1 + WORKFLOW_SCHEMA_V1; wires Runs/Results to SSE and artifact index; adds acceptance tests and CI checks; restates perf targets.

SUBTASK D (Code) — Engine & UI [REQUIRED]

Backend: Implement Pydantic models per WORKFLOW_SCHEMA_V1; minimal DAG executor for { dataSource, transform, domAction }; expose POST /api/workflows/execute; GET /api/runs/:id/stream; GET /api/results/:id; in‑memory run registry (v1) with TODOs for durable store and cursor‑paged results.

Frontend: Continue routing/layout/sidebar/header/error boundaries/ReactFlow provider isolation; bind palette/forms to NODE_REGISTRY_V1; validate import/export against WORKFLOW_SCHEMA_V1; implement template wizard; add “Load Sample Workflow” for E2E validation.

PRD ESSENTIALS (execute as guardrails; update PRD if misaligned)

Vision/Goals: local, provider‑agnostic, visual workflow editor driving browser‑automated deep research and transcript pipelines; Obsidian‑ready Markdown artifacts with YAML provenance.

Architecture: Frontend (SvelteKit or Next.js/shadcn with ReactFlow adapter isolation if SvelteKit), Backend (FastAPI executor + Playwright), Capture Tools (Chrome extension + mover daemon); JSON‑defined workflows persisted/imported/exported.

Core Features: the 10 routes plus builder (ReactFlow + palette + node editors + versioning/templates/import/export), runs/results (SSE + logs + artifacts browser), selectors‑lab (inspect/test + optimization + library + extension bridge), transcript pipeline, extension capture export/analytics, settings, command‑palette.

Non‑functional: ReactFlow perf targets, schema/registry validation in CI, WCAG 2.1 AA, logs/provenance, retry/backoff, batch/queue discipline, provider‑agnostic selector packs, stable memory.

Provider Strategy: endpoints.json via providerRef keys (perplexity, gemini, genericDom) with capability flags and selector pack versions.

Terminology: URL templating/query‑string parameterization; DOM query/action/mutation; synthetic event; use consistently across code, docs, UI, and tests.

ARCHITECTURE (specifics reaffirmed)

Frontend: Prefer React for native ReactFlow or SvelteKit shell with React adapter; maintain provider isolation and avoid reconciliation overhead to hit perf targets.

Backend: FastAPI executor with SSE, Playwright for domQuery/domAction and transcript fetchers under capability constraints.

Capture: Chrome extension + mover/launcher daemon for deterministic Markdown/YAML with stable frontmatter and filenames for Obsidian ingestion.

EXTENSION INJECTION CONTRACT

Lifecycle: idempotent attach on load and SPA navigations, iframe enumeration, Shadow DOM traversal; selector precedence from active provider selector pack recorded in provenance.

Synthetic events: mimic trusted sequences or dispatchEvent with delays; log nodeId/selector/event/timestamps/DOM snapshot hash in research_tree.json.

Error handling/retry: exponential backoff with jitter and maxAttempts; circuit‑breaker on repeated mutation conflicts; SSE error with nodeId/selector/retry state.

Security/scope: origin allowlists, no secret exfiltration, sanitized clipboard/code blocks, capability checks at plan and runtime.

Deterministic artifacts: YAML frontmatter fields (id, providerRef, timestamp, url, selectorsPackVersion, nodeIds, workflowVersion); normalized Markdown with dedented, language‑tagged code fences.

UX STYLE GUIDE BINDINGS

Bind the UX plan to UX_STYLE_GUIDE.md tokens; add CI checks for contrast, focus visibility, keyboard navigation across routes and command palette.

Route smoke tests assert landmark roles, focus order, and density baselines for ReactFlow readability and interactions at target node counts.

Schema‑driven forms derive labels/descriptions from NODE_REGISTRY_V1 and WORKFLOW_SCHEMA_V1 to ensure accessible and consistent parameters.

OPEN QUESTIONS BUCKET

Keep specs/build_docs_FUTURE/undefined_elements.md as canonical; mirror items into TRACEABILITY_MATRIX.md with owner, target PR, and closure test.

Prioritize edge cases: iframe/Shadow DOM traversal, SPA detection, provider capability boundaries, ReactFlow virtualization/memoization tuning.

PROVIDER STRATEGY ENHANCEMENTS

Include perplexity, gemini, genericDom in ENDPOINTS.template.json with baseUrl, authRef, capabilities, selector packs and versions; validate capabilities at plan time, fail fast at execute with SSE error on mismatch.

CRA MIGRATION NOTE

If CRA remnants exist, document constraints/migration in build_docs_CURRENT/create_react_app_situation.md and link to matrix; otherwise mark deprecated and assert no CRA assumptions in smoke tests; document SvelteKit↔ReactFlow adapter boundaries if applicable.

DELIVERABLES CHECKLIST

specs/matrix/TRACEABILITY_MATRIX.md with criteria/page→modules/routes/tests, status, owner, and open‑question IDs with closure tests.

specs/contracts/{WORKFLOW_SCHEMA_V1.json, NODE_REGISTRY_V1.json, ENDPOINTS.template.json, ENGINE_API_CONTRACT.md} with versioning and artifact/log conventions.

specs/plans/UX_REWORK_CONTINUATION_PLAN.md bound to registry/schema and engine SSE/artifacts with acceptance tests, CI schema validation, spec‑ID‑in‑PR, route smoke tests, and style‑guide checks.

Backend scaffold: Pydantic models, minimal DAG executor for { dataSource, transform, domAction }, SSE stream, results index, in‑memory run registry v1 with TODOs for durable store and cursor‑paged results.

Frontend shell: 10 routes, palette/forms bound to registry, import/export validation, template wizard, “Load Sample Workflow,” error boundaries, ReactFlow provider isolation meeting perf targets.

ACCEPTANCE CRITERIA

Round‑trip: ReactFlow ↔ WORKFLOW_SCHEMA_V1 import/export is lossless (ids, params, ui, runtime, metadata).

Engine: submit graph → runId; SSE emits nodeStarted/nodeFinished/error; results index browsable.

UX: 10 routes render; palette lists registry node types; node forms enforce paramsSchema; transcript demo flow runs E2E.

Perf: 50+ nodes add/link under 50ms median; pan/zoom ≥55 FPS; memory stable during prolonged canvas edits.

CI: JSON Schema validation, dead‑export/unused‑import checks, spec‑section ID in PR descriptions, ≥1 acceptance test per PR.

SAMPLE WORKFLOW (use for validation)

text
{
  "id": "wf_demo",
  "name": "Demo Research Flow",
  "version": 1,
  "metadata": { "tags": ["demo"] },
  "nodes": [
    { "id": "n_ds1", "type": "dataSource", "version": 1, "params": { "providerRef": "perplexity", "query": "topic" }, "ui": { "x": 120, "y": 200 } },
    { "id": "n_tr1", "type": "transform", "version": 1, "params": { "operation": "markdownToText" }, "ui": { "x": 360, "y": 200 } },
    { "id": "n_dom1", "type": "domAction", "version": 1, "params": { "selector": "#copy", "action": "click" }, "ui": { "x": 600, "y": 200 } }
  ],
  "edges": [
    { "id": "e1", "from": "n_ds1", "to": "n_tr1" },
    { "id": "e2", "from": "n_tr1", "to": "n_dom1" }
  ]
}
This example must be loaded by the “Load Sample Workflow” UI action and pass import/export round‑trip and E2E execution with SSE events visible in runs and artifacts listed in results.

BRANCH & PR

Branch: feature/schema-contract-checkpoint.

PR: “Schema v1 + Node Registry + Engine Contracts + UX Alignment”.

TASK FOR ORCHESTRATOR (write files)

Create or update the following files: TRACEABILITY_MATRIX.md, WORKFLOW_SCHEMA_V1.json, NODE_REGISTRY_V1.json, ENDPOINTS.template.json, ENGINE_API_CONTRACT.md, UX_REWORK_CONTINUATION_PLAN.md, and a new specs/plans/TODO_OBJECTIVES.md capturing the orchestrated worklist with owners, estimates, dependencies, and PR acceptance tests per objective.

Ensure CI passes with schema validation, spec‑ID in PR description, dead‑export/unused‑import checks, route smoke tests, accessibility checks, and performance thresholds.