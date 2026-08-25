from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Dict, Any, Optional
from app.services.obsidian_service import ObsidianService, get_obsidian_service
from app.services.workflow_service import WorkflowService, get_workflow_service

router = APIRouter()

@router.get("/results")
async def list_results(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    status: Optional[str] = Query(None),
    workflow_service: WorkflowService = Depends(get_workflow_service),
):
    """Paginated results for Runs/Results pages — aggregates Runs as RunResult."""
    all_runs = list(workflow_service.runs.values())
    # filter by status if provided
    if status and status != "all":
        all_runs = [r for r in all_runs if r.status == status]
    # sort newest first
    all_runs.sort(key=lambda r: r.started_at or r.id, reverse=True)
    total = len(all_runs)
    sliced = all_runs[offset: offset + limit]
    results = []
    for run in sliced:
        started = run.started_at.isoformat() + "Z" if run.started_at else ""
        completed = run.completed_at.isoformat() + "Z" if run.completed_at else None
        # map to RunResult shape expected by frontend
        results.append({
            "execution_id": run.id,
            "workflow_id": run.workflow_id,
            "status": run.status,
            "started_at": started,
            "completed_at": completed,
            "duration": run.execution_time,
            "execution_time": run.execution_time,
            "results": run.node_results,
            "node_results": run.node_results,
            "error": run.error,
        })
    return {"results": results, "pagination": {"total": total, "limit": limit, "offset": offset}}

@router.get("/results/{execution_id}")
async def get_result_by_id(
    execution_id: str,
    workflow_service: WorkflowService = Depends(get_workflow_service),
):
    """Single result by execution_id — matches frontend resultsService.getResult."""
    run = workflow_service.runs.get(execution_id)
    if not run:
        # also try as result id
        result = workflow_service.results.get(execution_id)
        if result:
            # synthesize RunResult from Result
            return {
                "execution_id": result.run_id,
                "workflow_id": result.workflow_id,
                "status": "completed",
                "started_at": result.created_at.isoformat() + "Z",
                "completed_at": None,
                "duration": None,
                "results": result.data,
                "error": None,
            }
        raise HTTPException(status_code=404, detail="Result not found")
    started = run.started_at.isoformat() + "Z" if run.started_at else ""
    completed = run.completed_at.isoformat() + "Z" if run.completed_at else None
    return {
        "execution_id": run.id,
        "workflow_id": run.workflow_id,
        "status": run.status,
        "started_at": started,
        "completed_at": completed,
        "duration": run.execution_time,
        "execution_time": run.execution_time,
        "results": run.node_results,
        "node_results": run.node_results,
        "error": run.error,
    }

# Alias for frontend's workflows/runs/cancel path
@router.post("/workflows/runs/{run_id}/cancel")
@router.post("/runs/{run_id}/cancel")
async def cancel_run_alias(
    run_id: str,
    workflow_service: WorkflowService = Depends(get_workflow_service),
):
    try:
        ok = await workflow_service.cancel_execution(run_id)
        return {"success": ok, "run_id": run_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/results/stats/top")
async def top_workflows_stats(
    limit: int = Query(5, ge=1, le=50),
    workflow_service: WorkflowService = Depends(get_workflow_service),
):
    """Top workflows by run count for the Dashboard Launchpad."""
    counts: Dict[str, Dict[str, Any]] = {}
    for run in workflow_service.runs.values():
        wf_id = run.workflow_id
        entry = counts.setdefault(wf_id, {"workflow_id": wf_id, "count": 0, "last_run": ""})
        entry["count"] += 1
        started = run.started_at.isoformat() + "Z" if run.started_at else ""
        if started > entry["last_run"]:
            entry["last_run"] = started
    top = sorted(counts.values(), key=lambda x: x["count"], reverse=True)[:limit]
    return top

@router.post("/save-research-report")
async def save_research_report(
    data: Dict[str, Any],
    obsidian_service: ObsidianService = Depends(get_obsidian_service)
):
    """
    Manually save a research report to Obsidian.
    """
    try:
        filepath = obsidian_service.save_research_report(data)
        return {"message": "Research report saved to Obsidian", "filepath": filepath}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save research report: {str(e)}")

@router.post("/save-youtube-analysis")
async def save_youtube_analysis(
    data: Dict[str, Any],
    obsidian_service: ObsidianService = Depends(get_obsidian_service)
):
    """
    Manually save YouTube analysis to Obsidian.
    """
    try:
        filepath = obsidian_service.save_youtube_analysis(data)
        return {"message": "YouTube analysis saved to Obsidian", "filepath": filepath}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save YouTube analysis: {str(e)}")

@router.post("/save-chat-capture")
async def save_chat_capture(
    data: Dict[str, Any],
    obsidian_service: ObsidianService = Depends(get_obsidian_service)
):
    """
    Manually save chat capture to Obsidian.
    """
    try:
        filepath = obsidian_service.save_chat_capture(data)
        return {"message": "Chat capture saved to Obsidian", "filepath": filepath}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save chat capture: {str(e)}")

@router.get("/obsidian-status")
async def get_obsidian_status(
    obsidian_service: ObsidianService = Depends(get_obsidian_service)
):
    """
    Get the status of Obsidian integration.
    """
    try:
        # Check if vault path is configured
        vault_path = obsidian_service.vault_path
        if vault_path:
            return {"status": "configured", "vault_path": vault_path}
        else:
            return {"status": "not_configured"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@router.get("/workflow-results/{execution_id}")
async def get_workflow_results(
    execution_id: str,
    workflow_service: WorkflowService = Depends(get_workflow_service)
):
    """
    Get workflow execution results, including Obsidian saved files.
    """
    execution = workflow_service.get_execution_status(execution_id)
    if not execution:
        raise HTTPException(status_code=404, detail="Workflow execution not found")

    return {
        "execution_id": execution.id,
        "status": execution.status,
        "started_at": execution.started_at,
        "completed_at": execution.completed_at,
        "results": execution.results
    }
