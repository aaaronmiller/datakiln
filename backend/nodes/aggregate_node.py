from typing import Dict, Any, Optional, List, Literal
from pydantic import Field
from .base_node import BaseNode


class AggregateNode(BaseNode):
    """Node for data aggregation operations"""

    type: str = "aggregate"

    # Aggregation configuration
    input_key: Optional[str] = Field(None, description="Key in inputs to aggregate")
    output_key: str = Field(default="aggregated", description="Key for aggregated output")

    # Aggregation functions
    functions: List[Literal["count", "sum", "avg", "min", "max", "distinct"]] = Field(
        default_factory=list, description="Aggregation functions to apply"
    )

    # Grouping configuration
    group_by: Optional[List[str]] = Field(None, description="Fields to group by")

    # Field mappings for aggregation
    field_mappings: Dict[str, str] = Field(
        default_factory=dict,
        description="Field mappings for aggregation (field_name -> aggregation_function)"
    )

    async def execute(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Execute data aggregation"""
        try:
            # Get input data
            input_data = self._get_input_data()
            if not input_data:
                raise ValueError("No input data available for aggregation")

            # Perform aggregation
            result = {}

            if isinstance(input_data, list):
                result[self.output_key] = self._aggregate_list(input_data)
            elif isinstance(input_data, dict):
                result[self.output_key] = self._aggregate_dict(input_data)
            else:
                raise ValueError("Unsupported data format for aggregation")

            self.mark_completed(result)
            return result

        except Exception as e:
            error_message = f"Aggregation failed: {str(e)}"
            self.mark_failed(error_message)
            raise

    def _get_input_data(self) -> Any:
        """Get input data for aggregation"""
        if self.input_key and self.input_key in self.inputs:
            return self.inputs[self.input_key]

        # If no specific input key, try to find suitable data
        for key, value in self.inputs.items():
            if isinstance(value, (list, dict)):
                return value

        return self.inputs.get("data") or list(self.inputs.values())[0] if self.inputs else None

    def _aggregate_list(self, data: List[Any]) -> Dict[str, Any]:
        """Aggregate a list of items"""
        if not data:
            return {"count": 0}

        result = {}

        # Apply specified functions
        if "count" in self.functions or not self.functions:
            result["count"] = len(data)

        # Handle numeric aggregations
        numeric_values = [item for item in data if isinstance(item, (int, float))]

        if numeric_values:
            if "sum" in self.functions or not self.functions:
                result["sum"] = sum(numeric_values)
            if "avg" in self.functions or not self.functions:
                result["avg"] = sum(numeric_values) / len(numeric_values)
            if "min" in self.functions or not self.functions:
                result["min"] = min(numeric_values)
            if "max" in self.functions or not self.functions:
                result["max"] = max(numeric_values)

        # Handle distinct values
        if "distinct" in self.functions:
            result["distinct"] = list(set(data))

        # Group by operations
        if self.group_by and isinstance(data[0], dict):
            result["grouped"] = self._group_by_fields(data)

        return result

    def _aggregate_dict(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Aggregate dictionary data"""
        result = {}

        # Apply field-specific aggregations
        for field, func in self.field_mappings.items():
            if field in data:
                value = data[field]
                if func == "count" and isinstance(value, list):
                    result[f"{field}_count"] = len(value)
                elif func == "sum" and isinstance(value, list):
                    numeric_vals = [v for v in value if isinstance(v, (int, float))]
                    result[f"{field}_sum"] = sum(numeric_vals) if numeric_vals else 0
                elif func == "avg" and isinstance(value, list):
                    numeric_vals = [v for v in value if isinstance(v, (int, float))]
                    result[f"{field}_avg"] = sum(numeric_vals) / len(numeric_vals) if numeric_vals else 0

        return result

    def _group_by_fields(self, data: List[Dict[str, Any]]) -> Dict[str, List[Dict[str, Any]]]:
        """Group data by specified fields"""
        if not self.group_by:
            return {}

        groups = {}
        for item in data:
            # Create group key from specified fields
            group_key_parts = []
            for field in self.group_by:
                value = item.get(field, "null")
                group_key_parts.append(str(value))

            group_key = "_".join(group_key_parts)

            if group_key not in groups:
                groups[group_key] = []
            groups[group_key].append(item)

        return groups