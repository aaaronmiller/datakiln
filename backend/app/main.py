from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, Any, List, Optional
import logging

# Import our services
from .services.query_engine import get_query_engine

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
@app.post("/workflows/execute")
async def execute_workflow(workflow: Dict[str, Any]):
    """Execute a workflow (placeholder for existing functionality)."""
    # This would integrate with existing workflow execution
    return {
        "message": "Workflow execution endpoint",
        "workflow": workflow,
        "status": "executed"
    }

@app.get("/research")
def get_research_status():
    """Get research status (placeholder for existing functionality)."""
    return {
        "status": "Research agent ready",
        "available_modes": ["fast", "balanced", "comprehensive"]
    }

@app.post("/research")
async def start_research(research_request: Dict[str, Any]):
    """Start research (placeholder for existing functionality)."""
    return {
        "message": "Research started",
        "request": research_request,
        "task_id": "research_123"
    }

@app.post("/chat-logs")
async def receive_chat_logs(chat_data: Dict[str, Any]):
    """Receive chat logs (placeholder for existing functionality)."""
    return {
        "message": "Chat logs received",
        "data": chat_data
    }
