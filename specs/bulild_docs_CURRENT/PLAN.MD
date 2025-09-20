
Here is a complete inventory of workflows, selectors, prompts, configs, file conventions, and other concrete elements extracted from the provided attachments to use directly when generating the implementation plan later.[1][2]
This is collection-only, not a plan or condensation, and it preserves all actionable components, structures, and parameters for the project’s next steps.[2][1]

### Workflows

- Deep Research engine with three modes that define breadth/depth and concurrency: Fast, Balanced, Comprehensive, including recursion and counter-arguments in the comprehensive path.[2]
- Research process pipeline: query analysis, unique query generation with semantic de-duplication, research tree building with UUIDs, recursive deep research (breadth reduction at depth), and minimum 3000-word report synthesis with citations.[2]
- Browser-automated Gemini flows for Canvas and Deep Research: mode selection, prompt entry, optional file attach, submit/send, delayed “Start research,” copy/share extraction, and downstream export.[2]
- YouTube transcript analysis flow: fetch transcript via a transcript tool pathway, run the advanced “Gemini Gem” transcript-analysis prompt, then optionally pass generated questions into deep research for a linked analysis (single-path and dual-path variants).[2]
- Chrome extension capture workflow: inject content script, detect provider, find conversation container with a selector map, extract HTML, convert to Markdown, generate YAML frontmatter, download to Downloads for the mover daemon to process.[1]
- Obsidian mover daemon flow: watch Downloads and subfolders for ai-session-*.md files, move with deconflict naming into the configured vault path, send OS notifications, and clean up empty directories; auto-restart after max runtime.[1]
- UI-centric workflow CRUD and run execution: dashboard for listing workflows, editor for node configuration (selectors, prompts), and status monitor for progress, errors, and live job tracing.[2]
- Hybrid research options and provider slotting: keep browser-automation for Gemini front-and-center while enabling alternate deep research via Perplexity and a final summarization model choice, with prompts and selectors stored as configurable assets.[2]
- Batch/queue discipline: enforce at-most-three parallel Deep Research tasks, queue remainder, add sleeps between jobs, and preserve error/retry logs with batch and UUID tagging in all artifacts.[2]

### Research mode parameters

- Fast: up to 3 concurrent queries, no recursion, typically 2–3 follow-ups per query, ~1–3 minutes targeted latency.[2]
- Balanced: up to 7 concurrent queries, no recursion, 3–5 follow-ups per query, ~3–6 minutes and default recommendation.[2]
- Comprehensive: 5 initial queries with recursive deepening, 5–7 follow-ups, exploring primary/secondary/tertiary relationships and counter-arguments, ~5–12 minutes.[2]

### Research tree and persistence

- Data structure: ResearchProgress with unique IDs per query, parent-child relationships, status, depth, and “learnings” aggregation per node.[2]
- Artifact: entire tree saved to research_tree.json during final report generation for later visualization and audit.[2]

### DOM automation selectors (Gemini/Canvas/Deep Research/YTT)

- Gemini prompt input: [contenteditable='true'].[2]
- Canvas mode selector: div.label:has-text("Canvas").[2]
- Deep Research selector: div.label:has-text("Deep Research").[2]
- Add files: mat-icon[fonticon="add_2"].[2]
- Submit/send: mat-icon[fonticon="send"].[2]
- Start research: span.mdc-button__label:has-text("Start research").[2]
- Copy output: span.mat-mdc-list-item-title:has-text("Copy").[2]
- Share: mat-icon[data-test-id="share-icon"].[2]
- YTT transcript copy: span#copy-span on youtubetotranscript.com/transcript.[2]

### Chrome extension — providers and selectors

