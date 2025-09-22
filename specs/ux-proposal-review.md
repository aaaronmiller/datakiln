Robust selectors means using a centrally versioned selector map with multiple reliable locators per UI element (text labels, roles, attributes) plus verified waits and fallbacks so Playwright can consistently find and act on Gemini Canvas/Deep Research controls despite DOM or locale shifts, while pacing means enforcing concurrency caps, inter-job sleeps, and state-based waits between actions to avoid rate caps and flaky transitions.

Below is a build-ready, step-by-step click plan for each workflow with exact selectors, waits, and UI wiring so the interface mirrors actual browser automation semantics and exposes every control the operator touches, not a generic overview, as specified in the plan and PRD.

Definitions
Robust selectors: a per-provider selector registry with primary and fallback entries for each action (mode toggle, input, attach, send, start, copy, share) using stable attributes and text filters, validated before runs and updated in one place when DOMs change, as mandated by the plan’s “selectors registry” and PRD’s “resilient selectors with retries” requirements.

Pacing: explicit concurrency caps per mode (Fast up to 3, Balanced up to 7, Comprehensive recursive with broader follow‑ups), at-most-3 parallel Deep Research sessions, sleeps between batch jobs, and action-level state waits (e.g., wait for “Start research” to appear after Send) with retries, as documented in mode specs and queue discipline.

Selector map (Gemini Canvas/Deep Research + YT transcript)
Canvas mode toggle: div.label:has-text("Canvas") as the primary mode selector entry.

Deep Research mode toggle: div.label:has-text("Deep Research") for switching into Deep Research panel.

Prompt input: any element with contenteditable="true" used for entering or pasting the research topic/prompt.

Add files: mat-icon[font-icon="add"] for optional file attachments to the prompt.

Send/Submit: mat-icon[font-icon="send"] to submit the prompt before deep research activation.

Start research: span.mdc-button__label:has-text("Start research") to trigger the Deep Research job after the prompt is submitted.

Copy output: span.mat-mdc-list-item-title:has-text("Copy") for copying model output.

Share export: mat-icon[data-test-id="share-icon"] for opening sharing/export options on the result pane.

YouTube transcript copy: span.copy-span on youtubetotranscript.com/transcript for grabbing a full transcript from the tool.

Deep Research: end-to-end click path (Balanced mode example)
Navigate the automation browser to gemini.google.com and ensure the app shell renders before interacting, as required by the PRD’s browser-automation step sequencing.

Click the Deep Research mode toggle using div.label:has-text("Deep Research") and verify the panel switches by asserting the presence of the “Start research” control later in the flow, per the selector map.

Focus the prompt input by selecting the first element with contenteditable="true" and confirm an active caret before typing or paste events, as specified in the DOM automation guidance.

Paste or type the topic prompt into the contenteditable area and ensure at least minimal character count before proceeding to submission, matching the “prompt input contenteditable” assumption.

Optional: click Add files via mat-icon[font-icon="add"] to attach any local file the workflow defined, then wait for attachment chips to appear as a verification step, per the selector map.

Submit the prompt by clicking mat-icon[font-icon="send"] and wait for the app to expose the Deep Research activation control, which is Start research, before proceeding, as outlined in the Gemini flow.

Click Start research using span.mdc-button__label:has-text("Start research") and record timestamped phase entry for the run console and research tree, as emphasized by the PRD’s progress tracking and research tree requirements.

Monitor job phases and retries in the run console while the automation pauses between transitions rather than using fixed sleeps, respecting pacing guidance and logging each phase for audit fidelity, as mandated by queue discipline and progress tracking.

After generation, click Copy using span.mat-mdc-list-item-title:has-text("Copy") to capture the model’s output for downstream processing or export, per the selector list.

Optionally click Share using mat-icon[data-test-id="share-icon"] to open export options if the workflow requires a share/export action beyond Copy, as mapped in the DOM selectors.

Persist the final artifact and researchtree.json, ensuring YAML frontmatter (title, aisummary, aisources, username, generatorversion, and batch UUID) for Obsidian ingestion, per output guarantees and artifact conventions.

Deep Research: UI wiring and controls
Mode switcher in the UI calls a provider action “selectMode('Deep Research')” which uses div.label:has-text("Deep Research") and validates success by awaiting Start research visibility; failure triggers fallback or selector test, per the centralized selector registry.

