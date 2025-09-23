from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
from datetime import datetime
import asyncio
import random
import logging

logger = logging.getLogger(__name__)


class BaseProvider(ABC):
    """Base class for AI providers"""

    def __init__(self, api_key: Optional[str] = None, endpoint: Optional[str] = None):
        self.api_key = api_key
        self.endpoint = endpoint
        self.session_cache: Dict[str, Any] = {}
        self.request_count = 0
        self.last_request_time: Optional[datetime] = None
        self.retry_attempts = 3
        self.retry_delay = 1.0
        self.timeout = 30.0
        self.circuit_breaker_failures = 0
        self.circuit_breaker_threshold = 5
        self.circuit_breaker_timeout = 60.0  # seconds
        self.last_failure_time: Optional[datetime] = None

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

    def _is_circuit_breaker_open(self) -> bool:
        """Check if circuit breaker is open"""
        if self.circuit_breaker_failures < self.circuit_breaker_threshold:
            return False

        if not self.last_failure_time:
            return False

        # Check if circuit breaker timeout has passed
        time_since_failure = (datetime.now() - self.last_failure_time).total_seconds()
        if time_since_failure > self.circuit_breaker_timeout:
            # Reset circuit breaker
            self.circuit_breaker_failures = 0
            return False

        return True

    def _record_failure(self):
        """Record a failure for circuit breaker"""
        self.circuit_breaker_failures += 1
        self.last_failure_time = datetime.now()

    def _record_success(self):
        """Record a success to reset circuit breaker"""
        self.circuit_breaker_failures = 0

    async def generate_response_with_retry(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """Generate response with retry logic and circuit breaker"""
        # Check circuit breaker
        if self._is_circuit_breaker_open():
            logger.warning(f"Circuit breaker open for provider {self.__class__.__name__}")
            return {
                "success": False,
                "error": "Service temporarily unavailable (circuit breaker open)",
                "circuit_breaker": True,
                "retry_after": self.circuit_breaker_timeout
            }

        last_exception = None

        for attempt in range(self.retry_attempts + 1):
            try:
                # Execute with timeout
                result = await asyncio.wait_for(
                    self.generate_response(request),
                    timeout=self.timeout
                )

                # Record success
                self._record_success()
                self._update_usage_stats()

                return result

            except asyncio.TimeoutError as e:
                last_exception = e
                logger.warning(f"Provider timeout on attempt {attempt + 1}: {str(e)}")

            except Exception as e:
                last_exception = e
                logger.warning(f"Provider error on attempt {attempt + 1}: {str(e)}")

            # Wait before retry (exponential backoff with jitter)
            if attempt < self.retry_attempts:
                delay = self.retry_delay * (2 ** attempt) + random.uniform(0, 0.1)
                await asyncio.sleep(delay)

        # All retries failed
        self._record_failure()
        logger.error(f"All retry attempts failed for provider {self.__class__.__name__}")

        return {
            "success": False,
            "error": f"Provider failed after {self.retry_attempts + 1} attempts: {str(last_exception)}",
            "last_exception": str(last_exception),
            "attempts": self.retry_attempts + 1
        }


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
        """Execute deep research using appropriate provider with retry and fallback"""
        provider_name = request.get("provider", self.default_provider or "gemini")

        # Try primary provider with retry
        primary_provider = self.get_provider(provider_name)
        if primary_provider:
            try:
                research_request = {
                    **request,
                    "mode": "deep_research",
                    "research_depth": request.get("research_depth", "balanced")
                }
                result = await primary_provider.generate_response_with_retry(research_request)
                if result.get("success") is not False:
                    return result
            except Exception as e:
                logger.warning(f"Primary provider {provider_name} failed: {str(e)}")

        # Fallback to alternative providers
        fallback_providers = ["gemini", "perplexity"]
        if provider_name in fallback_providers:
            fallback_providers.remove(provider_name)

        for fallback_name in fallback_providers:
            fallback_provider = self.get_provider(fallback_name)
            if fallback_provider:
                try:
                    logger.info(f"Attempting fallback to provider {fallback_name}")
                    research_request = {
                        **request,
                        "mode": "deep_research",
                        "research_depth": request.get("research_depth", "balanced"),
                        "fallback": True,
                        "original_provider": provider_name
                    }
                    result = await fallback_provider.generate_response_with_retry(research_request)
                    if result.get("success") is not False:
                        return result
                except Exception as e:
                    logger.warning(f"Fallback provider {fallback_name} also failed: {str(e)}")

        # All providers failed
        return {
            "success": False,
            "error": f"All providers failed for deep research request",
            "tried_providers": [provider_name] + fallback_providers
        }

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