from typing import Dict, Any, Optional
from pydantic import Field
from .base_node import BaseNode
import asyncio
from datetime import datetime


class DelayNode(BaseNode):
    """Node for introducing configurable delays in workflow execution"""

    type: str = "delay"

    # Delay configuration
    delay_seconds: float = Field(..., gt=0, description="Delay duration in seconds")
    delay_type: str = Field("fixed", description="Type of delay: 'fixed', 'random', 'progressive'")

    # Random delay range (for random type)
    min_delay: Optional[float] = Field(None, ge=0, description="Minimum delay for random type")
    max_delay: Optional[float] = Field(None, ge=0, description="Maximum delay for random type")

    # Progressive delay configuration
    initial_delay: Optional[float] = Field(None, ge=0, description="Initial delay for progressive type")
    increment_factor: Optional[float] = Field(None, ge=0, description="Increment factor for progressive type")

    # Execution control
    skip_on_condition: Optional[str] = Field(None, description="Condition to skip delay (Python expression)")

    async def execute(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Execute delay logic"""
        try:
            # Check skip condition
            if self.skip_on_condition and self._should_skip_delay(context):
                return {
                    "delay_skipped": True,
                    "reason": "condition_met",
                    "timestamp": datetime.now().isoformat()
                }

            # Calculate actual delay
            actual_delay = self._calculate_delay(context)

            # Validate delay bounds
            if actual_delay < 0:
                raise ValueError(f"Calculated delay cannot be negative: {actual_delay}")
            if actual_delay > 3600:  # Max 1 hour
                raise ValueError(f"Delay too long: {actual_delay} seconds (max 3600)")

            # Execute delay
            await asyncio.sleep(actual_delay)

            result = {
                "delay_executed": True,
                "delay_seconds": actual_delay,
                "delay_type": self.delay_type,
                "timestamp": datetime.now().isoformat()
            }

            self.mark_completed(result)
            return result

        except Exception as e:
            error_message = f"Delay execution failed: {str(e)}"
            self.mark_failed(error_message)
            raise

    def _should_skip_delay(self, context: Dict[str, Any]) -> bool:
        """Evaluate skip condition"""
        try:
            # Build evaluation context
            eval_context = {
                "node": self,
                "context": context,
                "inputs": self.inputs,
                "workflow_data": context.get("execution_data", {})
            }

            # Evaluate condition (safe eval with limited builtins)
            result = eval(self.skip_on_condition, {"__builtins__": {}}, eval_context)
            return bool(result)

        except Exception:
            # If evaluation fails, don't skip
            return False

    def _calculate_delay(self, context: Dict[str, Any]) -> float:
        """Calculate the actual delay duration"""
        if self.delay_type == "fixed":
            return self.delay_seconds

        elif self.delay_type == "random":
            if self.min_delay is None or self.max_delay is None:
                raise ValueError("min_delay and max_delay required for random delay type")

            import random
            return random.uniform(self.min_delay, self.max_delay)

        elif self.delay_type == "progressive":
            if self.initial_delay is None or self.increment_factor is None:
                raise ValueError("initial_delay and increment_factor required for progressive delay type")

            # Get attempt count from context or node state
            attempt_count = context.get("execution_data", {}).get("retry_count", 0)
            return self.initial_delay + (attempt_count * self.increment_factor)

        else:
            raise ValueError(f"Unknown delay type: {self.delay_type}")