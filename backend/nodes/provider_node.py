from typing import Dict, Any, Optional, Literal
from pydantic import Field
from .base_node import BaseNode


class ProviderNode(BaseNode):
    """Node for AI provider abstraction with multiple modes"""

    type: str = "provider"

    # Provider configuration
    provider_type: Literal["gemini_deep_research", "gemini_canvas", "perplexity", "extension"] = Field(
        ..., description="AI provider type or data source"
    )
    mode: Optional[str] = Field(None, description="Provider-specific mode")

    # Provider-specific settings
    model: Optional[str] = Field(None, description="Specific model to use")
    api_key: Optional[str] = Field(None, description="API key (can be overridden)")
    endpoint: Optional[str] = Field(None, description="Custom API endpoint")

    # Generation parameters
    max_tokens: int = Field(default=4000, description="Maximum tokens to generate")
    temperature: float = Field(default=0.7, description="Generation temperature")
    top_p: float = Field(default=0.9, description="Top-p sampling parameter")
    top_k: int = Field(default=40, description="Top-k sampling parameter")

    # Provider-specific features
    use_cache: bool = Field(default=True, description="Whether to use response caching")
    streaming: bool = Field(default=False, description="Whether to use streaming responses")

    # Deep research specific (for gemini_deep_research)
    research_depth: Optional[Literal["fast", "balanced", "comprehensive"]] = Field(
        None, description="Research depth for deep research mode"
    )
    follow_up_questions: int = Field(default=3, description="Number of follow-up questions to generate")

    # Canvas specific (for gemini_canvas)
    canvas_mode: Optional[Literal["create", "edit", "analyze"]] = Field(
        None, description="Canvas operation mode"
    )
    canvas_context: Optional[Dict[str, Any]] = Field(
        None, description="Context for canvas operations"
    )

    def _inject_services(self, context: Dict[str, Any]):
        """Inject services into the node"""
        self._provider_manager = context.get("provider_manager")
        self._selectors_registry = context.get("selectors_registry")

    async def execute(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Execute AI provider request"""
        try:
            # Get provider manager from injected service or context
            provider_manager = self._provider_manager or context.get("provider_manager")
            if not provider_manager:
                raise ValueError("Provider manager not available in context")

            # Prepare provider request
            request = self._build_provider_request(context)

            # Execute based on provider type
            if self.provider_type == "gemini_deep_research":
                result = await provider_manager.execute_deep_research(request)
            elif self.provider_type == "gemini_canvas":
                result = await provider_manager.execute_canvas(request)
            elif self.provider_type == "perplexity":
                result = await provider_manager.execute_perplexity(request)
            elif self.provider_type == "extension":
                result = await self._execute_extension_data_source(context)
            else:
                raise ValueError(f"Unsupported provider type: {self.provider_type}")

            self.mark_completed(result)
            return result

        except Exception as e:
            error_message = f"Provider execution failed: {str(e)}"
            self.mark_failed(error_message)
            raise

    def _build_provider_request(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Build provider-specific request"""
        # Get query from inputs first, then execution options
        query = self.inputs.get("query", "")
        if not query:
            execution_options = context.get("execution_options", {})
            query = execution_options.get("query", "")

        request = {
            "prompt": query,
            "provider_type": self.provider_type,
            "mode": self.mode,
            "model": self.model,
            "max_tokens": self.max_tokens,
            "temperature": self.temperature,
            "top_p": self.top_p,
            "top_k": self.top_k,
            "use_cache": self.use_cache,
            "streaming": self.streaming,
            "api_key": self.api_key,
            "endpoint": self.endpoint
        }

        # Add provider-specific parameters
        if self.provider_type == "gemini_deep_research":
            request.update({
                "research_depth": self.research_depth or "balanced",
                "follow_up_questions": self.follow_up_questions
            })
        elif self.provider_type == "gemini_canvas":
            request.update({
                "canvas_mode": self.canvas_mode or "create",
                "canvas_context": self.canvas_context or {}
            })

        return request

    async def _execute_extension_data_source(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Execute extension data source retrieval"""
        from backend.app.services.extension_service import extension_service

        # Get user ID from context or inputs
        user_id = self.inputs.get("user_id", context.get("user_id", "anonymous"))
        data_type = self.inputs.get("data_type", "chat_capture")

        # Fetch extension data
        data = await extension_service.get_workflow_data_source(user_id, data_type)

        # Mark captures as processed if requested
        if self.inputs.get("mark_processed", False) and "captures" in data:
            capture_ids = [capture["id"] for capture in data["captures"]]
            await extension_service.mark_data_processed(user_id, capture_ids)

        return {
            "data_source": "extension",
            "user_id": user_id,
            "data_type": data_type,
            "data": data,
            "timestamp": data.get("timestamp")
        }

    def validate_configuration(self) -> Dict[str, Any]:
        """Validate provider configuration"""
        issues = []

        # Check required parameters based on provider type
        if self.provider_type == "gemini_deep_research":
            if not self.model and not self.api_key:
                issues.append("Either model or api_key is required for Gemini Deep Research")
        elif self.provider_type == "gemini_canvas":
            if not self.api_key:
                issues.append("API key is required for Gemini Canvas")
        elif self.provider_type == "perplexity":
            if not self.api_key:
                issues.append("API key is required for Perplexity")

        # Check parameter ranges
        if not 1 <= self.max_tokens <= 100000:
            issues.append("max_tokens must be between 1 and 100000")

        if not 0.0 <= self.temperature <= 2.0:
            issues.append("temperature must be between 0.0 and 2.0")

        if not 0.0 <= self.top_p <= 1.0:
            issues.append("top_p must be between 0.0 and 1.0")

        return {
            "valid": len(issues) == 0,
            "issues": issues
        }