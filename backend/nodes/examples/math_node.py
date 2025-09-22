"""
Example Custom Node: Math Operations Node

This is an example implementation of a custom node that performs mathematical operations.
"""

from typing import Dict, Any, List
from ..base_node import BaseNode


class MathNode(BaseNode):
    """A custom node that performs mathematical operations"""

    def __init__(self, operation: str = "add", **kwargs):
        super().__init__(
            name=f"Math {operation.title()}",
            type="math_operation",
            description=f"Perform {operation} operation on numbers",
            **kwargs
        )
        self.operation = operation

    async def execute(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Execute the math operation"""
        # Get input values
        inputs = self.inputs.get("numbers", [])
        if not isinstance(inputs, list):
            inputs = [inputs]

        # Convert to numbers
        numbers = []
        for num in inputs:
            try:
                numbers.append(float(num))
            except (ValueError, TypeError):
                continue

        if not numbers:
            self.mark_failed("No valid numbers provided")
            return {"result": None, "error": "No valid numbers provided"}

        # Perform operation
        try:
            if self.operation == "add":
                result = sum(numbers)
            elif self.operation == "subtract":
                result = numbers[0] - sum(numbers[1:]) if len(numbers) > 1 else numbers[0]
            elif self.operation == "multiply":
                result = 1
                for num in numbers:
                    result *= num
            elif self.operation == "divide":
                result = numbers[0]
                for num in numbers[1:]:
                    if num == 0:
                        raise ValueError("Division by zero")
                    result /= num
            elif self.operation == "average":
                result = sum(numbers) / len(numbers)
            elif self.operation == "max":
                result = max(numbers)
            elif self.operation == "min":
                result = min(numbers)
            else:
                raise ValueError(f"Unknown operation: {self.operation}")

            self.mark_completed({"result": result})
            return {"result": result}

        except Exception as e:
            error_msg = f"Math operation failed: {str(e)}"
            self.mark_failed(error_msg)
            return {"result": None, "error": error_msg}


# Node definition for registration
MATH_NODE_DEFINITION = {
    "type": "math_operation",
    "name": "Math Operation",
    "description": "Perform mathematical operations on numbers",
    "version": "1.0.0",
    "inputs": ["numbers"],
    "outputs": ["result"],
    "params_schema": {
        "type": "object",
        "required": ["operation"],
        "properties": {
            "operation": {
                "type": "string",
                "enum": ["add", "subtract", "multiply", "divide", "average", "max", "min"],
                "default": "add",
                "description": "Mathematical operation to perform"
            },
            "numbers": {
                "type": "array",
                "items": {"type": "number"},
                "description": "List of numbers to operate on"
            }
        }
    },
    "metadata": {
        "author": "System",
        "category": "math",
        "tags": ["math", "calculation", "numbers"]
    }
}