---
date: 2026-06-21 03:29:26 PDT
ver: 1.0.0
author: codex
model: gpt-5-codex
tags: [datakiln, handoff, workflow, executor, dom, testing, artifacts, roadmap]
---
# Project Handoff

## Current State

Datakiln is back on track at the schema/executor layer. The core backend can now normalize GUI workflows, execute typed workflow schema objects, pass artifacts between nodes, export outputs, and persist run status through the API service path.

The repo was clean and aligned with `origin/main` before this handoff was written. Latest pushed code commits at that point:

- `590bb13` Harden live DOM workflow execution
- `f51dec8` Stabilize workflow schema and executor

## Product Goal

The target product is a workflow builder where users can assemble arbitrary-site automations from:

- Atoms: single DOM/API/data/code actions.
- Molecules: reusable groups of atoms.
- Substances: larger reusable workflow groups made from molecules.

The executor must process those schema objects, run the browser/API/code actions, pass outputs through the graph, and produce durable artifacts. The YouTube transcript and Deep Research workflows are reference examples, not necessarily final working templates.

## Implemented

- `backend/app/models/workflow_schema.py` defines the typed workflow schema, node registry, validation, and executable node definitions.
- `backend/dag_executor.py` runs schema-driven DAG workflows, normalizes legacy GUI workflow shapes, handles default DOM sequences, supports fallback selectors, extracts YouTube IDs, exports artifacts, and exposes a compatibility `DAGExecutor` facade.
- `backend/app/services/workflow_service.py` now uses the schema executor path, stores artifacts, persists run status/results, and exposes API-consistent execution state.
- GUI workflow shapes can be normalized into schema workflows rather than bypassing the schema.
- Inline data source, YouTube source, code transform, generic DOM action, Gemini Deep Research DOM node, Perplexity Pro Search DOM node, and artifact export nodes are registered.
- DOM execution can run dry-run plans or live Playwright actions.
- Live DOM execution supports supplied pages, storage state files, and persistent browser profiles.
- DOM blocker detection reports structured blocked states for Cloudflare, captcha/hCaptcha/reCAPTCHA, access denied/unusual traffic, and auth-required pages.
- Old context portal material was mined before cleanup and summarized in `early-directives.md`.
- Live selector findings were written to `live-dom-selector-audit.md`.

## Verified

These checks passed before this handoff:

```bash
python -m pytest backend/tests -q
python -m pytest backend/tests/test_schema_executor_contract.py -q
cd frontend && npm test -- --run
cd frontend && npm run type-check
cd frontend && npm run build
python /home/cheta/code/agents/skills/webapp-testing/scripts/with_server.py --server "cd backend && uvicorn app.main:app --host 127.0.0.1 --port 8000" --port 8000 --timeout 45 -- python scripts/smoke_workflow_api.py
```

Observed results:

- Backend: `94 passed`, warnings only.
- Schema contract subset: `8 passed`.
- Frontend tests: `99 passed` across `8` files.
- Frontend type-check: passed.
- Frontend build: passed with a non-failing chunk-size warning.
- API smoke: passed. It executed a source to transform to export pipeline and wrote `/tmp/datakiln-api-smoke-exports/api-output.md`.
- UI smoke: workflow editor loaded, AI DOM node add worked, sample workflow loaded, dashboard loaded.

## Live DOM Findings

Live probes found current usable selectors:

- Gemini prompt input: `rich-textarea [contenteditable='true']`
- Gemini send button: `button[aria-label*='Send']`
- Perplexity prompt input: `[contenteditable='true']`
- Perplexity submit button: `button[aria-label*='Submit']`

Stale or unreliable selectors:

- Gemini: `input[name='q']`, `input[type='text']`, `input[value='Google Search']`
- Perplexity primary old values: `textarea[data-testid='search-input']`, `button[data-testid='send-button']`
- `youtubetranscript.com/transcript?...` returned `404`.
- `youtubetotranscript.com/transcript?video_id=...` hit Cloudflare in headless mode.

