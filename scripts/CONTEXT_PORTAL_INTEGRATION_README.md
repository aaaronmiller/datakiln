# Context Portal Integration

This directory contains build-phase memory retention tools that integrate with the Context Portal for development workflow management.

## Overview

The Context Portal integration provides automated task tracking and memory retention between development phases. It serves as a build tool (not part of the final application code) that captures project state, progress, and decisions to ensure continuity across development sessions.

## Components

### 1. Context Portal Integration (`context_portal_integration.py`)

Core integration script that provides direct access to Context Portal database operations.

**Key Features:**
- Task lifecycle management (start, update, complete)
- Progress tracking and snapshots
- Decision logging
- Baseline storage for project state
- Context retrieval and updates

**Usage:**
```bash
# Start a task
python scripts/context_portal_integration.py start_task "Task Name" "Description"

# Update progress
python scripts/context_portal_integration.py update_progress "IN_PROGRESS" "Current status update"

# End task
python scripts/context_portal_integration.py end_task "Completion notes"

# Create baseline snapshot
python scripts/context_portal_integration.py baseline_snapshot

# View current context
python scripts/context_portal_integration.py get_context
```

### 2. Task Workflow (`task_workflow.py`)

Automated workflows for task beginning and end assessments with intelligent state analysis.

**Features:**
- Pre-task assessment (checks for incomplete tasks, recent progress)
- Task duration tracking
- Post-task assessment and baseline creation
- Interactive completion notes

**Usage:**
```bash
# Begin task with assessment
python scripts/task_workflow.py begin "Implement feature X" "Detailed description"

# End task with assessment
python scripts/task_workflow.py end "Task completed successfully"

# Check current task status
python scripts/task_workflow.py status
```

### 3. Periodic Progress (`periodic_progress.py`)

Automatic progress capture during development phases with smart change detection.

**Features:**
- Git status integration
- Change detection (file modifications, recent activity)
- Automatic snapshots when changes are detected
- Cleanup of old snapshots

**Usage:**
```bash
# Manual snapshot
python scripts/periodic_progress.py snapshot "Manual progress note"

# Automatic snapshot (only if changes detected)
python scripts/periodic_progress.py auto_snapshot

# Cleanup old snapshots
python scripts/periodic_progress.py cleanup 30  # Remove snapshots older than 30 days
```

### 4. Todo Integration (`todo_integration.py`)

Integration with existing todo-list systems for unified task management.

**Features:**
- Sync todos with Context Portal progress entries
- Mark todos as complete
- Add new todos
- List pending items

**Usage:**
```bash
# Sync current todos
python scripts/todo_integration.py sync_todos

# Mark todo as complete
python scripts/todo_integration.py mark_complete "Implement user authentication"

# Add new todo
python scripts/todo_integration.py add_todo "Write unit tests"

# List pending todos
python scripts/todo_integration.py list_pending
```

## Integration Points

### Build Phase Integration

These scripts are designed to be integrated into development workflows:

1. **Pre-commit hooks**: Run `periodic_progress.py auto_snapshot` before commits
2. **CI/CD pipelines**: Include baseline snapshots in build processes
3. **Development scripts**: Add to package.json scripts or Makefile
4. **Cron jobs**: Schedule periodic cleanup and snapshots

### Example Integration

```bash
# In package.json
{
  "scripts": {
    "task:start": "python scripts/task_workflow.py begin",
    "task:end": "python scripts/task_workflow.py end",
    "progress:snapshot": "python scripts/periodic_progress.py auto_snapshot",
    "todo:sync": "python scripts/todo_integration.py sync_todos"
  }
}
```

## Data Storage

The integration uses the Context Portal database with the following tables:

- `active_context`: Current working focus and recent changes
- `product_context`: Overall project goals and architecture
- `progress_entries`: Task progress and status updates
- `decisions`: Architectural and implementation decisions
- `custom_data`: Project baselines and custom data
- `system_patterns`: Coding patterns and best practices

## Memory Retention Features

1. **Task Continuity**: Tasks persist across sessions with full context
2. **Progress Baselines**: Periodic snapshots of project state
3. **Decision History**: Logged decisions with rationale
4. **Change Tracking**: Git integration for automatic progress detection
5. **Todo Synchronization**: Unified task management across systems

## Usage in Development Workflow

### Starting a Development Phase

```bash
# Begin new task
python scripts/task_workflow.py begin "Implement Context Portal integration" "Set up memory retention tools"

# Sync todos
python scripts/todo_integration.py sync_todos
```

### During Development

```bash
# Periodic snapshots (can be automated)
python scripts/periodic_progress.py auto_snapshot

# Update progress manually
python scripts/context_portal_integration.py update_progress "IN_PROGRESS" "Completed database schema analysis"
```

### Ending a Development Phase

```bash
# Complete task with assessment
python scripts/task_workflow.py end "Integration completed successfully"

# Create final baseline
python scripts/context_portal_integration.py baseline_snapshot
```

## Configuration

The scripts automatically detect the project workspace and use the following defaults:

- Database: `context_portal/context.db`
- Workspace ID: Absolute path to project root
- Snapshot retention: 30 days (configurable in cleanup)

## Dependencies

- Python 3.7+
- SQLite3 (built-in)
- Git (optional, for enhanced change detection)

## Notes

- Scripts are designed as build tools and don't interfere with application runtime
- Database locking may occur if Context Portal MCP server is running simultaneously
- All operations are logged with timestamps for audit trails
- Baselines include complete project context for restoration