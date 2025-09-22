from typing import Dict, Any, Optional, List, Union, Literal
from pydantic import Field
from .base_node import BaseNode
import re
import json


class FilterNode(BaseNode):
    """Node for advanced data filtering operations"""

    type: str = "filter"

    # Parameter validation schema
    params_schema: Dict[str, Any] = {
        "type": "object",
        "properties": {
            "filter_type": {
                "type": "string",
                "enum": ["condition", "regex", "jsonpath", "range", "type", "exists", "custom"],
                "description": "Type of filtering to perform"
            },
            "input_key": {
                "type": "string",
                "description": "Key in inputs to filter"
            },
            "output_key": {
                "type": "string",
                "default": "filtered",
                "description": "Key for filtered output"
            },
            "invert_filter": {
                "type": "boolean",
                "default": False,
                "description": "Invert the filter (exclude matching items)"
            },
            "condition": {
                "type": "string",
                "description": "Filter condition expression (e.g., 'value > 10')"
            },
            "regex_pattern": {
                "type": "string",
                "description": "Regex pattern to match against"
            },
            "regex_field": {
                "type": "string",
                "description": "Field to apply regex to (for objects)"
            },
            "jsonpath_query": {
                "type": "string",
                "description": "JSONPath query for filtering"
            },
            "range_field": {
                "type": "string",
                "description": "Field to check range for"
            },
            "min_value": {
                "type": ["number", "null"],
                "description": "Minimum value (inclusive)"
            },
            "max_value": {
                "type": ["number", "null"],
                "description": "Maximum value (inclusive)"
            },
            "allowed_types": {
                "type": "array",
                "items": {
                    "type": "string",
                    "enum": ["string", "number", "boolean", "object", "array", "null"]
                },
                "description": "Allowed data types"
            },
            "exists_field": {
                "type": "string",
                "description": "Field that must exist"
            },
            "exists_check": {
                "type": "string",
                "enum": ["exists", "not_exists", "truthy", "falsy"],
                "default": "exists",
                "description": "Type of existence check"
            },
            "custom_function": {
                "type": "string",
                "description": "Custom filter function code"
            }
        },
        "required": ["filter_type"],
        "dependencies": {
            "condition": {"properties": {"filter_type": {"enum": ["condition"]}}},
            "regex_pattern": {"properties": {"filter_type": {"enum": ["regex"]}}},
            "jsonpath_query": {"properties": {"filter_type": {"enum": ["jsonpath"]}}},
            "range_field": {"properties": {"filter_type": {"enum": ["range"]}}},
            "allowed_types": {"properties": {"filter_type": {"enum": ["type"]}}},
            "exists_field": {"properties": {"filter_type": {"enum": ["exists"]}}},
            "custom_function": {"properties": {"filter_type": {"enum": ["custom"]}}}
        }
    }

    # Filter operation type
    filter_type: Literal["condition", "regex", "jsonpath", "range", "type", "exists", "custom"] = Field(
        ..., description="Type of filtering to perform"
    )

    # Input/output configuration
    input_key: Optional[str] = Field(None, description="Key in inputs to filter")
    output_key: str = Field(default="filtered", description="Key for filtered output")
    invert_filter: bool = Field(default=False, description="Invert the filter (exclude matching items)")

    # Condition-based filtering
    condition: Optional[str] = Field(None, description="Filter condition expression (e.g., 'value > 10')")

    # Regex filtering
    regex_pattern: Optional[str] = Field(None, description="Regex pattern to match against")
    regex_field: Optional[str] = Field(None, description="Field to apply regex to (for objects)")

    # JSONPath filtering
    jsonpath_query: Optional[str] = Field(None, description="JSONPath query for filtering")

    # Range filtering
    range_field: Optional[str] = Field(None, description="Field to check range for")
    min_value: Optional[Union[int, float]] = Field(None, description="Minimum value (inclusive)")
    max_value: Optional[Union[int, float]] = Field(None, description="Maximum value (inclusive)")

    # Type filtering
    allowed_types: Optional[List[Literal["string", "number", "boolean", "object", "array", "null"]]] = Field(
        None, description="Allowed data types"
    )

    # Existence filtering
    exists_field: Optional[str] = Field(None, description="Field that must exist")
    exists_check: Optional[Literal["exists", "not_exists", "truthy", "falsy"]] = Field(
        "exists", description="Type of existence check"
    )

    # Custom filtering
    custom_function: Optional[str] = Field(None, description="Custom filter function code")

    async def execute(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Execute filtering operation"""
        try:
            # Get input data
            input_data = self._get_input_data()
            if input_data is None:
                raise ValueError("No input data available for filtering")

            # Apply filter
            filtered_data = self._apply_filter(input_data)

            result = {self.output_key: filtered_data}
            self.mark_completed(result)
            return result

        except Exception as e:
            error_message = f"Filter failed: {str(e)}"
            self.mark_failed(error_message)
            raise

    def _get_input_data(self) -> Any:
        """Get input data for filtering"""
        if self.input_key and self.input_key in self.inputs:
            return self.inputs[self.input_key]

        # If no specific input key, try to find suitable data
        for key, value in self.inputs.items():
            if isinstance(value, (list, dict)):
                return value

        return self.inputs.get("data") or list(self.inputs.values())[0] if self.inputs else None

    def _apply_filter(self, data: Any) -> Any:
        """Apply the configured filter to data"""
        if self.filter_type == "condition":
            return self._filter_by_condition(data)
        elif self.filter_type == "regex":
            return self._filter_by_regex(data)
        elif self.filter_type == "jsonpath":
            return self._filter_by_jsonpath(data)
        elif self.filter_type == "range":
            return self._filter_by_range(data)
        elif self.filter_type == "type":
            return self._filter_by_type(data)
        elif self.filter_type == "exists":
            return self._filter_by_existence(data)
        elif self.filter_type == "custom":
            return self._filter_by_custom_function(data)
        else:
            raise ValueError(f"Unsupported filter type: {self.filter_type}")

    def _filter_by_condition(self, data: Any) -> Any:
        """Filter by condition expression"""
        if not self.condition:
            raise ValueError("condition is required for condition filtering")

        if isinstance(data, list):
            filtered = []
            for item in data:
                try:
                    # Evaluate condition with item as context
                    if self._evaluate_condition(self.condition, item):
                        filtered.append(item)
                except Exception:
                    # If evaluation fails, exclude item
                    pass
            return filtered

        elif isinstance(data, dict):
            # Filter dict keys/values
            filtered = {}
            for key, value in data.items():
                try:
                    context = {"key": key, "value": value, "item": value}
                    if self._evaluate_condition(self.condition, context):
                        filtered[key] = value
                except Exception:
                    pass
            return filtered

        else:
            # Single value - evaluate condition
            try:
                if self._evaluate_condition(self.condition, data):
                    return data
                else:
                    return None
            except Exception:
                return None

    def _evaluate_condition(self, condition: str, context: Any) -> bool:
        """Safely evaluate a condition expression"""
        # Create safe globals for eval
        safe_globals = {
            "__builtins__": {
                "len": len,
                "str": str,
                "int": int,
                "float": float,
                "bool": bool,
                "isinstance": isinstance,
                "type": type,
                "abs": abs,
                "min": min,
                "max": max,
                "sum": sum,
                "all": all,
                "any": any,
                "enumerate": enumerate,
                "zip": zip,
                "range": range,
                "sorted": sorted,
                "reversed": reversed,
            }
        }

        # Create locals with data context
        locals_dict = {}
        if isinstance(context, dict):
            locals_dict.update(context)
        else:
            locals_dict["data"] = context
            locals_dict["value"] = context
            locals_dict["item"] = context

        try:
            result = eval(condition, safe_globals, locals_dict)
            return bool(result)
        except Exception as e:
            raise ValueError(f"Condition evaluation failed: {str(e)}")

    def _filter_by_regex(self, data: Any) -> Any:
        """Filter by regex pattern"""
        if not self.regex_pattern:
            raise ValueError("regex_pattern is required for regex filtering")

        try:
            pattern = re.compile(self.regex_pattern)
        except re.error as e:
            raise ValueError(f"Invalid regex pattern: {str(e)}")

        def matches_regex(value: Any) -> bool:
            if not isinstance(value, str):
                return False
            return bool(pattern.search(value))

        if isinstance(data, list):
            return [item for item in data if self._check_item_regex(item)]
        elif isinstance(data, dict):
            return {k: v for k, v in data.items() if self._check_item_regex(v)}
        else:
            return data if self._check_item_regex(data) else None

    def _check_item_regex(self, item: Any) -> bool:
        """Check if item matches regex criteria"""
        if self.regex_field and isinstance(item, dict):
            # Check specific field
            field_value = item.get(self.regex_field)
            if field_value is None:
                return False
            return self._matches_regex(str(field_value))
        else:
            # Check the item itself
            return self._matches_regex(str(item))

    def _matches_regex(self, text: str) -> bool:
        """Check if text matches the regex pattern"""
        try:
            pattern = re.compile(self.regex_pattern)
            return bool(pattern.search(text))
        except:
            return False

    def _filter_by_jsonpath(self, data: Any) -> Any:
        """Filter using JSONPath query"""
        if not self.jsonpath_query:
            raise ValueError("jsonpath_query is required for jsonpath filtering")

        try:
            import jsonpath_ng.ext as jsonpath
            jsonpath_expr = jsonpath.parse(self.jsonpath_query)
            matches = jsonpath_expr.find(data)
            return [match.value for match in matches]
        except Exception as e:
            raise ValueError(f"JSONPath filtering failed: {str(e)}")

    def _filter_by_range(self, data: Any) -> Any:
        """Filter by numeric range"""
        if not self.range_field and (self.min_value is None and self.max_value is None):
            raise ValueError("range_field and/or min_value/max_value required for range filtering")

        def in_range(value: Any) -> bool:
            if not isinstance(value, (int, float)):
                return False

            if self.min_value is not None and value < self.min_value:
                return False
            if self.max_value is not None and value > self.max_value:
                return False
            return True

        if isinstance(data, list):
            return [item for item in data if self._check_item_range(item)]
        elif isinstance(data, dict):
            return {k: v for k, v in data.items() if self._check_item_range(v)}
        else:
            return data if self._check_item_range(data) else None

    def _check_item_range(self, item: Any) -> bool:
        """Check if item is within the specified range"""
        if self.range_field and isinstance(item, dict):
            # Check specific field
            field_value = item.get(self.range_field)
            return self._value_in_range(field_value)
        else:
            # Check the item itself
            return self._value_in_range(item)

    def _value_in_range(self, value: Any) -> bool:
        """Check if a value is within the configured range"""
        if not isinstance(value, (int, float)):
            return False

        if self.min_value is not None and value < self.min_value:
            return False
        if self.max_value is not None and value > self.max_value:
            return False
        return True

    def _filter_by_type(self, data: Any) -> Any:
        """Filter by data type"""
        if not self.allowed_types:
            raise ValueError("allowed_types is required for type filtering")

        def get_type_name(value: Any) -> str:
            if value is None:
                return "null"
            elif isinstance(value, bool):
                return "boolean"
            elif isinstance(value, (int, float)):
                return "number"
            elif isinstance(value, str):
                return "string"
            elif isinstance(value, list):
                return "array"
            elif isinstance(value, dict):
                return "object"
            else:
                return "unknown"

        if isinstance(data, list):
            return [item for item in data if get_type_name(item) in self.allowed_types]
        elif isinstance(data, dict):
            return {k: v for k, v in data.items() if get_type_name(v) in self.allowed_types}
        else:
            return data if get_type_name(data) in self.allowed_types else None

    def _filter_by_existence(self, data: Any) -> Any:
        """Filter by field existence"""
        if not self.exists_field:
            raise ValueError("exists_field is required for existence filtering")

        def check_existence(item: Any) -> bool:
            if not isinstance(item, dict):
                return False

            field_value = item.get(self.exists_field)

            if self.exists_check == "exists":
                return field_value is not None
            elif self.exists_check == "not_exists":
                return field_value is None
            elif self.exists_check == "truthy":
                return bool(field_value)
            elif self.exists_check == "falsy":
                return not bool(field_value)
            else:
                return field_value is not None

        if isinstance(data, list):
            return [item for item in data if check_existence(item)]
        elif isinstance(data, dict):
            return {k: v for k, v in data.items() if check_existence(v)}
        else:
            return data if check_existence(data) else None

    def _filter_by_custom_function(self, data: Any) -> Any:
        """Filter using custom function code"""
        if not self.custom_function:
            raise ValueError("custom_function is required for custom filtering")

        # This would require a safe code execution environment
        # For now, raise an error indicating this feature needs implementation
        raise ValueError("Custom function filtering not yet implemented - requires safe code execution environment")

    def validate_configuration(self) -> Dict[str, Any]:
        """Validate filter configuration"""
        issues = []

        # Validate based on filter type
        if self.filter_type == "condition" and not self.condition:
            issues.append("condition is required for condition filtering")
        elif self.filter_type == "regex" and not self.regex_pattern:
            issues.append("regex_pattern is required for regex filtering")
        elif self.filter_type == "jsonpath" and not self.jsonpath_query:
            issues.append("jsonpath_query is required for jsonpath filtering")
        elif self.filter_type == "range" and not self.range_field and (self.min_value is None and self.max_value is None):
            issues.append("range_field and/or min_value/max_value required for range filtering")
        elif self.filter_type == "type" and not self.allowed_types:
            issues.append("allowed_types is required for type filtering")
        elif self.filter_type == "exists" and not self.exists_field:
            issues.append("exists_field is required for existence filtering")
        elif self.filter_type == "custom" and not self.custom_function:
            issues.append("custom_function is required for custom filtering")

        # Validate regex pattern
        if self.regex_pattern:
            try:
                re.compile(self.regex_pattern)
            except re.error as e:
                issues.append(f"Invalid regex pattern: {str(e)}")

        return {
            "valid": len(issues) == 0,
            "issues": issues
        }