Reports:

- `live-dom-selector-audit.md`
- `/tmp/datakiln-live-dom-selector-report.json`
- `/tmp/datakiln-live-dom-interaction-report.json`

## Auth And Headless Model

The executor supports legitimate authenticated automation, not anti-bot evasion:

- `dom_dry_run=false` enables managed live Playwright execution.
- `storage_state_path` can load a saved authenticated state.
- `user_data_dir` can use a persistent browser profile.
- A caller can supply an existing Playwright `page`.
- Metadata reports auth state as `none`, `storage_state`, `persistent_profile`, or `supplied_page`.
- Action pacing can be controlled with `dom_action_delay_ms` or node-level `delay_before_ms`.
- If a blocker appears, the executor returns `blocked=True` with a blocker kind/message rather than looping or attempting stealth bypass.

## Functional Now

- Schema objects can be generated and executed by the backend.
- Artifacts can flow from source nodes through transform nodes into export nodes.
- The API execution endpoint can run a simple pipeline and expose status/results.
- The frontend workflow creator is operational enough to load and create workflow graphs that map into the backend execution contract.
- Headless execution is supported for dry-run and live DOM mode when the target site allows it and required authentication is available.

## Not Fully Proven Yet

- End-to-end authenticated live Gemini Deep Research run has not been proven against a real logged-in user session.
- End-to-end authenticated live Perplexity Pro Search run has not been proven against a real logged-in user session.
- The exact final Deep Research output contract needs to be nailed down into durable artifacts such as markdown plus structured JSON.
- The arbitrary-site atom to molecule to substance builder UX is not complete as a first-class composition system. The backend schema supports the direction, but the frontend still needs stronger grouping, reusable pattern save/load, and parameter binding.
- Browser targets with Cloudflare/captcha/bot checks may still block headless execution. Current behavior is detection/reporting, not bypass.
- GitHub reported dependency vulnerabilities on push: 306 total, including 8 critical and 98 high. That has not been remediated.

## Remaining Work

1. Add an auth-state capture flow.
   - Create a small script or UI action that opens headed Playwright, lets the user log in, saves `storage_state_path`, and documents where to point workflow runs.

2. Prove one live authenticated provider workflow.
   - Run Gemini Deep Research or Perplexity Pro Search with real auth state.
   - Verify prompt submission, completion wait, content extraction, artifact creation, and API status propagation.

3. Formalize artifacts for Deep Research.
   - Define required outputs: raw extracted text, normalized markdown, source list, structured research JSON, and run metadata.
   - Add contract tests for those artifacts.

4. Complete molecule/substance composition.
   - Add reusable workflow fragments with typed inputs/outputs.
   - Allow the GUI to save/load grouped node patterns.
   - Validate that compiled groups produce the same schema contract the executor already accepts.

5. Harden selector registry.
   - Track selector version, fallback used, last success, and last failure reason.
   - Prefer site-specific selector bundles over hardcoded one-off template logic.

6. Address dependency vulnerabilities.
   - Audit npm and Python dependency reports.
   - Upgrade narrow dependencies first.
   - Avoid framework or package-manager churn unless required by the vulnerability fix.

7. Improve durable run storage.
   - Current service path is API-consistent, but long-term run/result storage should move to a durable backend rather than process-local state.

## Key Files

- `backend/app/models/workflow_schema.py`
- `backend/dag_executor.py`
- `backend/app/services/workflow_service.py`
- `backend/tests/test_schema_executor_contract.py`
- `scripts/smoke_workflow_api.py`
- `scripts/probe_live_dom_selectors.py`
- `scripts/probe_live_dom_interactions.py`
- `early-directives.md`
- `live-dom-selector-audit.md`

## Next Best Action

Build the auth-state capture flow, then run one real authenticated provider workflow end to end. That is the shortest path from "schema/executor works in tests" to "the product can perform the reference use case against a real target site."