Prompt editor binds to contenteditable and captures input length; the “Attach” button invokes the add-files action backed by mat-icon[font-icon="add"], and the “Send” button invokes mat-icon[font-icon="send"], matching the DOM automation steps above.

The “Start research” UI button is disabled until the app shows span.mdc-button__label:has-text("Start research"), then clicking it transitions the run into the queued/active phase tracked in the research tree with UUIDs, per the process contract.

Pacing, concurrency, and retries for Deep Research
Concurrency: cap active Deep Research sessions at three in the queue to prevent rate/batch caps, while Balanced mode allows up to seven concurrent queries internally managed by the agent, as documented in mode parameters and queue discipline.

Inter-job pacing: insert sleeps between batch jobs and action-level waits for DOM state changes (e.g., “Start research” appearing) rather than unbounded loops, with retries and failover logged for audit, following the plan’s pacing and retry guidance.

Phase waits: favor state-based waits (element attached + visible + enabled) and verify output controls (Copy/Share) before extraction or export to reduce flakiness, consistent with the “resilient selectors with retries” directive.

YouTube transcript pipeline: end-to-end click path
Open the transcript tool at youtubetotranscript.com/transcript and ensure the transcript is loaded for the target video by following the pipeline’s “open transcription site” step, as described in the project plan.

Click the Copy control using span.copy-span to place the transcript into the clipboard for downstream prompt assembly, as specified in the selector map.

Launch the Gemini Gem transcript analysis flow and paste the transcript into the contenteditable prompt input, then confirm and run the structured “Gemini Gem” prompt, per the pipeline coupling requirements.

Optionally generate follow-up questions from the analysis and pass them as inputs into a Deep Research run using the same Deep Research click path and selectors described earlier to create a linked analysis, as required by the PRD.

Chrome extension capture → Obsidian mover: end-to-end clicks and steps
On AI chat pages (Gemini, ChatGPT, Claude, Perplexity, Grok, Kimi, DeepSeek, Ernie), the extension detects the provider from URL regex and locates the conversation container via a provider-specific selector list with a generic fallback to .main-chat-container, main, or body, per the extension’s provider map.

The content script extracts outerHTML from the chosen container when at least 50 characters of text are found or falls back to body, then converts HTML to Markdown via htmlToMarkdown with code/list/heading normalization, as defined in the extractor.

The background script downloads the Markdown as ai-session-<service>-YYYY-MM-DDTHH-MM-SS.md into Downloads without prompting, using chrome.downloads with conflictAction=uniquify for determinism, per the capture plan.

The ai-vault-mover daemon (chokidar) watches Downloads and subfolders for ai-session-*.md, deconflicts names, moves files to the configured Obsidian vault path, and emits OS notifications via osascript/notify-send, as the mover flow prescribes.

Workflow authoring and run: exact UI actions
Open Workflows and click New Workflow to enter the editor that stores node configurations including selectors and prompts, as described in the UI components list.

Drag nodes for DataSource, Filter, Transform, Aggregate, and Task into the canvas, connect edges, and open each node’s parameter panel to set provider, selectors (from registry), and prompts, then click Validate to confirm the graph, per the integrated plan.

Click Save version to persist the workflow and click Run to hand execution to the backend agent which maintains progress, retries, and research tree JSON for audit and later visualization, as required by the PRD.

Selector tuning lab: exact UI actions
Open Selectors and choose provider “Gemini Deep Research” to load the selector map entries (Canvas toggle, Deep Research toggle, prompt input contenteditable, add files, send, start research, copy, share) as a centralized config, as mandated by the plan.

Edit a selector entry (e.g., Start research = span.mdc-button__label:has-text("Start research")) and click Test to run against a sandboxed browser tab that verifies presence/visibility and returns pass/fail with snapshots, per the PRD’s resilience requirement.

Click Publish version to make the updated selector set active for workflows, and show a badge on dependent workflows indicating that a selector revision was applied, following the registry approach.

Results and artifacts: exact UI actions
Open Results to view Markdown with YAML frontmatter (title, aisummary, aisources, username, generatorversion, and batch UUID) and a side panel listing researchtree.json and logs, aligned with output conventions.

