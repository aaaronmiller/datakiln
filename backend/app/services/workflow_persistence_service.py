import json
import os
import uuid
from datetime import datetime
from typing import Dict, List, Optional, Any
from pathlib import Path
import logging

from ..models.workflow import Workflow, WorkflowMetadata

logger = logging.getLogger(__name__)

class WorkflowPersistenceService:
    """
    Service for persisting workflows (query graphs) to JSON files.
    Provides CRUD operations with versioning and metadata support.
    """

    def __init__(self, storage_dir: str = "data/workflows"):
        self.storage_dir = Path(storage_dir)
        self.storage_dir.mkdir(parents=True, exist_ok=True)
        self._workflows_file = self.storage_dir / "workflows.json"
        self._versions_dir = self.storage_dir / "versions"
        self._versions_dir.mkdir(exist_ok=True)

        # Initialize storage if needed
        self._initialize_storage()

    def _initialize_storage(self):
        """Initialize storage files if they don't exist."""
        if not self._workflows_file.exists():
            self._save_workflows_index({})

    def _save_workflows_index(self, index: Dict[str, Any]):
        """Save the workflows index to file."""
        with open(self._workflows_file, 'w', encoding='utf-8') as f:
            json.dump(index, f, indent=2, ensure_ascii=False)

    def _load_workflows_index(self) -> Dict[str, Any]:
        """Load the workflows index from file."""
        try:
            with open(self._workflows_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        except (FileNotFoundError, json.JSONDecodeError):
            return {}

    def _get_workflow_file_path(self, workflow_id: str) -> Path:
        """Get the file path for a specific workflow."""
        return self.storage_dir / f"{workflow_id}.json"

    def _get_version_file_path(self, workflow_id: str, version: int) -> Path:
        """Get the file path for a specific workflow version."""
        return self._versions_dir / f"{workflow_id}_v{version}.json"

    def save_workflow(self, workflow: Workflow, user_id: Optional[str] = None, expected_version: Optional[int] = None) -> str:
        """
        Save a workflow to persistent storage with conflict detection.

        Args:
            workflow: The workflow to save
            user_id: ID of the user making the change
            expected_version: Expected current version for conflict detection

        Returns:
            The workflow ID

        Raises:
            ValueError: If version conflict is detected
        """
        try:
            # Ensure workflow has an ID
            if not workflow.id:
                workflow.id = str(uuid.uuid4())

            # Load existing workflow to check for conflicts
            existing_workflow = self.load_workflow(workflow.id)
            if existing_workflow and expected_version is not None:
                current_version = existing_workflow.metadata.version if existing_workflow.metadata else 1
                if current_version != expected_version:
                    raise ValueError(f"Version conflict detected. Current version is {current_version}, but expected {expected_version}")

            # Update metadata timestamps and user info
            now = datetime.now().isoformat()
            if not workflow.metadata:
                workflow.metadata = WorkflowMetadata()

            if not workflow.metadata.createdAt:
                workflow.metadata.createdAt = now
            workflow.metadata.updatedAt = now

            # Update version and author
            if existing_workflow:
                workflow.metadata.version = (existing_workflow.metadata.version if existing_workflow.metadata else 1) + 1
            else:
                workflow.metadata.version = 1

            if user_id:
                workflow.metadata.author = user_id

            # Convert to dict for JSON serialization
            workflow_dict = self._workflow_to_dict(workflow)

            # Save current version to versions directory
            version_file = self._get_version_file_path(workflow.id, workflow.metadata.version)
            with open(version_file, 'w', encoding='utf-8') as f:
                json.dump(workflow_dict, f, indent=2, ensure_ascii=False)

            # Save to main workflow file
            workflow_file = self._get_workflow_file_path(workflow.id)
            with open(workflow_file, 'w', encoding='utf-8') as f:
                json.dump(workflow_dict, f, indent=2, ensure_ascii=False)

            # Update index
            index = self._load_workflows_index()
            index[workflow.id] = {
                "id": workflow.id,
                "name": workflow.name,
                "description": workflow.description,
                "category": workflow.metadata.category if workflow.metadata else "general",
                "tags": workflow.metadata.tags if workflow.metadata else [],
                "createdAt": workflow.metadata.createdAt if workflow.metadata else now,
                "updatedAt": workflow.metadata.updatedAt if workflow.metadata else now,
                "version": workflow.metadata.version if workflow.metadata else 1,
                "author": workflow.metadata.author if workflow.metadata else user_id,
                "isPublic": workflow.metadata.isPublic if workflow.metadata else False,
                "nodeCount": workflow.nodeCount,
                "edgeCount": workflow.edgeCount,
                "thumbnail": workflow.metadata.thumbnail if workflow.metadata else None
            }
            self._save_workflows_index(index)

            logger.info(f"Workflow saved: {workflow.id} (v{workflow.metadata.version}) by user {user_id or 'unknown'}")
            return workflow.id

        except Exception as e:
            logger.error(f"Failed to save workflow: {str(e)}")
            raise

    def load_workflow(self, workflow_id: str) -> Optional[Workflow]:
        """
        Load a workflow from persistent storage.

        Args:
            workflow_id: The workflow ID to load

        Returns:
            The loaded workflow or None if not found
        """
        try:
            workflow_file = self._get_workflow_file_path(workflow_id)
            if not workflow_file.exists():
                return None

            with open(workflow_file, 'r', encoding='utf-8') as f:
                workflow_dict = json.load(f)

            workflow = self._dict_to_workflow(workflow_dict)
            logger.info(f"Workflow loaded: {workflow_id}")
            return workflow

        except Exception as e:
            logger.error(f"Failed to load workflow {workflow_id}: {str(e)}")
            return None

    def delete_workflow(self, workflow_id: str) -> bool:
        """
        Delete a workflow from persistent storage.

        Args:
            workflow_id: The workflow ID to delete

        Returns:
            True if deleted, False if not found
        """
        try:
            # Remove from index
            index = self._load_workflows_index()
            if workflow_id not in index:
                return False

            del index[workflow_id]
            self._save_workflows_index(index)

            # Remove workflow file
            workflow_file = self._get_workflow_file_path(workflow_id)
            if workflow_file.exists():
                workflow_file.unlink()

            # Remove all versions
            for version_file in self._versions_dir.glob(f"{workflow_id}_v*.json"):
                version_file.unlink()

            logger.info(f"Workflow deleted: {workflow_id}")
            return True

        except Exception as e:
            logger.error(f"Failed to delete workflow {workflow_id}: {str(e)}")
            return False

    def list_workflows(self, filters: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        """
        List all workflows with optional filtering.

        Args:
            filters: Optional filters (category, tags, author, etc.)

        Returns:
            List of workflow metadata
        """
        try:
            index = self._load_workflows_index()
            workflows = list(index.values())

            if filters:
                # Apply filters
                if 'category' in filters:
                    workflows = [w for w in workflows if w.get('category') == filters['category']]

                if 'tags' in filters and filters['tags']:
                    workflows = [w for w in workflows if any(tag in (w.get('tags') or []) for tag in filters['tags'])]

                if 'author' in filters:
                    workflows = [w for w in workflows if w.get('author') == filters['author']]

                if 'search' in filters:
                    search_term = filters['search'].lower()
                    workflows = [w for w in workflows if
                               search_term in w.get('name', '').lower() or
                               search_term in (w.get('description') or '').lower() or
                               any(search_term in tag.lower() for tag in (w.get('tags') or []))]

            return workflows

        except Exception as e:
            logger.error(f"Failed to list workflows: {str(e)}")
            return []

    def update_workflow_metadata(self, workflow_id: str, metadata: Dict[str, Any]) -> bool:
        """
        Update workflow metadata without changing the workflow structure.

        Args:
            workflow_id: The workflow ID
            metadata: Metadata updates

        Returns:
            True if updated, False if not found
        """
        try:
            workflow = self.load_workflow(workflow_id)
            if not workflow:
                return False

            if not workflow.metadata:
                workflow.metadata = WorkflowMetadata()

            # Update metadata fields
            for key, value in metadata.items():
                if hasattr(workflow.metadata, key):
                    setattr(workflow.metadata, key, value)

            workflow.metadata.updatedAt = datetime.now().isoformat()

            # Save updated workflow
            self.save_workflow(workflow)
            return True

        except Exception as e:
            logger.error(f"Failed to update workflow metadata {workflow_id}: {str(e)}")
            return False

    def create_version(self, workflow_id: str, new_name: Optional[str] = None) -> Optional[str]:
        """
        Create a new version of a workflow.

        Args:
            workflow_id: The workflow ID to version
            new_name: Optional new name for the version

        Returns:
            The new workflow ID if created, None if failed
        """
        try:
            workflow = self.load_workflow(workflow_id)
            if not workflow:
                return None

            # Create new workflow with incremented version
            new_workflow = workflow.model_copy(deep=True)
            new_workflow.id = str(uuid.uuid4())
            if new_name:
                new_workflow.name = new_name
            if new_workflow.metadata:
                new_workflow.metadata.version = 1
                new_workflow.metadata.createdAt = datetime.now().isoformat()
                new_workflow.metadata.updatedAt = datetime.now().isoformat()

            return self.save_workflow(new_workflow)

        except Exception as e:
            logger.error(f"Failed to create version of workflow {workflow_id}: {str(e)}")
            return None

    def get_workflow_versions(self, workflow_id: str) -> List[Dict[str, Any]]:
        """
        Get all versions of a workflow.

        Args:
            workflow_id: The workflow ID

        Returns:
            List of version metadata
        """
        try:
            versions = []
            for version_file in self._versions_dir.glob(f"{workflow_id}_v*.json"):
                try:
                    with open(version_file, 'r', encoding='utf-8') as f:
                        workflow_dict = json.load(f)

                    versions.append({
                        "id": workflow_dict.get("id"),
                        "version": workflow_dict.get("metadata", {}).get("version", 1),
                        "name": workflow_dict.get("name"),
                        "updatedAt": workflow_dict.get("metadata", {}).get("updatedAt"),
                        "nodeCount": len(workflow_dict.get("nodes", [])),
                        "edgeCount": len(workflow_dict.get("edges", []))
                    })
                except Exception as e:
                    logger.warning(f"Failed to load version file {version_file}: {str(e)}")

            return sorted(versions, key=lambda v: v.get("version", 0), reverse=True)

        except Exception as e:
            logger.error(f"Failed to get versions for workflow {workflow_id}: {str(e)}")
            return []

    def export_workflow(self, workflow_id: str) -> Optional[str]:
        """
        Export a workflow to JSON string.

        Args:
            workflow_id: The workflow ID to export

        Returns:
            JSON string of the workflow or None if not found
        """
        try:
            workflow = self.load_workflow(workflow_id)
            if not workflow:
                return None

            workflow_dict = self._workflow_to_dict(workflow)
            return json.dumps(workflow_dict, indent=2, ensure_ascii=False)

        except Exception as e:
            logger.error(f"Failed to export workflow {workflow_id}: {str(e)}")
            return None

    def import_workflow(self, json_data: str) -> Optional[str]:
        """
        Import a workflow from JSON string.

        Args:
            json_data: JSON string of the workflow

        Returns:
            The imported workflow ID or None if failed
        """
        try:
            workflow_dict = json.loads(json_data)

            # Validate the workflow structure
            validation_errors = self._validate_workflow_dict(workflow_dict)
            if validation_errors:
                logger.error(f"Workflow validation failed: {validation_errors}")
                return None

            workflow = self._dict_to_workflow(workflow_dict)

            # Generate new ID to avoid conflicts
            workflow.id = str(uuid.uuid4())
            if workflow.metadata:
                workflow.metadata.createdAt = datetime.now().isoformat()
                workflow.metadata.updatedAt = datetime.now().isoformat()
                workflow.metadata.version = 1

            return self.save_workflow(workflow)

        except Exception as e:
            logger.error(f"Failed to import workflow: {str(e)}")
            return None

    def validate_workflow(self, workflow: Workflow) -> List[str]:
        """
        Validate a workflow structure.

        Args:
            workflow: The workflow to validate

        Returns:
            List of validation errors (empty if valid)
        """
        errors = []

        # Check required fields
        if not workflow.id:
            errors.append("Workflow must have an ID")
        if not workflow.name:
            errors.append("Workflow must have a name")

        # Check nodes
        if not workflow.nodes:
            errors.append("Workflow must have at least one node")

        # Check for duplicate node IDs
        node_ids = [node.id for node in workflow.nodes]
        if len(node_ids) != len(set(node_ids)):
            errors.append("Workflow contains duplicate node IDs")

        # Check edges reference valid nodes
        if workflow.edges:
            for edge in workflow.edges:
                if edge.from_ not in node_ids:
                    errors.append(f"Edge references non-existent source node: {edge.from_}")
                if edge.to not in node_ids:
                    errors.append(f"Edge references non-existent target node: {edge.to}")

        return errors

    def _validate_workflow_dict(self, workflow_dict: Dict[str, Any]) -> List[str]:
        """Validate workflow dictionary structure."""
        errors = []

        # Check required fields
        if not workflow_dict.get("id"):
            errors.append("Workflow must have an ID")
        if not workflow_dict.get("name"):
            errors.append("Workflow must have a name")

        # Check nodes
        nodes = workflow_dict.get("nodes", [])
        if not nodes:
            errors.append("Workflow must have at least one node")

        # Check for duplicate node IDs
        node_ids = [node.get("id") for node in nodes if node.get("id")]
        if len(node_ids) != len(set(node_ids)):
            errors.append("Workflow contains duplicate node IDs")

        # Check edges reference valid nodes
        edges = workflow_dict.get("edges", [])
        if edges:
            for edge in edges:
                source = edge.get("from") or edge.get("from_") or edge.get("source")
                target = edge.get("to") or edge.get("target")
                if source not in node_ids:
                    errors.append(f"Edge references non-existent source node: {source}")
                if target not in node_ids:
                    errors.append(f"Edge references non-existent target node: {target}")

        return errors

    def _workflow_to_dict(self, workflow: Workflow) -> Dict[str, Any]:
        """Convert Workflow object to dictionary."""
        return {
            "id": workflow.id,
            "name": workflow.name,
            "description": workflow.description,
            "metadata": workflow.metadata.model_dump() if workflow.metadata else None,
            "nodes": [node.model_dump() for node in workflow.nodes],
            "edges": [edge.model_dump(by_alias=True) for edge in workflow.edges]
        }

    def _dict_to_workflow(self, workflow_dict: Dict[str, Any]) -> Workflow:
        """Convert dictionary to Workflow object."""
        from ..models.workflow import Node, Edge

        metadata = None
        if workflow_dict.get("metadata"):
            metadata = WorkflowMetadata(**workflow_dict["metadata"])

        nodes = []
        for node_data in workflow_dict.get("nodes", []):
            # Handle extra fields in nodes
            node = Node(**node_data)
            nodes.append(node)

        edges = []
        for edge_data in workflow_dict.get("edges", []):
            edge = Edge(**edge_data)
            edges.append(edge)

        return Workflow(
            id=workflow_dict["id"],
            name=workflow_dict["name"],
            description=workflow_dict.get("description"),
            metadata=metadata,
            nodes=nodes,
            edges=edges
        )

    def detect_conflicts(self, workflow_id: str, user_version: int, user_id: str) -> Dict[str, Any]:
        """
        Detect conflicts for collaborative editing.

        Args:
            workflow_id: The workflow ID
            user_version: The version the user is editing
            user_id: The user ID

        Returns:
            Conflict detection result
        """
        try:
            current_workflow = self.load_workflow(workflow_id)
            if not current_workflow:
                return {
                    "has_conflict": False,
                    "current_version": None,
                    "user_version": user_version,
                    "conflict_details": None
                }

            current_version = current_workflow.metadata.version if current_workflow.metadata else 1

            if current_version != user_version:
                # Get version history to show what changed
                versions = self.get_workflow_versions(workflow_id)
                conflicting_changes = []

                for version_info in versions:
                    if version_info.get("version", 0) > user_version:
                        conflicting_changes.append({
                            "version": version_info.get("version"),
                            "updatedAt": version_info.get("updatedAt"),
                            "author": version_info.get("author"),
                            "changes": f"Modified {version_info.get('nodeCount', 0)} nodes, {version_info.get('edgeCount', 0)} edges"
                        })

                return {
                    "has_conflict": True,
                    "current_version": current_version,
                    "user_version": user_version,
                    "conflict_details": {
                        "conflicting_changes": conflicting_changes,
                        "recommendation": "Please reload the workflow and reapply your changes"
                    }
                }

            return {
                "has_conflict": False,
                "current_version": current_version,
                "user_version": user_version,
                "conflict_details": None
            }

        except Exception as e:
            logger.error(f"Failed to detect conflicts for workflow {workflow_id}: {str(e)}")
            return {
                "has_conflict": True,
                "error": str(e),
                "current_version": None,
                "user_version": user_version,
                "conflict_details": {
                    "error": "Unable to check for conflicts",
                    "recommendation": "Please reload the workflow"
                }
            }

    def get_storage_stats(self) -> Dict[str, Any]:
        """Get storage statistics."""
        try:
            index = self._load_workflows_index()
            total_workflows = len(index)

            # Calculate total size
            total_size = 0
            for workflow_file in self.storage_dir.glob("*.json"):
                if workflow_file.exists():
                    total_size += workflow_file.stat().st_size

            for version_file in self._versions_dir.glob("*.json"):
                if version_file.exists():
                    total_size += version_file.stat().st_size

            return {
                "totalWorkflows": total_workflows,
                "totalSize": total_size,
                "storagePath": str(self.storage_dir)
            }

        except Exception as e:
            logger.error(f"Failed to get storage stats: {str(e)}")
            return {
                "totalWorkflows": 0,
                "totalSize": 0,
                "storagePath": str(self.storage_dir)
            }


# Singleton instance
_workflow_persistence_service = None

def get_workflow_persistence_service() -> WorkflowPersistenceService:
    """Get the singleton workflow persistence service instance."""
    global _workflow_persistence_service
    if _workflow_persistence_service is None:
        _workflow_persistence_service = WorkflowPersistenceService()
    return _workflow_persistence_service