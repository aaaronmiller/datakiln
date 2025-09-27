# Consolidated Product Requirements Document (PRD)
## AI Research Automation Platform

### Executive Summary
A visual workflow management system for AI-driven research and data processing, combining browser automation, node-based query construction, and integrated research workflows with Obsidian export capabilities.

### Vision & Goals
- **Local Control**: Provider-agnostic, visual workflow editor with full user control
- **Browser Automation**: DOM-automated deep research and transcript pipelines  
- **Obsidian Integration**: Markdown artifacts with YAML provenance for seamless knowledge management
- **Visual Workflows**: ReactFlow-based canvas for drag-and-drop workflow creation

### Core Features

#### 1. Visual Workflow Builder
- **ReactFlow Canvas**: Drag-and-drop interface for workflow creation
- **Node Palette**: 10+ node types (provider, dom_action, transform, filter, etc.)
- **Real-time Execution**: Live progress monitoring with SSE updates
- **Import/Export**: JSON workflow definitions with versioning

#### 2. Research Automation
- **Deep Research Modes**: Fast (1-3min), Balanced (3-6min), Comprehensive (5-12min)
- **Browser Automation**: Playwright-controlled Gemini Canvas/Deep Research
- **Multi-Provider**: Gemini, Perplexity with provider-agnostic endpoints
- **Research Tree**: UUID-based exploration with 3000+ word reports

#### 3. Data Capture & Processing
- **Chrome Extension**: Multi-platform chat capture (OpenAI, Claude, Gemini, etc.)
- **YouTube Transcripts**: Automated extraction and analysis pipeline
- **DOM Selectors**: Configurable selector registry with fallbacks
- **Content Processing**: HTML→Markdown with YAML frontmatter

#### 4. Chrome Extension Workflow Activation
- **Dual Activation Modes**: Website-triggered workflows and clipboard-based processing
- **Workflow Selection**: Extension popup with available workflow options
- **Smart Input Detection**: Current URL for website workflows, clipboard for research workflows
- **Output Routing**: Default Obsidian export with optional screen display
- **DOM Selector Definition**: Advanced feature for custom element extraction

#### 5. Integration & Export
- **Obsidian Vault**: Automated file mover with conflict resolution
- **API Endpoints**: RESTful workflow management and execution
- **Real-time Updates**: WebSocket streaming for live monitoring
- **Artifact Management**: Structured results with download capabilities

### Architecture Overview

#### Backend (FastAPI)
- **Workflow Engine**: DAG executor with node processing
- **API Layer**: CRUD operations and execution endpoints
- **Automation**: Playwright browser controller
- **Persistence**: JSON workflows with optional database

#### Frontend (Next.js + React)
- **10 Core Routes**: Dashboard, Workflows, Runs, Results, Selectors, Templates, Transcript, Extension, Settings, Command Palette
- **ReactFlow Integration**: Visual workflow canvas with performance optimization
- **Component Library**: shadcn/ui with consistent design system
- **State Management**: Zustand for workflow and UI state

#### Chrome Extension
- **Workflow Activation**: Click-to-trigger workflows with current website/clipboard input
- **Selection Interface**: Popup showing available workflows with descriptions
- **Smart Context Detection**: Automatic input routing (URL vs clipboard vs selected text)
- **Output Configuration**: Obsidian-first with optional screen display override
- **DOM Selector Tools**: Advanced interface for defining custom extraction elements

### User Stories & Acceptance Criteria

#### Epic 1: Workflow Creation
**As a researcher, I want to create visual workflows**
- WHEN I drag nodes onto canvas THEN they connect with data flow
- WHEN I configure node parameters THEN they validate against schema
- WHEN I save workflow THEN it persists as JSON with versioning

#### Epic 2: Research Execution  
**As a researcher, I want automated deep research**
- WHEN I select research mode THEN appropriate concurrency limits apply
- WHEN research executes THEN progress updates in real-time
- WHEN research completes THEN 3000+ word report generates with citations

#### Epic 3: Extension Workflow Activation
**As a researcher, I want to trigger workflows from any website**
- WHEN I click extension on YouTube THEN transcript workflow activates with current video
- WHEN I have clipboard text and click extension THEN deep-research options appear
- WHEN workflow completes THEN results save to Obsidian automatically
- WHEN I need custom extraction THEN DOM selector interface allows element definition

#### Epic 4: Data Capture & Processing
**As a knowledge worker, I want automated content processing**
- WHEN I use Chrome extension THEN conversations export as Markdown
- WHEN files download THEN mover daemon processes to Obsidian vault
- WHEN conflicts occur THEN automatic resolution with notifications

### Technical Requirements

#### Performance
- ReactFlow: 50+ nodes with <100ms response time
- Workflow execution: <5 second startup time
- Research modes: Complete within specified timeframes
- UI responsiveness: Maintained during long operations

#### Reliability  
- 99% uptime for workflow execution
- Graceful degradation for external service failures
- Automatic retry with exponential backoff
- Comprehensive error logging and recovery

#### Security
- Local-only operation with no external data transmission
- Secure credential storage in .env files
- Input validation and sanitization
- Audit logging for all operations

### Success Metrics
- **MVP**: Basic text→API→display node functional
- **Phase 1**: ReactFlow canvas with 5+ node types
- **Phase 2**: Browser automation with DOM selectors
- **Phase 3**: Full integration with Chrome extension and Obsidian
- **Production**: Complex workflows execute reliably end-to-end

### Technology Stack
- **Frontend**: Next.js, React, ReactFlow, Zustand, shadcn/ui, Tailwind CSS
- **Backend**: FastAPI, Pydantic, Playwright, SQLAlchemy, PostgreSQL
- **Integration**: Chrome Extension, Node.js mover daemon, Obsidian vault
- **Testing**: pytest, Jest, Playwright for automation testing