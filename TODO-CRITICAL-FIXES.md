# CRITICAL FIXES - DO NOW

**Status**: WORK IN PROGRESS
**Started**: 2025-11-18
**Goal**: Make EVERY button work, EVERY feature functional

---

## ✅ TASK 1: Fix Execute Workflow - Call REAL Backend API
**Status**: 🔄 IN PROGRESS
**File**: `frontend/src/components/workflow/WorkflowEditor.tsx` (line 1126-1216)
**Problem**: Currently SIMULATES execution instead of calling backend
**Fix**: Replace simulation loop with actual POST to `/api/v1/workflows/{id}/execute`
**Code Location**: `const executeWorkflow = useCallback(async () => {`

---

## 📋 TASK 2: Make Prompts Editable in Node Config
**Status**: ⏳ PENDING
**File**: Need to find/create NodeConfigDialog component
**Problem**: Can't edit LLM prompts in workflow builder
**Fix**: Add textarea for `query_prompt`, `prepend_text`, `prompt` fields
**Search**: Look for node config dialog in WorkflowEditor.tsx

---

## 💾 TASK 3: Add Workflow Save/Load to localStorage
**Status**: ⏳ PENDING
**File**: `frontend/src/components/workflow/WorkflowEditor.tsx`
**Problem**: Workflows not persisted, lost on refresh
**Fix**:
- Save to localStorage on save button
- Load workflows list on mount
- Add "Load Workflow" dropdown
**Functions**: Enhance `saveWorkflow` (line 1011)

---

## 📊 TASK 4: Create Execution History Viewer
**Status**: ⏳ PENDING
**File**: Create `frontend/src/components/workflow/ExecutionHistory.tsx`
**Problem**: No way to see past executions or failures
**Fix**:
- Store execution results in localStorage
- Show list of executions with success/failure
- Click to see details and errors
**Integration**: Add to WorkflowEditor or separate page

---

## 🔁 TASK 5: Add Retry Mechanism
**Status**: ⏳ PENDING
**File**: `frontend/src/components/workflow/WorkflowEditor.tsx`
**Problem**: Can't retry failed nodes
**Fix**:
- Add "Retry" button on failed nodes
- Re-execute just failed nodes
- Show retry count

---

## 🚀 TASK 6: Add Common Workflows to Dashboard
**Status**: ⏳ PENDING
**File**: `frontend/src/pages/Dashboard.tsx`
**Problem**: No quick-start for Deep Research, YouTube workflows
**Fix**:
- Import SIMPLE_DEEP_RESEARCH, DEEPER_RESEARCH from workflow-predefined.ts
- Add cards with "Run Deep Research" button
- One-click load and execute

---

## 🎥 TASK 7: Test YouTube Transcript Workflow
**Status**: ⏳ PENDING
**File**: `scripts/youtube_transcript.py`
**Problem**: Never tested end-to-end
**Fix**:
- Create test workflow JSON
- Test with real YouTube URL
- Verify transcript extraction
- Test Gemini integration

---

## 📖 TASK 8: Write API Documentation
**Status**: ⏳ PENDING
**File**: Create `API-DOCUMENTATION.md`
**Problem**: No docs for API endpoints
**Fix**: Document:
- POST /api/v1/workflows/{id}/execute
- GET /api/v1/workflows
- Example JSON payloads
- curl commands

---

## 🎨 TASK 9: Enhance DOM Workflow Builder UI
**Status**: ⏳ PENDING
**File**: `frontend/src/components/workflow/WorkflowEditor.tsx`
**Problem**: DOM selector editing unclear
**Fix**:
- Add DOM action config dialog
- Visual selector builder
- Test button for selectors

---

## 🛠️ TASK 10: Fix Backend DAG Executor Error Handling
**Status**: ⏳ PENDING
**File**: `backend/dag_executor.py`, `backend/query_engine.py`
**Problem**: Errors swallowed, returns empty error message
**Fix**:
- Add proper logging in execute_workflow
- Return detailed error messages
- Log stack traces

---

## 📦 TASK 11: Install CLI Tool
**Status**: ⏳ PENDING
**File**: Move `/tmp/workflow_cli.py` → `scripts/workflow_cli.py`
**Problem**: CLI tool not in repo
**Fix**:
- Move to scripts/
- Add usage docs
- Make executable

---

## ✅ TASK 12: Progress Tracking with Real Names
**Status**: ⏳ PENDING
**File**: `frontend/src/components/workflow/WorkflowEditor.tsx`
**Problem**: Shows "Task 1" instead of actual node names
**Fix**: Use `node.data.name` in progress display

---

## 🔍 KEY FILES REFERENCE

**Backend:**
- `backend/nodes/consolidate_node.py` - File reading (FIXED)
- `backend/nodes/splitter_node.py` - Query splitting (FIXED)
- `backend/dag_executor.py` - Workflow execution (NEEDS ERROR FIX)
- `backend/query_engine.py` - Entry point (NEEDS ERROR FIX)
- `backend/main.py` - FastAPI endpoints

**Frontend:**
- `frontend/src/components/workflow/WorkflowEditor.tsx` - Main editor (1920 lines)
- `frontend/src/pages/Dashboard.tsx` - Dashboard page
- `frontend/src/pages/Workflows.tsx` - Workflows list
- `frontend/src/types/workflow-predefined.ts` - Workflow templates

**Scripts:**
- `scripts/youtube_transcript.py` - YouTube workflow
- `scripts/deep_research.py` - Deep research automation

---

## 🎯 EXECUTION ORDER

1. ✅ Fix executeWorkflow (HIGHEST PRIORITY)
2. Fix backend DAG executor errors
3. Add prompt editing
4. Add workflow persistence
5. Create execution history
6. Add retry mechanism
7. Add dashboard templates
8. Test YouTube workflow
9. Enhance DOM builder
10. Write API docs
11. Install CLI tool
12. Fix progress names
