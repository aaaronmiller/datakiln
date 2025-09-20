A unified, comprehensive PRD is compiled below that consolidates all versions and related docs without condensing, preserving every requirement, selector, workflow, and rationale across the provided materials and the base upstream repository scope.[1][2]

This PRD focuses on the WHAT and the WHY of how the project operates, covering features, architecture, research modes, DOM automation, Chrome extension integration, Obsidian flows, technology choices, risks, and deliverables drawn from the documents and source references.[2][1]

### Vision and goals (WHY)
- The project delivers a powerful, locally-run, user-configurable automation platform for AI-driven research and data processing, enabling power users to visually build, modify, and chain complex workflows that interact with live web pages and large language models using transparent, extensible logic under full user control.[1]
- The immediate product goal is to create a robust, extensible research assistant that leverages Gemini’s Deep Research and Canvas web interfaces through browser automation, supports batch and hybrid research workflows, and integrates natively with Obsidian and a YouTube transcript pipeline to produce high-fidelity, auditable outputs.[1]

### Repository context and starting points (WHY/WHAT)
- Upstream baseline: Open Gemini Deep Research by eRuaro provides a Python-based deep research agent with defined modes, concurrency, progress tracking, and a research tree, forming the core functionality to extend via UI, DOM automation, and integrations.[2]
- The working fork is at aaaronmiller/open-gemini-deep-research, and this PRD references it as the target for new features and branch work, preserving and extending features while adding UI, automation, and integrations specified herein.[1]

### Problem framing and tech choice rationale (WHY)
- Historical front-end guidance referenced Create React App, but CRA deprecation and incompatibilities make it unreliable, thus the PRD adopts modern alternatives like Vite, Next.js, or SvelteKit, aligning with the user’s preferred stack and ecosystem for performance and dev experience.[3]
- The WHY: selecting Svelte/Hono/Bun or Next.js/shadcn avoids CRA failures and accelerates delivery while supporting better bundling, DX, and dark-mode UI consistency, directly addressing the issues documented with CRA and modern React 19 incompatibilities.[3]

***

### Core features (WHAT)
- Modern Web UI: A Next.js and shadcn/ui front end for a user-friendly interface to orchestrate all research tasks, with explicit toggles for research modes, batch operations, and workflow selection in dark mode as preferred, with extensibility for new agent endpoints and prompts.[1]
- Browser-Automated Research: Playwright-powered control of Gemini’s Canvas and Deep Research UIs, including mode selection, input entry, file attach, “Start research,” and copy/export behaviors under resilient selectors with retries and pacing.[1]
- Multi-Workflow Support: Deep Research with fast/balanced/comprehensive modes and a YouTube Transcript Analysis pathway that fetches transcripts and uses structured prompts to generate comprehensive analyses and downstream research inputs.[1]
- Obsidian Integration: All research reports and chat captures are saved to an Obsidian vault as Markdown with YAML frontmatter, including tags, traceability, and file mover automation for seamless archival and retrieval.[4][1]
- AI Chat Exporter: A Chrome extension captures chat logs across multiple AI sites (Gemini, ChatGPT, Claude, Perplexity, Grok, Kimi, DeepSeek, Ernie) into clean Markdown with enriched YAML and metadata for downstream vault processing.[4]

### Research modes and process (WHAT)
- Fast Mode: Quick surface scan with up to 3 concurrent queries, no recursion, typical 2–3 follow-ups per query, 1–3 minutes for time-sensitive queries and initial exploration.[2][1]
- Balanced Mode: Default moderate depth/breadth with up to 7 concurrent queries, 3–5 follow-ups per query, 3–6 minutes, exploring main concepts and immediate relationships.[2][1]
- Comprehensive Mode: Exhaustive deep research with recursive sub-queries, 5–7 follow-ups, exploring primary, secondary, tertiary relationships, including counter-arguments, 5–12 minutes.[2][1]
- End-to-end flow includes query analysis, semantic de-duplication of generated queries, a research tree with UUIDs, recursive exploration, progress tracking, and 3000+ word report generation with inline citations and structured synthesis.[2][1]

