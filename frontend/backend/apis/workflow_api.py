"""
Workflow execution API for Phase 1 MVP
"""
from fastapi import APIRouter, HTTPException, BackgroundTasks
from typing import Dict, Any, List
from pydantic import BaseModel
import uuid
from datetime import datetime

from ..executor import WorkflowExecutor
from ..nodes.dom_action_node import DomActionNode, create_dom_action_node


router = APIRouter(prefix="/workflow", tags=["workflow"])


class NodeConfig(BaseModel):
    id: str
    type: str
    name: str
    position: Dict[str, float]
    data: Dict[str, Any]


class WorkflowRequest(BaseModel):
    nodes: List[NodeConfig]
    edges: List[Dict[str, Any]]


class WorkflowResponse(BaseModel):
    execution_id: str
    status: str
    message: str


# In-memory storage for Phase 1 (later replace with database)
execution_results = {}


@router.post("/execute", response_model=WorkflowResponse)
async def execute_workflow(
    request: WorkflowRequest,
    background_tasks: BackgroundTasks
):
    """Execute a workflow with AiDomNodes - Phase 1 MVP"""

    try:
        execution_id = str(uuid.uuid4())

        # Validate that we only have AiDomNodes (Phase 1 requirement)
        valid_nodes = [node for node in request.nodes if node.type == 'ai_dom']
        if not valid_nodes:
            raise HTTPException(
                status_code=400,
                detail="Phase 1 MVP only supports AiDomNodes. No other node types allowed."
            )

        # Start background execution
        background_tasks.add_task(
            execute_ai_dom_workflow,
            execution_id,
            valid_nodes,
            request.edges
        )

        return WorkflowResponse(
            execution_id=execution_id,
            status="started",
            message=f"Phase 1 workflow execution started with {len(valid_nodes)} AiDomNodes"
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/status/{execution_id}")
async def get_execution_status(execution_id: str):
    """Get workflow execution status"""
    if execution_id not in execution_results:
        raise HTTPException(status_code=404, detail="Execution not found")

    return execution_results[execution_id]


async def execute_ai_dom_workflow(execution_id: str, nodes: List[NodeConfig], edges: List[Dict[str, Any]]):
    """Execute Phase 1 AI DOM workflow in background"""

    start_time = datetime.now()
    result = {
        'execution_id': execution_id,
        'status': 'running',
        'start_time': start_time.isoformat(),
        'nodes_executed': [],
        'errors': [],
        'completed_at': None
    }

    try:
        print(f"Starting Phase 1 workflow execution: {execution_id}")

        # Execute nodes in topological order (simplified for Phase 1)
        execution_order = determine_execution_order(nodes, edges)

        for node_config in execution_order:
            try:
                print(f"Executing node: {node_config.name} ({node_config.id})")

                # Create DomActionNode from frontend data
                action_node = create_dom_action_node({
                    'id': node_config.id,
                    'name': node_config.name,
                    'provider': node_config.data.get('provider', 'gemini'),
                    'actions': node_config.data.get('actions', []),
                    'output': node_config.data.get('output', 'clipboard')
                })

                # Execute the node
                node_result = await action_node.execute()

                # Record node execution result
                node_execution = {
                    'node_id': node_config.id,
                    'name': node_config.name,
                    'provider': node_config.data.get('provider'),
                    'success': node_result.get('success', False),
                    'output': node_result.get('output', ''),
                    'execution_time': node_result.get('execution_time', 0),
                    'logs': node_result.get('logs', []),
                    'executed_at': datetime.now().isoformat()
                }

                result['nodes_executed'].append(node_execution)

                if not node_result.get('success', False):
                    result['errors'].append(f"Node {node_config.name} execution failed")

            except Exception as e:
                error_msg = f"Node execution error for {node_config.name}: {str(e)}"
                print(error_msg)
                result['errors'].append(error_msg)

                node_execution = {
                    'node_id': node_config.id,
                    'name': node_config.name,
                    'success': False,
                    'error': str(e),
                    'executed_at': datetime.now().isoformat()
                }
                result['nodes_executed'].append(node_execution)

        # Complete execution
        result['status'] = 'completed' if not result['errors'] else 'completed_with_errors'
        result['completed_at'] = datetime.now().isoformat()

        print(f"Phase 1 workflow execution completed: {execution_id}")

    except Exception as e:
        result['status'] = 'failed'
        result['errors'].append(f"Workflow execution failed: {str(e)}")
        result['completed_at'] = datetime.now().isoformat()
        print(f"Phase 1 workflow execution failed: {str(e)}")

    # Store final result
    execution_results[execution_id] = result


def determine_execution_order(nodes: List[NodeConfig], edges: List[Dict[str, Any]]) -> List[NodeConfig]:
    """Simple topological sort for Phase 1 (no complex dependencies yet)"""
    # For MVP, just return nodes in input order
    # Later phases will implement proper DAG sorting
    return nodes