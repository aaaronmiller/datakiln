import os
import uuid
from typing import Dict, List, Any, Optional
from datetime import datetime
import json
import logging
from pathlib import Path

logger = logging.getLogger(__name__)

class ArtifactService:
    """
    Service for managing workflow execution artifacts (files, data exports, etc.)
    """

    def __init__(self, storage_path: str = "./artifacts"):
        self.storage_path = Path(storage_path)
        self.storage_path.mkdir(exist_ok=True)
        self._artifacts: Dict[str, Dict[str, Any]] = {}

    def store_artifact(
        self,
        run_id: str,
        artifact_name: str,
        content: Any,
        content_type: str = "application/json",
        metadata: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        Store an artifact and return its ID.

        Args:
            run_id: The workflow run ID
            artifact_name: Name of the artifact
            content: The artifact content
            content_type: MIME type of the content
            metadata: Additional metadata

        Returns:
            The artifact ID
        """
        artifact_id = str(uuid.uuid4())

        # Create run directory
        run_dir = self.storage_path / run_id
        run_dir.mkdir(exist_ok=True)

        # Prepare artifact data
        artifact_data = {
            "id": artifact_id,
            "run_id": run_id,
            "name": artifact_name,
            "content_type": content_type,
            "created_at": datetime.now().isoformat(),
            "size": 0,
            "metadata": metadata or {}
        }

        # Store content based on type
        file_path = run_dir / f"{artifact_id}.data"

        if isinstance(content, (dict, list)):
            # JSON content
            json_content = json.dumps(content, indent=2)
            file_path.write_text(json_content)
            artifact_data["size"] = len(json_content.encode('utf-8'))
            artifact_data["content_type"] = "application/json"
        elif isinstance(content, str):
            # Text content
            file_path.write_text(content)
            artifact_data["size"] = len(content.encode('utf-8'))
            if not content_type or content_type == "application/json":
                artifact_data["content_type"] = "text/plain"
        else:
            # Binary or other content
            if isinstance(content, bytes):
                file_path.write_bytes(content)
                artifact_data["size"] = len(content)
            else:
                # Convert to string
                str_content = str(content)
                file_path.write_text(str_content)
                artifact_data["size"] = len(str_content.encode('utf-8'))

        # Store artifact metadata
        self._artifacts[artifact_id] = artifact_data

        # Save metadata to file
        metadata_file = run_dir / f"{artifact_id}.meta.json"
        metadata_file.write_text(json.dumps(artifact_data, indent=2))

        logger.info(f"Stored artifact {artifact_id} for run {run_id}: {artifact_name}")
        return artifact_id

    def get_artifact(self, artifact_id: str) -> Optional[Dict[str, Any]]:
        """
        Get artifact metadata by ID.

        Args:
            artifact_id: The artifact ID

        Returns:
            Artifact metadata or None if not found
        """
        return self._artifacts.get(artifact_id)

    def get_artifacts_for_run(self, run_id: str) -> List[Dict[str, Any]]:
        """
        Get all artifacts for a workflow run.

        Args:
            run_id: The workflow run ID

        Returns:
            List of artifact metadata
        """
        return [artifact for artifact in self._artifacts.values() if artifact["run_id"] == run_id]

    def get_artifact_content(self, artifact_id: str) -> Optional[bytes]:
        """
        Get the raw content of an artifact.

        Args:
            artifact_id: The artifact ID

        Returns:
            The artifact content as bytes, or None if not found
        """
        artifact = self.get_artifact(artifact_id)
        if not artifact:
            return None

        run_dir = self.storage_path / artifact["run_id"]
        file_path = run_dir / f"{artifact_id}.data"

        if file_path.exists():
            return file_path.read_bytes()
        return None

    def get_artifact_download_url(self, artifact_id: str) -> Optional[str]:
        """
        Get a download URL for an artifact.

        Args:
            artifact_id: The artifact ID

        Returns:
            Download URL or None if artifact not found
        """
        artifact = self.get_artifact(artifact_id)
        if artifact:
            return f"/api/v1/artifacts/{artifact_id}/download"
        return None

    def create_artifact_index(self, run_id: str) -> Dict[str, Any]:
        """
        Create an artifact index for a workflow run.

        Args:
            run_id: The workflow run ID

        Returns:
            Artifact index with download URLs
        """
        artifacts = self.get_artifacts_for_run(run_id)

        index = {
            "run_id": run_id,
            "total_artifacts": len(artifacts),
            "artifacts": []
        }

        for artifact in artifacts:
            index["artifacts"].append({
                "id": artifact["id"],
                "name": artifact["name"],
                "content_type": artifact["content_type"],
                "size": artifact["size"],
                "created_at": artifact["created_at"],
                "download_url": self.get_artifact_download_url(artifact["id"]),
                "metadata": artifact["metadata"]
            })

        return index

    def cleanup_old_artifacts(self, days_old: int = 30) -> int:
        """
        Clean up artifacts older than specified days.

        Args:
            days_old: Number of days to keep artifacts

        Returns:
            Number of artifacts cleaned up
        """
        cutoff_date = datetime.now().timestamp() - (days_old * 24 * 60 * 60)
        cleaned_count = 0

        for artifact_id, artifact in list(self._artifacts.items()):
            created_timestamp = datetime.fromisoformat(artifact["created_at"]).timestamp()
            if created_timestamp < cutoff_date:
                # Remove files
                run_dir = self.storage_path / artifact["run_id"]
                data_file = run_dir / f"{artifact_id}.data"
                meta_file = run_dir / f"{artifact_id}.meta.json"

                try:
                    if data_file.exists():
                        data_file.unlink()
                    if meta_file.exists():
                        meta_file.unlink()
                except Exception as e:
                    logger.warning(f"Failed to remove artifact files for {artifact_id}: {e}")

                # Remove from memory
                del self._artifacts[artifact_id]
                cleaned_count += 1

        logger.info(f"Cleaned up {cleaned_count} old artifacts")
        return cleaned_count

# Dependency injection provider
def get_artifact_service() -> ArtifactService:
    """
    Dependency injection provider for ArtifactService.
    """
    return ArtifactService()