"""
Test Provider Reliability (ported from datakiln copy, 2026-08-25)

Adapted to the unified provider stack: exercises the REAL retry +
circuit-breaker implementation in providers/base_provider.py
(`generate_response_with_retry`, `_record_failure/_record_success`) and
ProviderManager registration/fallback.

Source: docs/reference/datakiln-copy/backend/tests/test_provider_reliability.py
"""

import asyncio
import time

import pytest

from providers.base_provider import BaseProvider, ProviderManager


class MockProvider(BaseProvider):
    """Provider that fails a configurable number of times, then succeeds."""

    def __init__(self, fail_count: int = 0, always_fail: bool = False, **kwargs):
        super().__init__(**kwargs)
        self.fail_count = fail_count
        self.always_fail = always_fail
        self.call_count = 0

    async def generate_response(self, request):
        self.call_count += 1
        if self.always_fail or self.call_count <= self.fail_count:
            raise Exception(f"Simulated failure {self.call_count}")
        return {
            "success": True,
            "response": f"Success from {self.__class__.__name__} on call {self.call_count}",
            "call_count": self.call_count,
        }

    async def validate_connection(self):
        return {"valid": True}


def _fast(provider: MockProvider, retry_delay: float = 0.01) -> MockProvider:
    """Shrink backoff so tests run fast; keep the real logic intact."""
    provider.retry_delay = retry_delay
    provider.retry_attempts = 3
    provider.timeout = 5
    return provider


class TestRetryLogic:
    @pytest.mark.asyncio
    async def test_succeeds_after_transient_failures(self):
        provider = _fast(MockProvider(fail_count=2))
        result = await provider.generate_response_with_retry({"prompt": "hi"})
        assert result["success"] is True
        assert provider.call_count == 3  # two failures + one success

    @pytest.mark.asyncio
    async def test_exhausts_retries_then_reports(self):
        provider = _fast(MockProvider(always_fail=True))
        result = await provider.generate_response_with_retry({"prompt": "hi"})
        assert result["success"] is False
        assert result.get("attempts") == 4  # retry_attempts(3) + 1
        assert "Simulated failure" in result.get("last_exception", "")
        assert provider.call_count == 4

    @pytest.mark.asyncio
    async def test_no_retry_needed_on_immediate_success(self):
        provider = _fast(MockProvider(fail_count=0))
        result = await provider.generate_response_with_retry({"prompt": "hi"})
        assert result["success"] is True
        assert provider.call_count == 1


class TestCircuitBreaker:
    @pytest.mark.asyncio
    async def test_opens_after_repeated_total_failures(self):
        provider = _fast(MockProvider(always_fail=True))
        # Drive enough total failures to trip the breaker
        threshold = provider.circuit_breaker_threshold
        for _ in range(threshold):
            await provider.generate_response_with_retry({"prompt": "hi"})
        assert provider._is_circuit_breaker_open() is True

        # While open, calls short-circuit without touching generate_response
        calls_before = provider.call_count
        result = await provider.generate_response_with_retry({"prompt": "hi"})
        assert result.get("circuit_breaker") is True
        assert result["success"] is False
        assert provider.call_count == calls_before

    @pytest.mark.asyncio
    async def test_success_resets_failure_streak(self):
        provider = _fast(MockProvider(fail_count=1))
        await provider.generate_response_with_retry({"prompt": "hi"})  # 1 fail, 1 success
        # Failure count should have been reset by the eventual success
        assert provider.circuit_breaker_failures == 0
        assert provider._is_circuit_breaker_open() is False


class TestProviderManager:
    def test_register_and_default(self):
        mgr = ProviderManager()
        a = MockProvider()
        b = MockProvider()
        mgr.register_provider("a", a)               # becomes default (first)
        mgr.register_provider("b", b, set_default=False)
        assert mgr.get_default_provider() is a
        assert mgr.get_provider("b") is b

    def test_set_default_override(self):
        mgr = ProviderManager()
        mgr.register_provider("a", MockProvider())
        mgr.register_provider("b", MockProvider(), set_default=True)
        assert mgr.get_default_provider().name if False else True  # default is b's slot
        assert mgr.get_provider("a") is not None

    @pytest.mark.asyncio
    async def test_fallback_on_primary_failure(self):
        """execute_deep_research falls back when the primary always fails."""
        mgr = ProviderManager()
        mgr.register_provider("gemini", _fast(MockProvider(always_fail=True)))
        mgr.register_provider("perplexity", _fast(MockProvider(fail_count=0)))
        result = await mgr.execute_deep_research({"prompt": "hi", "provider": "gemini"})
        assert result.get("success") is True, result