- Provider detection map by URL regex with per-site selector lists: OpenAI (chat.openai.com), Perplexity (perplexity.ai), Claude (claude.ai), Gemini (gemini.google.com), Grok (grok.x.ai), Kimi (kimi), DeepSeek (deepseek), Ernie (ernie), with a generic fallback to .main-chat-container, main, body.[1]
- Extraction routine: pick first selector that yields >50 chars of text, otherwise fallback to body; convert outerHTML to Markdown via an htmlToMarkdown function that normalizes pre/code, br, li, headings, paragraphs, and strips remaining tags.[1]
- Filename pattern: ai-session-${service}-${YYYY-MM-DDTHH-MM-SS}.md with colons replaced and millis removed for deterministic paths.[1]
- YAML frontmatter fields in export: date, provider, session_url, chat_selector, extraction_time, word_count, char_count, followed by “Extraction Metadata” section listing Provider, URL, Selector Used, Captured, and Content Length.[1]
- Messaging and download: background injects content.js, sends “extract_ai_chat”, falls back to executeScript if messaging fails, then downloads Blob via chrome.downloads with saveAs=false and conflictAction='uniquify'.[1]

### Obsidian mover daemon and launcher

- package.json: ai-vault-mover with chokidar dependency and scripts start/daemon to run ai-vault-mover.js.[1]
- ai-vault-mover.js configuration: APP_NAME, DOWNLOADS_DIR (~/Downloads), VAULT_PATH (Documents/ChetasVault/ai_transcripts — update path), FILE_PATTERN /^ai-session-.*.md$/, CHECK_INTERVAL seconds, MAX_RUNTIME_HOURS auto-restart, LOG_FILE /tmp/${APP_NAME}.log, PID_FILE /tmp/${APP_NAME}.pid.[1]
- Watch paths: Downloads, Downloads/ChetasVault, Downloads/ai-chats; ignore dotfiles; depth 2; awaitWriteFinish enabled; on add matching pattern, delay 500ms, move file with unique naming if conflict and notify success/failure.[1]
- PID handling and single-instance guard: checkIfRunning uses PID file and kill -0; removes stale PID; ensures VAULT_PATH exists with fatal exit if missing; writes PID and registers signal/exception handlers.[1]
- Notifications: osascript on macOS or notify-send on Linux for start, move events, errors, and auto-restart messages.[1]
- Background mode behavior: forks when launched in GUI contexts to run as BACKGROUND_MODE using child_process spawn and unref.[1]
- ai_vault_launcher.sh: start/stop/status/restart controls, PID/log paths in /tmp, dependency installer choosing bun/pnpm/yarn/npm, nohup launch to background, wait-for-daemon with MAX_STARTUP_WAIT, and notify integration.[1]

### Outputs and YAML conventions

- Research reports: Markdown with YAML frontmatter including title, ai_summary, ai_sources, username, generator/version, tags, and batch/UUID associations where applicable for provenance and audit.[2]
- Minimum report characteristics: coherent narrative of at least 3000 words with inline citations, organized by relevance/relationship, optionally adding scenarios and analogies while maintaining factual accuracy.[2]
- Tree/state artifacts: research_tree.json stored at finalization to enable retrospective visualization and QA of traversal and learnings aggregation.[2]

### Configuration, environment, and secrets

- Runtime environment: Local macOS with Python 3.9+, Playwright-controlled Chrome/Chromium, and VS Code/devcontainer or Docker-based setup for determinism and portability.[2]
- Obsidian vault configuration: target path noted as ~/documents/ChetaValut in PRD context and Documents/ChetasVault/ai_transcripts in mover script, which should be reconciled during configuration.[2]
- Secrets and API keys: Gemini API key injected into .env or secrets store; variable name GEMINI_API_KEY referenced for default conventions and simplicity.[2]

### Scheduling, queueing, and batch constraints

- Queue discipline: cap Deep Research to three concurrent automations, queue remainder, and insert sleeps between batch jobs to mitigate rate/batch caps with retry/failover.[2]
- Delay/scheduling requests: ability to schedule injections over time windows (e.g., every N hours), including reading queued tasks from a Downloads/to-do folder to trigger configured workflows.[2]

### UI components and behaviors

- Dashboard: list/manage saved workflows with mode toggles, batch inputs, and quick actions for Start, Pause, Cancel, Export, Download artifacts, and version/license/footer references.[2]
- Workflow Editor: form-based node builder where users define selectors, prompts, and chaining, with visualization of data flow and storage of reusable configurations.[2]
- Status Monitor: real-time progress with job tags, phases, queue state, error/retry messages, and JSON research tree visualization for traceability.[2]

