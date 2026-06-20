---
date: 2026-06-18 22:25:46 PDT
ver: 1.0.0
author: codex
model: gpt-5-codex
tags: [datakiln, directives, workflows, schema, executor, selectors, artifacts, testing]
---
# Early Directives

## Provenance

Context Portal itself contained little product instruction. Its database had one decision and seven progress rows, all about documentation unification and Context Portal setup:

- Completed documentation unification with enhanced quality assurance.
- Created/migrated documentation directories.
- Updated README navigation and cross-references.
- Validated documentation and Context Portal integration.

The useful directives came from the old build docs that Context Portal pointed to, especially:

- `old-specs/reference_old/build_docs_CURRENT/PLAN.MD`
- `old-specs/reference_old/build_docs_CURRENT/PRD-NEW.MD`
- `old-specs/ux-proposal-review.md`
- `old-specs/TESTING_METHODOLOGY_OVERHAUL.md`

## Product Intent

DataKiln is a local, power-user workflow automation platform. The core objective is not a generic workflow editor. It is a visual builder that can create reusable workflows from small DOM and data actions, execute those workflows reliably, and preserve every meaningful output as traceable artifacts.

The canonical example workflows are:

- Gemini Deep Research through browser automation.
- YouTube transcript retrieval and analysis, optionally feeding Deep Research.

The system should support arbitrary sites by abstracting site-specific DOM actions into reusable selector-backed steps.

## Workflow Model

The workflow builder should produce schema objects that the executor can run directly. The schema must preserve explicit node contracts, data edges, artifact flow, and execution semantics.

Reusable units should be treated as layered components:

- Atomic actions: individual DOM/data/provider operations such as click, fill, wait, extract, transform, export.
- Molecules: reusable grouped actions for a site behavior, such as "submit prompt to Gemini" or "copy transcript."
- Substances: higher-order workflows assembled from molecules, such as "Deep Research report" or "YouTube transcript analysis."

This maps well to the current registry/template direction: templates should be composable objects, not ad hoc code snippets.

## DOM Automation

Selectors must be centralized, versioned, and testable. Each selector key should support primary and fallback selectors, with state-based waits and action logging.

Gemini/Deep Research selector keys from the old directives:

- `canvasToggle`: `div.label:has-text("Canvas")`
- `deepResearchToggle`: `div.label:has-text("Deep Research")`
- `promptInput`: `[contenteditable='true']`
- `addFiles`: `mat-icon[fonticon="add_2"]` or `mat-icon[font-icon="add"]`
- `send`: `mat-icon[fonticon="send"]` or `mat-icon[font-icon="send"]`
- `startResearch`: `span.mdc-button__label:has-text("Start research")`
- `copyOutput`: `span.mat-mdc-list-item-title:has-text("Copy")`
- `shareOutput`: `mat-icon[data-test-id="share-icon"]`

YouTube transcript selector:

- `ytTranscriptCopy`: `span#copy-span` or `span.copy-span` on `youtubetotranscript.com/transcript`

Executor implication: DOM nodes should run as ordered action sequences with selectors resolved by key. They should record which selector/fallback was used and fail with actionable selector-key errors.

## Execution Semantics

Deep Research flow:

1. Navigate to Gemini.
2. Select Deep Research mode.
3. Focus prompt input.
4. Insert prompt.
5. Optionally attach files.
6. Send prompt.
7. Wait for Start Research.
8. Click Start Research.
9. Monitor progress with retries and phase logs.
10. Copy/share final output.
11. Persist Markdown/YAML report plus `research_tree.json`.

YouTube transcript flow:

1. Open transcript tool for target video.
2. Copy transcript.
3. Feed transcript into structured analysis prompt.
4. Optionally generate follow-up questions.
5. Pass follow-ups into Deep Research for linked analysis.
6. Persist transcript, analysis, follow-up questions, and final report artifacts.

The executor must carry artifacts between nodes as first-class data, not hidden side effects.

## Artifact Contract

Every run should produce an artifact index and durable artifacts. Required artifact families:

