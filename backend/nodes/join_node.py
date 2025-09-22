from typing import Dict, Any, Optional, List, Literal
from pydantic import Field
from .base_node import BaseNode


class JoinNode(BaseNode):
    """Node for joining multiple data sources"""

    type: str = "join"

    # Join configuration
    join_type: Literal["inner", "left", "right", "full", "cross"] = Field(
        default="inner", description="Type of join to perform"
    )

    # Input keys for join sources
    left_input_key: str = Field(..., description="Key for left side data")
    right_input_key: str = Field(..., description="Key for right side data")

    # Join conditions
    left_join_key: str = Field(..., description="Field name for join in left data")
    right_join_key: str = Field(..., description="Field name for join in right data")

    # Output configuration
    output_key: str = Field(default="joined", description="Key for joined output")

    # Field selection
    select_fields: Optional[List[str]] = Field(
        None, description="Fields to include in output (None = all fields)"
    )

    async def execute(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Execute data join operation"""
        try:
            # Get input data
            left_data = self.inputs.get(self.left_input_key)
            right_data = self.inputs.get(self.right_input_key)

            if left_data is None or right_data is None:
                raise ValueError("Both left and right input data are required for join")

            if not isinstance(left_data, list) or not isinstance(right_data, list):
                raise ValueError("Join inputs must be lists of dictionaries")

            # Perform join
            result = {}

            if self.join_type == "inner":
                result[self.output_key] = self._inner_join(left_data, right_data)
            elif self.join_type == "left":
                result[self.output_key] = self._left_join(left_data, right_data)
            elif self.join_type == "right":
                result[self.output_key] = self._right_join(left_data, right_data)
            elif self.join_type == "full":
                result[self.output_key] = self._full_join(left_data, right_data)
            elif self.join_type == "cross":
                result[self.output_key] = self._cross_join(left_data, right_data)
            else:
                raise ValueError(f"Unsupported join type: {self.join_type}")

            # Apply field selection if specified
            if self.select_fields:
                result[self.output_key] = self._select_fields(result[self.output_key])

            self.mark_completed(result)
            return result

        except Exception as e:
            error_message = f"Join failed: {str(e)}"
            self.mark_failed(error_message)
            raise

    def _inner_join(self, left: List[Dict[str, Any]], right: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Perform inner join"""
        result = []

        # Create lookup map for right side
        right_map = {}
        for item in right:
            key = item.get(self.right_join_key)
            if key is not None:
                if key not in right_map:
                    right_map[key] = []
                right_map[key].append(item)

        # Perform join
        for left_item in left:
            left_key = left_item.get(self.left_join_key)
            if left_key in right_map:
                for right_item in right_map[left_key]:
                    # Merge the records
                    merged = {**left_item, **right_item}
                    result.append(merged)

        return result

    def _left_join(self, left: List[Dict[str, Any]], right: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Perform left join"""
        result = []

        # Create lookup map for right side
        right_map = {}
        for item in right:
            key = item.get(self.right_join_key)
            if key is not None:
                if key not in right_map:
                    right_map[key] = []
                right_map[key].append(item)

        # Perform join
        for left_item in left:
            left_key = left_item.get(self.left_join_key)
            if left_key in right_map:
                for right_item in right_map[left_key]:
                    merged = {**left_item, **right_item}
                    result.append(merged)
            else:
                # Left item with null right side
                merged = {**left_item}
                result.append(merged)

        return result

    def _right_join(self, left: List[Dict[str, Any]], right: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Perform right join"""
        # Right join is essentially left join with sides swapped
        swapped_result = self._left_join(right, left)

        # Swap back the field names in result
        result = []
        for item in swapped_result:
            # This is a simplified approach - in practice, you'd need more sophisticated field mapping
            result.append(item)

        return result

    def _full_join(self, left: List[Dict[str, Any]], right: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Perform full outer join"""
        result = []

        # Create lookup maps
        right_map = {}
        for item in right:
            key = item.get(self.right_join_key)
            if key is not None:
                if key not in right_map:
                    right_map[key] = []
                right_map[key].append(item)

        left_map = {}
        for item in left:
            key = item.get(self.left_join_key)
            if key is not None:
                if key not in left_map:
                    left_map[key] = []
                left_map[key].append(item)

        # Add matched records
        processed_right_keys = set()
        for left_item in left:
            left_key = left_item.get(self.left_join_key)
            if left_key in right_map:
                for right_item in right_map[left_key]:
                    merged = {**left_item, **right_item}
                    result.append(merged)
                processed_right_keys.add(left_key)
            else:
                # Left-only records
                result.append({**left_item})

        # Add right-only records
        for right_key, right_items in right_map.items():
            if right_key not in processed_right_keys:
                for right_item in right_items:
                    result.append({**right_item})

        return result

    def _cross_join(self, left: List[Dict[str, Any]], right: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Perform cross join (Cartesian product)"""
        result = []

        for left_item in left:
            for right_item in right:
                merged = {**left_item, **right_item}
                result.append(merged)

        return result

    def _select_fields(self, data: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Select specific fields from joined data"""
        if not self.select_fields:
            return data

        result = []
        for item in data:
            selected = {}
            for field in self.select_fields:
                if field in item:
                    selected[field] = item[field]
            result.append(selected)

        return result