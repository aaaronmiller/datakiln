from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks, Query
from typing import Dict, Any, Optional, List
from datetime import datetime
from ....services.workflow_service import WorkflowService, get_workflow_service
from ....services.workflow_persistence_service import get_workflow_persistence_service
from ....models.workflow import Workflow, Run, Result
from ....schemas.workflow import (
    WorkflowExecutionRequest,
    WorkflowExecutionResponse,
    WorkflowStatusResponse,
    WorkflowResultResponse,
    WorkflowValidationRequest,
    WorkflowValidationResponse,
    WorkflowOptimizationRequest,
    WorkflowOptimizationResponse,
    WorkflowStatsResponse,
    ExecutionCancelRequest,
    ExecutionCancelResponse
)
from sse_starlette.sse import EventSourceResponse
import asyncio
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

@router.post("/workflows", response_model=Workflow)
def create_workflow(
    workflow: Workflow,
    persistence_service = Depends(get_workflow_persistence_service)
):
    """
    Creates a new research workflow with persistence.
    """
    try:
        # Validate workflow structure
        validation_errors = persistence_service.validate_workflow(workflow)
        if validation_errors:
            raise HTTPException(status_code=400, detail=f"Workflow validation failed: {validation_errors}")

        workflow_id = persistence_service.save_workflow(workflow)
        saved_workflow = persistence_service.load_workflow(workflow_id)
        if not saved_workflow:
            raise HTTPException(status_code=500, detail="Failed to retrieve saved workflow")
        return saved_workflow
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to create workflow: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to create workflow: {str(e)}")

@router.get("/workflows")
def get_all_workflows(
    category: Optional[str] = Query(None),
    tags: Optional[List[str]] = Query(None),
    author: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    persistence_service = Depends(get_workflow_persistence_service)
):
    """
    Retrieves a list of all research workflows with optional filtering.
    """
    try:
        filters = {}
        if category:
            filters['category'] = category
        if tags:
            filters['tags'] = tags
        if author:
            filters['author'] = author
        if search:
            filters['search'] = search

        return persistence_service.list_workflows(filters)
    except Exception as e:
        logger.error(f"Failed to get workflows: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get workflows: {str(e)}")

@router.get("/workflows/{workflow_id}", response_model=Workflow)
def get_workflow_by_id(
    workflow_id: str,
    persistence_service = Depends(get_workflow_persistence_service)
):
    """
    Retrieves a single research workflow by its ID.
    """
    workflow = persistence_service.load_workflow(workflow_id)
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
    return workflow

@router.put("/workflows/{workflow_id}", response_model=Workflow)
def update_workflow(
    workflow_id: str,
    updated_workflow: Workflow,
    persistence_service = Depends(get_workflow_persistence_service)
):
    """
    Updates an existing research workflow.
    """
    # Ensure the workflow ID matches the URL parameter
    updated_workflow.id = workflow_id

    # Increment version if metadata exists
    if updated_workflow.metadata:
        updated_workflow.metadata.version += 1
        updated_workflow.metadata.updatedAt = datetime.now().isoformat()

    try:
        persistence_service.save_workflow(updated_workflow)
        saved_workflow = persistence_service.load_workflow(workflow_id)
        if not saved_workflow:
            raise HTTPException(status_code=500, detail="Failed to retrieve updated workflow")
        return saved_workflow
    except Exception as e:
        logger.error(f"Failed to update workflow {workflow_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to update workflow: {str(e)}")

@router.delete("/workflows/{workflow_id}")
def delete_workflow(
    workflow_id: str,
    persistence_service = Depends(get_workflow_persistence_service)
):
    """
    Deletes a research workflow.
    """
    success = persistence_service.delete_workflow(workflow_id)
    if not success:
        raise HTTPException(status_code=404, detail="Workflow not found")
    return {"message": "Workflow deleted successfully"}

@router.post("/workflows/{workflow_id}/versions", response_model=Workflow)
def create_workflow_version(
    workflow_id: str,
    new_name: Optional[str] = None,
    persistence_service = Depends(get_workflow_persistence_service)
):
    """
    Creates a new version of a workflow.
    """
    new_workflow_id = persistence_service.create_version(workflow_id, new_name)
    if not new_workflow_id:
        raise HTTPException(status_code=404, detail="Original workflow not found")

    new_workflow = persistence_service.load_workflow(new_workflow_id)
    if not new_workflow:
        raise HTTPException(status_code=500, detail="Failed to create workflow version")
    return new_workflow

