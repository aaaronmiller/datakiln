from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, Any, List, Optional
import logging
import json
from datetime import datetime
from sse_starlette.sse import EventSourceResponse

# Import our services
from .services.query_engine import get_query_engine
from .services.research_service import initialize_research_service, shutdown_research_service

# Import API routers
from .api.v1.endpoints import dashboard
# Temporarily disabled due to import issues:
# from .api.v1.endpoints import workflows, results, artifacts, extension, selectors
from .api.v1.endpoints import research

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="AI Research Automation Platform",
    description="Backend API for the node-based query system and workflow automation",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],  # Frontend URLs
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Startup and shutdown events
@app.on_event("startup")
async def startup_event():
    """Initialize services on startup."""
    await initialize_research_service()
    logger.info("Application startup complete")

@app.on_event("shutdown")
async def shutdown_event():
    """Clean up services on shutdown."""
    await shutdown_research_service()
    logger.info("Application shutdown complete")

# Include API routers
app.include_router(dashboard.router, prefix="/api/v1/dashboard", tags=["dashboard"])
# Temporarily disabled due to import issues:
# app.include_router(workflows.router, prefix="/api/v1", tags=["workflows"])
# app.include_router(results.router, prefix="/api/v1", tags=["results"])
# app.include_router(artifacts.router, prefix="/api/v1", tags=["artifacts"])
# app.include_router(extension.router, prefix="/api/v1/extension", tags=["extension"])
# app.include_router(selectors.router, prefix="/api/v1/selectors", tags=["selectors"])
app.include_router(research.router, prefix="/api/v1/research", tags=["research"])

# Pydantic models for request/response
class QueryGraphRequest(BaseModel):
    nodes: List[Dict[str, Any]]
    edges: List[Dict[str, Any]]
    context: Optional[Dict[str, Any]] = None

class QueryGraphResponse(BaseModel):
    success: bool
    results: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    execution_time: float
    total_nodes: Optional[int] = None
    completed_nodes: Optional[int] = None
    failed_nodes: Optional[int] = None

class ValidationResponse(BaseModel):
    valid: bool
    errors: List[str]
    warnings: List[str]

@app.get("/")
def read_root():
    return {
        "message": "Welcome to the AI Research Automation Platform",
        "version": "1.0.0",
        "endpoints": {
            "query": {
                "validate": "POST /query/validate",
                "execute": "POST /query/execute"
            },
            "health": "GET /health"
        }
    }

@app.get("/health")
def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "timestamp": "2025-01-21T03:12:48Z",
        "services": {
            "query_engine": "available"
        }
    }

@app.post("/query/validate", response_model=ValidationResponse)
def validate_query_graph(request: QueryGraphRequest):
    """Validate a query graph structure."""
    try:
        query_engine = get_query_engine()
        validation_result = query_engine.validate_query_graph({
            "nodes": request.nodes,
            "edges": request.edges
        })

        return ValidationResponse(
            valid=validation_result["valid"],
            errors=validation_result["errors"],
            warnings=validation_result["warnings"]
        )

    except Exception as e:
        logger.error(f"Validation error: {e}")
        raise HTTPException(status_code=500, detail=f"Validation failed: {str(e)}")

@app.post("/query/execute", response_model=QueryGraphResponse)
async def execute_query_graph(request: QueryGraphRequest):
    """Execute a query graph."""
    try:
        logger.info(f"Executing query graph with {len(request.nodes)} nodes")

        query_engine = get_query_engine()
        result = await query_engine.execute_query_graph({
            "nodes": request.nodes,
            "edges": request.edges
        }, request.context)

        return QueryGraphResponse(**result)

    except Exception as e:
        logger.error(f"Query execution error: {e}")
        raise HTTPException(status_code=500, detail=f"Query execution failed: {str(e)}")

@app.get("/query/execute/stream")
async def execute_query_graph_streaming(request: QueryGraphRequest):
    """Execute a query graph with streaming results."""
    try:
        logger.info(f"Streaming execution of query graph with {len(request.nodes)} nodes")

        query_engine = get_query_engine()
        return EventSourceResponse(
            query_engine.execute_query_graph_streaming({
                "nodes": request.nodes,
                "edges": request.edges
            }, request.context),
            media_type="text/event-stream"
        )

    except Exception as e:
        logger.error(f"Query streaming execution error: {e}")
        raise HTTPException(status_code=500, detail=f"Query streaming execution failed: {str(e)}")

@app.get("/query/node-types")
def get_query_node_types():
    """Get available query node types."""
    from .services.query_engine import QueryNodeType

    return {
        "node_types": [
            {
                "type": node_type.value,
                "description": node_type.name.replace("_", " ").title()
            }
            for node_type in QueryNodeType
        ]
    }

# Workflow endpoints (existing)
@app.post("/workflow/execute")
async def execute_workflow(workflow: Dict[str, Any]):
    """Execute a workflow."""
    try:
        from .services.workflow_service import get_workflow_service
        from .models.workflow import Workflow

        # Convert dict to Workflow model
        workflow_obj = Workflow(**workflow)
        workflow_service = get_workflow_service()
        run_id = await workflow_service.execute_workflow(workflow_obj)

        return {
            "success": True,
            "run_id": run_id,
            "message": "Workflow execution started"
        }
    except Exception as e:
        logger.error(f"Workflow execution failed: {e}")
        raise HTTPException(status_code=500, detail=f"Workflow execution failed: {str(e)}")


@app.post("/chat-logs")
async def receive_chat_logs(chat_data: Dict[str, Any]):
    """Receive chat logs (placeholder for existing functionality)."""
    return {
        "message": "Chat logs received",
        "data": chat_data
    }

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
