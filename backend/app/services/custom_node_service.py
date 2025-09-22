"""
Custom Node Management Service

This service provides API endpoints for managing custom node definitions,
including CRUD operations, validation, and deployment.
"""

import asyncio
from typing import Dict, Any, List, Optional
from datetime import datetime
import json
from pathlib import Path

from ..models.custom_node import (
    CustomNodeDefinition,
    CustomNodeRegistration,
    CustomNodeValidationResult
)
from ...nodes.node_factory import node_factory, CustomNodeDefinition as FactoryDefinition
from ...nodes.node_registry import node_registry
from ...nodes.node_validator import node_validator
from ...nodes.node_loader import node_loader


class CustomNodeService:
    """Service for managing custom nodes"""

    def __init__(self):
        self._active_deployments: Dict[str, Dict[str, Any]] = {}

    async def create_node(self, node_data: Dict[str, Any], user_id: Optional[str] = None) -> CustomNodeRegistration:
        """Create a new custom node"""
        try:
            # Convert to factory definition
            factory_def = FactoryDefinition(**node_data)

            # Validate the definition
            validation_result = node_validator.validate_definition(factory_def)
            if not validation_result["valid"]:
                raise ValueError(f"Validation failed: {', '.join(validation_result['errors'])}")

            # Register the node
            registration_id = node_registry.register_node(factory_def, user_id)

            # Create response
            registration = CustomNodeRegistration(
                id=registration_id,
                node_type=node_data["type"],
                user_id=user_id,
                created_at=datetime.now(),
                status="active",
                validation_result=CustomNodeValidationResult(
                    valid=True,
                    errors=[]
                )
            )

            return registration

        except Exception as e:
            # Return failed registration
            return CustomNodeRegistration(
                id="",
                node_type=node_data.get("type", "unknown"),
                user_id=user_id,
                created_at=datetime.now(),
                status="failed",
                validation_result=CustomNodeValidationResult(
                    valid=False,
                    errors=[str(e)]
                )
            )

    async def update_node(self, node_type: str, node_data: Dict[str, Any], user_id: Optional[str] = None) -> bool:
        """Update an existing custom node"""
        try:
            # Check if node exists and user has permission
            existing = node_registry.get_node(node_type)
            if not existing:
                raise ValueError(f"Node type '{node_type}' not found")

            metadata = node_registry.get_node_metadata(node_type)
            if metadata and metadata.get("user_id") and metadata["user_id"] != user_id:
                raise ValueError("Permission denied: cannot update node owned by another user")

            # Convert to factory definition
            factory_def = FactoryDefinition(**node_data)

            # Validate the definition
            validation_result = node_validator.validate_definition(factory_def)
            if not validation_result["valid"]:
                raise ValueError(f"Validation failed: {', '.join(validation_result['errors'])}")

            # Update the node
            success = node_registry.update_node(node_type, factory_def, user_id)

            return success

        except Exception as e:
            print(f"Error updating node {node_type}: {e}")
            return False

    async def delete_node(self, node_type: str, user_id: Optional[str] = None) -> bool:
        """Delete a custom node"""
        try:
            # Check permissions
            metadata = node_registry.get_node_metadata(node_type)
            if metadata and metadata.get("user_id") and metadata["user_id"] != user_id:
                raise ValueError("Permission denied: cannot delete node owned by another user")

            # Delete the node
            success = node_registry.unregister_node(node_type)

            return success

        except Exception as e:
            print(f"Error deleting node {node_type}: {e}")
            return False

    async def get_node(self, node_type: str) -> Optional[Dict[str, Any]]:
        """Get a custom node definition"""
        definition = node_registry.get_node(node_type)
        if not definition:
            return None

        metadata = node_registry.get_node_metadata(node_type)

        return {
            "definition": {
                "type": definition.type,
                "name": definition.name,
                "description": definition.description,
                "version": definition.version,
                "inputs": definition.inputs,
                "outputs": definition.outputs,
                "params_schema": definition.params_schema,
                "implementation": definition.implementation,
                "config": definition.config,
                "metadata": definition.metadata
            },
            "metadata": metadata
        }

    async def list_nodes(self, user_id: Optional[str] = None, include_inactive: bool = False) -> List[Dict[str, Any]]:
        """List custom node definitions"""
        definitions = node_registry.list_nodes(user_id, include_inactive)

        result = []
        for definition in definitions:
            metadata = node_registry.get_node_metadata(definition.type)

            result.append({
                "type": definition.type,
                "name": definition.name,
                "description": definition.description,
                "version": definition.version,
                "metadata": metadata
            })

        return result

    async def validate_node(self, node_data: Dict[str, Any]) -> CustomNodeValidationResult:
        """Validate a node definition without registering it"""
        try:
            factory_def = FactoryDefinition(**node_data)
            validation_result = node_validator.validate_definition(factory_def)

            return CustomNodeValidationResult(
                valid=validation_result["valid"],
                errors=validation_result["errors"]
            )

        except Exception as e:
            return CustomNodeValidationResult(
                valid=False,
                errors=[str(e)]
            )

    async def deploy_node(self, node_type: str, deployment_config: Dict[str, Any]) -> Dict[str, Any]:
        """Deploy a custom node to make it available for execution"""
        try:
            definition = node_registry.get_node(node_type)
            if not definition:
                raise ValueError(f"Node type '{node_type}' not found")

            # Mark as deployed
            deployment_id = f"deploy_{node_type}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"

            self._active_deployments[deployment_id] = {
                "node_type": node_type,
                "config": deployment_config,
                "deployed_at": datetime.now(),
                "status": "active"
            }

            return {
                "deployment_id": deployment_id,
                "node_type": node_type,
                "status": "deployed",
                "message": f"Node {node_type} deployed successfully"
            }

        except Exception as e:
            return {
                "deployment_id": "",
                "node_type": node_type,
                "status": "failed",
                "message": str(e)
            }

    async def undeploy_node(self, node_type: str) -> bool:
        """Undeploy a custom node"""
        try:
            # Find and remove deployments for this node type
            deployments_to_remove = [
                deploy_id for deploy_id, deploy_info in self._active_deployments.items()
                if deploy_info["node_type"] == node_type
            ]

            for deploy_id in deployments_to_remove:
                del self._active_deployments[deploy_id]

            return True

        except Exception as e:
            print(f"Error undeploying node {node_type}: {e}")
            return False

    async def load_nodes_from_file(self, file_path: str, user_id: Optional[str] = None) -> List[str]:
        """Load custom nodes from a file"""
        try:
            loaded_types = await node_loader.load_from_file(file_path, register=True)

            # Update metadata with user_id
            for node_type in loaded_types:
                if user_id:
                    metadata = node_registry.get_node_metadata(node_type)
                    if metadata:
                        metadata["user_id"] = user_id
                        # Save updated metadata
                        node_registry._save_registry()

            return loaded_types

        except Exception as e:
            print(f"Error loading nodes from file {file_path}: {e}")
            return []

    async def load_nodes_from_directory(self, directory_path: str, user_id: Optional[str] = None) -> List[str]:
        """Load custom nodes from a directory"""
        try:
            loaded_types = await node_loader.load_from_directory(directory_path, register=True)

            # Update metadata with user_id
            for node_type in loaded_types:
                if user_id:
                    metadata = node_registry.get_node_metadata(node_type)
                    if metadata:
                        metadata["user_id"] = user_id
                        node_registry._save_registry()

            return loaded_types

        except Exception as e:
            print(f"Error loading nodes from directory {directory_path}: {e}")
            return []

    async def export_nodes(self, node_types: Optional[List[str]] = None) -> Dict[str, Any]:
        """Export custom node definitions"""
        return node_registry.export_nodes(node_types)

    async def import_nodes(self, data: Dict[str, Any], user_id: Optional[str] = None) -> List[str]:
        """Import custom node definitions"""
        try:
            imported_types = node_registry.import_nodes(data, user_id)

            # Update metadata with user_id for newly imported nodes
            for node_type in imported_types:
                if user_id:
                    metadata = node_registry.get_node_metadata(node_type)
                    if metadata:
                        metadata["user_id"] = user_id
                        node_registry._save_registry()

            return imported_types

        except Exception as e:
            print(f"Error importing nodes: {e}")
            return []

    def get_registry_stats(self) -> Dict[str, Any]:
        """Get registry statistics"""
        return node_registry.get_registry_stats()

    def get_active_deployments(self) -> Dict[str, Dict[str, Any]]:
        """Get active deployments"""
        return self._active_deployments.copy()


# Global service instance
custom_node_service = CustomNodeService()