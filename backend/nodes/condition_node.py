from typing import Dict, Any, Optional, Union, List, Literal
from pydantic import Field
from .base_node import BaseNode


class ConditionNode(BaseNode):
    """Node for conditional branching logic"""

    type: str = "condition"

    # Condition configuration
    expr: str = Field(..., description="Expression to evaluate for branching")

    # Branch targets
    true_next: Optional[Union[str, List[str]]] = Field(
        None, description="Next node(s) if condition is true"
    )
    false_next: Optional[Union[str, List[str]]] = Field(
        None, description="Next node(s) if condition is false"
    )

    # Input data configuration
    input_key: Optional[str] = Field(None, description="Key in inputs to evaluate")

    # Advanced condition options
    condition_type: Literal["simple", "python", "jsonpath", "regex"] = Field(
        "simple", description="Type of condition evaluation"
    )
    timeout_condition: Optional[str] = Field(
        None, description="Condition to check for timeout scenarios"
    )

    # Evaluation context
    variables: Dict[str, Any] = Field(
        default_factory=dict, description="Additional variables for evaluation"
    )

    async def execute(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Execute conditional evaluation"""
        try:
            # Get data to evaluate
            eval_data = self._get_evaluation_data()
            if eval_data is None:
                raise ValueError("No data available for condition evaluation")

            # Evaluate condition
            result = await self._evaluate_condition(eval_data)

            # Determine next nodes
            next_nodes = self.true_next if result else self.false_next

            # Store evaluation result
            evaluation_result = {
                "condition_evaluated": True,
                "condition_result": result,
                "next_nodes": next_nodes,
                "evaluated_data": eval_data,
                "expression": self.expr,
                "condition_type": self.condition_type
            }

            self.mark_completed(evaluation_result)
            return evaluation_result

        except Exception as e:
            error_message = f"Condition evaluation failed: {str(e)}"
            self.mark_failed(error_message)
            raise

    def _get_evaluation_data(self) -> Any:
        """Get data for condition evaluation"""
        if self.input_key and self.input_key in self.inputs:
            return self.inputs[self.input_key]

        # Try to find suitable data from inputs
        for key, value in self.inputs.items():
            if isinstance(value, (str, int, float, bool, dict, list)):
                return value

        return self.inputs

    async def _evaluate_condition(self, data: Any) -> bool:
        """Evaluate condition based on type"""
        try:
            if self.condition_type == "simple":
                return await self._evaluate_simple_condition(data)
            elif self.condition_type == "python":
                return await self._evaluate_python_condition(data)
            elif self.condition_type == "jsonpath":
                return await self._evaluate_jsonpath_condition(data)
            elif self.condition_type == "regex":
                return await self._evaluate_regex_condition(data)
            else:
                raise ValueError(f"Unsupported condition type: {self.condition_type}")

        except Exception as e:
            # Log the error but don't fail - return False as default
            print(f"Condition evaluation error: {str(e)}")
            return False

    async def _evaluate_simple_condition(self, data: Any) -> bool:
        """Evaluate simple condition expressions"""
        # Get evaluation context
        context = self._build_evaluation_context(data)

        # Handle different data types and common patterns
        if isinstance(data, bool):
            return data
        elif isinstance(data, str):
            return self._evaluate_string_condition(data, context)
        elif isinstance(data, (int, float)):
            return self._evaluate_numeric_condition(data, context)
        elif isinstance(data, list):
            return self._evaluate_list_condition(data, context)
        elif isinstance(data, dict):
            return self._evaluate_dict_condition(data, context)
        else:
            return bool(data)

    async def _evaluate_python_condition(self, data: Any) -> bool:
        """Evaluate Python expression"""
        context = self._build_evaluation_context(data)

        try:
            # Create evaluation context with safe built-ins
            safe_builtins = {
                'len': len,
                'str': str,
                'int': int,
                'float': float,
                'bool': bool,
                'list': list,
                'dict': dict,
                'abs': abs,
                'min': min,
                'max': max,
                'sum': sum,
                'any': any,
                'all': all,
            }

            # Evaluate expression
            result = eval(self.expr, {"__builtins__": safe_builtins}, context)
            return bool(result)

        except Exception as e:
            raise ValueError(f"Python condition evaluation failed: {str(e)}")

    async def _evaluate_jsonpath_condition(self, data: Any) -> bool:
        """Evaluate JSONPath condition"""
        if not isinstance(data, dict):
            return False

        try:
            import jsonpath_ng.ext as jsonpath
            jsonpath_expr = jsonpath.parse(self.expr)
            matches = jsonpath_expr.find(data)
            return len(matches) > 0

        except Exception as e:
            raise ValueError(f"JSONPath condition evaluation failed: {str(e)}")

    async def _evaluate_regex_condition(self, data: Any) -> bool:
        """Evaluate regex condition"""
        if not isinstance(data, str):
            return False

        try:
            import re
            match = re.search(self.expr, data)
            return match is not None

        except Exception as e:
            raise ValueError(f"Regex condition evaluation failed: {str(e)}")

    def _build_evaluation_context(self, data: Any) -> Dict[str, Any]:
        """Build evaluation context"""
        context = {
            "data": data,
            "value": data,
            "item": data,
            "input": self.inputs
        }

        # Add custom variables
        context.update(self.variables)

        # Add metadata
        context.update({
            "node_id": self.id,
            "node_name": self.name,
            "timestamp": self.created_at.isoformat()
        })

        return context

    def _evaluate_string_condition(self, data: str, context: Dict[str, Any]) -> bool:
        """Evaluate string-based conditions"""
        # Common string condition patterns
        patterns = {
            "empty": lambda x: len(x.strip()) == 0,
            "not_empty": lambda x: len(x.strip()) > 0,
            "contains": lambda x: self.expr.replace("contains:", "").strip() in x,
            "starts_with": lambda x: x.startswith(self.expr.replace("starts_with:", "").strip()),
            "ends_with": lambda x: x.endswith(self.expr.replace("ends_with:", "").strip()),
            "equals": lambda x: x == self.expr.replace("equals:", "").strip(),
            "length": lambda x: len(x) == int(self.expr.replace("length:", "").strip()) if self.expr.startswith("length:") else False,
        }

        # Check for pattern matches
        for pattern, evaluator in patterns.items():
            if self.expr.startswith(pattern + ":"):
                return evaluator(data)

        # Default: non-empty string is truthy
        return len(data.strip()) > 0

    def _evaluate_numeric_condition(self, data: Union[int, float], context: Dict[str, Any]) -> bool:
        """Evaluate numeric conditions"""
        # Handle comparison expressions
        if ">" in self.expr:
            try:
                threshold = float(self.expr.split(">")[-1].strip())
                return data > threshold
            except:
                return False
        elif "<" in self.expr:
            try:
                threshold = float(self.expr.split("<")[-1].strip())
                return data < threshold
            except:
                return False
        elif ">=" in self.expr:
            try:
                threshold = float(self.expr.split(">=")[-1].strip())
                return data >= threshold
            except:
                return False
        elif "<=" in self.expr:
            try:
                threshold = float(self.expr.split("<=")[-1].strip())
                return data <= threshold
            except:
                return False
        elif "==" in self.expr:
            try:
                threshold = float(self.expr.split("==")[-1].strip())
                return data == threshold
            except:
                return False
        else:
            # Default: non-zero is truthy
            return data != 0

    def _evaluate_list_condition(self, data: list, context: Dict[str, Any]) -> bool:
        """Evaluate list-based conditions"""
        # Common list condition patterns
        if self.expr.startswith("length:"):
            try:
                expected_length = int(self.expr.replace("length:", "").strip())
                return len(data) == expected_length
            except:
                return False
        elif self.expr == "empty":
            return len(data) == 0
        elif self.expr == "not_empty":
            return len(data) > 0
        else:
            # Default: non-empty list is truthy
            return len(data) > 0

    def _evaluate_dict_condition(self, data: dict, context: Dict[str, Any]) -> bool:
        """Evaluate dict-based conditions"""
        # Common dict condition patterns
        if self.expr.startswith("has_key:"):
            key = self.expr.replace("has_key:", "").strip()
            return key in data
        elif self.expr.startswith("key_equals:"):
            parts = self.expr.replace("key_equals:", "").strip().split("=", 1)
            if len(parts) == 2:
                key, expected_value = parts
                return data.get(key.strip()) == expected_value.strip()
        elif self.expr == "empty":
            return len(data) == 0
        elif self.expr == "not_empty":
            return len(data) > 0
        else:
            # Default: non-empty dict is truthy
            return len(data) > 0