### Architecture overview (WHAT)
- Backend (Python + FastAPI): Central “brain” orchestrating workflow definitions, execution, automation calls, and persistence, featuring a workflow engine, Playwright browser controller, and RESTful endpoints for CRUD and run control.[1]
- Frontend (UI Shell): Initially described as React/CRA/Tailwind SPA with dashboard, workflow editor, and status monitor, but practically moving to Next.js/shadcn or SvelteKit with dark mode to avoid CRA pitfalls while retaining all planned UI affordances.[3][1]
- Capture Tools: Chrome extension and a Node.js background daemon (chokidar) watch for captured chat files and move them into the Obsidian vault with notifications and conflict-safe file handling.[4][1]

### Workflow engine concepts (WHAT)
- Workflows and Nodes: Users define nodes with DOM selectors, prompts, and logic, chaining them into reusable workflows with explicit data flow and saved configurations for repeatability and sharing across tasks.[1]
- Data Flow and Orchestration: The engine passes intermediate artifacts and context between nodes with logging, retry logic, versioning, and YAML/Markdown outputs to ensure full traceability during complex, multi-stage research runs.[1]

### UI/UX requirements (WHAT)
- Dashboard and Editor: List saved workflows, edit nodes, set selectors and prompts, visualize chains, initiate runs, and view real-time status with queued jobs and progress bars for batch/bulk use cases in a minimal, dark-mode UI.[1]
- Visualization: Research tree/state visualization JSON with collapsible views and job/phase tags to reflect parent-child relationships, completion, and learnings as part of the progress monitor and artifact audit.[1]

***

### DOM automation and selectors (WHAT)
- Canvas and Deep Research: Mode selectors include label detection for “Canvas” and “Deep Research,” input areas are contenteditable fields, and actions cover add files, send/submit, “Start research,” copy, and share for downstream export.[1]
- Selector map (high level):  
  - Prompt input: [contenteditable='true'][1]
  - Canvas label: div.label:has-text("Canvas")[1]
  - Deep Research label: div.label:has-text("Deep Research")[1]
  - Add Files: mat-icon[fonticon="add_2"][1]
  - Submit: mat-icon[fonticon="send"][1]
  - Start research: span.mdc-button__label:has-text("Start research")[1]
  - Copy output: span.mat-mdc-list-item-title:has-text("Copy")[1]
  - Share: mat-icon[data-test-id="share-icon"][1]
- YT transcript copy selector: span#copy-span on youtubetotranscript.com/transcript for pipeline integration and bulk operations.[1]

### Chrome extension capture (WHAT)
- Providers and selectors: Robust mapping across platforms to locate the main conversation container and fallback gracefully to body, supporting OpenAI, Perplexity, Claude, Gemini, Grok, Kimi, DeepSeek, and Ernie, with a default generic selector set.[4]
- Content extraction: Converts HTML to Markdown with code block cleanup, heading normalization, list conversion, and removal of residual tags, then packages enriched YAML frontmatter and extraction metadata for file save.[4]
- Background script: Ensures content script injection, sends capture message, retries with direct execution fallback, and downloads the capture file deterministically to support the mover daemon flow without prompts.[4]

### Obsidian integration and mover daemon (WHAT)
- Vault path and YAML: Reports and captures are saved as Markdown with YAML frontmatter tailored for Obsidian parsing, including title, summary, sources, username, generator/version, and trace tags for robust auditing.[4][1]
- ai-vault-mover.js: A chokidar-based Node daemon watches Downloads and subfolders for ai-session-*.md patterns, deconflicts names, moves to configured vault path, cleans empty directories, logs activity, and posts OS notifications on macOS/Linux.[4]
- Launcher script: A bash launcher manages dependencies via bun/pnpm/yarn/npm, forks to background with nohup, monitors PID/logs, and provides start/stop/status/restart commands with safety checks and notifications for reliability.[4]

***

