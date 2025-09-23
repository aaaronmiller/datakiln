"""
Extension API endpoints for Chrome extension integration.
"""

from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import Dict, Any, Optional
from backend.app.services.extension_service import extension_service


router = APIRouter()


class ChatCaptureRequest(BaseModel):
    """Request model for chat capture data"""
    site: str
    userId: str
    timestamp: str
    model: Optional[str] = None
    messages: list


class ExtensionDataRequest(BaseModel):
    """Request model for extension data queries"""
    user_id: str
    data_type: str = "chat_capture"


@router.post("/capture/chat")
async def capture_chat(request: ChatCaptureRequest, background_tasks: BackgroundTasks):
    """
    Receive chat capture data from Chrome extension.

    This endpoint receives chat data captured by the Chrome extension
    and stores it for consumption by workflow dataSource nodes.
    """
    try:
        # Convert request to dict for service
        data = request.dict()

        # Save the capture
        result = await extension_service.handle_chat_capture(data)

        if not result["success"]:
            raise HTTPException(status_code=500, detail=result["error"])

        # Background task to process/save to Obsidian if configured
        background_tasks.add_task(save_to_obsidian_if_configured, data)

        return {
            "status": "success",
            "capture_id": result["capture_id"],
            "message": "Chat capture received and stored"
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process chat capture: {str(e)}")


@router.get("/data/{user_id}")
async def get_extension_data(user_id: str, data_type: str = "chat_capture"):
    """
    Get extension data for workflow consumption.

    This endpoint provides captured data to workflow dataSource nodes.
    """
    try:
        data = await extension_service.get_workflow_data_source(user_id, data_type)

        return {
            "status": "success",
            "data": data
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get extension data: {str(e)}")


@router.post("/data/{user_id}/mark-processed")
async def mark_data_processed(user_id: str, capture_ids: list):
    """
    Mark extension data as processed by workflow.

    This allows workflows to indicate which captured data has been consumed.
    """
    try:
        await extension_service.mark_data_processed(user_id, capture_ids)

        return {
            "status": "success",
            "message": f"Marked {len(capture_ids)} captures as processed"
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to mark data as processed: {str(e)}")


@router.get("/stats/{user_id}")
async def get_user_stats(user_id: str):
    """
    Get statistics for a user's extension data.
    """
    try:
        stats = extension_service.get_user_stats(user_id)

        return {
            "status": "success",
            "stats": stats
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get user stats: {str(e)}")


async def save_to_obsidian_if_configured(data: Dict[str, Any]):
    """
    Background task to save captured data to Obsidian if configured.
    """
    try:
        # Import here to avoid circular imports
        from backend.app.services.obsidian_service import ObsidianService

        # Check if Obsidian is configured
        obsidian_service = ObsidianService()
        if obsidian_service.vault_path:
            # Save chat capture to Obsidian
            await obsidian_service.save_chat_capture({
                "title": f"Chat Capture from {data.get('site', 'Unknown')}",
                "content": format_chat_messages(data.get("messages", [])),
                "status": "captured"
            })

    except Exception as e:
        # Log error but don't fail the main operation
        print(f"Failed to save to Obsidian: {e}")


def format_chat_messages(messages: list) -> str:
    """Format chat messages for Obsidian storage"""
    formatted = []

    for msg in messages:
        role = msg.get("role", "unknown")
        content = msg.get("content", "")

        if role == "user":
            formatted.append(f"**User:** {content}")
        elif role == "assistant":
            formatted.append(f"**Assistant:** {content}")
        else:
            formatted.append(f"**{role}:** {content}")

    return "\n\n".join(formatted)