@router.get("/workflows/{workflow_id}/versions")
def get_workflow_versions(
    workflow_id: str,
    persistence_service = Depends(get_workflow_persistence_service)
):
    """
    Gets all versions of a workflow.
    """
    versions = persistence_service.get_workflow_versions(workflow_id)
    return {"versions": versions}

@router.get("/workflows/{workflow_id}/export")
def export_workflow(
    workflow_id: str,
    persistence_service = Depends(get_workflow_persistence_service)
):
    """
    Exports a workflow as JSON.
    """
    json_data = persistence_service.export_workflow(workflow_id)
    if not json_data:
        raise HTTPException(status_code=404, detail="Workflow not found")

    return {
        "workflow_id": workflow_id,
        "data": json_data
    }

@router.post("/workflows/import", response_model=Workflow)
def import_workflow(
    json_data: str,
    persistence_service = Depends(get_workflow_persistence_service)
):
    """
    Imports a workflow from JSON data.
    """
    workflow_id = persistence_service.import_workflow(json_data)
    if not workflow_id:
        raise HTTPException(status_code=400, detail="Invalid workflow data")

    workflow = persistence_service.load_workflow(workflow_id)
    if not workflow:
        raise HTTPException(status_code=500, detail="Failed to import workflow")
    return workflow

@router.patch("/workflows/{workflow_id}/metadata")
def update_workflow_metadata(
    workflow_id: str,
    metadata: Dict[str, Any],
    persistence_service = Depends(get_workflow_persistence_service)
):
    """
    Updates workflow metadata without changing the workflow structure.
    """
    success = persistence_service.update_workflow_metadata(workflow_id, metadata)
    if not success:
        raise HTTPException(status_code=404, detail="Workflow not found")
    return {"message": "Metadata updated successfully"}

@router.get("/workflows/stats")
def get_workflows_stats(
    persistence_service = Depends(get_workflow_persistence_service)
):
    """
    Gets workflow storage statistics.
    """
    return persistence_service.get_storage_stats()

@router.post("/workflows/execute", response_model=WorkflowExecutionResponse)
async def execute_workflow(
    request: WorkflowExecutionRequest,
    background_tasks: BackgroundTasks,
    workflow_service: WorkflowService = Depends(get_workflow_service)
) -> WorkflowExecutionResponse:
    """
    Execute a workflow with enhanced monitoring and error handling.

    - Validates workflow structure before execution
    - Applies optional query optimization
    - Provides detailed execution tracking and status monitoring
    - Returns comprehensive execution summary
    """
    try:
        logger.info(f"Received workflow execution request for workflow: {request.workflow.get('id', 'unknown')}")

        # Convert request workflow dict to Workflow model
        workflow = Workflow(**request.workflow)

        # Map optimization level string to enum
        from ....services.query_optimizer import OptimizationLevel
        optimization_level_map = {
            "standard": OptimizationLevel.STANDARD,
            "aggressive": OptimizationLevel.AGGRESSIVE,
            "conservative": OptimizationLevel.CONSERVATIVE
        }
        optimization_level = optimization_level_map.get(request.optimization_level, OptimizationLevel.STANDARD)

        # Execute workflow with enhanced options
        run_id, execution_summary = await workflow_service.execute_workflow(
            workflow=workflow,
            execution_options=request.execution_options,
            validate_workflow=request.validate_workflow,
            enable_optimization=request.enable_optimization,
            optimization_level=optimization_level
        )

        logger.info(f"Workflow execution started successfully: run_id={run_id}")

        return WorkflowExecutionResponse(
            run_id=run_id,
            workflow_id=execution_summary.get("workflow_id"),
            status=execution_summary.get("status", "running"),
            started_at=execution_summary.get("started_at", ""),
            execution_summary=execution_summary
        )

    except ValueError as e:
        logger.error(f"Workflow validation failed: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Workflow validation failed: {str(e)}")
    except Exception as e:
        logger.error(f"Workflow execution failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Workflow execution failed: {str(e)}")

@router.get("/runs/{run_id}/stream")
async def stream_run_updates(
    run_id: str,
    workflow_service: WorkflowService = Depends(get_workflow_service)
):
    """
    Streams real-time updates for a workflow run.
    """
    async def event_generator():
        while True:
            run = workflow_service.get_run(run_id)
            if not run:
                yield {"event": "error", "data": "Run not found"}
                break

            yield {"event": "update", "data": run.dict()}

            if run.status in ["completed", "failed"]:
                break

            await asyncio.sleep(1)  # Poll every second

    return EventSourceResponse(event_generator())

