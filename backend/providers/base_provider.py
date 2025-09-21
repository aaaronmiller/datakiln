from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
from datetime import datetime
import asyncio


class BaseProvider(ABC):
    """Base class for AI providers"""

    def __init__(self, api_key: Optional[str] = None, endpoint: Optional[str] = None):
        self.api_key = api_key
        self.endpoint = endpoint
        self.session_cache: Dict[str, Any] = {}
        self.request_count = 0
        self.last_request_time: Optional[datetime] = None

    @abstractmethod
    async def generate_response(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """Generate response from the provider"""
        pass

    @abstractmethod
    async def validate_connection(self) -> Dict[str, Any]:
        """Validate provider connection"""
        pass

    def _update_usage_stats(self):
        """Update usage statistics"""
        self.request_count += 1
        self.last_request_time = datetime.now()

    def get_usage_stats(self) -> Dict[str, Any]:
        """Get provider usage statistics"""
        return {
            "request_count": self.request_count,
            "last_request_time": self.last_request_time.isoformat() if self.last_request_time else None,
            "cache_size": len(self.session_cache)
        }

    def clear_cache(self):
        """Clear session cache"""
        self.session_cache.clear()


class ProviderManager:
    """Manager for multiple AI providers"""

    def __init__(self):
        self.providers: Dict[str, BaseProvider] = {}
        self.default_provider: Optional[str] = None

    def register_provider(self, name: str, provider: BaseProvider, set_default: bool = False):
        """Register a provider"""
        self.providers[name] = provider
        if set_default or not self.default_provider:
            self.default_provider = name

    def get_provider(self, name: str) -> Optional[BaseProvider]:
        """Get a provider by name"""
        return self.providers.get(name)

    def get_default_provider(self) -> Optional[BaseProvider]:
        """Get the default provider"""
        return self.providers.get(self.default_provider) if self.default_provider else None

    async def execute_deep_research(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """Execute deep research using appropriate provider"""
        provider_name = request.get("provider", self.default_provider or "gemini")
        provider = self.get_provider(provider_name)

        if not provider:
            raise ValueError(f"Provider {provider_name} not found")

        # Add deep research specific parameters
        research_request = {
            **request,
            "mode": "deep_research",
            "research_depth": request.get("research_depth", "balanced")
        }

        return await provider.generate_response(research_request)

    async def execute_canvas(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """Execute canvas operations using appropriate provider"""
        provider_name = request.get("provider", "gemini")  # Canvas is Gemini-specific
        provider = self.get_provider(provider_name)

        if not provider:
            raise ValueError(f"Provider {provider_name} not found")

        # Add canvas specific parameters
        canvas_request = {
            **request,
            "mode": "canvas",
            "canvas_mode": request.get("canvas_mode", "create")
        }

        return await provider.generate_response(canvas_request)

    async def execute_perplexity(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """Execute Perplexity-specific operations"""
        provider = self.get_provider("perplexity")
        if not provider:
            raise ValueError("Perplexity provider not configured")

        return await provider.generate_response(request)

    async def validate_all_providers(self) -> Dict[str, Any]:
        """Validate all registered providers"""
        results = {}
        for name, provider in self.providers.items():
            try:
                results[name] = await provider.validate_connection()
            except Exception as e:
                results[name] = {"valid": False, "error": str(e)}

        return results

    def get_all_usage_stats(self) -> Dict[str, Any]:
        """Get usage statistics for all providers"""
        return {
            name: provider.get_usage_stats()
            for name, provider in self.providers.items()
        }