- Execution result JSON.
- Node output artifacts where outputs are large or user-facing.
- Markdown reports with YAML frontmatter.
- `research_tree.json` for Deep Research style traversal.
- Logs with selector version, node IDs, batch IDs, timestamps, retries, and fallback selector usage.

Recommended YAML fields:

- `title`
- `ai_summary`
- `ai_sources`
- `username`
- `generator`
- `generator_version`
- `tags`
- `batch_id`
- `run_id`
- `workflow_id`
- `selector_profile`
- `created_at`

## Queueing And Pacing

Deep Research automation should enforce:

- At most three active Deep Research browser sessions.
- Mode-specific breadth/depth limits.
- State-based waits for DOM transitions.
- Sleeps only between batch jobs or after explicit rate-limit/backoff decisions.
- Retry/failover logs attached to the run.

Mode defaults from old directives:

- Fast: up to 3 concurrent queries, no recursion, 2-3 follow-ups.
- Balanced: up to 7 concurrent queries, no recursion, 3-5 follow-ups.
- Comprehensive: recursive deepening, 5-7 follow-ups, counter-arguments and relationship exploration.

## UI Requirements

The UI should expose operational controls that map to backend behavior:

- Dashboard: saved workflows, recent runs, quick actions.
- Workflow editor: node builder, selector/prompt configuration, validation, save version, run.
- Selector lab: edit/test/publish selector profiles.
- Run monitor: queue state, phases, retries, node logs, errors.
- Results: Markdown/YAML report, artifact index, `research_tree.json`, logs, export/download.
- Settings: provider config, vault path, selector profile defaults, output conventions.

UI controls should not be decorative. If a control exists, it must call a backend operation or be clearly staged outside the main implementation path.

## Testing Directive

Presence-only tests are insufficient. A passing test that only proves a button or page exists is not evidence of functionality.

Required validation levels:

- Schema contract tests: builder-shaped workflow objects normalize into executor-ready compositions.
- Executor tests: node outputs flow through edges and produce artifacts.
- API tests: create/save/execute workflows through service or HTTP boundary.
- UI functional tests: click controls and verify state changes/results, not just rendered text.
- Manual or Playwright smoke tests for browser DOM workflows when live provider credentials/session state are available.

Completion can only be claimed when output artifacts exist and are connected to the run that produced them.

## Current Project Application

Already aligned:

- A schema-driven executor path now exists.
- Registry/template direction matches the atomic/molecule/substance model.
- Focused backend tests now validate legacy GUI-shaped workflow normalization, DOM template compilation, dry-run DOM execution, and YouTube ID extraction.
- Workflow service stores an execution result artifact and artifact index.

Partially aligned:

- Selector registry exists, but selector profile versioning and per-run selector provenance need to be made explicit.
- DOM sequence execution exists, but live browser validation for Gemini/YT still needs Playwright-backed smoke coverage.
- Artifact handoff exists for execution results, but node-level large outputs should be persisted as first-class artifacts and referenced in downstream node inputs.
- UI has workflow pages, but current functional status must be validated by clicking through create/save/run and confirming backend output.

Remaining work to finish functional confidence:

- Add an end-to-end service/API test that creates a builder-style workflow, executes it, verifies node output propagation, verifies artifact index contents, and reads back the stored artifact.
- Add selector-profile metadata to DOM execution results and artifacts.
- Add node-output artifact persistence for export/report-producing nodes.
- Run a frontend workflow-builder smoke test against the local app once backend API and frontend dev server are started.
- Keep old generated e2e screenshots/reports out of Git; retain only runnable tests and current evidence.

## Incorporation Decisions

Use these directives immediately as implementation constraints:

- Treat artifact propagation as a blocking correctness requirement.
- Prefer schema/template/registry changes over hardcoded special workflows.
- Keep selector details centralized and versionable.
- Make tests prove real output and artifact handoff.
- Do not declare the workflow creator operational until create/save/execute/output has been verified through the actual API/UI path.
