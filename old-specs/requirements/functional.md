---
Type: PRD | Status: Active | Completion: 90%
---

# Functional Requirements

## Core Features

### Modern Web UI
- Next.js and shadcn/ui front end for user-friendly interface
- Orchestrate all research tasks with explicit toggles for research modes
- Batch operations and workflow selection in dark mode
- Extensibility for new agent endpoints and prompts

### Browser-Automated Research
- Playwright-powered control of Gemini's Canvas and Deep Research UIs
- Mode selection, input entry, file attachment, "Start research," and copy/export behaviors
- Resilient selectors with retries and pacing

### Multi-Workflow Support
- Deep Research with fast/balanced/comprehensive modes
- YouTube Transcript Analysis pathway for comprehensive analyses
- Downstream research inputs generation

### Obsidian Integration
- All research reports and chat captures saved to Obsidian vault as Markdown
- YAML frontmatter with tags, traceability, and file mover automation
- Seamless archival and retrieval

### AI Chat Exporter
- Chrome extension captures chat logs across multiple AI platforms
- Clean Markdown output with enriched YAML and metadata
- Downstream vault processing support

## Research Modes and Process

### Fast Mode
- Quick surface scan with up to 3 concurrent queries
- No recursion, 2-3 follow-ups per query
- 1-3 minutes for time-sensitive queries and initial exploration

### Balanced Mode
- Default moderate depth/breadth with up to 7 concurrent queries
- 3-5 follow-ups per query, 3-6 minutes
- Main concepts and immediate relationships exploration

### Comprehensive Mode
- Exhaustive deep research with recursive sub-queries
- 5-7 follow-ups exploring primary, secondary, tertiary relationships
- Counter-arguments inclusion, 5-12 minutes

### End-to-End Flow
- Query analysis and semantic de-duplication
- Research tree with UUIDs and recursive exploration
- Progress tracking and 3000+ word report generation
- Inline citations and structured synthesis

## Architecture Overview

### Backend (Python + FastAPI)
- Central orchestration of workflow definitions and execution
- Automation calls and persistence handling
- Workflow engine, Playwright browser controller
- RESTful endpoints for CRUD and run control

### Frontend (UI Shell)
- Next.js/shadcn with dark mode support
- Dashboard, workflow editor, and status monitor
- All planned UI affordances maintained

### Capture Tools
- Chrome extension for chat capture
- Node.js background daemon (chokidar) for file watching
- Automated vault integration with notifications

## Workflow Engine Concepts

### Workflows and Nodes
- User-defined nodes with DOM selectors, prompts, and logic
- Chaining into reusable workflows with explicit data flow
- Saved configurations for repeatability and sharing

### Data Flow and Orchestration
- Intermediate artifacts and context passing between nodes
- Logging, retry logic, versioning, and YAML/Markdown outputs
- Full traceability during complex, multi-stage research runs

## UI/UX Requirements

### Dashboard and Editor
- List saved workflows and edit nodes
- Set selectors and prompts, visualize chains
- Initiate runs and view real-time status
- Queued jobs and progress bars for batch/bulk use cases
- Minimal, dark-mode UI

### Visualization
- Research tree/state visualization JSON
- Collapsible views with job/phase tags
- Parent-child relationships, completion, and learnings
- Progress monitor and artifact audit

## DOM Automation and Selectors

### Canvas and Deep Research
- Mode selectors with label detection
- Contenteditable input areas
- File attachment, send/submit, "Start research" actions
- Copy and share functionality for export

### Selector Map
- Prompt input: `[contenteditable='true']`
- Canvas label: `div.label:has-text("Canvas")`
- Deep Research label: `div.label:has-text("Deep Research")`
- Add Files: `mat-icon[fonticon="add_2"]`
- Submit: `mat-icon[fonticon="send"]`
- Start research: `span.mdc-button__label:has-text("Start research")`
- Copy output: `span.mat-mdc-list-item-title:has-text("Copy")`
- Share: `mat-icon[data-test-id="share-icon"]`

### YouTube Transcript Integration
- Transcript copy selector: `span#copy-span` on youtubetotranscript.com
- Pipeline integration and bulk operations support

## Chrome Extension Capture

### Providers and Selectors
- Robust mapping across AI platforms (OpenAI, Perplexity, Claude, Gemini, etc.)
- Main conversation container location with fallback to body
- Default generic selector set for unsupported platforms

### Content Extraction
- HTML to Markdown conversion with code block cleanup
- Heading normalization and list conversion
- Residual tag removal and YAML frontmatter packaging
- Extraction metadata for file save