### Prompts, templates, and analysis directives

- Gemini “Gem” for transcript_analysis_and_extraction: a structured XML system prompt specifying goals, quality standards, output formatting, research methodology, a seven-phase analysis protocol, content analysis requirements, deliverable specification, and input data append section for transcripts.[2]
- Key elements include a mandatory Phase 1 Mermaid mind map, canonical definitions, algorithmic/state-machine descriptions, pattern benefit tagging, prompt cataloging with verbatim/synthesized splits, methodological defense, evaluation checklist, benchmark rubric, and article assembly with meta-learning.[2]
- Additional enforcement directives: always include Obsidian-style header block, maintain secret preservation, escape spaces in Bash, prefer macOS defaults, and analyze other approaches and OS interaction risks when doing research or command design.[2]

### Provider and endpoint slotting concepts

- Endpoints taxonomy: AI research endpoints, consolidation endpoints, task-determination endpoints, website-bounce endpoint (e.g., YouTube transcript tool), with interchangeable DOM definitions for textarea/input/submit/attach and optional deep research “start” control.[2]
- Extensibility: name and save endpoint definitions, support add/edit/delete/testing in UI, and enable branching/recursion and multi-model bouncing using configured endpoints.[2]

### Hybrid and alternate research paths

- Hybrid approach: browser-first (Gemini Canvas/Deep Research) with optional API usage for speed or reliability, while keeping artifact handling and large context benefits of DOM automation.[2]
- Perplexity alternative: define workflows to use Perplexity for deep research, or run Gemini and Perplexity in parallel and summarize best answers, with a selectable final model for summarization and prompt modularity.[2]

### File, naming, and directory conventions

- Chrome capture files: ai-session-${service}-${ISO-with-dashes}.md landing in Downloads, then moved to vault with unique naming if conflicts present.[1]
- Logs and PIDs: /tmp/ai-vault-mover.log and /tmp/ai-vault-mover.pid with a separate /tmp/${APP_NAME}-daemon.log for launcher-driven nohup outputs.[1]
- Watch roots: ~/Downloads plus common subfolders like ChetasVault or ai-chats, with configurable depth and awaitWriteFinish settings.[1]

### Error handling, retries, and notifications

- Research engine: retry logic, progress tracking, error capture with per-query/tag versioning, and full audit logs for reproducibility and regression testing.[2]
- Extension/mover: content script injection fallback, direct executeScript extraction if messaging fails, move failures reported via OS notifications, and daemon auto-restart after configured runtime.[1]

### Known mismatches and to-reconcile items

- Obsidian vault path mismatch: PRD references ~/documents/ChetaValut while mover uses Documents/ChetasVault/ai_transcripts; a single canonical path should be selected for consistent behavior.[2]
- UI tech references: PRD mentions a React/CRA/Tailwind SPA and a Next.js/shadcn UI; consolidation into a single modern stack is expected during planning while retaining all controls/toggles.[2]

### Direct artifacts to include in repo (verbatim sources)

- Selectors registry: the Gemini/Canvas/Deep Research/YTT selector list provided above should be placed into a central config artifact for quick updates and localization handling.[2]
- Extension sources: content.js, background.js logic, and htmlToMarkdown transform behavior are concrete, production-ready starting points for capture integration with Obsidian mover.[1]
- Mover/launcher: ai-vault-mover.js with its configs, watch paths, move/deconflict logic, and ai_vault_launcher.sh control script are ready to be included with only VAULT_PATH reconciliation required.[1]

### Data points for plan inputs

- Mode caps and timings, recursion rules, and breadth scaling at depth for comprehensive mode.[2]
- Required outputs: minimum 3000-word reports, research_tree.json, and Markdown/YAML with frontmatter fields including username and generator/version.[2]
- Message flows and file patterns: extension messaging, download options, file naming regexes, and mover pattern matching.[1]
- OS interactions: notify via osascript/notify-send, PID safety, stale PID cleanup, and fork-to-background for daemonization.[1]
- Security/secrets: GEMINI_API_KEY in .env or secrets file and secret preservation directives in prompt standards.[2]
