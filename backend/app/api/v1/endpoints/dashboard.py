from fastapi import APIRouter, HTTPException, BackgroundTasks
from typing import Dict, Any, List
from datetime import datetime, timedelta
import random
import subprocess
import json
import uuid
from pathlib import Path

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
async def quick_run_deep_research(request: Dict[str, Any], background_tasks: BackgroundTasks):
    """Quick run deep research task"""
    try:
        # Extract parameters from request
        topic = request.get("topic", "")
        mode = request.get("mode", "balanced")
        concurrency = request.get("concurrency", 3)
        retries = request.get("retries", 2)
        selector_profile = request.get("selector_profile", "balanced")

        if not topic:
            raise HTTPException(status_code=400, detail="Topic is required")

        # Generate unique task ID
        task_id = str(uuid.uuid4())

        # Get project root directory
        project_root = Path(__file__).parent.parent.parent.parent
        script_path = project_root / "backend" / "scripts" / "deep_research.py"

        if not script_path.exists():
            raise HTTPException(status_code=500, detail="Deep research script not found")

        # Start research in background
        background_tasks.add_task(
            run_deep_research_background,
            task_id=task_id,
            script_path=str(script_path),
            project_root=str(project_root),
            topic=topic,
            mode=mode,
            concurrency=concurrency,
            retries=retries,
            selector_profile=selector_profile
        )

        return {
            "task_id": task_id,
            "status": "started",
            "message": f"Deep research task started for topic: {topic}",
            "estimated_time": "2-5 minutes",
            "mode": mode,
            "concurrency": concurrency,
            "retries": retries,
            "selector_profile": selector_profile
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to start deep research: {str(e)}")

async def run_deep_research_background(task_id: str, script_path: str, project_root: str,
                                     topic: str, mode: str, concurrency: int, retries: int,
                                     selector_profile: str):
    """Run deep research in background"""
    try:
        # Run the deep research script
        cmd = [
            "python3", script_path,
            topic,
            "--mode", mode,
            "--concurrency", str(concurrency),
            "--retries", str(retries)
        ]

        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            cwd=project_root,
            timeout=600  # 10 minute timeout
        )

        # Parse result
        if result.returncode == 0:
            status = "completed"
            # Try to extract research ID from output
            research_id = None
            for line in result.stdout.split('\n'):
                if line.startswith("Research ID:"):
                    research_id = line.split(":", 1)[1].strip()
                    break
        else:
            status = "failed"

        # Broadcast completion via WebSocket (if available)
        try:
            from ....main import broadcast_dashboard_update
            await broadcast_dashboard_update("research_completed", {
                "task_id": task_id,
                "status": status,
                "topic": topic,
                "mode": mode,
                "output": result.stdout if result.returncode == 0 else result.stderr
            })
        except:
            pass  # WebSocket broadcast is optional

    except subprocess.TimeoutExpired:
        # Handle timeout
        try:
            from ....main import broadcast_dashboard_update
            await broadcast_dashboard_update("research_completed", {
                "task_id": task_id,
                "status": "timeout",
                "topic": topic,
                "mode": mode,
                "error": "Research timed out after 10 minutes"
            })
        except:
            pass
    except Exception as e:
        # Handle other errors
        try:
            from ....main import broadcast_dashboard_update
            await broadcast_dashboard_update("research_completed", {
                "task_id": task_id,
                "status": "error",
                "topic": topic,
                "mode": mode,
                "error": str(e)
            })
        except:
            pass

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