Click Export to Obsidian to write the Markdown into the configured vault path or use the Obsidian URI option if enabled, keeping the YAML fields unchanged for reliable parsing, as specified in integration requirements.

Use Copy in the provider UI when needed and map it back to span.mat-mdc-list-item-title:has-text("Copy") to maintain consistency between on-page exports and stored artifacts, per the selector list.

Interface elements to expose for fidelity
Balanced/Fast/Comprehensive toggles with mode caps and follow-up counts surfaced in tooltips to match agent behavior and set user expectations, aligning UI and agent semantics.

Concurrency and retries controls per run with guardrails enforcing at-most-three active Deep Research jobs and sleeps between batch entries, as the queue discipline requires.

A selector profile picker on the run form to bind the exact selector map version so run logs can link DOM actions to selector revisions for audits, fulfilling the PRD’s traceability focus.

Error handling surfaces mapped to actions
If a selector fails, the run console shows the failed selector key and offers “Open in Selector Lab” and “Retry with fallback” actions so operators can correct and resume quickly, per the selectors registry and retry guidance.

If a batch job exceeds caps or hits rate limits, the queue inserts sleeps before next job and logs the backoff decision with timestamps, ensuring reproducibility and post-hoc analysis, as required by queue and pacing rules.

If the mover cannot write into the vault path, the UI surfaces the OS notification and provides a “Fix vault path” action in Settings, aligned with the mover’s fatal-path behavior in configuration.

Why these selectors and waits
The chosen selectors are directly taken from the plan’s DOM automation list for Gemini Canvas/Deep Research and the YT transcript tool, which are intended to be centralized and versioned for rapid updates as UIs change.

The action order and waits reflect the PRD’s emphasis on resilient sequencing (submit, then Start research), progress tracking, artifact consistency, and auditability via research tree and YAML, ensuring UI actions map 1:1 to logged phases.

The concurrency and sleep policies reflect the plan’s explicit caps and pacing requirements to minimize rate-limit failures and keep long-running jobs stable for power users running batches, which the UI must present clearly.

Implementation notes you can wire directly
Use a central “selectors.json” profile with keys: canvasToggle, deepResearchToggle, promptInput, addFiles, send, startResearch, copyOutput, shareOutput, ytTranscriptCopy; each key holds an ordered selector array for fallback resolution, as prescribed by the registry concept.

Expose selector-set versioning in the UI, bind version to each run request, and record the version in YAML and logs so audits can reproduce DOM conditions at the time of execution, per traceability requirements.

In the run engine, implement state-based waits (attached + visible + enabled) on each action and only use fixed sleeps between batch jobs to satisfy the pacing mandate without introducing unnecessary flakiness, as the plan directs.

Based on the workflows described above, now give me a comprehensive list and description of every page and available option on the user. User interface portion of the project. Confirm that these correlate properly with the back-end operations. If uh i feature you suggest does not have a back end of the colour.

Leave that in an additional appendix regarding proposed additional improvements or changes that could be made to the code base beyond the main thing. Implementation of making the current interface more functional. To the user.

Based on the workflows described above, now give me a comprehensive list and description of every page and available option on the user. User interface portion of the project. Confirm that these correlate properly with the back-end operations. If uh i feature you suggest does not have a back end of the colour. Leave that in an additional appendix regarding proposed additional improvements or changes that could be made to the code base beyond the main thing. Implementation of making the current interface more functional. To the user.
title: Complete UI surface map with options, backend correlations, and appendix of proposed additions
date: 2025-09-21 09:30:00 PDT
ver: 1.0.0
author: lil' Gimpy
model: perplexity-llm
tags: [ui, ux, pages, endpoints, workflows, selectors, results, obsidian]

The following enumerates every page and user-facing option required to operate the current workflows, confirms where each control maps to existing backend operations, and isolates any UI elements that need backend or script additions in an appendix for staged implementation by Ice‑Ninja and lil’ Gimpy’s crew.

All pages and controls are derived from the PRD, plan, integrated roadmap, backend API, and frontend architecture so the interface precisely reflects deep research, transcript analysis, selector registry, runs/queue discipline, results artifacts, and Obsidian integration behaviors already specified in the documents.