### Output, logs, and artifacts (WHAT)
- Markdown + YAML: All outputs include consistent YAML frontmatter with query tags, versioning, and timestamping, plus optional attachment of HTML sources or sidecar files for deep provenance and reproducibility.[1]
- Research tree: The complete tree structure is dumped to research_tree.json at finalization to support later analysis, visualization, and post-hoc QA reviews of the agent’s exploration path.[2][1]
- Persistent logging: Full query/result audit logs with retries, error captures, version history, and batch/job tagging to support investigation, regression tests, and reproducible runs under evolving UI selectors.[1]

### Hybrid API + browser strategy and alternatives (WHAT/WHY)
- Hybrid approach: Prefer browser automation for Canvas/Deep Research to maximize context and artifact handling while permitting hybrid API calls when appropriate for speed or reliability, as explicitly recommended by the PRD context.[1]
- Perplexity variant: Provide an alternative deep research path powered by Perplexity as an option in the UI, maintaining selector/config modularity so switching providers is a slot-in operation for experimentation and parity testing.[1]

### YouTube transcript pipeline (WHAT)
- Transcript analysis: Integrate a transcript-first flow that extracts the video’s workable structures, workflows, patterns, prompts, and principles, producing article-quality synthesis with appendices and genre-aware visuals when needed.[1]
- Downstream coupling: After transcript analysis, generate questions from extracted workflows and pass them into deep research to develop a more comprehensive, linked analysis that unifies both pipelines in single- and double-path options.[1]

***

### Non-functional requirements (WHAT/WHY)
- Reliability and resilience: DOM selectors are configurable in one place, with a test phase and retries to handle Gemini UI changes and localization, pinned browser and dependency versions in devcontainer/Docker for determinism, and strict logging.[1]
- Performance and scalability: Concurrency tuned per mode, queueing to enforce limits (e.g., 3 at a time for Deep Research), and pacing between batch jobs to avoid rate limits with recovery and failover strategies.[1]
- Security and secrets: Secrets reside in .env or injected configs, honoring do-not-touch guarantees and secret preservation rules, while keeping the whole process local and observable for power-user transparency.[1]

### Configuration and environment (WHAT)
- Execution environment: Local macOS with Playwright and Python, Chrome/Chromium available, VS Code/devcontainer supported, and user notifications via osascript or notify-send integrated into each pipeline stage.[1]
- Obsidian vault specifics: Store outputs in the configured vault path and ensure YAML parsing semantics align with installed Obsidian plugins, with username and generator/version fields set per PRD guidance.[1]

### Deliverables and success criteria (WHAT)
- UI deliverable: Clean, documented HTML/JS front end (Next.js/shadcn or SvelteKit) with dark mode, batch controls, mode toggles, selectors mapping, job queue views, and export/download actions surfaced prominently.[1]
- Automation deliverable: Playwright/Puppeteer scripts with docstrings for each selector and artifact stage, research tree maintenance, YAML/Markdown outputs, and robust logs with retry/versioning semantics.[1]
- Integration deliverable: Obsidian-ready files, Chrome extension compatibility for YouTube transcript and notification flows, and minimal deployment docs for Docker/devcontainer/bash to accelerate adoption.[1]

***

### Risks and open questions (WHY)
- UI drift risk: Gemini DOM changes can break selectors; mitigations include centralized selector config, selector tests, and rapid update processes with pinned browser/deps in containerized environments.[1]
- Rate limits and batch caps: Heavy parallel runs and long sessions may stress Deep Research and Canvas; queueing, retries, and graceful backoff are required to sustain large batches and meet user SLAs.[1]

### Competitive landscape and patterns (WHY)
- The PRD positions against general automation platforms like Zapier/n8n by emphasizing local transparency, visual workflow editing, DOM-first control, and reusability, targeting power users who need full-fidelity customization.[1]
- Broader OSS patterns show “open deep research” implementations using configurable agents, structured outputs, and hybrid search/LLM stacks, reinforcing the project’s emphasis on modularity and provider-agnostic design.[5][6]