@router.get("/results/{result_id}", response_model=WorkflowResultResponse)
def get_result(
    result_id: str,
    workflow_service: WorkflowService = Depends(get_workflow_service)
) -> WorkflowResultResponse:
    """
    Retrieves a workflow execution result by ID.
    """
    result = workflow_service.get_result(result_id)
    if not result:
        raise HTTPException(status_code=404, detail="Result not found")

    return WorkflowResultResponse(
        id=result.id,
        run_id=result.run_id,
        workflow_id=result.workflow_id,
        data=result.data,
        created_at=result.created_at.isoformat()
    )

@router.get("/runs/{run_id}/status", response_model=WorkflowStatusResponse)
async def get_run_status(
    run_id: str,
    workflow_service: WorkflowService = Depends(get_workflow_service)
) -> WorkflowStatusResponse:
    """
    Get detailed status information for a workflow run.
    """
    status_info = await workflow_service.get_execution_status(run_id)
    if not status_info:
        raise HTTPException(status_code=404, detail="Run not found")

    return WorkflowStatusResponse(**status_info)

@router.post("/runs/{run_id}/cancel", response_model=ExecutionCancelResponse)
async def cancel_run(
    run_id: str,
    workflow_service: WorkflowService = Depends(get_workflow_service)
) -> ExecutionCancelResponse:
    """
    Cancel a running workflow execution.
    """
    success = await workflow_service.cancel_execution(run_id)

    if success:
        logger.info(f"Successfully cancelled execution: {run_id}")
        return ExecutionCancelResponse(
            success=True,
            run_id=run_id,
            message="Execution cancelled successfully"
        )
    else:
        logger.warning(f"Failed to cancel execution: {run_id}")
        return ExecutionCancelResponse(
            success=False,
            run_id=run_id,
            message="Execution could not be cancelled (not found or not running)"
        )

@router.get("/workflows/stats", response_model=WorkflowStatsResponse)
def get_workflow_stats(
    workflow_service: WorkflowService = Depends(get_workflow_service)
) -> WorkflowStatsResponse:
    """
    Get workflow execution statistics.
    """
    stats = workflow_service.get_workflow_stats()
    return WorkflowStatsResponse(**stats)

@router.post("/workflows/validate", response_model=WorkflowValidationResponse)
async def validate_workflow_endpoint(
    request: WorkflowValidationRequest,
    workflow_service: WorkflowService = Depends(get_workflow_service)
) -> WorkflowValidationResponse:
    """
    Validate a workflow structure and configuration.
    """
    try:
        # Convert dict to Workflow model for validation
        workflow = Workflow(**request.workflow)
        validation_result = await workflow_service.validate_workflow_graph(workflow)

        return WorkflowValidationResponse(
            valid=validation_result.get("valid", False),
            errors=validation_result.get("errors", []),
            warnings=validation_result.get("warnings", []),
            timestamp=datetime.now().isoformat()
        )
    except Exception as e:
        logger.error(f"Workflow validation error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Validation error: {str(e)}")

@router.post("/workflows/optimize", response_model=WorkflowOptimizationResponse)
async def optimize_workflow_endpoint(
    request: WorkflowOptimizationRequest,
    workflow_service: WorkflowService = Depends(get_workflow_service)
) -> WorkflowOptimizationResponse:
    """
    Optimize a workflow for better performance.
    """
    try:
        # Convert dict to Workflow model
        workflow = Workflow(**request.workflow)

        # Map optimization level
        from ..services.query_optimizer import OptimizationLevel
        optimization_level_map = {
            "standard": OptimizationLevel.STANDARD,
            "aggressive": OptimizationLevel.AGGRESSIVE,
            "conservative": OptimizationLevel.CONSERVATIVE
        }
        optimization_level = optimization_level_map.get(request.optimization_level, OptimizationLevel.STANDARD)

        optimization_result = await workflow_service.optimize_workflow(
            workflow=workflow,
            optimization_level=optimization_level,
            schema=request.schema,
            business_rules=request.business_rules
        )

        return WorkflowOptimizationResponse(
            success="error" not in optimization_result,
            optimized_workflow=optimization_result.get("optimized_workflow"),
            optimization_applied=optimization_result.get("optimization_applied", []),
            validation_results=optimization_result.get("validation_results", {}),
            performance_improvements=optimization_result.get("performance_improvements", []),
            error=optimization_result.get("error")
        )
    except Exception as e:
        logger.error(f"Workflow optimization error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Optimization error: {str(e)}")