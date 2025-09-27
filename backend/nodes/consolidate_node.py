from typing import Dict, Any, Optional, List
from pydantic import Field
from .base_node import BaseNode


class ConsolidateNode(BaseNode):
    """Node for consolidating multiple inputs with AI models"""

    type: str = "consolidate"

    # Model configuration
    model: str = Field(..., description="AI model to use for consolidation")
    prepend_text: Optional[str] = Field(None, description="Text to prepend to input")
    append_text: Optional[str] = Field(None, description="Text to append to input")

    # Attachments (file paths)
    attachments: List[str] = Field(default_factory=list, description="List of file paths to attach")

    async def execute(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Execute consolidation using AI provider"""
        try:
            # Get input data from previous nodes
            input_data = self._gather_input_data(context)

            # Create temp files for data passage confirmation
            temp_files = self._create_temp_files(input_data)

            # Prepare consolidated prompt
            consolidated_prompt = self._prepare_consolidated_prompt(input_data)

            # Get AI provider from context
            provider = context.get("provider")
            if not provider:
                raise ValueError("AI provider not available in context")

            # Prepare provider request with attachments
            all_attachments = self.attachments + temp_files
            provider_request = {
                "prompt": consolidated_prompt,
                "model": self.model,
                "max_tokens": 2000,
                "temperature": 0.7,
                "attachments": all_attachments
            }

            # Execute consolidation
            result = provider.generate_response(provider_request)

            # Handle outputs
            output_result = self._handle_outputs(result, context)

            # Clean up temp files
            self._cleanup_temp_files(temp_files)

            self.mark_completed(output_result)
            return output_result

        except Exception as e:
            error_message = f"Consolidation execution failed: {str(e)}"
            self.mark_failed(error_message)
            raise

    def _gather_input_data(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Gather input data from workflow state"""
        workflow_state = context.get("execution_data", {}).get("workflow_state", {})

        # Collect data from all previous nodes that connected to this node
        input_data = {}
        for node_id, data in workflow_state.items():
            input_data[node_id] = data

        return input_data

    def _prepare_consolidated_prompt(self, input_data: Dict[str, Any]) -> str:
        """Prepare consolidated prompt from input data"""
        parts = []

        # Add prepend text
        if self.prepend_text:
            parts.append(self.prepend_text)

        # Add consolidated input data
        if input_data:
            parts.append("Consolidate the following inputs:")
            for node_id, data in input_data.items():
                parts.append(f"\nFrom {node_id}:")
                if isinstance(data, (dict, list)):
                    import json
                    parts.append(json.dumps(data, indent=2))
                else:
                    parts.append(str(data))

        # Add append text
        if self.append_text:
            parts.append(self.append_text)

        return "\n".join(parts)

    def _create_temp_files(self, input_data: Dict[str, Any]) -> List[str]:
        """Create temporary files for data passage confirmation"""
        import tempfile
        import os
        import json

        temp_files = []
        temp_dir = tempfile.gettempdir()

        for node_id, data in input_data.items():
            try:
                # Create temp file with node data
                temp_file = os.path.join(temp_dir, f"consolidate_input_{node_id}_{os.getpid()}.json")

                with open(temp_file, 'w', encoding='utf-8') as f:
                    if isinstance(data, (dict, list)):
                        json.dump(data, f, indent=2, ensure_ascii=False)
                    else:
                        json.dump({"data": str(data)}, f, indent=2, ensure_ascii=False)

                temp_files.append(temp_file)
            except Exception as e:
                # Log error but continue
                print(f"Failed to create temp file for {node_id}: {str(e)}")

        return temp_files

    def _cleanup_temp_files(self, temp_files: List[str]):
        """Clean up temporary files"""
        import os

        for temp_file in temp_files:
            try:
                if os.path.exists(temp_file):
                    os.remove(temp_file)
            except Exception as e:
                print(f"Failed to cleanup temp file {temp_file}: {str(e)}")

    def _handle_outputs(self, result: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        """Handle output destinations"""
        output_data = {
            "consolidated_result": result.get("response", ""),
            "model_used": self.model,
            "attachments_count": len(self.attachments),
            "input_sources": list(context.get("execution_data", {}).get("workflow_state", {}).keys())
        }

        # Handle output destinations based on node configuration
        if hasattr(self, 'outputs') and self.outputs:
            for output_config in self.outputs:
                destination = output_config.get("destination")
                if destination == "file":
                    # File output will be handled by executor
                    pass
                elif destination == "clipboard":
                    # Clipboard output will be handled by executor
                    pass
                elif destination == "screen":
                    # Screen output will be handled by executor
                    pass

        return output_data