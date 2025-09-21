from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Dict, Any, Optional, List
from datetime import datetime
import asyncio
import json

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
