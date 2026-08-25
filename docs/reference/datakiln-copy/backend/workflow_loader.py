"""
Workflow Loader Utility

Loads workflow JSON definitions from the filesystem and prepares them for execution
via the DAGExecutor. This ensures user-created workflows behave identically to 
system workflows.
"""

import json
import logging
from pathlib import Path
from typing import Dict, Any, Optional, List

logger = logging.getLogger(__name__)

# Default workflows directory
WORKFLOWS_DIR = Path(__file__).parent / "workflows"

# Mapping from extension workflow_id to JSON filename
WORKFLOW_ID_TO_FILE = {
    "youtube-analysis": "youtube_transcript_analysis.json",
    "deep-research": "deep_research_3x6.json",
    # Add more mappings as needed
}


def load_workflow_by_id(workflow_id: str) -> Optional[Dict[str, Any]]:
    """
    Load a workflow JSON definition by its ID.
    
    Args:
        workflow_id: The workflow identifier (e.g., "youtube-analysis")
        
    Returns:
        The workflow dict if found, None otherwise
    """
    # Check if we have a mapped filename
    filename = WORKFLOW_ID_TO_FILE.get(workflow_id)
    if not filename:
        # Try direct filename match
        filename = f"{workflow_id}.json"
    
    filepath = WORKFLOWS_DIR / filename
    
    if not filepath.exists():
        logger.warning(f"Workflow file not found: {filepath}")
        return None
    
    try:
        with open(filepath, 'r') as f:
            workflow = json.load(f)
        logger.info(f"Loaded workflow '{workflow_id}' from {filepath}")
        return workflow
    except json.JSONDecodeError as e:
        logger.error(f"Invalid JSON in workflow file {filepath}: {e}")
        return None
    except Exception as e:
        logger.error(f"Failed to load workflow file {filepath}: {e}")
        return None


def list_available_workflows() -> List[Dict[str, Any]]:
    """
    List all available workflow JSON files in the workflows directory.
    
    Returns:
        List of workflow metadata dicts
    """
    workflows = []
    
    if not WORKFLOWS_DIR.exists():
        logger.warning(f"Workflows directory does not exist: {WORKFLOWS_DIR}")
        return workflows
    
    for filepath in WORKFLOWS_DIR.glob("*.json"):
        try:
            with open(filepath, 'r') as f:
                workflow = json.load(f)
            
            workflows.append({
                "id": workflow.get("id", filepath.stem),
                "name": workflow.get("name", filepath.stem),
                "description": workflow.get("description", ""),
                "filename": filepath.name,
                "node_count": len(workflow.get("nodes", [])),
                "edge_count": len(workflow.get("edges", [])),
                "metadata": workflow.get("metadata", {})
            })
        except Exception as e:
            logger.warning(f"Failed to parse workflow file {filepath}: {e}")
    
    return workflows


def validate_workflow_structure(workflow: Dict[str, Any]) -> Dict[str, Any]:
    """
    Validate that a workflow has the required structure for DAGExecutor.
    
    Args:
        workflow: The workflow dict to validate
        
    Returns:
        Validation result with 'valid', 'errors', and 'warnings' keys
    """
    errors = []
    warnings = []
    
    # Check required fields
    if "nodes" not in workflow:
        errors.append("Workflow missing 'nodes' field")
    elif not isinstance(workflow["nodes"], list):
        errors.append("'nodes' must be an array")
    
    if "edges" not in workflow:
        errors.append("Workflow missing 'edges' field")
    elif not isinstance(workflow["edges"], list):
        errors.append("'edges' must be an array")
    
    # Validate nodes
    if "nodes" in workflow and isinstance(workflow["nodes"], list):
        node_ids = set()
        for node in workflow["nodes"]:
            if not isinstance(node, dict):
                errors.append(f"Node must be an object, got {type(node)}")
                continue
            
            if "id" not in node:
                errors.append("Node missing 'id' field")
            else:
                node_ids.add(node["id"])
            
            if "type" not in node:
                errors.append(f"Node '{node.get('id', 'unknown')}' missing 'type' field")
        
        # Validate edges reference valid nodes
        if "edges" in workflow and isinstance(workflow["edges"], list):
            for edge in workflow["edges"]:
                if not isinstance(edge, dict):
                    errors.append(f"Edge must be an object, got {type(edge)}")
                    continue
                
                from_node = edge.get("from")
                to_node = edge.get("to")
                
                if from_node and from_node not in node_ids:
                    errors.append(f"Edge references unknown 'from' node: {from_node}")
                if to_node and to_node not in node_ids:
                    errors.append(f"Edge references unknown 'to' node: {to_node}")
    
    return {
        "valid": len(errors) == 0,
        "errors": errors,
        "warnings": warnings
    }


def prepare_workflow_for_execution(
    workflow: Dict[str, Any],
    input_data: Dict[str, Any],
    execution_options: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Prepare a workflow for execution by injecting input data and execution options.
    
    Args:
        workflow: The base workflow definition
        input_data: Input data from the trigger (e.g., URL, text content)
        execution_options: Optional execution configuration
        
    Returns:
        The prepared workflow ready for DAGExecutor
    """
    import copy
    
    prepared = copy.deepcopy(workflow)
    
    # Inject execution metadata
    if "execution_data" not in prepared:
        prepared["execution_data"] = {}
    
    prepared["execution_data"]["input_data"] = input_data
    prepared["execution_data"]["execution_options"] = execution_options or {}
    
    # Inject input into first node or nodes without incoming edges
    if "nodes" in prepared and prepared["nodes"]:
        edges = prepared.get("edges", [])
        nodes_with_incoming = {e.get("to") for e in edges if e.get("to")}
        
        for node in prepared["nodes"]:
            node_id = node.get("id")
            if node_id not in nodes_with_incoming:
                # This is an entry node - inject input
                if "inputs" not in node:
                    node["inputs"] = {}
                node["inputs"]["__trigger_input__"] = input_data
    
    return prepared