@router.post("/query/structure")
async def structure_research_query(request: Dict[str, Any]):
    """Structure and enhance a research query before execution"""
    try:
        base_query = request.get("query", "")
        research_mode = request.get("mode", "balanced")
        user_preferences = request.get("preferences", {})

        if not base_query:
            raise HTTPException(status_code=400, detail="Query is required")

        # Generate query structuring options
        structured_options = generate_query_structuring_options(base_query, research_mode, user_preferences)

        return {
            "original_query": base_query,
            "structured_options": structured_options,
            "recommendations": get_query_recommendations(base_query, research_mode),
            "enhancement_suggestions": generate_enhancement_suggestions(base_query)
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Query structuring failed: {str(e)}")

def generate_query_structuring_options(base_query: str, mode: str, preferences: Dict[str, Any]) -> Dict[str, Any]:
    """Generate different ways to structure the research query"""

    options = {
        "focused": {
            "title": "Focused Research",
            "description": "Narrow, specific investigation of the core topic",
            "structured_query": f"Comprehensive analysis of: {base_query}",
            "approach": "Single deep dive with detailed findings",
            "estimated_time": "3-5 minutes"
        },
        "comprehensive": {
            "title": "Comprehensive Research",
            "description": "Broad exploration covering multiple aspects and perspectives",
            "structured_query": f"Multi-faceted investigation of {base_query} including historical context, current developments, and future implications",
            "approach": "Multiple analysis angles with cross-referencing",
            "estimated_time": "5-8 minutes"
        },
        "comparative": {
            "title": "Comparative Analysis",
            "description": "Compare and contrast different approaches, solutions, or perspectives",
            "structured_query": f"Comparative analysis of {base_query}: examining different methodologies, outcomes, and implications",
            "approach": "Side-by-side analysis with pros/cons evaluation",
            "estimated_time": "4-6 minutes"
        },
        "trend_analysis": {
            "title": "Trend Analysis",
            "description": "Focus on patterns, trends, and future projections",
            "structured_query": f"Trend analysis and future projections for {base_query}",
            "approach": "Historical data analysis with predictive modeling",
            "estimated_time": "4-7 minutes"
        }
    }

    # Filter options based on mode
    if mode == "fast":
        # Only show focused option for fast mode
        return {"focused": options["focused"]}
    elif mode == "comprehensive":
        # Show all options for comprehensive mode
        return options
    else:
        # Show focused and comprehensive for balanced mode
        return {
            "focused": options["focused"],
            "comprehensive": options["comprehensive"]
        }

def get_query_recommendations(query: str, mode: str) -> List[Dict[str, Any]]:
    """Get recommendations for improving the research query"""

    recommendations = []

    # Check query length
    if len(query.split()) < 3:
        recommendations.append({
            "type": "expansion",
            "priority": "high",
            "message": "Consider expanding your query with more context or specific aspects to investigate",
            "suggestion": f"Try: '{query} - key aspects, challenges, and solutions'"
        })

    # Check for specificity
    vague_words = ["how to", "what is", "explain", "tell me about"]
    if any(vague_word in query.lower() for vague_word in vague_words):
        recommendations.append({
            "type": "specificity",
            "priority": "medium",
            "message": "Your query could benefit from more specific focus areas",
            "suggestion": "Add specific aspects like 'best practices', 'case studies', or 'implementation details'"
        })

    # Mode-specific recommendations
    if mode == "comprehensive":
        recommendations.append({
            "type": "depth",
            "priority": "medium",
            "message": "For comprehensive research, consider including temporal aspects",
            "suggestion": f"Include: '{query} - historical development, current state, and future trends'"
        })

    return recommendations

def generate_enhancement_suggestions(query: str) -> List[Dict[str, Any]]:
    """Generate suggestions for enhancing the research query"""

    suggestions = [
        {
            "category": "scope",
            "suggestions": [
                f"{query} - current best practices and methodologies",
                f"{query} - real-world applications and case studies",
                f"{query} - challenges, limitations, and solutions"
            ]
        },
        {
            "category": "depth",
            "suggestions": [
                f"{query} - technical implementation details",
                f"{query} - comparative analysis with alternatives",
                f"{query} - future developments and trends"
            ]
        },
        {
            "category": "context",
            "suggestions": [
                f"{query} - industry impact and market analysis",
                f"{query} - regulatory and compliance considerations",
                f"{query} - stakeholder perspectives and requirements"
            ]
        }
    ]

    return suggestions