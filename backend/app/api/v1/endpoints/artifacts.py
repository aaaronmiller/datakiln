from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from typing import Dict, Any
from ..services.artifact_service import ArtifactService, get_artifact_service

router = APIRouter()

@router.get("/artifacts/{artifact_id}")
async def get_artifact_info(
    artifact_id: str,
    artifact_service: ArtifactService = Depends(get_artifact_service)
) -> Dict[str, Any]:
    """
    Get information about an artifact.
    """
    artifact = artifact_service.get_artifact(artifact_id)
    if not artifact:
        raise HTTPException(status_code=404, detail="Artifact not found")

    return artifact

@router.get("/artifacts/{artifact_id}/download")
async def download_artifact(
    artifact_id: str,
    artifact_service: ArtifactService = Depends(get_artifact_service)
):
    """
    Download an artifact file.
    """
    artifact = artifact_service.get_artifact(artifact_id)
    if not artifact:
        raise HTTPException(status_code=404, detail="Artifact not found")

    content = artifact_service.get_artifact_content(artifact_id)
    if content is None:
        raise HTTPException(status_code=404, detail="Artifact content not found")

    def iter_content():
        yield content

    return StreamingResponse(
        iter_content(),
        media_type=artifact["content_type"],
        headers={
            "Content-Disposition": f"attachment; filename={artifact['name']}",
            "Content-Length": str(len(content))
        }
    )

@router.get("/runs/{run_id}/artifacts")
async def get_run_artifacts(
    run_id: str,
    artifact_service: ArtifactService = Depends(get_artifact_service)
) -> Dict[str, Any]:
    """
    Get all artifacts for a workflow run.
    """
    artifacts = artifact_service.get_artifacts_for_run(run_id)
    return {
        "run_id": run_id,
        "artifacts": artifacts,
        "total": len(artifacts)
    }

@router.get("/runs/{run_id}/artifacts/index")
async def get_artifact_index(
    run_id: str,
    artifact_service: ArtifactService = Depends(get_artifact_service)
) -> Dict[str, Any]:
    """
    Get artifact index for a workflow run with download URLs.
    """
    return artifact_service.create_artifact_index(run_id)