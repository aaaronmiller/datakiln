from fastapi import APIRouter, HTTPException
from typing import Dict, Any, List
from datetime import datetime, timedelta
import random

router = APIRouter()

# Mock data for dashboard - in production this would come from database/services
def get_system_status():
    """Get current system status"""
    return {
        "active_runs": random.randint(0, 5),
        "recent_results": random.randint(10, 50),
        "system_health": "healthy",
        "uptime": "2d 14h 32m",
        "cpu_usage": random.uniform(10, 80),
        "memory_usage": random.uniform(20, 90),
        "last_updated": datetime.now().isoformat()
    }

def get_recent_activity(limit: int = 10):
    """Get recent activity feed"""
    activities = [
        {
            "id": f"activity_{i}",
            "type": random.choice(["workflow_completed", "research_started", "transcript_analyzed", "error_occurred"]),
            "title": f"Activity {i}",
            "description": f"Description for activity {i}",
            "timestamp": (datetime.now() - timedelta(minutes=random.randint(1, 1440))).isoformat(),
            "status": random.choice(["success", "warning", "error", "info"])
        }
        for i in range(limit)
    ]
    return sorted(activities, key=lambda x: x["timestamp"], reverse=True)

def get_queue_status():
    """Get current queue status"""
    return {
        "pending_jobs": random.randint(0, 20),
        "processing_jobs": random.randint(0, 5),
        "completed_today": random.randint(50, 200),
        "failed_today": random.randint(0, 10),
        "average_processing_time": f"{random.uniform(5, 30):.1f}s",
        "queue_depth": random.randint(0, 100),
        "last_updated": datetime.now().isoformat()
    }

@router.get("/system-status")
async def get_dashboard_system_status():
    """Get system status for dashboard"""
    return get_system_status()

@router.get("/recent-activity")
async def get_dashboard_recent_activity(limit: int = 10):
    """Get recent activity feed for dashboard"""
    return {"activities": get_recent_activity(limit)}

@router.get("/queue-status")
async def get_dashboard_queue_status():
    """Get queue status for dashboard"""
    return get_queue_status()

@router.post("/quick-run/deep-research")
async def quick_run_deep_research(request: Dict[str, Any]):
    """Quick run deep research task"""
    task_id = f"research_{random.randint(1000, 9999)}"

    return {
        "task_id": task_id,
        "status": "started",
        "message": "Deep research task started",
        "estimated_time": "2-5 minutes"
    }

@router.post("/quick-run/transcript-analysis")
async def quick_run_transcript_analysis(request: Dict[str, Any]):
    """Quick run transcript analysis task"""
    task_id = f"transcript_{random.randint(1000, 9999)}"

    return {
        "task_id": task_id,
        "status": "started",
        "message": "Transcript analysis task started",
        "estimated_time": "1-3 minutes"
    }