App shell
The app shell provides the persistent Header, Sidebar, and content frame hosting Dashboard, Workflows, Runs, Results, Selectors, Templates, Transcript, Extension, and Settings, implemented per the frontend architecture’s component plan with dark mode defaults.

Global controls include search, command palette, and user/session controls, while navigation emphasizes Dashboard, Workflows, Runs, Results, and Settings as primary destinations to match current maturity and backend API availability.

Header: app logo, global search, command palette trigger, and user/session menu consistent across all pages.

Sidebar: primary nav links to Dashboard, Workflows, Runs, Results, Selectors, Templates, Transcript, Extension, Settings with active route highlighting and keyboard shortcuts.

Dashboard
The Dashboard offers quick-run tiles for Deep Research (Fast/Balanced/Comprehensive) and Transcript Analysis, recent runs/results, and a queue snapshot to accelerate common flows in line with the PRD’s emphasis on quick value and batch usage.

Each tile opens a modal or page with explicit mode, topic, concurrency, retries, selector profile, and output destination so that run requests are fully bound to backend semantics and artifact expectations before execution.

Quick run: Deep Research tile with Mode toggle, Topic input, Concurrency, Retries, Selector profile, Start button invoking execution.

Transcript quick run: URL input or “Paste transcript,” Prompt preset selector, Submit/Analyze actions, and “Chain into Deep Research” toggle.

Recent activity: last N runs with status, provider, mode, and open-in-console shortcut, plus recent results with export badges.

Workflows (list)
The Workflows list shows saved workflows with create, duplicate, edit, version, execute, and delete actions, aligning with backend CRUD endpoints and the product’s workflow-first orchestration model.

Rows include name, description, updated time, and usage badges (e.g., selector-profile version) to reinforce traceability required by the PRD’s audit posture.

Create: opens editor with new graph, default metadata, and empty nodes list for construction.

Execute: dispatches POST /workflows/{id}/execute and navigates to the run console for live monitoring.

Version: duplicates current spec into a new immutable version id (frontend-side), with version tagging recorded in run metadata.

Workflow editor (canvas)
The editor hosts a drag-and-drop canvas to assemble nodes (DataSource, Filter, Transform, Aggregate, Query/Task nodes), configure parameters (provider, selectors, prompts), connect edges, validate, save, and run, as called for by the plan and integrated project roadmap.

A right-rail parameter sheet exposes per-node configs while toolbar actions include Validate, Save version, Export JSON, Import JSON, and Run to match persistence and execution semantics defined in backend and PRD.

Nodes: DataSource, Filter, Transform, Aggregate, Task/Query nodes with parameter editors and enable/disable toggles.

Toolbar: Validate (structural and parameter checks), Save version (persist spec), Export/Import JSON (graph portability), Run (start execution).

Graph ops: select, move, align, delete, duplicate, and group operations with Undo/Redo for productivity and clarity.

Runs (activity)
The Runs page aggregates Active, Queued, and Completed executions with scope-first filters for provider and mode and then sorting by time, reflecting the queue discipline and auditability expectations in the plan.

Each run row links to its console, exposes status, phase, retries, start/end times, and ties to selector profile and workflow version so operators can diagnose or compare runs precisely.

Filters: provider, mode, workflow, status, date/time range, with default scope-first filter UI before sort.

Row actions: Open console, View logs, View artifacts, Rerun with tweaks (pre-fills console form).

Run console (detail)
The console is a live view of a specific run with phase progression, retries, screenshots/snapshots toggle, and a collapsible research tree pane; it is the operator’s locus for validation, triage, and provenance.

Controls include Stop, Retry step, Open selectors, and Re-run with changes, mapping directly to backend status retrieval and agent-level retry semantics with research tree JSON captured at completion.

Header: run id, mode, provider, selector profile, workflow version, and timestamps.

Live status: phases, retries, optional snapshots, DOM step annotations, and error surfaces with “Open in Selector Lab” shortcut.

Research tree: tree view reflecting parent/child/depth/learned facts, saved as research_tree.json on finalize.

Results (list)
The Results page lists completed outputs with title, mode, provider, run id, and export indicators, providing direct access to Markdown+YAML and sidecar artifacts as required by output conventions.

