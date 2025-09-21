import asyncio
from typing import Dict, Any, Optional, List
from datetime import datetime
import httpx
import json
import os
from .base_provider import BaseProvider


class GeminiProvider(BaseProvider):
    """Gemini AI provider for deep research and canvas operations"""

    def __init__(self, api_key: Optional[str] = None, endpoint: Optional[str] = None):
        super().__init__(api_key, endpoint)
        self.base_url = endpoint or "https://generativelanguage.googleapis.com/v1beta"
        self.api_key = api_key or os.getenv("GEMINI_API_KEY")
        self.model = "gemini-1.5-pro"

        if not self.api_key:
            raise ValueError("Gemini API key is required")

    async def generate_response(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """Generate response using Gemini"""
        self._update_usage_stats()

        mode = request.get("mode", "standard")
        prompt = request.get("prompt", "")
        system_message = request.get("system_message")
        max_tokens = request.get("max_tokens", 1000)
        temperature = request.get("temperature", 0.7)

        try:
            if mode == "deep_research":
                return await self._generate_deep_research_response(request)
            elif mode == "canvas":
                return await self._generate_canvas_response(request)
            else:
                return await self._generate_standard_response(
                    prompt, system_message, max_tokens, temperature
                )

        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "provider": "gemini",
                "mode": mode,
                "timestamp": datetime.now().isoformat()
            }

    async def _generate_standard_response(
        self,
        prompt: str,
        system_message: Optional[str],
        max_tokens: int,
        temperature: float
    ) -> Dict[str, Any]:
        """Generate standard response"""
        url = f"{self.base_url}/models/{self.model}:generateContent"

        # Build request payload
        payload = {
            "contents": [{
                "parts": [{"text": prompt}]
            }],
            "generationConfig": {
                "temperature": temperature,
                "maxOutputTokens": max_tokens,
            }
        }

        if system_message:
            payload["systemInstruction"] = {
                "parts": [{"text": system_message}]
            }

        headers = {
            "Content-Type": "application/json",
            "x-goog-api-key": self.api_key
        }

        async with httpx.AsyncClient() as client:
            response = await client.post(url, json=payload, headers=headers, timeout=60)

            if response.status_code != 200:
                raise ValueError(f"Gemini API error: {response.status_code} - {response.text}")

            data = response.json()

            # Extract response
            candidates = data.get("candidates", [])
            if not candidates:
                raise ValueError("No response candidates from Gemini")

            candidate = candidates[0]
            content = candidate.get("content", {})
            parts = content.get("parts", [])

            if not parts:
                raise ValueError("No content parts in response")

            response_text = parts[0].get("text", "")

            return {
                "success": True,
                "response": response_text,
                "provider": "gemini",
                "model": self.model,
                "tokens_used": data.get("usageMetadata", {}).get("totalTokenCount", 0),
                "timestamp": datetime.now().isoformat()
            }

    async def _generate_deep_research_response(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """Generate deep research response"""
        research_depth = request.get("research_depth", "balanced")
        prompt = request.get("prompt", "")
        follow_up_questions = request.get("follow_up_questions", 3)

        # Enhanced prompt for deep research
        research_prompt = f"""You are conducting deep research on the following topic. Please provide a comprehensive analysis with the following depth level: {research_depth}

Topic: {prompt}

Please structure your response as follows:
1. **Summary**: A concise overview of the topic
2. **Key Findings**: Main discoveries and insights
3. **Detailed Analysis**: In-depth exploration of the subject matter
4. **Sources and Citations**: References and sources used
5. **Follow-up Questions**: {follow_up_questions} relevant questions for further investigation

Ensure your response is well-researched, factual, and provides multiple perspectives where applicable."""

        # Adjust parameters for deep research
        max_tokens = request.get("max_tokens", 4000)
        temperature = request.get("temperature", 0.3)  # Lower temperature for factual content

        result = await self._generate_standard_response(
            research_prompt,
            request.get("system_message"),
            max_tokens,
            temperature
        )

        if result.get("success"):
            # Add research-specific metadata
            result["research_depth"] = research_depth
            result["follow_up_questions"] = follow_up_questions
            result["research_type"] = "deep_research"

        return result

    async def _generate_canvas_response(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """Generate canvas response"""
        canvas_mode = request.get("canvas_mode", "create")
        prompt = request.get("prompt", "")
        canvas_context = request.get("canvas_context", {})

        # Enhanced prompt for canvas operations
        if canvas_mode == "create":
            canvas_prompt = f"""Create a new canvas visualization for the following content. Structure your response as a JSON object that can be used to render an interactive canvas.

Content: {prompt}

Please provide a JSON response with the following structure:
{{
    "canvas_type": "diagram|mindmap|timeline|process_flow",
    "title": "Canvas title",
    "nodes": [
        {{"id": "1", "label": "Node 1", "x": 100, "y": 100, "type": "concept|fact|question"}},
        ...
    ],
    "edges": [
        {{"from": "1", "to": "2", "label": "Relationship", "type": "directed|undirected"}},
        ...
    ],
    "metadata": {{
        "created": "timestamp",
        "version": "1.0"
    }}
}}"""
        elif canvas_mode == "edit":
            canvas_prompt = f"""Edit the existing canvas based on the following instructions and context.

Existing Canvas Context: {json.dumps(canvas_context, indent=2)}

Instructions: {prompt}

Provide an updated canvas JSON structure."""
        else:  # analyze
            canvas_prompt = f"""Analyze the following content and create a canvas that represents the key concepts, relationships, and insights.

Content: {prompt}

Provide analysis as a structured canvas JSON."""

        # Adjust parameters for canvas generation
        max_tokens = request.get("max_tokens", 3000)
        temperature = request.get("temperature", 0.4)

        result = await self._generate_standard_response(
            canvas_prompt,
            request.get("system_message"),
            max_tokens,
            temperature
        )

        if result.get("success"):
            # Try to parse and validate JSON
            try:
                response_text = result["response"]
                # Extract JSON from response if wrapped in text
                json_start = response_text.find('{')
                json_end = response_text.rfind('}') + 1

                if json_start != -1 and json_end > json_start:
                    json_str = response_text[json_start:json_end]
                    parsed_canvas = json.loads(json_str)
                    result["parsed_canvas"] = parsed_canvas
                else:
                    result["parse_error"] = "Could not extract JSON from response"
            except json.JSONDecodeError as e:
                result["parse_error"] = f"Invalid JSON in canvas response: {str(e)}"

            result["canvas_mode"] = canvas_mode
            result["canvas_type"] = "gemini_canvas"

        return result

    async def validate_connection(self) -> Dict[str, Any]:
        """Validate Gemini API connection"""
        try:
            url = f"{self.base_url}/models/{self.model}"

            headers = {
                "x-goog-api-key": self.api_key
            }

            async with httpx.AsyncClient() as client:
                response = await client.get(url, headers=headers, timeout=10)

                if response.status_code == 200:
                    return {
                        "valid": True,
                        "provider": "gemini",
                        "model": self.model,
                        "response_time": response.elapsed.total_seconds()
                    }
                else:
                    return {
                        "valid": False,
                        "error": f"API returned status {response.status_code}",
                        "provider": "gemini"
                    }

        except Exception as e:
            return {
                "valid": False,
                "error": str(e),
                "provider": "gemini"
            }


class GeminiDeepResearchProvider(GeminiProvider):
    """Specialized provider for deep research"""

    def __init__(self, api_key: Optional[str] = None):
        super().__init__(api_key)
        self.model = "gemini-1.5-pro"  # Use most capable model for research


class GeminiCanvasProvider(GeminiProvider):
    """Specialized provider for canvas operations"""

    def __init__(self, api_key: Optional[str] = None):
        super().__init__(api_key)
        self.model = "gemini-1.5-pro"  # Use most capable model for canvas