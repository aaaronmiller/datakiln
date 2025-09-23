"""
Test Provider Reliability

Tests for provider retry logic, circuit breaker, and graceful degradation.
"""

import pytest
import asyncio
from unittest.mock import patch, AsyncMock, MagicMock
from backend.providers.base_provider import BaseProvider, ProviderManager
from backend.providers.gemini_provider import GeminiProvider
from backend.providers.perplexity_provider import PerplexityProvider


class MockProvider(BaseProvider):
    """Mock provider for testing"""

    def __init__(self, should_fail=False, fail_count=0, **kwargs):
        super().__init__(**kwargs)
        self.should_fail = should_fail
        self.fail_count = fail_count
        self.call_count = 0

    async def generate_response(self, request):
        self.call_count += 1
        if self.should_fail and self.call_count <= self.fail_count:
            raise Exception(f"Simulated failure {self.call_count}")

        return {
            "success": True,
            "response": f"Success from {self.__class__.__name__} on call {self.call_count}",
            "call_count": self.call_count
        }

    async def validate_connection(self):
        return {"valid": True}


class TestProviderReliability:
    """Test cases for provider reliability features"""

    def test_retry_logic_success_on_first_attempt(self):
        """Test that successful calls don't trigger retries"""
        provider = MockProvider(should_fail=False)
        request = {"test": "data"}

        result = asyncio.run(provider.generate_response_with_retry(request))

        assert result["success"] is True
        assert result["call_count"] == 1
        assert "response" in result

    def test_retry_logic_success_after_failures(self):
        """Test that retries work and succeed after initial failures"""
        provider = MockProvider(should_fail=True, fail_count=2)  # Fail first 2 calls, succeed on 3rd
        request = {"test": "data"}

        result = asyncio.run(provider.generate_response_with_retry(request))

        assert result["success"] is True
        assert result["call_count"] == 3  # Should have been called 3 times
        assert "response" in result

    def test_retry_logic_all_attempts_fail(self):
        """Test that after all retries are exhausted, failure is returned"""
        provider = MockProvider(should_fail=True, fail_count=10)  # Fail all calls
        request = {"test": "data"}

        result = asyncio.run(provider.generate_response_with_retry(request))

        assert result["success"] is False
        assert "error" in result
        assert "attempts" in result
        assert result["attempts"] == 4  # 3 retries + 1 initial = 4 attempts

    def test_circuit_breaker_opens_after_threshold(self):
        """Test that circuit breaker opens after reaching failure threshold"""
        provider = MockProvider(should_fail=True, fail_count=10)
        provider.circuit_breaker_threshold = 3

        # Trigger circuit breaker by failing multiple times
        for _ in range(3):
            result = asyncio.run(provider.generate_response_with_retry({"test": "data"}))
            assert result["success"] is False

        # Next call should be blocked by circuit breaker
        result = asyncio.run(provider.generate_response_with_retry({"test": "data"}))
        assert result["success"] is False
        assert result.get("circuit_breaker") is True
        assert "retry_after" in result

    def test_circuit_breaker_resets_after_success(self):
        """Test that circuit breaker resets after successful calls"""
        provider = MockProvider(should_fail=True, fail_count=2)  # Fail twice, then succeed
        provider.circuit_breaker_threshold = 3

        # First two calls fail
        result1 = asyncio.run(provider.generate_response_with_retry({"test": "data"}))
        assert result1["success"] is False

        result2 = asyncio.run(provider.generate_response_with_retry({"test": "data"}))
        assert result2["success"] is False

        # Third call succeeds and resets circuit breaker
        result3 = asyncio.run(provider.generate_response_with_retry({"test": "data"}))
        assert result3["success"] is True

        # Circuit breaker should be reset, so this should work
        provider.should_fail = True  # Make it fail again
        provider.fail_count = 10
        result4 = asyncio.run(provider.generate_response_with_retry({"test": "data"}))
        # Should not be blocked by circuit breaker since it was reset
        assert result4["success"] is False
        assert result4.get("circuit_breaker") is not True

    def test_timeout_handling(self):
        """Test that timeouts are handled properly"""
        async def slow_response(request):
            await asyncio.sleep(2)  # Longer than timeout
            return {"success": True}

        provider = MockProvider()
        provider.timeout = 0.1  # Very short timeout

        with patch.object(provider, 'generate_response', side_effect=slow_response):
            result = asyncio.run(provider.generate_response_with_retry({"test": "data"}))

            assert result["success"] is False
            assert "error" in result
            assert "timeout" in result["error"].lower() or "cancelled" in result["error"].lower()

    @pytest.mark.asyncio
    async def test_provider_manager_fallback(self):
        """Test that ProviderManager falls back to alternative providers"""
        manager = ProviderManager()

        # Register providers - primary will fail, fallback will succeed
        failing_provider = MockProvider(should_fail=True, fail_count=10)
        succeeding_provider = MockProvider(should_fail=False)

        manager.register_provider("primary", failing_provider)
        manager.register_provider("fallback", succeeding_provider)

        # Mock the get_provider method to return our test providers
        with patch.object(manager, 'get_provider') as mock_get_provider:
            mock_get_provider.side_effect = lambda name: {
                "primary": failing_provider,
                "fallback": succeeding_provider
            }.get(name)

            # Execute deep research - should fallback to working provider
            result = await manager.execute_deep_research({
                "provider": "primary",
                "query": "test query"
            })

            # Should succeed via fallback
            assert result["success"] is True
            assert "fallback" in result.get("response", "")

    @pytest.mark.asyncio
    async def test_provider_manager_all_fail(self):
        """Test graceful degradation when all providers fail"""
        manager = ProviderManager()

        # Register only failing providers
        failing_provider1 = MockProvider(should_fail=True, fail_count=10)
        failing_provider2 = MockProvider(should_fail=True, fail_count=10)

        manager.register_provider("gemini", failing_provider1)
        manager.register_provider("perplexity", failing_provider2)

        # Execute deep research - all should fail
        result = await manager.execute_deep_research({
            "provider": "gemini",
            "query": "test query"
        })

        # Should return failure with tried providers list
        assert result["success"] is False
        assert "error" in result
        assert "tried_providers" in result
        assert len(result["tried_providers"]) > 1

    def test_exponential_backoff(self):
        """Test that retry delays use exponential backoff"""
        import time

        provider = MockProvider(should_fail=True, fail_count=10)
        provider.retry_delay = 0.01  # Small delay for testing

        start_time = time.time()

        result = asyncio.run(provider.generate_response_with_retry({"test": "data"}))

        elapsed = time.time() - start_time

        # Should have taken some time due to retries with backoff
        # 3 retries with delays: 0.01, 0.02, 0.04 = ~0.07 total delay
        assert elapsed > 0.05  # Allow some margin
        assert result["success"] is False

    def test_provider_stats_tracking(self):
        """Test that provider usage statistics are tracked"""
        provider = MockProvider(should_fail=False)

        # Make a successful call
        result = asyncio.run(provider.generate_response_with_retry({"test": "data"}))

        assert result["success"] is True

        # Check usage stats
        stats = provider.get_usage_stats()
        assert stats["request_count"] == 1
        assert stats["last_request_time"] is not None
        assert stats["cache_size"] == 0  # No cache used in this test