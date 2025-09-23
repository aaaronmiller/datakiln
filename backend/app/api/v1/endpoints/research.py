#!/usr/bin/env python3
"""
Research API Endpoints
Provides REST API endpoints for research operations.
"""

from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import Dict, List, Any, Optional
import logging

from ...services.research_service import get_research_service

logger = logging.getLogger(__name__)

router = APIRouter()

# Pydantic models
class ResearchRequest(BaseModel):
    query: str
    mode: str = "balanced"
    interface: str = "deep_research"

class ResearchStatusResponse(BaseModel):
    research_id: str
    query: str
    mode: str
    interface: str
    status: str
    progress: float
    created_at: str
    started_at: Optional[str] = None
    completed_at: Optional[str] = None
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None

class QueueStatusResponse(BaseModel):
    active_jobs: int
    queued_jobs: int
    max_concurrent: int
    total_jobs: int

@router.post("/start", response_model=Dict[str, str])
async def start_research(request: ResearchRequest, background_tasks: BackgroundTasks):
    """Start a new research job."""
    try:
        service = get_research_service()
        research_id = await service.start_research(
            query=request.query,
            mode=request.mode,
            interface=request.interface
        )

        return {
            "research_id": research_id,
            "message": "Research job started successfully",
            "status": "queued"
        }

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to start research: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to start research: {str(e)}")

@router.get("/status/{research_id}", response_model=ResearchStatusResponse)
async def get_research_status(research_id: str):
    """Get the status of a research job."""
    try:
        service = get_research_service()
        status = service.get_research_status(research_id)

        if not status:
            raise HTTPException(status_code=404, detail=f"Research job {research_id} not found")

        return ResearchStatusResponse(**status)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get research status: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get research status: {str(e)}")

@router.get("/list", response_model=List[ResearchStatusResponse])
async def list_researches(status: Optional[str] = None):
    """List all research jobs, optionally filtered by status."""
    try:
        service = get_research_service()
        researches = service.list_researches(status_filter=status)

        return [ResearchStatusResponse(**research) for research in researches]

    except Exception as e:
        logger.error(f"Failed to list researches: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to list researches: {str(e)}")

@router.get("/queue/status", response_model=QueueStatusResponse)
async def get_queue_status():
    """Get the current research queue status."""
    try:
        service = get_research_service()
        status = service.get_queue_status()

        return QueueStatusResponse(**status)

    except Exception as e:
        logger.error(f"Failed to get queue status: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get queue status: {str(e)}")

@router.delete("/cancel/{research_id}")
async def cancel_research(research_id: str):
    """Cancel a research job."""
    try:
        service = get_research_service()
        cancelled = await service.cancel_research(research_id)

        if not cancelled:
            raise HTTPException(status_code=400, detail=f"Could not cancel research job {research_id}")

        return {
            "research_id": research_id,
            "message": "Research job cancelled successfully"
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to cancel research: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to cancel research: {str(e)}")

@router.get("/modes")
async def get_available_modes():
    """Get available research modes and their configurations."""
    return {
        "modes": {
            "fast": {
                "description": "Quick research with basic follow-ups",
                "max_concurrent": 3,
                "max_follow_ups": 2,
                "recursion_enabled": False,
                "estimated_time": "1-3 minutes"
            },
            "balanced": {
                "description": "Balanced research with moderate depth",
                "max_concurrent": 7,
                "max_follow_ups": 5,
                "recursion_enabled": False,
                "estimated_time": "3-6 minutes"
            },
            "comprehensive": {
                "description": "Deep research with recursion and counter-arguments",
                "max_concurrent": 5,
                "max_follow_ups": 7,
                "recursion_enabled": True,
                "counter_arguments": True,
                "estimated_time": "5-12 minutes"
            }
        }
    }

@router.get("/interfaces")
async def get_available_interfaces():
    """Get available Gemini interfaces."""
    return {
        "interfaces": {
            "canvas": {
                "description": "Gemini Canvas for creative and exploratory research",
                "url": "https://gemini.google.com/canvas"
            },
            "deep_research": {
                "description": "Gemini Deep Research for comprehensive analysis",
                "url": "https://gemini.google.com/deep-research"
            }
        }
    }