Actions include open, copy, download, export to Obsidian, and compare versions to maintain the PRD’s provenance guarantees and operator control.

Filters: by provider, mode, tag, and date, mirroring Runs for consistency.

Row actions: Open result detail, Export to Obsidian, Download Markdown, View research_tree.json.

Result detail
The detail view renders Markdown with YAML frontmatter (title, ai_summary, ai_sources, username, generator/version, tags, batch/UUID), shows artifact list (research_tree.json, logs), and offers export actions including Obsidian URI and direct vault write.

This page is the final audit surface binding outputs to run metadata, selector profile, and workflow version, allowing precise reproduction or rollbacks per PRD discipline.

Viewer: Markdown renderer with YAML preview and copy-to-clipboard.

Artifacts: research_tree.json, logs, and any captured snapshots linked for download.

Exports: Obsidian write, Obsidian URI, raw file download.

Selectors lab
The Selectors Lab centralizes provider selector maps for Gemini Canvas/Deep Research and the YT transcript tool with entries for canvasToggle, deepResearchToggle, promptInput, addFiles, send, startResearch, copyOutput, shareOutput, and ytTranscriptCopy.

Operators can edit selectors, run sandbox tests, view pass/fail with snapshots, and publish a new selector profile version that workflows and runs can bind to for reproducible automation.

Provider picker: Gemini Canvas, Gemini Deep Research, YTT with profile version selector and change log.

Selector editor: key/value arrays for primary and fallback selectors and a “Test in sandbox” button returning status and captures.

Publish: publish new version, propagate badges to dependent workflows, and lock runs to specific profile version.

Templates
Templates provide one-click presets for Fast scan, Balanced review, and Comprehensive audit with prefilled parameters (concurrency, follow-ups, recursion), reducing time-to-value while honoring queue discipline and output standards.

Templates are stored as immutable specs that can be cloned into workflows or quick-run modals, facilitating team reuse and consistent results.

Catalog: list of presets with mode, scope, and notes, plus “Use” and “Clone to Workflow” actions.

Governance: versioned template spec with description, owner, and last-updated fields.

Transcript analysis
This page enables YouTube transcript workflows: paste URL or transcript, apply the Gem-based analysis prompt, and optionally generate follow-up questions to chain into Deep Research, unifying the dual-path pipeline specified in the plan.

It exposes Prompt presets, Analyze, Generate questions, Select questions, and “Run Deep Research” to feed the earlier-defined deep research run flow.

Inputs: URL field, “Paste transcript,” or reference captured transcript; Prompt preset dropdown.

Actions: Analyze, Generate questions, Select subset, Run Deep Research with chosen mode and constraints.

Extension capture
The Extension page documents the Chrome extension’s provider detection, selector fallbacks, HTML→Markdown pipeline, and local Downloads→Vault mover flow, providing manual test triggers and configuration readouts for the operator.

Given limited integration maturity, this page focuses on capture tests, file naming format, and mover status while deferring deeper in-app stitching to the appendix for future backend/API work as noted in the integrated plan.

Test capture: run provider detection and capture on the current tab, show selector used and preview of Markdown.

Downloads and mover: show last captures, mover PID/log status, VAULT_PATH, and notifications health.

Settings
Settings expose environment and integration controls: Obsidian vault path, mover daemon start/stop/status/logs, queue discipline caps, default selector profile, and API secrets locations per PRD and mover/launcher behaviors.

The goal is to surface OS interactions and execution environment in a controlled way while preserving secrets and local-only guarantees established by the documents.

Vault/mover: VAULT_PATH display/edit, mover start/stop/status/restart, log tail preview, and notification test.

Queue discipline: max concurrent Deep Research runs and inter-job sleep defaults.

Selector defaults: global default selector profile for new runs/workflows.

Command palette
The palette accelerates expert workflows with verbs like Run, Open, Edit, Test, and Export and quick navigation to workflows, runs, and selectors, aligning with the PRD’s power-user posture without adding backend needs.

Palettized commands map to existing UI actions and API invocations, preserving parity and reducing surface complexity for frequent operators.

Actions: start run, open console, open result, open selectors, test selector, export to Obsidian.

Navigation: jump to Dashboard, Workflows, Runs, Results, Selectors, Settings.