### Background Script
- Content script injection and capture message sending
- Retry logic with direct execution fallback
- Deterministic file download for mover daemon flow

## Obsidian Integration and Mover Daemon

### Vault Path and YAML
- Markdown files with Obsidian-compatible YAML frontmatter
- Title, summary, sources, username, generator/version fields
- Trace tags for robust auditing

### AI Vault Mover
- Chokidar-based Node daemon watching Downloads
- Pattern matching for `ai-session-*.md` files
- Deconflict naming and automated vault movement
- Empty directory cleanup and activity logging
- OS notifications on macOS/Linux

### Launcher Script
- Bash launcher with dependency management
- Background forking with nohup and PID monitoring
- Start/stop/status/restart commands
- Safety checks and notifications

## Output, Logs, and Artifacts

### Markdown + YAML Outputs
- Consistent YAML frontmatter with query tags and versioning
- Timestamping and optional HTML source attachments
- Deep provenance and reproducibility support

### Research Tree
- Complete tree structure dumped to `research_tree.json`
- Support for later analysis, visualization, and QA reviews
- Agent's exploration path documentation

### Persistent Logging
- Full query/result audit logs with retries and error captures
- Version history and batch/job tagging
- Investigation, regression testing, and reproducible runs support

## Hybrid API + Browser Strategy

### Hybrid Approach
- Browser automation preferred for Canvas/Deep Research
- Maximum context and artifact handling
- Hybrid API calls when appropriate for speed/reliability

### Alternative Providers
- Perplexity-powered deep research path option
- UI provider switching with modular selector/config
- Slot-in operation for experimentation and parity testing

## YouTube Transcript Pipeline

### Transcript Analysis
- Transcript-first flow extracting workable structures
- Workflows, patterns, prompts, and principles extraction
- Article-quality synthesis with appendices and visuals

### Downstream Coupling
- Questions generation from extracted workflows
- Deep research integration for comprehensive analysis
- Single- and double-path options support

## Configuration and Environment

### Execution Environment
- Local macOS with Playwright and Python
- Chrome/Chromium availability and VS Code/devcontainer support
- User notifications via osascript or notify-send

### Obsidian Vault Specifics
- Configured vault path storage
- YAML parsing alignment with installed plugins
- Username and generator/version field configuration

## Prompts and Structured Analysis

### Transcript Analysis Protocol
- Multi-phase analysis with Mermaid mind map
- Canonical definitions and algorithmic descriptions
- Pattern benefit tagging and prompt cataloging
- QA gates and benchmarking requirements

### Deliverable Specifications
- Executive summary and topic-based body sections
- Appendices for verbatim and constructed prompts
- Evaluation checklist and benchmark rubric

## Implementation Tactics

### UI Technology
- Next.js/shadcn or SvelteKit with dark mode
- Mode toggles, batch input, live status, export buttons
- Selector mapping panels with minimal custom CSS

### Automation Implementation
- Playwright scripts with resilient waits and verification
- Per-action logging, retry policy, and error snapshots
- Headless run support for error triage

### Storage Strategy
- `research_tree.json` persistence per run
- Structured logs directory with job IDs
- Obsidian Markdown output with comprehensive YAML

## Future Work Considerations

### Advanced Features
- Drag-and-drop workflow builder
- Direct page content parsing nodes
- Community workflow library exchange
- RBAC and user switching for long-running jobs
- Scheduled triggers (n8n/Zapier/cron compatible)

### Plugin Architecture
- Slots for non-text artifacts (images/tables/zipped outputs)
- Multi-provider agent lists
- Stable front-end toggle and selector configuration

## Acceptance Criteria

### End-to-End System Operation
- UI-driven research runs completion
- DOM-automated Gemini sessions with robust logs
- Research tree persistence and Obsidian file outputs
- Chrome extension capture feeding vault mover autonomously

### Batch Operations
- All modes completion with consistent YAML frontmatter
- Job/batch tags maintenance
- Transcript pipeline downstream question generation
- Deep research integration for linked analyses

## Out-of-Scope Clarifications

### Deployment Model
- No cloud-hosted, multi-tenant deployment requirements
- No closed-source integration bundles
- Local control and transparency prioritization
- Modular endpoint addition as user-configured slots

### Technology Choices
- Modern stacks over deprecated frameworks (CRA)
- Front-end minimalism with extensibility
- Power-user transparency and rapid iteration focus