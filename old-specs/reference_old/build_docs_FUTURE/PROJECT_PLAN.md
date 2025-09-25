Imagine a craftsman’s bench where every tool is a discrete, interchangeable gear. Each gear—data-source, filter, prompt, pause, parser, exporter—snaps into a canvas of its own accord, forming an endlessly re-routeable machine. Once locked in place, the machine is wound up: Playwright fingers reach into living browser tabs, coaxing public AI surfaces (Gemini Canvas, Deep Research, Perplexity, et al.) to speak on cue. Timers tick, queues breathe, retries sigh; intermediate answers are caught, annotated, and fed back—prepend, append, transform—until the original question has unfolded into a citadel of cited, time-stamped Markdown that glides, unasked, into your Obsidian vault. The whole choreography is versioned, containerised, and observable, a reproducible performance rather than a brittle script.

flowchart TD

  %% LANE: Input/Trigger
  A[🎥 User watching video] --> B[🔘 Chrome extension clicked]
  B --> C[🌐 Open transcription site]

  %% LANE: Transcription
  C --> D[📄 Copy transcript from site]
  D --> E[📋 Transcript in clipboard]

  %% LANE: Gemini Gem
  E --> F[💎 Gemini gem opens or receives clipboard]
  F --> G[📝 Paste/append transcript into request]
  G --> H[✅ User confirms extraction or auto-append]

  %% LANE: Output Capture
  H --> I[📋 Gemini output copied to clipboard]
  I --> J[🔗 Sent to Obsidian via URI]

  %% LANE: Obsidian Ingestion
  J --> K[📓 New note created in vault]
  K --> L[📑 YAML front matter parsed]

  %% Decision: Archive vs Actionable
  L -->|No instructions found| M[📦 Archive transcript (information pathway)]
  L -->|Instructions found| N[⚙️ Pass to agent for automation]

  %% LANE: Automation Agent
  N --> O[🔒 Safety filter / validation]
  O --> P[📜 Generate installation script / task plan]
  P --> Q[📊 Parse results into activity log ticket]

  %% LANE: Feedback Loop
  M --> R[📓 Log entry added to Obsidian]
  Q --> R
  R --> S[🖥️ Activity Dashboard shows recent processes]
  S --> T[➕ Templates to launch new automated tasks]
This chart shows:
* Five main lanes (Trigger → Transcription → Gem → Obsidian → Agent → Feedback).
* A branch at the YAML parsing step (archive vs actionable).
* A loop back into Obsidian as a centralized record/log.


# Project Plan: AI Research Automation Platform

This document outlines the project plan for creating a locally-run, user-configurable AI research automation platform.

## Phase 1: Core Infrastructure Setup

**Objective:** Establish the foundational components of the application, including the backend, frontend, and automation scripts.

**Key Tasks & Deliverables:**

*   **Backend API (Python/FastAPI):**
    *   **Task:** Set up a new FastAPI project.
    *   **Task:** Define initial API endpoints for managing research tasks.
    *   **Task:** Implement basic data models for research workflows.
    *   **Deliverable:** A running FastAPI server with placeholder endpoints.

*   **Frontend Project (Next.js):**
    *   **Task:** Initialize a new Next.js project with TypeScript and Tailwind CSS.
    *   **Task:** Set up the basic project structure (components, pages, styles).
    *   **Task:** Integrate `shadcn/ui` for the component library.
    *   **Deliverable:** A boilerplate Next.js application that can communicate with the backend.

*   **Automation Scripts (Playwright):**
    *   **Task:** Set up a new Playwright project.
    *   **Task:** Create initial scripts for basic browser interactions (e.g., navigating to a URL, extracting text).
    *   **Deliverable:** A set of basic, runnable Playwright scripts.

## Phase 2: Feature Implementation

**Objective:** Develop the core features of the platform, including the research workflows and Obsidian integration.

**Key Tasks & Deliverables:**

*   **Deep Research Workflow:**
    *   **Task:** Design the logic for the deep research workflow (e.g., search queries, data extraction, summarization).
    *   **Task:** Implement the Playwright scripts to automate the research process.
    *   **Task:** Create the backend API endpoints to trigger and manage the deep research workflow.
    *   **Deliverable:** A functional deep research workflow that can be triggered via the API.

*   **YouTube Transcript Analysis Workflow:**
    *   **Task:** Design the logic for the YouTube transcript analysis workflow.
    *   **Task:** Implement the Playwright scripts to fetch YouTube transcripts.
    *   **Task:** Create the backend API endpoints to trigger and manage the analysis workflow.
    *   **Deliverable:** A functional YouTube transcript analysis workflow that can be triggered via the API.

*   **Obsidian Integration:**
    *   **Task:** Research and select a method for saving reports to Obsidian (e.g., using local file APIs, Obsidian URI schemes).
    *   **Task:** Implement the backend logic to format and save research reports as markdown files in a specified Obsidian vault.
    *   **Deliverable:** A service that can save a generated report to a local Obsidian vault.

## Phase 3: UI/UX and Finalization

**Objective:** Build the user interface, integrate the chat exporter, and conduct thorough testing.

**Key Tasks & Deliverables:**

*   **Next.js UI Development:**
    *   **Task:** Design and build the UI components for orchestrating research tasks.
    *   **Task:** Create the main dashboard for viewing and managing research workflows.
    *   **Task:** Implement the user interface for configuring and launching research tasks.
    *   **Deliverable:** A fully functional Next.js UI that allows users to control the research automation platform.

*   **AI Chat Exporter Integration:**
    *   **Task:** Define how the data from the AI Chat Exporter Chrome extension will be captured and used.
    *   **Task:** Implement the necessary backend endpoints to receive data from the extension.
    *   **Deliverable:** A mechanism to ingest and process data from the chat exporter.

*   **Testing and Finalization:**
    *   **Task:** Conduct end-to-end testing of all features.
    *   **Task:** Perform UI/UX testing and gather feedback.
    *   **Task:** Write documentation for setting up and using the platform.
    *   **Deliverable:** A stable, well-documented, and tested version of the AI research automation platform.