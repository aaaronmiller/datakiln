import asyncio
from typing import Dict, Any, Optional, List
from datetime import datetime
import httpx
import json
import os
from .base_provider import BaseProvider


class PerplexityProvider(BaseProvider):
    """Perplexity AI provider"""

    def __init__(self, api_key: Optional[str] = None, endpoint: Optional[str] = None):
        super().__init__(api_key, endpoint)
        self.base_url = endpoint or "https://api.perplexity.ai"
        self.api_key = api_key or os.getenv("PERPLEXITY_API_KEY")
        self.model = "llama-3.1-sonar-large-128k-online"

        if not self.api_key:
            raise ValueError("Perplexity API key is required")

    async def generate_response(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """Generate response using Perplexity"""
        self._update_usage_stats()

        prompt = request.get("prompt", "")
        system_message = request.get("system_message")
        max_tokens = request.get("max_tokens", 1000)
        temperature = request.get("temperature", 0.7)

        try:
            return await self._generate_perplexity_response(
                prompt, system_message, max_tokens, temperature
            )

        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "provider": "perplexity",
                "timestamp": datetime.now().isoformat()
            }

    async def _generate_perplexity_response(
        self,
        prompt: str,
        system_message: Optional[str],
        max_tokens: int,
        temperature: float
    ) -> Dict[str, Any]:
        """Generate response using Perplexity API"""
        url = f"{self.base_url}/chat/completions"

        # Build messages array
        messages = []

        if system_message:
            messages.append({
                "role": "system",
                "content": system_message
            })

        messages.append({
            "role": "user",
            "content": prompt
        })

        # Build request payload
        payload = {
            "model": self.model,
            "messages": messages,
            "max_tokens": max_tokens,
            "temperature": temperature,
            "stream": False
        }

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }

        async with httpx.AsyncClient() as client:
            response = await client.post(url, json=payload, headers=headers, timeout=60)

            if response.status_code != 200:
                raise ValueError(f"Perplexity API error: {response.status_code} - {response.text}")

            data = response.json()

            # Extract response
            choices = data.get("choices", [])
            if not choices:
                raise ValueError("No response choices from Perplexity")

            choice = choices[0]
            message = choice.get("message", {})
            response_text = message.get("content", "")

            # Extract usage information
            usage = data.get("usage", {})
            tokens_used = usage.get("total_tokens", 0)

            return {
                "success": True,
                "response": response_text,
                "provider": "perplexity",
                "model": self.model,
                "tokens_used": tokens_used,
                "citations": self._extract_citations(response_text),
                "timestamp": datetime.now().isoformat()
            }

    def _extract_citations(self, text: str) -> List[Dict[str, Any]]:
        """Extract citations from Perplexity response"""
        citations = []

        # Perplexity often includes citations in square brackets [1], [2], etc.
        import re

        # Look for citation patterns
        citation_patterns = [
            r'\[(\d+)\]',  # [1], [2], etc.
            r'\((\d+)\)',  # (1), (2), etc.
            r'source:([^\s]+)',  # source:url
            r'https?://[^\s<>"{}|\\^`[\]]+',  # URLs
        ]

        for pattern in citation_patterns:
            matches = re.finditer(pattern, text)
            for match in matches:
                citation_text = match.group(0)
                citations.append({
                    "text": citation_text,
                    "type": "reference" if pattern.startswith(r'\[') else "url" if "http" in pattern else "citation",
                    "index": match.start()
                })

        return citations

    async def validate_connection(self) -> Dict[str, Any]:
        """Validate Perplexity API connection"""
        try:
            url = f"{self.base_url}/chat/completions"

            payload = {
                "model": self.model,
                "messages": [{"role": "user", "content": "Hello"}],
                "max_tokens": 10
            }

            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            }

            async with httpx.AsyncClient() as client:
                response = await client.post(url, json=payload, headers=headers, timeout=10)

                if response.status_code == 200:
                    return {
                        "valid": True,
                        "provider": "perplexity",
                        "model": self.model,
                        "response_time": response.elapsed.total_seconds()
                    }
                elif response.status_code == 401:
                    return {
                        "valid": False,
                        "error": "Invalid API key",
                        "provider": "perplexity"
                    }
                else:
                    return {
                        "valid": False,
                        "error": f"API returned status {response.status_code}",
                        "provider": "perplexity"
                    }

        except Exception as e:
            return {
                "valid": False,
                "error": str(e),
                "provider": "perplexity"
            }


class PerplexityResearchProvider(PerplexityProvider):
    """Specialized Perplexity provider for research tasks"""

    def __init__(self, api_key: Optional[str] = None):
        super().__init__(api_key)
        # Use research-optimized model if available
        self.model = "llama-3.1-sonar-large-128k-online"  # Best for research

    async def generate_response(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """Generate research-focused response"""
        # Add research-specific system message
        research_system = """You are a research assistant. Provide comprehensive, well-cited answers with multiple perspectives when relevant. Focus on factual accuracy and include relevant sources."""

        if "system_message" not in request:
            request["system_message"] = research_system
        elif request["system_message"]:
            request["system_message"] = research_system + "\n\n" + request["system_message"]

        return await super().generate_response(request)