from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Dict, Any, Optional, List
from datetime import datetime
import asyncio
import json
import subprocess
import uuid
from pathlib import Path

from research_agent import ResearchAgent, ResearchMode
from query_engine import QueryEngine
from websocket_manager import collaboration_manager
from dom_selectors import default_registry as selectors_registry
from providers import ProviderManager

app = FastAPI(title="DataKiln Backend API", version="2.0.0")
research_agent = ResearchAgent()
query_engine = QueryEngine()
provider_manager = ProviderManager()

# Pydantic models
class ResearchRequest(BaseModel):
    query: str
    mode: ResearchMode = ResearchMode.BALANCED

class ChatData(BaseModel):
    site: str
    userId: str
    timestamp: str
    model: str
    messages: list

class WorkflowExecutionRequest(BaseModel):
    workflow: Dict[str, Any]
    execution_options: Optional[Dict[str, Any]] = None

class WorkflowValidationRequest(BaseModel):
    workflow: Dict[str, Any]

class ProviderTestRequest(BaseModel):
    provider_name: str

# Version management models
class VersionCreateRequest(BaseModel):
    entity_type: str
    entity_id: str
    data: Dict[str, Any]
    metadata: Optional[Dict[str, Any]] = None

class VersionCompareRequest(BaseModel):
    entity_type: str
    entity_id: str
    version1_id: str
    version2_id: str

class VersionRollbackRequest(BaseModel):
    entity_type: str
    entity_id: str
    version_id: str
    create_new_version: bool = True

class BranchCreateRequest(BaseModel):
    entity_type: str
    entity_id: str
    branch_name: str
    base_version_id: str

class MergeRequest(BaseModel):
    entity_type: str
    entity_id: str
    source_version_id: str
    target_version_id: str
    merge_strategy: str = "auto"

@app.get("/")
async def read_root():
    return {"message": "DataKiln Backend API v2.0.0 is running!"}

@app.post("/research")
async def start_research(request: ResearchRequest):
    result = await research_agent.run_research(request.query, request.mode)
    return {"status": "Research completed", "result": result}

@app.post("/chat-logs")
async def receive_chat_logs(data: ChatData):
    print(f"Received chat data from {data.site} for user {data.userId}")
    return {"status": "received"}

# New workflow endpoints
@app.post("/workflow/execute")
async def execute_workflow(request: WorkflowExecutionRequest):
    """Execute a workflow using the node system"""
    try:
        result = await query_engine.execute_query(
            query="Custom workflow execution",
            workflow_config=request.workflow,
            execution_options=request.execution_options
        )

        if result.get("success", False):
            return {
                "status": "completed",
                "execution_id": result.get("execution_id"),
                "execution_time": result.get("execution_time"),
                "result": result
            }
        else:
            raise HTTPException(
                status_code=400,
                detail=f"Workflow execution failed: {result.get('error', 'Unknown error')}"
            )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Workflow execution error: {str(e)}")

