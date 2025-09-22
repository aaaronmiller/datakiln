from typing import Dict, Any, Optional, List, Literal
from pydantic import Field
from .base_node import BaseNode


class PromptNode(BaseNode):
    """Node for template-based prompts with variable substitution"""

    type: str = "prompt"

    # Prompt properties
    template_id: str = Field(..., description="Template identifier")
    vars: Dict[str, Any] = Field(default_factory=dict, description="Variables for template substitution")

    # Prompt configuration
    system_message: Optional[str] = Field(None, description="System message for the prompt")
    max_tokens: int = Field(default=1000, description="Maximum tokens in response")
    temperature: float = Field(default=0.7, description="Temperature for response generation")
    model: Optional[str] = Field(None, description="Specific model to use")

    # Output formatting
    output_format: Optional[Literal["text", "json", "markdown", "structured"]] = Field(
        "text", description="Expected output format"
    )
    parse_json: bool = Field(default=False, description="Whether to parse output as JSON")

    async def execute(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Execute prompt using AI provider"""
        try:
            # Get template from context
            templates = context.get("templates", {})
            template = templates.get(self.template_id)

            if not template:
                raise ValueError(f"Template '{self.template_id}' not found")

            # Get AI provider from context
            provider = context.get("provider")
            if not provider:
                raise ValueError("AI provider not available in context")

            # Substitute variables in template
            prompt_text = self._substitute_variables(template)

            # Prepare provider request
            provider_request = {
                "prompt": prompt_text,
                "system_message": self.system_message,
                "max_tokens": self.max_tokens,
                "temperature": self.temperature,
                "model": self.model,
                "output_format": self.output_format
            }

            # Execute prompt
            result = await provider.generate_response(provider_request)

            # Parse JSON if requested
            if self.parse_json:
                try:
                    import json
                    result["parsed"] = json.loads(result.get("response", "{}"))
                except json.JSONDecodeError:
                    result["parse_error"] = "Failed to parse response as JSON"

            self.mark_completed(result)
            return result

        except Exception as e:
            error_message = f"Prompt execution failed: {str(e)}"
            self.mark_failed(error_message)
            raise

    def _substitute_variables(self, template: str) -> str:
        """Substitute variables in template string"""
        result = template

        # Replace {{variable}} patterns with actual values
        for key, value in self.vars.items():
            placeholder = f"{{{{{key}}}}}"
            str_value = str(value) if value is not None else ""
            result = result.replace(placeholder, str_value)

        return result

    def get_required_variables(self, template: str) -> List[str]:
        """Extract required variables from template"""
        import re
        pattern = r'\{\{([^}]+)\}\}'
        matches = re.findall(pattern, template)
        return list(set(matches))

    def validate_template_variables(self, template: str) -> Dict[str, Any]:
        """Validate that all required variables are provided"""
        required_vars = self.get_required_variables(template)
        missing_vars = []
        extra_vars = []

        for var in required_vars:
            if var not in self.vars:
                missing_vars.append(var)

        for var in self.vars:
            if var not in required_vars:
                extra_vars.append(var)

        return {
            "valid": len(missing_vars) == 0,
            "missing_variables": missing_vars,
            "extra_variables": extra_vars,
            "required_variables": required_vars
        }