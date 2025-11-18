from typing import Dict, Any, List
from pydantic import Field
from .base_node import BaseNode


class SplitterNode(BaseNode):
    """Node for splitting input into multiple parallel outputs"""

    type: str = "splitter"
    num_splits: int = Field(3, description="Number of output splits")

    async def execute(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Execute splitting logic"""
        try:
            input_data = context.get("input_data", "")
            splits = [input_data] * self.num_splits
            
            result = {
                "splits": splits,
                "num_splits": len(splits)
            }
            
            self.mark_completed(result)
            return result
            
        except Exception as e:
            error_message = f"Splitter failed: {str(e)}"
            self.mark_failed(error_message)
            raise
