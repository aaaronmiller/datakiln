# System Architecture

This document provides a unified overview of the system architecture for the AI Research Automation Platform, combining backend and frontend components.

## Overview

The platform consists of a FastAPI backend providing REST APIs and real-time capabilities, paired with a Next.js frontend offering a visual workflow builder interface. The system supports node-based query construction, workflow execution, and integrated research automation.

## Backend Architecture

### Directory Structure

```
backend/
├── app/
│   ├── main.py         # FastAPI app initialization
│   ├── api/v1/endpoints/
│   │   ├── workflows.py
│   │   └── results.py
│   ├── core/config.py     # Application configuration
│   ├── models/
│   │   ├── workflow.py
│   │   └── task.py
│   ├── services/
│   │   ├── workflow_service.py
│   │   └── automation_service.py
│   └── utils/file_utils.py
├── scripts/              # Automation scripts (Playwright)
│   ├── deep_research.py
│   └── youtube_transcript.py
└── tests/
```

### Key Components

- **API Layer**: RESTful endpoints for workflow management, execution, and results
- **Service Layer**: Business logic for workflow processing and automation
- **Data Models**: Pydantic models for workflows, tasks, and results
- **Scripts**: Playwright-based automation for web interactions

### API Endpoints

- `POST /api/v1/workflows` - Create workflow
- `GET /api/v1/workflows` - List workflows
- `POST /api/v1/workflows/{id}/execute` - Execute workflow
- `GET /api/v1/results` - Retrieve results

## Frontend Architecture

### Directory Structure

```
frontend/src/
├── app/                # Next.js App Router
├── components/
│   ├── core/           # Custom components (WorkflowBuilder, TaskNode)
│   └── ui/             # shadcn/ui components
├── hooks/              # Custom React hooks
├── lib/                # Utilities and constants
├── store/              # Zustand state management
├── styles/             # Global styles and Tailwind CSS
└── types/              # TypeScript definitions
```

### Key Components

- **WorkflowBuilder**: Drag-and-drop interface for creating workflows
- **TaskNode**: Configurable nodes representing workflow tasks
- **QueryEditor**: Modal interface for building query graphs
- **ResultsDisplay**: Structured presentation of execution results

### State Management

Uses Zustand for lightweight, performant state management of:
- Workflow node positions and connections
- Query graph structures
- UI state and user preferences

## Integration Patterns

### Query ↔ Workflow Integration

```
WorkflowBuilder (Canvas)
├── TaskNode (Standard task)
├── QueryNode (Opens QueryEditor modal)
└── ResultsNode (Query results display)
```

### Backend ↔ Frontend Communication

```
Frontend Query Graph → JSON → Backend API
→ Query Execution Engine → Results → Frontend Display
```

## Technology Stack

- **Backend**: FastAPI, Pydantic, Playwright
- **Frontend**: Next.js, React, ReactFlow, Zustand, Tailwind CSS
- **Database**: PostgreSQL with SQLAlchemy
- **Real-time**: Server-Sent Events (SSE)
- **Testing**: pytest, Jest

## Performance Considerations

- ReactFlow optimization for 50+ nodes with <100ms response times
- Efficient state synchronization between ReactFlow and Zustand
- Memory leak prevention through proper cleanup
- Virtualization for large node graphs

## Historical Versions

For detailed historical documentation, see:
- [`reference_old/architecture/BACKEND_ARCHITECTURE.md`](reference_old/architecture/BACKEND_ARCHITECTURE.md)
- [`reference_old/architecture/FRONTEND_ARCHITECTURE.md`](reference_old/architecture/FRONTEND_ARCHITECTURE.md)