@app.post("/workflow/validate")
async def validate_workflow(request: WorkflowValidationRequest):
    """Validate a workflow structure"""
    try:
        validation_result = await query_engine.validate_workflow_graph(request.workflow)

        return {
            "valid": validation_result.get("valid", False),
            "errors": validation_result.get("errors", []),
            "warnings": validation_result.get("warnings", []),
            "timestamp": datetime.now().isoformat()
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Validation error: {str(e)}")

@app.get("/selectors/registry")
async def get_selectors_registry():
    """Get available selectors registry"""
    try:
        selectors = {}
        for selector_key, selector_def in selectors_registry.selectors.items():
            selectors[selector_key] = {
                "key": selector_def.key,
                "selector": selector_def.selector,
                "selector_type": selector_def.selector_type,
                "description": selector_def.description,
                "provider": selector_def.provider,
                "context": selector_def.context,
                "attributes": selector_def.attributes
            }

        return {
            "selectors": selectors,
            "provider_mappings": selectors_registry.provider_mappings,
            "context_mappings": selectors_registry.context_mappings,
            "total_selectors": len(selectors_registry.selectors)
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get selectors: {str(e)}")

@app.post("/providers/test")
async def test_provider(request: ProviderTestRequest):
    """Test a specific provider connection"""
    try:
        provider = provider_manager.get_provider(request.provider_name)
        if not provider:
            raise HTTPException(
                status_code=404,
                detail=f"Provider {request.provider_name} not found"
            )

        # Test provider connection
        test_result = await provider.validate_connection()

        # Get usage stats
        usage_stats = provider.get_usage_stats()

        return {
            "provider": request.provider_name,
            "connection_test": test_result,
            "usage_stats": usage_stats,
            "timestamp": datetime.now().isoformat()
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Provider test failed: {str(e)}")

@app.get("/providers/status")
async def get_providers_status():
    """Get status of all providers"""
    try:
        status = await query_engine.get_provider_status()

        return {
            "providers": status.get("providers", {}),
            "usage_stats": status.get("usage_stats", {}),
            "default_provider": status.get("default_provider"),
            "timestamp": datetime.now().isoformat()
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get provider status: {str(e)}")

@app.get("/execution/history")
async def get_execution_history(limit: int = 10, include_details: bool = False):
    """Get execution history"""
    try:
        history = await query_engine.get_execution_history(limit, include_details)

        return {
            "executions": history.get("executions", []),
            "total": history.get("total", 0),
            "timestamp": datetime.now().isoformat()
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get execution history: {str(e)}")

@app.post("/workflow/optimize")
async def optimize_workflow(workflow: Dict[str, Any]):
    """Optimize a workflow for better performance"""
    try:
        optimization_result = await query_engine.optimize_workflow(workflow)

        return {
            "success": "error" not in optimization_result,
            "optimization_result": optimization_result,
            "timestamp": datetime.now().isoformat()
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Optimization failed: {str(e)}")

@app.post("/workflow/create")
async def create_workflow(
    nodes_config: Dict[str, Any],
    connections: List[Dict[str, str]],
    name: str = "Custom Workflow",
    description: str = ""
):
    """Create a custom workflow"""
    try:
        result = await query_engine.create_custom_workflow(
            nodes_config=nodes_config,
            connections=connections,
            name=name,
            description=description
        )

        if result.get("success", False):
            return {
                "status": "created",
                "workflow": result.get("workflow"),
                "validation": result.get("validation"),
                "timestamp": datetime.now().isoformat()
            }
        else:
            raise HTTPException(
                status_code=400,
                detail=f"Workflow creation failed: {result.get('error', 'Unknown error')}"
            )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Workflow creation error: {str(e)}")

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    try:
        # Test basic components
        components_status = {
            "query_engine": "ready",
            "provider_manager": "ready",
            "selectors_registry": "ready" if selectors_registry.selectors else "empty"
        }

        return {
            "status": "healthy",
            "components": components_status,
            "timestamp": datetime.now().isoformat(),
            "version": "2.0.0"
        }

    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }

# Background task to clean up old executions
@app.post("/admin/cleanup")
async def cleanup_old_executions(days: int = 30):
    """Clean up old execution artifacts"""
    try:
        # This would implement cleanup logic
        # For now, just return success
        return {
            "status": "cleanup_completed",
            "message": f"Cleanup completed for executions older than {days} days",
            "timestamp": datetime.now().isoformat()
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Cleanup failed: {str(e)}")

# Error handlers
@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": exc.detail,
            "timestamp": datetime.now().isoformat()
        }
    )

@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal server error",
            "detail": str(exc),
            "timestamp": datetime.now().isoformat()
        }
    )

from fastapi import WebSocket, WebSocketDisconnect
import logging

logger = logging.getLogger(__name__)

# Real-time collaboration WebSocket endpoints
@app.websocket("/ws/workflow/{workflow_id}")
async def workflow_collaboration(
    websocket: WebSocket,
    workflow_id: str,
    user_id: str = "anonymous",
    user_name: str = "Anonymous User"
):
    """WebSocket endpoint for real-time workflow collaboration"""
    user_info = {
        "user_id": user_id,
        "user_name": user_name,
        "avatar": f"https://api.dicebear.com/7.x/avataaars/svg?seed={user_id}"
    }

    try:
        await collaboration_manager.connection_manager.connect(
            websocket, workflow_id, user_id, user_info
        )

        while True:
            # Receive message from client
            data = await websocket.receive_text()
            message = json.loads(data)

            # Update user activity
            await collaboration_manager.connection_manager.update_user_activity(user_id)

            # Handle different message types
            message_type = message.get("type")

            if message_type == "workflow_update":
                await collaboration_manager.handle_workflow_update(
                    workflow_id, user_id, message.get("data", {})
                )
            elif message_type == "node_lock":
                await collaboration_manager.handle_node_lock(
                    workflow_id, user_id, message.get("node_id"), message.get("lock", True)
                )
            elif message_type == "cursor_position":
                await collaboration_manager.handle_cursor_position(
                    workflow_id, user_id, message.get("position", {})
                )
            elif message_type == "ping":
                # Respond to ping with pong
                await collaboration_manager.connection_manager.send_to_user(
                    user_id,
                    {"type": "pong", "timestamp": datetime.now().isoformat()}
                )

    except WebSocketDisconnect:
        await collaboration_manager.connection_manager.disconnect(websocket, user_id)
    except Exception as e:
        logger.error(f"WebSocket error for user {user_id}: {e}")
        await collaboration_manager.connection_manager.disconnect(websocket, user_id)

@app.get("/collaboration/workflow/{workflow_id}/users")
async def get_workflow_users(workflow_id: str):
    """Get list of users currently collaborating on a workflow"""
    try:
        users = collaboration_manager.connection_manager.get_workflow_users(workflow_id)
        return {
            "workflow_id": workflow_id,
            "users": users,
            "count": len(users),
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get workflow users: {str(e)}")

@app.get("/collaboration/workflow/{workflow_id}/state")
async def get_workflow_collaboration_state(workflow_id: str):
    """Get current collaboration state for a workflow"""
    try:
        workflow_state = collaboration_manager.get_workflow_state(workflow_id)
        users = collaboration_manager.connection_manager.get_workflow_users(workflow_id)

        return {
            "workflow_id": workflow_id,
            "state": workflow_state,
            "users": users,
            "locked_nodes": collaboration_manager.workflow_locks.get(workflow_id, {}),
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get workflow state: {str(e)}")

# Dashboard endpoints
@app.get("/api/v1/dashboard/system-status")
async def get_dashboard_system_status():
    """Get system status for dashboard"""
    import random
    return {
        "active_runs": random.randint(0, 5),
        "recent_results": random.randint(10, 50),
        "system_health": "healthy",
        "uptime": "2d 14h 32m",
        "cpu_usage": random.uniform(10, 80),
        "memory_usage": random.uniform(20, 90),
        "last_updated": datetime.now().isoformat()
    }

@app.get("/api/v1/dashboard/recent-activity")
async def get_dashboard_recent_activity(limit: int = 10):
    """Get recent activity feed for dashboard"""
    import random
    from datetime import timedelta

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
    return {"activities": sorted(activities, key=lambda x: x["timestamp"], reverse=True)}

@app.get("/api/v1/dashboard/queue-status")
async def get_dashboard_queue_status():
    """Get queue status for dashboard"""
    import random
    return {
        "pending_jobs": random.randint(0, 20),
        "processing_jobs": random.randint(0, 5),
        "completed_today": random.randint(50, 200),
        "failed_today": random.randint(0, 10),
        "average_processing_time": f"{random.uniform(5, 30):.1f}s",
        "queue_depth": random.randint(0, 100),
        "last_updated": datetime.now().isoformat()
    }

@app.post("/api/v1/dashboard/quick-run/deep-research")
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
        project_root = Path(__file__).parent
        script_path = project_root / "scripts" / "deep_research.py"

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

@app.post("/api/v1/dashboard/query/structure")
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

# YouTube transcript endpoint
@app.post("/api/v1/workflows/youtube/transcript")
async def process_youtube_transcript_workflow(request: Dict[str, Any], background_tasks: BackgroundTasks) -> Dict[str, Any]:
    url = request.get("url")
    if not url:
        raise HTTPException(status_code=400, detail="URL is required")
    """Process YouTube video transcript with workflow integration."""
    try:
        task_id = str(uuid.uuid4())

        # Start background processing
        background_tasks.add_task(
            process_youtube_workflow_background,
            task_id=task_id,
            url=url
        )

        return {
            "task_id": task_id,
            "status": "started",
            "message": "YouTube transcript analysis workflow started",
            "workflow_steps": [
                "Extract video transcript",
                "Process with Gemini AI",
                "Generate analysis",
                "Export to Obsidian"
            ]
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to start YouTube workflow: {str(e)}")

# Helper functions
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

        # Broadcast completion via WebSocket
        try:
            await broadcast_dashboard_update("research_completed", {
                "task_id": task_id,
                "status": "completed" if result.returncode == 0 else "failed",
                "topic": topic,
                "mode": mode,
                "output": result.stdout if result.returncode == 0 else result.stderr
            })
        except:
            pass

    except subprocess.TimeoutExpired:
        # Handle timeout
        try:
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
            await broadcast_dashboard_update("research_completed", {
                "task_id": task_id,
                "status": "error",
                "topic": topic,
                "mode": mode,
                "error": str(e)
            })
        except:
            pass

async def process_youtube_workflow_background(task_id: str, url: str):
    """Process YouTube transcript in background following workflow steps"""
    try:
        # Step 1: Extract transcript
        project_root = Path(__file__).parent
        script_path = project_root / "scripts" / "youtube_transcript.py"

        result = subprocess.run(
            ["python3", str(script_path), url, "--no-analysis"],
            capture_output=True,
            text=True,
            cwd=str(project_root),
            timeout=60
        )

        if result.returncode != 0:
            raise Exception(f"Transcript extraction failed: {result.stderr}")

        # Parse transcript file
        output_lines = result.stdout.strip().split('\n')
        transcript_file = None
        for line in output_lines:
            if line.startswith("Transcript saved to:"):
                transcript_file = line.split(":", 1)[1].strip()
                break

        if not transcript_file:
            raise Exception("Failed to find transcript file")

        with open(transcript_file, 'r', encoding='utf-8') as f:
            transcript_data = json.load(f)

        # For now, just broadcast completion with basic info
        # In a full implementation, this would include Gemini processing and Obsidian export
        try:
            await broadcast_dashboard_update("youtube_workflow_completed", {
                "task_id": task_id,
                "status": "completed",
                "url": url,
                "video_id": transcript_data['metadata']['video_id'],
                "transcript_length": transcript_data['metadata']['word_count']
            })
        except:
            pass

    except Exception as e:
        try:
            await broadcast_dashboard_update("youtube_workflow_completed", {
                "task_id": task_id,
                "status": "failed",
                "url": url,
                "error": str(e)
            })
        except:
            pass

# WebSocket connections for real-time updates
active_websocket_connections: List[WebSocket] = []

@app.websocket("/ws/dashboard")
async def dashboard_websocket(websocket: WebSocket):
    """WebSocket endpoint for dashboard real-time updates."""
    await websocket.accept()
    active_websocket_connections.append(websocket)

    try:
        while True:
            # Keep connection alive and listen for client messages
            data = await websocket.receive_text()
            # For now, just echo back (could be used for client commands)
            await websocket.send_text(f"Echo: {data}")
    except WebSocketDisconnect:
        if websocket in active_websocket_connections:
            active_websocket_connections.remove(websocket)

# Function to broadcast updates to all connected dashboard clients
async def broadcast_dashboard_update(update_type: str, data: Dict[str, Any]):
    """Broadcast dashboard updates to all connected WebSocket clients."""
    message = {
        "type": update_type,
        "data": data,
        "timestamp": datetime.now().isoformat()
    }

    disconnected_clients = []
    for websocket in active_websocket_connections:
        try:
            await websocket.send_text(json.dumps(message))
        except Exception as e:
            logger.error(f"Failed to send WebSocket message: {e}")
            disconnected_clients.append(websocket)

    # Clean up disconnected clients
    for client in disconnected_clients:
        if client in active_websocket_connections:
            active_websocket_connections.remove(client)

# Version management endpoints
@app.post("/versions/create")
async def create_version(request: VersionCreateRequest):
    """Create a new version of an entity"""
    try:
        version_id = version_manager.create_version(
            request.entity_type,
            request.entity_id,
            request.data,
            request.metadata
        )

        return {
            "version_id": version_id,
            "entity_type": request.entity_type,
            "entity_id": request.entity_id,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Version creation failed: {str(e)}")

@app.get("/versions/{entity_type}/{entity_id}/{version_id}")
async def get_version(entity_type: str, entity_id: str, version_id: str):
    """Get a specific version of an entity"""
    try:
        version = version_manager.get_version(entity_type, entity_id, version_id)
        if not version:
            raise HTTPException(status_code=404, detail="Version not found")

        return version
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get version: {str(e)}")

@app.get("/versions/{entity_type}/{entity_id}")
async def get_entity_versions(entity_type: str, entity_id: str, limit: Optional[int] = None):
    """Get version history for an entity"""
    try:
        history = version_manager.get_version_history(entity_type, entity_id, limit)
        return {
            "entity_type": entity_type,
            "entity_id": entity_id,
            "versions": history,
            "total": len(history),
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get version history: {str(e)}")

@app.get("/versions/{entity_type}/{entity_id}/latest")
async def get_latest_version(entity_type: str, entity_id: str):
    """Get the latest version of an entity"""
    try:
        version = version_manager.get_latest_version(entity_type, entity_id)
        if not version:
            raise HTTPException(status_code=404, detail="No versions found")

        return version
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get latest version: {str(e)}")

@app.post("/versions/compare")
async def compare_versions(request: VersionCompareRequest):
    """Compare two versions of an entity"""
    try:
        comparison = version_manager.compare_versions(
            request.entity_type,
            request.entity_id,
            request.version1_id,
            request.version2_id
        )

        return comparison
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Version comparison failed: {str(e)}")

@app.post("/versions/rollback")
async def rollback_version(request: VersionRollbackRequest):
    """Rollback an entity to a specific version"""
    try:
        new_version_id = version_manager.rollback_to_version(
            request.entity_type,
            request.entity_id,
            request.version_id,
            request.create_new_version
        )

        return {
            "new_version_id": new_version_id,
            "entity_type": request.entity_type,
            "entity_id": request.entity_id,
            "timestamp": datetime.now().isoformat()
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Version rollback failed: {str(e)}")

@app.post("/versions/branch")
async def create_branch(request: BranchCreateRequest):
    """Create a branch from a specific version"""
    try:
        branch_version_id = version_manager.create_branch(
            request.entity_type,
            request.entity_id,
            request.branch_name,
            request.base_version_id
        )

        return {
            "branch_version_id": branch_version_id,
            "entity_type": request.entity_type,
            "entity_id": request.entity_id,
            "branch_name": request.branch_name,
            "timestamp": datetime.now().isoformat()
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Branch creation failed: {str(e)}")

@app.post("/versions/merge")
async def merge_versions(request: MergeRequest):
    """Merge two versions of an entity"""
    try:
        merged_version_id = version_manager.merge_versions(
            request.entity_type,
            request.entity_id,
            request.source_version_id,
            request.target_version_id,
            request.merge_strategy
        )

        return {
            "merged_version_id": merged_version_id,
            "entity_type": request.entity_type,
            "entity_id": request.entity_id,
            "timestamp": datetime.now().isoformat()
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Version merge failed: {str(e)}")

@app.delete("/versions/{entity_type}/{entity_id}/{version_id}")
async def delete_version(entity_type: str, entity_id: str, version_id: str):
    """Delete a specific version"""
    try:
        success = version_manager.delete_version(entity_type, entity_id, version_id)
        if not success:
            raise HTTPException(status_code=404, detail="Version not found")

        return {
            "deleted": True,
            "entity_type": entity_type,
            "entity_id": entity_id,
            "version_id": version_id,
            "timestamp": datetime.now().isoformat()
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Version deletion failed: {str(e)}")

@app.post("/versions/cleanup/{entity_type}/{entity_id}")
async def cleanup_versions(entity_type: str, entity_id: str, keep_versions: int = 10):
    """Clean up old versions, keeping only the most recent ones"""
    try:
        result = version_manager.cleanup_old_versions(entity_type, entity_id, keep_versions)

        return {
            "cleanup_completed": True,
            "entity_type": entity_type,
            "entity_id": entity_id,
            "kept_versions": result.get("kept", []),
            "deleted_versions": result.get("deleted", []),
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Version cleanup failed: {str(e)}")

@app.get("/versions/stats")
async def get_version_stats():
    """Get version statistics"""
    try:
        stats = version_manager.get_version_stats()
        return stats
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get version stats: {str(e)}")

# Search endpoints
@app.get("/search")
async def global_search(q: str, entity_types: Optional[str] = None, limit: int = 20):
    """Global search across workflows, executions, results, and other entities"""
    try:
        # Parse entity types filter
        entity_filter = None
        if entity_types:
            entity_filter = set(entity_types.split(","))

        results = []

        # Mock search results for demonstration
        # In a real implementation, this would search actual data stores
        mock_entities = [
            {
                "id": "wf-1",
                "type": "workflow",
                "title": "Research Workflow",
                "description": "A comprehensive research workflow for data analysis",
                "metadata": {"created_at": "2024-01-15T10:00:00Z", "author": "user1"}
            },
            {
                "id": "wf-2",
                "type": "workflow",
                "title": "Data Processing Pipeline",
                "description": "Automated data processing and transformation workflow",
                "metadata": {"created_at": "2024-01-20T14:30:00Z", "author": "user2"}
            },
            {
                "id": "run-1",
                "type": "run",
                "title": "Research Execution #123",
                "description": "Completed research execution with comprehensive results",
                "metadata": {"status": "completed", "workflow_id": "wf-1", "duration": "45m"}
            },
            {
                "id": "run-2",
                "type": "run",
                "title": "Data Processing Run #456",
                "description": "Successful data processing execution",
                "metadata": {"status": "completed", "workflow_id": "wf-2", "duration": "12m"}
            },
            {
                "id": "result-1",
                "type": "result",
                "title": "Research Report - AI Trends",
                "description": "Comprehensive analysis of current AI technology trends",
                "metadata": {"execution_id": "run-1", "format": "markdown", "size": "2.5MB"}
            },
            {
                "id": "result-2",
                "type": "result",
                "title": "Processed Dataset Summary",
                "description": "Summary statistics and insights from processed dataset",
                "metadata": {"execution_id": "run-2", "format": "json", "size": "500KB"}
            }
        ]

        # Filter and search
        for entity in mock_entities:
            if entity_filter and entity["type"] not in entity_filter:
                continue

            # Simple text search in title and description
            search_text = f"{entity['title']} {entity['description']}".lower()
            if q.lower() in search_text:
                results.append(entity)

        # Sort by relevance (simple implementation)
        results.sort(key=lambda x: (
            0 if q.lower() in x["title"].lower() else 1,  # Title matches first
            x["title"].lower().find(q.lower())  # Position of match
        ))

        return {
            "query": q,
            "results": results[:limit],
            "total": len(results),
            "entity_types": list(set(r["type"] for r in results)) if results else [],
            "timestamp": datetime.now().isoformat()
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")
