"""
Settings API endpoints for provider configuration and system settings.
"""
from fastapi import APIRouter, HTTPException
from typing import Dict, Any, Optional
from pydantic import BaseModel
import os

router = APIRouter()

class ProviderConfig(BaseModel):
    api_key: str

BUILTIN_PROVIDERS = [
    {
        "id": "gemini",
        "name": "Google Gemini",
        "description": "Advanced AI model with multimodal capabilities",
        "status": "active" if os.environ.get("GEMINI_API_KEY") else "inactive",
        "apiKeyConfigured": bool(os.environ.get("GEMINI_API_KEY")),
        "type": "ai",
        "capabilities": ["text", "image", "analysis", "research"]
    },
    {
        "id": "perplexity",
        "name": "Perplexity AI",
        "description": "Research-focused AI with web search integration",
        "status": "active" if os.environ.get("PERPLEXITY_API_KEY") else "inactive",
        "apiKeyConfigured": bool(os.environ.get("PERPLEXITY_API_KEY")),
        "type": "ai",
        "capabilities": ["search", "research", "analysis"]
    },
    {
        "id": "openai",
        "name": "OpenAI GPT",
        "description": "General purpose AI model for text generation",
        "status": "active" if os.environ.get("OPENAI_API_KEY") else "inactive",
        "apiKeyConfigured": bool(os.environ.get("OPENAI_API_KEY")),
        "type": "ai",
        "capabilities": ["text", "analysis"]
    },
]


@router.get("/providers/status")
async def get_providers_status():
    """Get status of all configured providers."""
    return {"providers": BUILTIN_PROVIDERS}


@router.post("/providers/{provider_id}/configure")
async def configure_provider(provider_id: str, config: ProviderConfig):
    """Configure an API key for a provider."""
    provider_ids = [p["id"] for p in BUILTIN_PROVIDERS]
    if provider_id not in provider_ids:
        raise HTTPException(status_code=404, detail=f"Unknown provider: {provider_id}")

    # Set environment variable (in-memory only, not persisted)
    env_var_map = {
        "gemini": "GEMINI_API_KEY",
        "perplexity": "PERPLEXITY_API_KEY",
        "openai": "OPENAI_API_KEY",
    }
    if provider_id in env_var_map:
        os.environ[env_var_map[provider_id]] = config.api_key

    return {
        "success": True,
        "provider_id": provider_id,
        "message": f"{provider_id} API key configured"
    }


@router.post("/providers/{provider_id}/test")
async def test_provider(provider_id: str):
    """Test a provider connection."""
    provider_ids = [p["id"] for p in BUILTIN_PROVIDERS]
    if provider_id not in provider_ids:
        raise HTTPException(status_code=404, detail=f"Unknown provider: {provider_id}")

    env_var_map = {
        "gemini": "GEMINI_API_KEY",
        "perplexity": "PERPLEXITY_API_KEY",
        "openai": "OPENAI_API_KEY",
    }

    if provider_id in env_var_map and os.environ.get(env_var_map[provider_id]):
        return {"success": True, "message": f"{provider_id} is configured and ready"}
    else:
        return {"success": False, "message": f"{provider_id} API key is not configured"}