### Safety notes for OS interactions (WHY)
- The mover and launcher scripts write to /tmp logs, fork to background, and issue notifications; guardrails include PID checks, stale-PID cleanup, dependency verification, and bounded runtime auto-restart to avoid orphan processes or log bloat.[4]
- Negative interactions to consider include incorrect VAULT_PATH causing exit, missing package managers, permission issues in Downloads, or killing unrelated PIDs; scripts explicitly check for these and provide actionable error messages and notifications.[4]

***

### Upstream baseline details to inherit (WHAT)
- Mode definitions, research process, concurrency characteristics, research tree semantics, and reporting guarantees (e.g., 3000+ word minimum, citations) are part of the baseline to preserve during feature expansion and UI integration.[2]
- Setup paths include Python 3.9+, .env with GEMINI_KEY, optional devcontainer, and CLI usage with mode, num-queries, and optional learnings parameters, which remain available beneath the UI layer and automation flows.[2]

### Required selectors and user-specific config (WHAT)
- Centralize selectors and user config: one Python/config file mapping all DOM entries, output labeling, and Obsidian YAML templating as a Jinja2 block, ensuring rapid updates when UI or localization shifts occur.[1]
- Maintain job tags, UUIDs, batch identifiers, and timestamps in all buffers and final artifacts so errors can be traced back to specific UI-origin labels or selector actions in the wrapper.[1]

### Prompts and structured analysis directives (WHAT)
- The transcript-analysis “gem” specifies a multi-phase analysis protocol with Mermaid mind map first, canonical definitions, algorithmic descriptions, pattern benefit tagging, prompt cataloging, QA gates, and benchmarking, which should be honored in the transcript mode.[1]
- The deliverable specification for transcript analysis includes executive summary, topic-based body sections, appendices for verbatim and constructed prompts, an evaluation checklist, and a benchmark rubric to ensure consistent evaluability.[1]

***

### Implementation notes and tactics (WHAT)
- UI tech: Prefer Next.js/shadcn or SvelteKit with dark mode to present mode toggles, batch input, live status, export buttons, and selector mapping panels, while minimizing bespoke CSS to reduce surface area for visual regressions.[3][1]
- Automation: Implement Playwright scripts with resilient waits and verification for mode selection, input, start actions, and copy/share paths, with per-action logging, retry policy, and optional snapshots for error triage in headless runs.[1]
- Storage: Persist research_tree.json per run, maintain a structured logs directory with job IDs, and write final Markdown to the configured Obsidian path with YAML including title, ai_summary, ai_sources, username, and generator/version.[1]

### Future work (WHAT)
- Drag-and-drop workflow builder, direct page content parsing nodes, community workflow library exchange, RBAC and user switching for long-running jobs, and scheduled triggers compatible with tools like n8n/Zapier/cron are identified future directions.[1]
- Plugin slots for non-text artifacts and multi-provider agent lists should evolve to cover image/table/zipped outputs and additional endpoints while preserving a stable front-end toggle and selector configuration panel.[1]

***

### Acceptance criteria (WHY)
- The system must run end-to-end with UI-driven research runs, DOM-automated Gemini sessions, robust logs, research tree persistence, Obsidian file outputs, and Chrome extension capture feeding the vault mover in background without manual intervention.[4][1]
- Batch runs in all modes must complete with consistent YAML frontmatter and job/batch tags, and the transcript pipeline must be able to generate downstream questions and pass them into deep research for deeper linked analyses.[1]

### Out-of-scope clarifications (WHY)
- The PRD does not require cloud-hosted, multi-tenant deployment or closed-source integration bundles, instead prioritizing local control, transparency, and modular addition of endpoints as user-configured “slots” for experimentation.[1]
- While UI initially referenced CRA, the PRD explicitly moves to modern stacks to avoid known failures, keeping the front-end minimal but extensible and aligned with the broader goals of power-user transparency and rapid iteration.[3]

***

### References and grounding (WHY)
- Upstream README and “How It Works” content establish definitions for modes, processes, and output guarantees that this PRD preserves as the core behavioral contract of the system.[2]
- This PRD consolidates project-specific PRD text, DOM selector maps, transcript protocol directives, Obsidian integration, Chrome extension code, and mover/launcher scripts from the provided documents without excluding content.[4][1]