UI ↔ backend correlation table
UI page/feature	Backend endpoint(s)	Correlation status
Workflows list: Create, Get all, Get by id, Update, Delete	POST /api/v1/workflows; GET /api/v1/workflows; GET /api/v1/workflows/{id}; PUT /api/v1/workflows/{id}; DELETE /api/v1/workflows/{id}	Implemented per backend architecture; maps directly to list, create, edit, delete actions in UI 
Execute workflow from list/editor	POST /api/v1/workflows/{workflow_id}/execute	Implemented; UI Start buttons call this and navigate to Run console 
Run console status polling	GET /api/v1/workflows/executions/{execution_id}/status	Implemented; console polls and renders phases/retries in real time 
Results list/detail	GET /api/v1/results; GET /api/v1/results/{result_id}	Implemented; provides result data to list and detail pages 
Selector Lab: read/update/publish selector profiles	(No explicit endpoints defined)	Gap; proposed endpoints in Appendix A for provider selector CRUD and test harness 
Transcript analysis execution	scripts/youtube_transcript.py (gap flagged); Task type “youtube_transcript” in models	Partial; integrated plan flags scripts dir missing; UI should ship but mark as needs script/backend hookup 
Queue discipline caps (max concurrent, sleeps)	Enforced by backend agent/engine per PRD	Present as behavioral contract; UI exposes settings and documents limits 
Obsidian export/mover controls	Local Node daemon and script launcher outside FastAPI	Out of API scope; UI surfaces status via local integration patterns per mover docs 
Notes on fidelity and provenance
All run-start forms bind selector profile version, workflow version, mode, concurrency, retries, and output destination so executions are traceable and reproducible with research_tree.json produced on finalize, satisfying PRD requirements.

Results detail preserves YAML frontmatter fields exactly (title, ai_summary, ai_sources, username, generator/version, tags, batch/UUID) and exposes artifacts to maintain downstream Obsidian indexing and audit chains.

Confirmed correlations
Workflow CRUD, execution, status, and results retrieval are fully covered by current backend endpoints and align cleanly with the UI Workflows, Run console, and Results pages as designed above.

Queue discipline, research modes, and research tree artifact expectations are backend behaviors that the UI enforces and displays, ensuring correct operator expectations and audit integrity.

Appendix A — Proposed backend/API additions to support UI completeness
Selector profiles API: GET /api/v1/providers; GET/PUT /api/v1/providers/{provider}/selectors; POST /api/v1/providers/{provider}/selectors:test to back the Selectors Lab editor and sandbox test harness with snapshots and pass/fail.

Transcript execution API: POST /api/v1/transcript/execute with body {url|transcript, prompt_profile} and GET /api/v1/transcript/{id}/status to formalize Transcript Analysis end-to-end and remove scripts gap flagged in the integrated plan .

Artifacts API: GET /api/v1/runs/{id}/artifacts to standardize research_tree.json and logs retrieval for the Results detail pane rather than ad hoc file paths.

Queue/pacing config API: GET/PUT /api/v1/settings/queue to expose max concurrent deep research runs and inter-job sleep defaults now set behaviorally, enabling Settings page control.

Obsidian mover status API: Local bridge (e.g., Hono local server) exposing GET /mover/status, POST /mover/{start|stop|restart}, and GET /mover/logs to wire the Settings page without overloading FastAPI scope, matching mover/launcher lifecycle semantics .

Appendix B — Implementation and reconciliation notes
Scripts directory gap: The integrated plan calls out missing automation scripts despite directory scaffolding; prioritize deep_research.py and youtube_transcript.py implementations referenced by the backend architecture doc to unlock Transcript and robust Deep Research automation.

Obsidian vault path mismatch: Reconcile PRD’s path variants into a single canonical VAULT_PATH and surface it in Settings; update mover/launcher defaults accordingly to prevent silent failures.

Frontend tech consolidation: Finalize Next.js/shadcn or SvelteKit choice to reduce drift noted in PRD and ensure component parity; ReactFlow performance issues must be resolved per integrated plan before scaling node editor complexity.

Selector registry source of truth: Place the Gemini/Canvas/Deep Research/YTT selector list in a central config artifact and bind runs to a selector profile version to uphold reproducibility under DOM or locale shifts