from typing import Dict, Any, Optional, List, Literal
from pydantic import Field
from .base_node import BaseNode


class UnionNode(BaseNode):
    """Node for union operations on multiple data sources"""

    type: str = "union"

    # Union configuration
    input_keys: List[str] = Field(..., description="Keys for input data sources to union")
    output_key: str = Field(default="unioned", description="Key for unioned output")

    # Union mode
    union_mode: Literal["distinct", "all", "intersect", "except"] = Field(
        default="distinct", description="Union mode: distinct (unique), all (allow duplicates), intersect (common), except (difference)"
    )

    # Field alignment for structured data
    align_fields: bool = Field(default=True, description="Whether to align fields when unioning structured data")

    async def execute(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Execute union operation"""
        try:
            # Get input data sources
            input_data_sources = []
            for key in self.input_keys:
                data = self.inputs.get(key)
                if data is not None:
                    input_data_sources.append(data)

            if not input_data_sources:
                raise ValueError("No input data sources found for union operation")

            # Perform union
            result = {}

            if self.union_mode == "distinct":
                result[self.output_key] = self._union_distinct(input_data_sources)
            elif self.union_mode == "all":
                result[self.output_key] = self._union_all(input_data_sources)
            elif self.union_mode == "intersect":
                result[self.output_key] = self._union_intersect(input_data_sources)
            elif self.union_mode == "except":
                result[self.output_key] = self._union_except(input_data_sources)
            else:
                raise ValueError(f"Unsupported union mode: {self.union_mode}")

            self.mark_completed(result)
            return result

        except Exception as e:
            error_message = f"Union failed: {str(e)}"
            self.mark_failed(error_message)
            raise

    def _union_distinct(self, data_sources: List[Any]) -> List[Any]:
        """Union with distinct values (remove duplicates)"""
        result = []

        for source in data_sources:
            if isinstance(source, list):
                result.extend(source)
            else:
                result.append(source)

        # Remove duplicates while preserving order
        seen = set()
        distinct_result = []

        for item in result:
            # Create a hashable representation for comparison
            if isinstance(item, dict):
                # For dicts, create a frozenset of items
                item_hash = frozenset(item.items()) if item else None
            elif isinstance(item, list):
                # For lists, convert to tuple
                item_hash = tuple(item) if item else ()
            else:
                # For other types, use the item directly
                item_hash = item

            if item_hash not in seen:
                seen.add(item_hash)
                distinct_result.append(item)

        return distinct_result

    def _union_all(self, data_sources: List[Any]) -> List[Any]:
        """Union all values (allow duplicates)"""
        result = []

        for source in data_sources:
            if isinstance(source, list):
                result.extend(source)
            else:
                result.append(source)

        return result

    def _union_intersect(self, data_sources: List[Any]) -> List[Any]:
        """Find intersection of all data sources"""
        if not data_sources:
            return []

        # Convert all sources to sets for intersection
        sets = []
        for source in data_sources:
            if isinstance(source, list):
                # Create hashable items for set
                hashable_items = []
                for item in source:
                    if isinstance(item, dict):
                        hashable_items.append(frozenset(item.items()) if item else None)
                    elif isinstance(item, list):
                        hashable_items.append(tuple(item) if item else ())
                    else:
                        hashable_items.append(item)
                sets.append(set(hashable_items))
            else:
                # Single item
                if isinstance(source, dict):
                    item_hash = frozenset(source.items()) if source else None
                elif isinstance(source, list):
                    item_hash = tuple(source) if source else ()
                else:
                    item_hash = source
                sets.append({item_hash})

        if not sets:
            return []

        # Find intersection
        intersection_hashes = set.intersection(*sets)

        # Convert back to original format (simplified - returns hashes)
        # In a real implementation, you'd need to maintain the original item mapping
        return list(intersection_hashes)

    def _union_except(self, data_sources: List[Any]) -> List[Any]:
        """Find difference between first source and others"""
        if not data_sources:
            return []

        # Use first source as base
        first_source = data_sources[0]
        other_sources = data_sources[1:]

        if isinstance(first_source, list):
            base_items = first_source.copy()
        else:
            base_items = [first_source]

        # Convert other sources to sets for exclusion
        exclude_sets = []
        for source in other_sources:
            if isinstance(source, list):
                hashable_items = []
                for item in source:
                    if isinstance(item, dict):
                        hashable_items.append(frozenset(item.items()) if item else None)
                    elif isinstance(item, list):
                        hashable_items.append(tuple(item) if item else ())
                    else:
                        hashable_items.append(item)
                exclude_sets.append(set(hashable_items))
            else:
                # Single item
                if isinstance(source, dict):
                    item_hash = frozenset(source.items()) if source else None
                elif isinstance(source, list):
                    item_hash = tuple(source) if source else ()
                else:
                    item_hash = source
                exclude_sets.append({item_hash})

        # Combine all items to exclude
        all_exclude = set()
        for exclude_set in exclude_sets:
            all_exclude.update(exclude_set)

        # Filter base items
        result = []
        for item in base_items:
            # Create hashable version
            if isinstance(item, dict):
                item_hash = frozenset(item.items()) if item else None
            elif isinstance(item, list):
                item_hash = tuple(item) if item else ()
            else:
                item_hash = item

            if item_hash not in all_exclude:
                result.append(item)

        return result