import json
import hashlib
from datetime import datetime
from typing import Dict, Any, Optional, List
from pathlib import Path
import uuid


class VersionManager:
    """Manages versioning and history tracking for workflows and queries"""

    def __init__(self, storage_path: str = "versions"):
        self.storage_path = Path(storage_path)
        self.storage_path.mkdir(exist_ok=True)
        self.versions_file = self.storage_path / "versions.json"
        self.versions: Dict[str, Dict[str, Any]] = self._load_versions()

    def _load_versions(self) -> Dict[str, Dict[str, Any]]:
        """Load versions from storage"""
        if self.versions_file.exists():
            try:
                with open(self.versions_file, 'r') as f:
                    return json.load(f)
            except Exception:
                return {}
        return {}

    def _save_versions(self):
        """Save versions to storage"""
        with open(self.versions_file, 'w') as f:
            json.dump(self.versions, f, indent=2, default=str)

    def _generate_version_hash(self, data: Dict[str, Any]) -> str:
        """Generate hash for version identification"""
        # Create a normalized string representation
        normalized = json.dumps(data, sort_keys=True, separators=(',', ':'))
        return hashlib.sha256(normalized.encode()).hexdigest()[:16]

    def create_version(
        self,
        entity_type: str,
        entity_id: str,
        data: Dict[str, Any],
        metadata: Optional[Dict[str, Any]] = None
    ) -> str:
        """Create a new version of an entity"""
        version_id = str(uuid.uuid4())
        timestamp = datetime.now()

        # Generate content hash for change detection
        content_hash = self._generate_version_hash(data)

        # Create version entry
        version_entry = {
            "version_id": version_id,
            "entity_type": entity_type,
            "entity_id": entity_id,
            "content_hash": content_hash,
            "data": data,
            "metadata": metadata or {},
            "created_at": timestamp.isoformat(),
            "parent_version": self._get_latest_version(entity_type, entity_id)
        }

        # Store version
        if entity_type not in self.versions:
            self.versions[entity_type] = {}
        if entity_id not in self.versions[entity_type]:
            self.versions[entity_type][entity_id] = {}

        self.versions[entity_type][entity_id][version_id] = version_entry

        # Save to disk
        self._save_versions()

        return version_id

    def get_version(
        self,
        entity_type: str,
        entity_id: str,
        version_id: str
    ) -> Optional[Dict[str, Any]]:
        """Get a specific version of an entity"""
        if (entity_type in self.versions and
            entity_id in self.versions[entity_type] and
            version_id in self.versions[entity_type][entity_id]):
            return self.versions[entity_type][entity_id][version_id]
        return None

    def get_latest_version(
        self,
        entity_type: str,
        entity_id: str
    ) -> Optional[Dict[str, Any]]:
        """Get the latest version of an entity"""
        versions = self._get_entity_versions(entity_type, entity_id)
        if not versions:
            return None

        # Return the most recent version
        latest_version_id = max(versions.keys(),
                               key=lambda v: versions[v]["created_at"])
        return versions[latest_version_id]

    def get_version_history(
        self,
        entity_type: str,
        entity_id: str,
        limit: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        """Get version history for an entity"""
        versions = self._get_entity_versions(entity_type, entity_id)
        if not versions:
            return []

        # Sort by creation time (newest first)
        sorted_versions = sorted(
            versions.values(),
            key=lambda v: v["created_at"],
            reverse=True
        )

        if limit:
            sorted_versions = sorted_versions[:limit]

        return sorted_versions

    def compare_versions(
        self,
        entity_type: str,
        entity_id: str,
        version1_id: str,
        version2_id: str
    ) -> Dict[str, Any]:
        """Compare two versions of an entity"""
        version1 = self.get_version(entity_type, entity_id, version1_id)
        version2 = self.get_version(entity_type, entity_id, version2_id)

        if not version1 or not version2:
            raise ValueError("One or both versions not found")

        def find_differences(old_data: Dict, new_data: Dict, path: str = "") -> Dict[str, Any]:
            """Recursively find differences between two data structures"""
            differences = {}

            # Check for key differences
            old_keys = set(old_data.keys())
            new_keys = set(new_data.keys())

            for key in old_keys - new_keys:
                differences[f"{path}.{key}" if path else key] = {
                    "type": "removed",
                    "old_value": old_data[key],
                    "new_value": None
                }

            for key in new_keys - old_keys:
                differences[f"{path}.{key}" if path else key] = {
                    "type": "added",
                    "old_value": None,
                    "new_value": new_data[key]
                }

            # Check for value differences in common keys
            for key in old_keys & new_keys:
                current_path = f"{path}.{key}" if path else key

                if isinstance(old_data[key], dict) and isinstance(new_data[key], dict):
                    nested_diffs = find_differences(old_data[key], new_data[key], current_path)
                    differences.update(nested_diffs)
                elif old_data[key] != new_data[key]:
                    differences[current_path] = {
                        "type": "modified",
                        "old_value": old_data[key],
                        "new_value": new_data[key]
                    }

            return differences

        differences = find_differences(version1["data"], version2["data"])

        return {
            "version1": version1,
            "version2": version2,
            "differences": differences,
            "has_changes": len(differences) > 0
        }

    def rollback_to_version(
        self,
        entity_type: str,
        entity_id: str,
        version_id: str,
        create_new_version: bool = True
    ) -> str:
        """Rollback an entity to a specific version"""
        target_version = self.get_version(entity_type, entity_id, version_id)
        if not target_version:
            raise ValueError(f"Version {version_id} not found")

        # Create new version for the rollback if requested
        if create_new_version:
            metadata = {
                "rollback_from": self._get_latest_version(entity_type, entity_id),
                "rollback_to": version_id,
                "rollback_reason": "Manual rollback"
            }
            return self.create_version(
                entity_type,
                entity_id,
                target_version["data"],
                metadata
            )
        else:
            # Directly update the latest version
            latest_version = self.get_latest_version(entity_type, entity_id)
            if latest_version:
                latest_version_id = None
                for vid, v in self.versions[entity_type][entity_id].items():
                    if v["created_at"] == latest_version["created_at"]:
                        latest_version_id = vid
                        break

                if latest_version_id:
                    self.versions[entity_type][entity_id][latest_version_id]["data"] = target_version["data"]
                    self._save_versions()

            return version_id

    def create_branch(
        self,
        entity_type: str,
        entity_id: str,
        branch_name: str,
        base_version_id: Optional[str] = None
    ) -> str:
        """Create a branch from a specific version"""
        if base_version_id:
            base_version = self.get_version(entity_type, entity_id, base_version_id)
            if not base_version:
                raise ValueError(f"Base version {base_version_id} not found")
            data = base_version["data"]
        else:
            latest_version = self.get_latest_version(entity_type, entity_id)
            if not latest_version:
                raise ValueError(f"No versions found for {entity_type}:{entity_id}")
            data = latest_version["data"]

        # Create version with branch metadata
        metadata = {
            "branch_name": branch_name,
            "base_version": base_version_id or self._get_latest_version(entity_type, entity_id),
            "is_branch": True
        }

        return self.create_version(entity_type, entity_id, data, metadata)

    def merge_versions(
        self,
        entity_type: str,
        entity_id: str,
        source_version_id: str,
        target_version_id: str,
        merge_strategy: str = "manual"
    ) -> str:
        """Merge two versions of an entity"""
        source_version = self.get_version(entity_type, entity_id, source_version_id)
        target_version = self.get_version(entity_type, entity_id, target_version_id)

        if not source_version or not target_version:
            raise ValueError("Source or target version not found")

        # Simple merge strategy - in a real implementation, this would be more sophisticated
        if merge_strategy == "overwrite":
            merged_data = source_version["data"]
        elif merge_strategy == "preserve":
            merged_data = target_version["data"]
        else:
            # Default: create a new version with both versions as metadata
            merged_data = source_version["data"]

        # Create merged version
        metadata = {
            "merge_source": source_version_id,
            "merge_target": target_version_id,
            "merge_strategy": merge_strategy,
            "is_merge": True
        }

        return self.create_version(entity_type, entity_id, merged_data, metadata)

    def get_entity_versions(
        self,
        entity_type: str,
        entity_id: str
    ) -> Dict[str, Dict[str, Any]]:
        """Get all versions of an entity"""
        return self._get_entity_versions(entity_type, entity_id)

    def _get_entity_versions(self, entity_type: str, entity_id: str) -> Dict[str, Dict[str, Any]]:
        """Internal method to get entity versions"""
        if (entity_type in self.versions and
            entity_id in self.versions[entity_type]):
            return self.versions[entity_type][entity_id]
        return {}

    def _get_latest_version(self, entity_type: str, entity_id: str) -> Optional[str]:
        """Get the ID of the latest version"""
        versions = self._get_entity_versions(entity_type, entity_id)
        if not versions:
            return None

        latest_version_id = max(versions.keys(),
                               key=lambda v: versions[v]["created_at"])
        return latest_version_id

    def delete_version(
        self,
        entity_type: str,
        entity_id: str,
        version_id: str
    ) -> bool:
        """Delete a specific version"""
        if (entity_type in self.versions and
            entity_id in self.versions[entity_type] and
            version_id in self.versions[entity_type][entity_id]):

            del self.versions[entity_type][entity_id][version_id]
            self._save_versions()
            return True
        return False

    def cleanup_old_versions(
        self,
        entity_type: str,
        entity_id: str,
        keep_versions: int = 10
    ):
        """Keep only the most recent versions, delete older ones"""
        versions = self._get_entity_versions(entity_type, entity_id)
        if len(versions) <= keep_versions:
            return

        # Sort versions by creation time
        sorted_versions = sorted(
            versions.items(),
            key=lambda x: x[1]["created_at"],
            reverse=True
        )

        # Keep the most recent versions
        versions_to_keep = sorted_versions[:keep_versions]
        versions_to_delete = sorted_versions[keep_versions:]

        for version_id, version_data in versions_to_delete:
            del self.versions[entity_type][entity_id][version_id]

        self._save_versions()

        return {
            "kept": [v[0] for v in versions_to_keep],
            "deleted": [v[0] for v in versions_to_delete]
        }

    def get_version_stats(self) -> Dict[str, Any]:
        """Get statistics about versions"""
        total_versions = 0
        entity_counts = {}
        type_counts = {}

        for entity_type, entities in self.versions.items():
            type_counts[entity_type] = len(entities)
            for entity_id, versions in entities.items():
                if entity_type not in entity_counts:
                    entity_counts[entity_type] = 0
                entity_counts[entity_type] += 1
                total_versions += len(versions)

        return {
            "total_versions": total_versions,
            "entity_types": type_counts,
            "entities_per_type": entity_counts,
            "storage_path": str(self.storage_path)
        }


# Global version manager instance
version_manager = VersionManager()