"""
Custom Node API Endpoints

FastAPI endpoints for managing custom node definitions.
"""

from typing import Dict, Any, List, Optional
from fastapi import APIRouter, HTTPException, BackgroundTasks, UploadFile, File
from fastapi.responses import JSONResponse

from ....services.custom_node_service import custom_node_service
from ....models.custom_node import (
    CustomNodeDefinition,
    CustomNodeRegistration,
    CustomNodeValidationResult,
    CustomNodeInfo,
    CustomNodeListItem,
    CustomNodeDeployment,
    CustomNodeLoadRequest,
    CustomNodeLoadResult,
    CustomNodeExportRequest,
    CustomNodeImportRequest,
    RegistryStats
)
from ....nodes.node_registry import node_registry

router = APIRouter()


@router.post("/validate", response_model=CustomNodeValidationResult)
async def validate_node(node_data: CustomNodeDefinition) -> CustomNodeValidationResult:
    """Validate a custom node definition"""
    return await custom_node_service.validate_node(node_data.dict())


@router.post("/register", response_model=CustomNodeRegistration)
async def register_node(
    node_data: CustomNodeDefinition,
    user_id: Optional[str] = None
) -> CustomNodeRegistration:
    """Register a new custom node"""
    registration = await custom_node_service.create_node(node_data.dict(), user_id)

    if registration.status == "failed":
        raise HTTPException(
            status_code=400,
            detail=f"Node registration failed: {', '.join(registration.validation_result.errors)}"
        )

    return registration


@router.put("/{node_type}", response_model=bool)
async def update_node(
    node_type: str,
    node_data: CustomNodeDefinition,
    user_id: Optional[str] = None
) -> bool:
    """Update an existing custom node"""
    success = await custom_node_service.update_node(node_type, node_data.dict(), user_id)

    if not success:
        raise HTTPException(status_code=404, detail=f"Node '{node_type}' not found or update failed")

    return True


@router.delete("/{node_type}", response_model=bool)
async def delete_node(node_type: str, user_id: Optional[str] = None) -> bool:
    """Delete a custom node"""
    success = await custom_node_service.delete_node(node_type, user_id)

    if not success:
        raise HTTPException(status_code=404, detail=f"Node '{node_type}' not found or deletion failed")

    return True


@router.get("/{node_type}", response_model=CustomNodeInfo)
async def get_node(node_type: str) -> CustomNodeInfo:
    """Get a custom node definition"""
    node_info = await custom_node_service.get_node(node_type)

    if not node_info:
        raise HTTPException(status_code=404, detail=f"Node '{node_type}' not found")

    return CustomNodeInfo(**node_info)


@router.get("/", response_model=List[CustomNodeListItem])
async def list_nodes(
    user_id: Optional[str] = None,
    include_inactive: bool = False
) -> List[CustomNodeListItem]:
    """List custom node definitions"""
    nodes = await custom_node_service.list_nodes(user_id, include_inactive)
    return [CustomNodeListItem(**node) for node in nodes]


@router.post("/{node_type}/deploy", response_model=CustomNodeDeployment)
async def deploy_node(
    node_type: str,
    deployment_config: Optional[Dict[str, Any]] = None
) -> CustomNodeDeployment:
    """Deploy a custom node"""
    if deployment_config is None:
        deployment_config = {}

    result = await custom_node_service.deploy_node(node_type, deployment_config)
    return CustomNodeDeployment(**result)


@router.delete("/{node_type}/deploy", response_model=bool)
async def undeploy_node(node_type: str) -> bool:
    """Undeploy a custom node"""
    success = await custom_node_service.undeploy_node(node_type)

    if not success:
        raise HTTPException(status_code=400, detail=f"Failed to undeploy node '{node_type}'")

    return True


@router.post("/load", response_model=CustomNodeLoadResult)
async def load_nodes(
    request: CustomNodeLoadRequest,
    background_tasks: BackgroundTasks,
    user_id: Optional[str] = None
) -> CustomNodeLoadResult:
    """Load custom nodes from external source"""
    try:
        if request.source_type == "file" and request.source_path:
            loaded_types = await custom_node_service.load_nodes_from_file(request.source_path, user_id)
        elif request.source_type == "directory" and request.source_path:
            loaded_types = await custom_node_service.load_nodes_from_directory(request.source_path, user_id)
        else:
            raise HTTPException(status_code=400, detail="Invalid source type or missing source path")

        return CustomNodeLoadResult(
            loaded_types=loaded_types,
            failed_types=[],
            errors=[]
        )

    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to load nodes: {str(e)}")


@router.post("/upload", response_model=CustomNodeLoadResult)
async def upload_nodes(
    file: UploadFile = File(...),
    user_id: Optional[str] = None
) -> CustomNodeLoadResult:
    """Upload and load custom nodes from file"""
    try:
        # Read file content
        content = await file.read()
        file_content = content.decode('utf-8')

        # Parse JSON
        import json
        data = json.loads(file_content)

        # Import nodes
        imported_types = await custom_node_service.import_nodes(data, user_id)

        return CustomNodeLoadResult(
            loaded_types=imported_types,
            failed_types=[],
            errors=[]
        )

    except json.JSONDecodeError as e:
        raise HTTPException(status_code=400, detail=f"Invalid JSON file: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to upload nodes: {str(e)}")


@router.post("/export", response_model=Dict[str, Any])
async def export_nodes(request: CustomNodeExportRequest) -> Dict[str, Any]:
    """Export custom node definitions"""
    try:
        export_data = await custom_node_service.export_nodes(request.node_types)
        return export_data
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to export nodes: {str(e)}")


@router.post("/import", response_model=List[str])
async def import_nodes(
    request: CustomNodeImportRequest,
    user_id: Optional[str] = None
) -> List[str]:
    """Import custom node definitions"""
    try:
        imported_types = await custom_node_service.import_nodes(request.data, user_id)
        return imported_types
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to import nodes: {str(e)}")


@router.get("/stats", response_model=RegistryStats)
async def get_registry_stats() -> RegistryStats:
    """Get registry statistics"""
    stats = custom_node_service.get_registry_stats()
    return RegistryStats(**stats)


@router.get("/deployments", response_model=Dict[str, Dict[str, Any]])
async def get_active_deployments() -> Dict[str, Dict[str, Any]]:
    """Get active node deployments"""
    return custom_node_service.get_active_deployments()


@router.post("/{node_type}/activate", response_model=bool)
async def activate_node(node_type: str) -> bool:
    """Activate a custom node"""
    # This would be an admin operation
    success = node_registry.activate_node(node_type)

    if not success:
        raise HTTPException(status_code=404, detail=f"Node '{node_type}' not found")

    return True


@router.post("/{node_type}/deactivate", response_model=bool)
async def deactivate_node(node_type: str) -> bool:
    """Deactivate a custom node"""
    # This would be an admin operation
    success = node_registry.deactivate_node(node_type)

    if not success:
        raise HTTPException(status_code=404, detail=f"Node '{node_type}' not found")

    return True