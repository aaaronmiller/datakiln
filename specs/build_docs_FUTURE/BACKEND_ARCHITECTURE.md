# Backend Architecture

This document outlines the backend architecture for the AI Research Automation Platform.

## Directory Structure

The FastAPI application will be organized into the following directory structure:

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py         # FastAPI app initialization
│   ├── api/
│   │   ├── __init__.py
│   │   └── v1/
│   │       ├── __init__.py
│   │       ├── endpoints/
│   │       │   ├── __init__.py
│   │       │   ├── workflows.py
│   │       │   └── results.py
│   │       └── schemas/
│   │           ├── __init__.py
│   │           ├── workflow.py
│   │           └── task.py
│   ├── core/
│   │   ├── __init__.py
│   │   └── config.py     # Application configuration
│   ├── models/
│   │   ├── __init__.py
│   │   ├── workflow.py
│   │   └── task.py
│   ├── services/
│   │   ├── __init__.py
│   │   ├── workflow_service.py
│   │   └── automation_service.py
│   └── utils/
│       ├── __init__.py
│       └── file_utils.py   # Utilities for file operations
├── scripts/              # Automation scripts (Playwright)
│   ├── __init__.py
│   ├── deep_research.py
│   └── youtube_transcript.py
└── tests/
    ├── __init__.py
    └── test_workflows.py
```

## API Endpoints

The following API endpoints will be implemented to support the frontend application:

### Workflow Management

*   **Create Workflow:**
    *   **Method:** `POST`
    *   **Path:** `/api/v1/workflows`
    *   **Description:** Creates a new research workflow.
    *   **Request Body:** JSON object containing workflow details (e.g., name, description, tasks).
    *   **Response:** JSON object of the newly created workflow.

*   **Get All Workflows:**
    *   **Method:** `GET`
    *   **Path:** `/api/v1/workflows`
    *   **Description:** Retrieves a list of all research workflows.
    *   **Response:** JSON array of workflow objects.

*   **Get Workflow by ID:**
    *   **Method:** `GET`
    *   **Path:** `/api/v1/workflows/{workflow_id}`
    *   **Description:** Retrieves a single research workflow by its ID.
    *   **Response:** JSON object of the workflow.

*   **Update Workflow:**
    *   **Method:** `PUT`
    *   **Path:** `/api/v1/workflows/{workflow_id}`
    *   **Description:** Updates an existing research workflow.
    *   **Request Body:** JSON object with the fields to be updated.
    *   **Response:** JSON object of the updated workflow.

*   **Delete Workflow:**
    *   **Method:** `DELETE`
    *   **Path:** `/api/v1/workflows/{workflow_id}`
    *   **Description:** Deletes a research workflow.
    *   **Response:** `204 No Content`.

### Workflow Execution

*   **Start Workflow:**
    *   **Method:** `POST`
    *   **Path:** `/api/v1/workflows/{workflow_id}/execute`
    *   **Description:** Starts the execution of a specific workflow.
    *   **Response:** JSON object with a task ID for tracking the execution status.

*   **Get Workflow Status:**
    *   **Method:** `GET`
    *   **Path:** `/api/v1/workflows/executions/{execution_id}/status`
    *   **Description:** Retrieves the status of a workflow execution.
    *   **Response:** JSON object with the current status (e.g., "running", "completed", "failed").

### Results

*   **Get Results:**
    *   **Method:** `GET`
    *   **Path:** `/api/v1/results`
    *   **Description:** Retrieves all research results.
    *   **Response:** JSON array of result objects.

*   **Get Result by ID:**
    *   **Method:** `GET`
    *   **Path:** `/api/v1/results/{result_id}`
    *   **Description:** Retrieves a specific research result by its ID.
    *   **Response:** JSON object of the result.

## Data Models

*   **Workflow:**
    *   `id`: Unique identifier for the workflow.
    *   `name`: Name of the workflow.
    *   `description`: A brief description of the workflow.
    *   `tasks`: A list of tasks that make up the workflow.

*   **Task:**
    *   `id`: Unique identifier for the task.
    *   `name`: Name of the task.
    *   `type`: The type of task (e.g., "deep_research", "youtube_transcript").
    *   `parameters`: A dictionary of parameters for the task.

*   **Result:**
    *   `id`: Unique identifier for the result.
    *   `workflow_id`: The ID of the workflow that produced the result.
    *   `data`: The research data that was generated.
    *   `created_at`: Timestamp of when the result was created.