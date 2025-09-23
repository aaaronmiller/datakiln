from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, Any
from ...services.obsidian_service import ObsidianService, get_obsidian_service
from ...services.workflow_service import WorkflowService, get_workflow_service

router = APIRouter()

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