"""
Node Registry System for Custom Node Management

This module provides a persistent registry for custom node definitions,
supporting CRUD operations, validation, and integration with the node factory.
"""

import json
import os
import asyncio
from typing import Dict, Any, List, Optional, Set
from pathlib import Path
from datetime import datetime
import hashlib
import uuid

from .node_factory import (
    CustomNodeDefinition,
    DynamicNodeFactory,
    NodeValidationError,
    NodeRegistrationError,
    node_factory
)


class NodeRegistry:
    """Persistent registry for custom node definitions"""

    def __init__(self, storage_path: str = "data/custom_nodes"):
        self.storage_path = Path(storage_path)
        self.storage_path.mkdir(parents=True, exist_ok=True)

        self.definitions_file = self.storage_path / "definitions.json"
        self.metadata_file = self.storage_path / "metadata.json"

        self._definitions: Dict[str, CustomNodeDefinition] = {}
        self._metadata: Dict[str, Dict[str, Any]] = {}

        # Load existing data
        self._load_registry()

    def _load_registry(self):
        """Load registry data from disk"""
        # Load definitions
        if self.definitions_file.exists():
            try:
                with open(self.definitions_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    for node_type, defn_data in data.items():
                        self._definitions[node_type] = CustomNodeDefinition(**defn_data)
            except (json.JSONDecodeError, KeyError) as e:
                print(f"Warning: Failed to load node definitions: {e}")

        # Load metadata
        if self.metadata_file.exists():
            try:
                with open(self.metadata_file, 'r', encoding='utf-8') as f:
                    self._metadata = json.load(f)
            except json.JSONDecodeError as e:
                print(f"Warning: Failed to load registry metadata: {e}")

    def _save_registry(self):
        """Save registry data to disk"""
        # Save definitions
        definitions_data = {}
        for node_type, defn in self._definitions.items():
            definitions_data[node_type] = {
                "type": defn.type,
                "name": defn.name,
                "description": defn.description,
                "version": defn.version,
                "inputs": defn.inputs,
                "outputs": defn.outputs,
                "params_schema": defn.params_schema,
                "implementation": defn.implementation,
                "config": defn.config,
                "metadata": defn.metadata
            }

        with open(self.definitions_file, 'w', encoding='utf-8') as f:
            json.dump(definitions_data, f, indent=2, ensure_ascii=False)

        # Save metadata
        with open(self.metadata_file, 'w', encoding='utf-8') as f:
            json.dump(self._metadata, f, indent=2, ensure_ascii=False)

    def register_node(self, definition: CustomNodeDefinition,
                     user_id: Optional[str] = None) -> str:
        """Register a new custom node definition"""
        # Validate definition
        node_factory.validate_definition(definition)

        # Check if node type already exists
        if definition.type in self._definitions:
            raise NodeRegistrationError(f"Node type '{definition.type}' already exists")

        # Generate unique ID for this registration
        registration_id = str(uuid.uuid4())

        # Add to registry
        self._definitions[definition.type] = definition

        # Add metadata
        self._metadata[definition.type] = {
            "registration_id": registration_id,
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat(),
            "user_id": user_id,
            "version": definition.version,
            "status": "active",
            "usage_count": 0
        }

        # Register with factory
        node_factory.register_node_definition(definition)

        # Save to disk
        self._save_registry()

        return registration_id

    def update_node(self, node_type: str, definition: CustomNodeDefinition,
                   user_id: Optional[str] = None) -> bool:
        """Update an existing node definition"""
        if node_type not in self._definitions:
            raise NodeRegistrationError(f"Node type '{node_type}' not found")

        # Validate new definition
        node_factory.validate_definition(definition)

        # Ensure type matches
        if definition.type != node_type:
            raise NodeValidationError("Cannot change node type during update")

        # Update definition
        self._definitions[node_type] = definition

        # Update metadata
        if node_type in self._metadata:
            self._metadata[node_type]["updated_at"] = datetime.now().isoformat()
            self._metadata[node_type]["version"] = definition.version
            if user_id:
                self._metadata[node_type]["user_id"] = user_id

        # Re-register with factory
        node_factory.register_node_definition(definition)

        # Save to disk
        self._save_registry()

        return True

    def unregister_node(self, node_type: str) -> bool:
        """Unregister a node definition"""
        if node_type not in self._definitions:
            return False

        # Remove from registry
        del self._definitions[node_type]

        # Remove metadata
        self._metadata.pop(node_type, None)

        # Unregister from factory
        node_factory.unregister_node(node_type)

        # Save to disk
        self._save_registry()

        return True

    def get_node(self, node_type: str) -> Optional[CustomNodeDefinition]:
        """Get a node definition by type"""
        return self._definitions.get(node_type)

    def list_nodes(self, user_id: Optional[str] = None,
                  include_inactive: bool = False) -> List[CustomNodeDefinition]:
        """List all registered node definitions"""
        nodes = []

        for node_type, definition in self._definitions.items():
            metadata = self._metadata.get(node_type, {})

            # Filter by user if specified
            if user_id and metadata.get("user_id") != user_id:
                continue

            # Filter inactive nodes unless requested
            if not include_inactive and metadata.get("status") != "active":
                continue

            nodes.append(definition)

        return nodes

    def get_node_metadata(self, node_type: str) -> Optional[Dict[str, Any]]:
        """Get metadata for a node"""
        return self._metadata.get(node_type)

    def increment_usage(self, node_type: str):
        """Increment usage count for a node"""
        if node_type in self._metadata:
            self._metadata[node_type]["usage_count"] = \
                self._metadata[node_type].get("usage_count", 0) + 1
            self._save_registry()

    def deactivate_node(self, node_type: str) -> bool:
        """Deactivate a node (soft delete)"""
        if node_type not in self._metadata:
            return False

        self._metadata[node_type]["status"] = "inactive"
        self._metadata[node_type]["updated_at"] = datetime.now().isoformat()

        # Unregister from factory
        node_factory.unregister_node(node_type)

        self._save_registry()
        return True

    def activate_node(self, node_type: str) -> bool:
        """Reactivate a node"""
        if node_type not in self._metadata:
            return False

        self._metadata[node_type]["status"] = "active"
        self._metadata[node_type]["updated_at"] = datetime.now().isoformat()

        # Re-register with factory
        if node_type in self._definitions:
            node_factory.register_node_definition(self._definitions[node_type])

        self._save_registry()
        return True

    def validate_node_config(self, node_type: str, config: Dict[str, Any]) -> Dict[str, Any]:
        """Validate node configuration against schema"""
        definition = self.get_node(node_type)
        if not definition:
            raise NodeValidationError(f"Unknown node type: {node_type}")

        return node_factory.validate_definition(definition)

    def export_nodes(self, node_types: Optional[List[str]] = None) -> Dict[str, Any]:
        """Export node definitions to a dictionary"""
        if node_types:
            definitions = {nt: self._definitions[nt] for nt in node_types if nt in self._definitions}
            metadata = {nt: self._metadata[nt] for nt in node_types if nt in self._metadata}
        else:
            definitions = self._definitions.copy()
            metadata = self._metadata.copy()

        return {
            "exported_at": datetime.now().isoformat(),
            "definitions": definitions,
            "metadata": metadata
        }

    def import_nodes(self, data: Dict[str, Any], user_id: Optional[str] = None,
                    overwrite: bool = False) -> List[str]:
        """Import node definitions from exported data"""
        imported_types = []

        definitions = data.get("definitions", {})
        metadata = data.get("metadata", {})

        for node_type, defn_data in definitions.items():
            try:
                definition = CustomNodeDefinition(**defn_data)

                # Check if node already exists
                if node_type in self._definitions and not overwrite:
                    continue

                # Register the node
                registration_id = self.register_node(definition, user_id)

                # Restore metadata if available
                if node_type in metadata:
                    self._metadata[node_type] = metadata[node_type]
                    self._metadata[node_type]["registration_id"] = registration_id

                imported_types.append(node_type)

            except Exception as e:
                print(f"Warning: Failed to import node '{node_type}': {e}")
                continue

        # Save after import
        self._save_registry()

        return imported_types

    def get_registry_stats(self) -> Dict[str, Any]:
        """Get registry statistics"""
        total_nodes = len(self._definitions)
        active_nodes = sum(1 for m in self._metadata.values() if m.get("status") == "active")
        inactive_nodes = total_nodes - active_nodes

        user_counts = {}
        for metadata in self._metadata.values():
            user_id = metadata.get("user_id")
            if user_id:
                user_counts[user_id] = user_counts.get(user_id, 0) + 1

        return {
            "total_nodes": total_nodes,
            "active_nodes": active_nodes,
            "inactive_nodes": inactive_nodes,
            "user_counts": user_counts
        }


# Global registry instance
node_registry = NodeRegistry()

# Convenience functions
def register_custom_node(definition: CustomNodeDefinition,
                        user_id: Optional[str] = None) -> str:
    """Register a custom node definition"""
    return node_registry.register_node(definition, user_id)

def get_custom_node(node_type: str) -> Optional[CustomNodeDefinition]:
    """Get a custom node definition"""
    return node_registry.get_node(node_type)

def list_custom_nodes(user_id: Optional[str] = None) -> List[CustomNodeDefinition]:
    """List custom node definitions"""
    return node_registry.list_nodes(user_id)

def unregister_custom_node(node_type: str) -> bool:
    """Unregister a custom node"""
    return node_registry.unregister_node(node_type)