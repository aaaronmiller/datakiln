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

    async def execute_deep_research(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """Execute deep research using the integrated research engine"""
        try:
            # Import research components
            import sys
            from pathlib import Path

            # Add backend to path for imports
            backend_path = Path(__file__).parent
            sys.path.insert(0, str(backend_path))

            from research_agent import ResearchAgent, ResearchMode
            from gemini_automation import perform_gemini_research, GeminiInterface

            # Map research depth to ResearchMode
            depth_map = {
                "fast": ResearchMode.FAST,
                "balanced": ResearchMode.BALANCED,
                "comprehensive": ResearchMode.COMPREHENSIVE
            }
            research_mode = depth_map.get(request.get("research_depth", "balanced"), ResearchMode.BALANCED)

            # Get query from request
            query = request.get("prompt", "")

            # Use the research agent for comprehensive research, or direct automation for simpler modes
            if research_mode == ResearchMode.COMPREHENSIVE:
                # Use full research agent with tree building
                agent = ResearchAgent()
                result = await agent.run_research(query, research_mode)
                return {
                    "research_type": "comprehensive_agent",
                    "query": query,
                    "mode": research_mode.value,
                    "result": result,
                    "research_tree": result.get("result", {}),
                    "timestamp": result.get("created_at")
                }
            else:
                # Use direct Gemini automation for faster modes
                automation_result = await perform_gemini_research(query, interface="deep_research", headless=True)

                return {
                    "research_type": "direct_automation",
                    "query": query,
                    "mode": research_mode.value,
                    "interface": "deep_research",
                    "result": automation_result,
                    "timestamp": automation_result.get("timestamp")
                }

        except Exception as e:
            # Fallback to basic Gemini provider if research components fail
            gemini_provider = self.get_provider("gemini")
            if gemini_provider:
                try:
                    return await gemini_provider.generate(request.get("prompt", ""))
                except Exception:
                    pass

            raise ValueError(f"Deep research execution failed: {str(e)}")

# Global provider manager instance
provider_manager = ProviderManager()