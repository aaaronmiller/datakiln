from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, Any
from ...services.workflow_service import WorkflowService, get_workflow_service
from ...models.workflow import Workflow, WorkflowExecution

router = APIRouter()

# In-memory storage for workflows (in production, this would be a database)
workflows: Dict[str, Workflow] = {}

@router.post("/workflows")
def create_workflow(workflow: Workflow):
    """
    Creates a new research workflow.
    """
    workflows[workflow.id] = workflow
    return workflow

@router.get("/workflows")
def get_all_workflows():
    """
    Retrieves a list of all research workflows.
    """
    return list(workflows.values())

@router.get("/workflows/{workflow_id}")
def get_workflow_by_id(workflow_id: str):
    """
    Retrieves a single research workflow by its ID.
    """
    if workflow_id not in workflows:
        raise HTTPException(status_code=404, detail="Workflow not found")
    return workflows[workflow_id]

@router.put("/workflows/{workflow_id}")
def update_workflow(workflow_id: str, updated_workflow: Workflow):
    """
    Updates an existing research workflow.
    """
    if workflow_id not in workflows:
        raise HTTPException(status_code=404, detail="Workflow not found")
    workflows[workflow_id] = updated_workflow
    return updated_workflow

@router.delete("/workflows/{workflow_id}")
def delete_workflow(workflow_id: str):
    """
    Deletes a research workflow.
    """
    if workflow_id not in workflows:
        raise HTTPException(status_code=404, detail="Workflow not found")
    del workflows[workflow_id]
    return {"message": "Workflow deleted successfully"}

@router.post("/workflows/{workflow_id}/execute")
async def start_workflow(
    workflow_id: str,
    workflow_service: WorkflowService = Depends(get_workflow_service)
):
    """
    Starts the execution of a specific workflow.
    """
    if workflow_id not in workflows:
        raise HTTPException(status_code=404, detail="Workflow not found")

    workflow = workflows[workflow_id]
    execution_id = await workflow_service.execute_workflow(workflow)

    return {"execution_id": execution_id, "message": "Workflow execution started"}

@router.get("/workflows/executions/{execution_id}/status")
def get_workflow_status(
    execution_id: str,
    workflow_service: WorkflowService = Depends(get_workflow_service)
):
    """
    Retrieves the status of a workflow execution.
    """
    execution = workflow_service.get_execution_status(execution_id)
    if not execution:
        raise HTTPException(status_code=404, detail="Execution not found")

    return execution