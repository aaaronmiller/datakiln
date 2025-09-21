from typing import Dict, Any, Optional, List
from datetime import datetime
import asyncio
from .providers.base_provider import BaseProvider
from .providers.gemini_provider import GeminiProvider
from .providers.perplexity_provider import PerplexityProvider

class ProviderManager:
    """Manager for AI providers"""

    def __init__(self):
        self.providers: Dict[str, BaseProvider] = {}
        self._initialize_providers()

    def _initialize_providers(self):
        """Initialize all available providers"""
        try:
            # Initialize Gemini provider
            gemini_provider = GeminiProvider()
            self.providers[gemini_provider.name] = gemini_provider

            # Initialize Perplexity provider
            perplexity_provider = PerplexityProvider()
            self.providers[perplexity_provider.name] = perplexity_provider

            print(f"Initialized {len(self.providers)} providers")
        except Exception as e:
            print(f"Error initializing providers: {e}")

    def get_provider(self, name: str) -> Optional[BaseProvider]:
        """Get a provider by name"""
        return self.providers.get(name)

    def get_all_providers(self) -> Dict[str, BaseProvider]:
        """Get all providers"""
        return self.providers.copy()

    def get_provider_names(self) -> List[str]:
        """Get list of provider names"""
        return list(self.providers.keys())

    async def get_provider_status(self) -> Dict[str, Any]:
        """Get status of all providers"""
        status = {
            "providers": {},
            "usage_stats": {},
            "default_provider": "gemini_deep_research",
            "timestamp": datetime.now().isoformat()
        }

        for name, provider in self.providers.items():
            try:
                # Test connection
                connection_status = await provider.validate_connection()

                # Get usage stats
                usage_stats = provider.get_usage_stats()

                status["providers"][name] = {
                    "status": "connected" if connection_status else "disconnected",
                    "connection_test": connection_status,
                    "last_used": usage_stats.get("last_used"),
                    "total_requests": usage_stats.get("total_requests", 0)
                }
            except Exception as e:
                status["providers"][name] = {
                    "status": "error",
                    "error": str(e)
                }

        return status

    def get_default_provider(self) -> Optional[BaseProvider]:
        """Get the default provider"""
        return self.get_provider("gemini_deep_research")

# Global provider manager instance
provider_manager = ProviderManager()