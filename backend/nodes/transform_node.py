from typing import Dict, Any, Optional, List, Union, Literal
from pydantic import Field
from .base_node import BaseNode
import json
import re


class TransformNode(BaseNode):
    """Node for data transformation operations"""

    type: str = "transform"

    # Parameter validation schema
    params_schema: Dict[str, Any] = {
        "type": "object",
        "properties": {
            "transform_type": {
                "type": "string",
                "enum": ["markdown", "extract_citations", "merge", "filter", "json_transform", "text_clean", "field_ops", "type_convert"],
                "description": "Type of transformation to perform"
            },
            "input_key": {
                "type": "string",
                "description": "Key in inputs to transform"
            },
            "output_key": {
                "type": "string",
                "default": "transformed",
                "description": "Key for transformed output"
            },
            "merge_keys": {
                "type": "array",
                "items": {"type": "string"},
                "description": "Keys to merge for merge transform"
            },
            "filter_condition": {
                "type": "string",
                "description": "Filter condition (e.g., 'len > 100')"
            },
            "json_path": {
                "type": "string",
                "description": "JSON path for extraction (e.g., '$.items[*].name')"
            },
            "regex_pattern": {
                "type": "string",
                "description": "Regex pattern for text operations"
            },
            "replacement": {
                "type": "string",
                "description": "Replacement string for regex operations"
            },
            "markdown_format": {
                "type": "string",
                "enum": ["plain", "github", "html"],
                "default": "plain",
                "description": "Markdown output format"
            },
            "clean_operations": {
                "type": "array",
                "items": {
                    "type": "string",
                    "enum": ["lowercase", "uppercase", "trim", "normalize_whitespace", "remove_urls", "remove_emails"]
                },
                "description": "Text cleaning operations to apply"
            },
            "field_operations": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "operation": {
                            "type": "string",
                            "enum": ["add", "remove", "rename"]
                        },
                        "field": {"type": "string"},
                        "value": {},  # Any type for add operation
                        "new_name": {"type": "string"}  # For rename operation
                    },
                    "required": ["operation", "field"]
                },
                "description": "Field operations to perform"
            },
            "type_conversions": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "field": {"type": "string"},
                        "target_type": {
                            "type": "string",
                            "enum": ["string", "number", "boolean", "integer", "float"]
                        }
                    },
                    "required": ["field", "target_type"]
                },
                "description": "Type conversion operations"
            }
        },
        "required": ["transform_type"],
        "dependencies": {
            "merge_keys": {"properties": {"transform_type": {"enum": ["merge"]}}},
            "filter_condition": {"properties": {"transform_type": {"enum": ["filter"]}}},
            "json_path": {"properties": {"transform_type": {"enum": ["json_transform"]}}},
            "regex_pattern": {"properties": {"transform_type": {"enum": ["text_clean"]}}},
            "field_operations": {"properties": {"transform_type": {"enum": ["field_ops"]}}},
            "type_conversions": {"properties": {"transform_type": {"enum": ["type_convert"]}}}
        }
    }

    # Transform operation type
    transform_type: Literal["markdown", "extract_citations", "merge", "filter", "json_transform", "text_clean", "field_ops", "type_convert"] = Field(
        ..., description="Type of transformation to perform"
    )

    # Configuration parameters
    input_key: Optional[str] = Field(None, description="Key in inputs to transform")
    output_key: str = Field(default="transformed", description="Key for transformed output")

    # Transform-specific parameters
    merge_keys: Optional[List[str]] = Field(None, description="Keys to merge for merge transform")
    filter_condition: Optional[str] = Field(None, description="Filter condition (e.g., 'len > 100')")
    json_path: Optional[str] = Field(None, description="JSON path for extraction (e.g., '$.items[*].name')")
    regex_pattern: Optional[str] = Field(None, description="Regex pattern for text operations")
    replacement: Optional[str] = Field(None, description="Replacement string for regex operations")

    # Markdown-specific parameters
    markdown_format: Optional[Literal["plain", "github", "html"]] = Field(
        "plain", description="Markdown output format"
    )

    # Text cleaning parameters
    clean_operations: List[Literal["lowercase", "uppercase", "trim", "normalize_whitespace", "remove_urls", "remove_emails"]] = Field(
        default_factory=list, description="Text cleaning operations to apply"
    )

    # Field operation parameters
    field_operations: List[Dict[str, Any]] = Field(
        default_factory=list, description="Field operations to perform"
    )

    # Type conversion parameters
    type_conversions: List[Dict[str, Any]] = Field(
        default_factory=list, description="Type conversion operations"
    )

    async def execute(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Execute data transformation"""
        try:
            # Get input data
            input_data = self._get_input_data()
            if not input_data:
                raise ValueError("No input data available for transformation")

            # Perform transformation
            result = {}

            if self.transform_type == "markdown":
                result[self.output_key] = await self._transform_markdown(input_data)

            elif self.transform_type == "extract_citations":
                result[self.output_key] = self._extract_citations(input_data)

            elif self.transform_type == "merge":
                result[self.output_key] = self._merge_data(input_data)

            elif self.transform_type == "filter":
                result[self.output_key] = self._filter_data(input_data)

            elif self.transform_type == "json_transform":
                result[self.output_key] = self._transform_json(input_data)

            elif self.transform_type == "text_clean":
                result[self.output_key] = self._clean_text(input_data)

            elif self.transform_type == "field_ops":
                result[self.output_key] = self._apply_field_operations(input_data)

            elif self.transform_type == "type_convert":
                result[self.output_key] = self._apply_type_conversions(input_data)

            else:
                raise ValueError(f"Unsupported transform type: {self.transform_type}")

            self.mark_completed(result)
            return result

        except Exception as e:
            error_message = f"Transform failed: {str(e)}"
            self.mark_failed(error_message)
            raise

    def _get_input_data(self) -> Any:
        """Get input data for transformation"""
        if self.input_key and self.input_key in self.inputs:
            return self.inputs[self.input_key]

        # If no specific input key, try to find suitable data
        for key, value in self.inputs.items():
            if isinstance(value, (str, list, dict)):
                return value

        return self.inputs.get("data") or list(self.inputs.values())[0] if self.inputs else None

    async def _transform_markdown(self, data: Any) -> str:
        """Transform data to markdown format"""
        if isinstance(data, str):
            # Simple text to markdown
            return f"# Generated Content\n\n{data}"

        elif isinstance(data, list):
            # List to markdown
            if self.markdown_format == "html":
                items = [f"<li>{item}</li>" for item in data]
                return f"<ul>{''.join(items)}</ul>"
            else:
                items = [f"- {item}" for item in data]
                return f"# List\n\n{chr(10).join(items)}"

        elif isinstance(data, dict):
            # Dict to markdown
            if self.markdown_format == "html":
                items = [f"<li><strong>{k}:</strong> {v}</li>" for k, v in data.items()]
                return f"<ul>{''.join(items)}</ul>"
            else:
                items = [f"- **{k}:** {v}" for k, v in data.items()]
                return f"# Data\n\n{chr(10).join(items)}"

        else:
            return str(data)

    def _extract_citations(self, data: Any) -> List[Dict[str, Any]]:
        """Extract citations from text data"""
        if not isinstance(data, str):
            return []

        citations = []

        # Pattern for various citation formats
        patterns = [
            r'\[([^\]]+)\]\s*\(([^)]+)\)',  # [text](url) - markdown links
            r'([A-Za-z\s]+(?:et al\.)?)\s*\(\d{4}\)',  # Author (Year)
            r'([A-Za-z\s]+(?:et al\.)?)\s*,?\s*(\d{4})',  # Author, Year
            r'https?://[^\s<>"{}|\\^`[\]]+',  # URLs
        ]

        for i, pattern in enumerate(patterns):
            matches = re.finditer(pattern, data)
            for match in matches:
                if i == 0:  # [text](url) - markdown links
                    citations.append({
                        "type": "citation",
                        "text": match.group(1),
                        "url": match.group(2)
                    })
                elif i == 1:  # Author (Year)
                    citations.append({
                        "type": "citation",
                        "text": match.group(1).strip(),
                        "year": match.group(2)
                    })
                elif i == 2:  # Author, Year
                    citations.append({
                        "type": "citation",
                        "text": match.group(1).strip(),
                        "year": match.group(2)
                    })
                elif i == 3:  # URLs
                    citations.append({
                        "type": "url",
                        "url": match.group(0)
                    })

        return citations

    def _merge_data(self, data: Any) -> Any:
        """Merge multiple data sources"""
        if not self.merge_keys:
            raise ValueError("merge_keys required for merge transform")

        if isinstance(data, dict) and "sources" in data:
            # Merge multiple sources
            merged = {}
            for key in self.merge_keys:
                if key in data.get("sources", {}):
                    merged.update(data["sources"][key])
            return merged

        elif isinstance(data, list):
            # Merge list of dicts
            merged = {}
            for item in data:
                if isinstance(item, dict):
                    merged.update(item)
            return merged

        else:
            raise ValueError("Unsupported data format for merge operation")

    def _filter_data(self, data: Any) -> Any:
        """Filter data based on condition"""
        if not self.filter_condition:
            raise ValueError("filter_condition required for filter transform")

        if isinstance(data, list):
            # Filter list items
            filtered = []
            for item in data:
                try:
                    # Simple evaluation of filter condition
                    if eval(self.filter_condition, {"item": item, "len": len}):
                        filtered.append(item)
                except:
                    # If evaluation fails, include item
                    filtered.append(item)
            return filtered

        elif isinstance(data, dict):
            # Filter dict keys/values
            filtered = {}
            for key, value in data.items():
                try:
                    if eval(self.filter_condition, {"key": key, "value": value, "len": len}):
                        filtered[key] = value
                except:
                    filtered[key] = value
            return filtered

        else:
            return data

    def _transform_json(self, data: Any) -> Any:
        """Transform JSON data"""
        if not isinstance(data, (dict, list)):
            try:
                data = json.loads(str(data))
            except:
                raise ValueError("Cannot parse data as JSON")

        if self.json_path:
            # Extract data using JSON path
            try:
                import jsonpath_ng.ext as jsonpath
                jsonpath_expr = jsonpath.parse(self.json_path)
                matches = jsonpath_expr.find(data)
                return [match.value for match in matches]
            except Exception as e:
                raise ValueError(f"JSON path extraction failed: {str(e)}")

        return data

    def _clean_text(self, data: Any) -> str:
        """Clean text data"""
        if not isinstance(data, str):
            data = str(data)

        cleaned = data

        for operation in self.clean_operations:
            if operation == "lowercase":
                cleaned = cleaned.lower()
            elif operation == "uppercase":
                cleaned = cleaned.upper()
            elif operation == "trim":
                cleaned = cleaned.strip()
            elif operation == "normalize_whitespace":
                cleaned = re.sub(r'\s+', ' ', cleaned)
            elif operation == "remove_urls":
                cleaned = re.sub(r'https?://[^\s<>"{}|\\^`[\]]+', '', cleaned)
            elif operation == "remove_emails":
                cleaned = re.sub(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', '', cleaned)

        return cleaned

    def _apply_field_operations(self, data: Any) -> Any:
        """Apply field operations (add, remove, rename)"""
        if not self.field_operations:
            return data

        if isinstance(data, list):
            return [self._apply_field_ops_to_item(item) for item in data]
        elif isinstance(data, dict):
            return self._apply_field_ops_to_item(data)
        else:
            return data

    def _apply_field_ops_to_item(self, item: Dict[str, Any]) -> Dict[str, Any]:
        """Apply field operations to a single item"""
        if not isinstance(item, dict):
            return item

        result = item.copy()

        for operation in self.field_operations:
            op_type = operation.get("operation")
            field = operation.get("field")

            if op_type == "add":
                value = operation.get("value")
                result[field] = value
            elif op_type == "remove":
                result.pop(field, None)
            elif op_type == "rename":
                new_name = operation.get("new_name")
                if field in result and new_name:
                    result[new_name] = result.pop(field)

        return result

    def _apply_type_conversions(self, data: Any) -> Any:
        """Apply type conversions"""
        if not self.type_conversions:
            return data

        if isinstance(data, list):
            return [self._apply_type_conversions_to_item(item) for item in data]
        elif isinstance(data, dict):
            return self._apply_type_conversions_to_item(data)
        else:
            return data

    def _apply_type_conversions_to_item(self, item: Dict[str, Any]) -> Dict[str, Any]:
        """Apply type conversions to a single item"""
        if not isinstance(item, dict):
            return item

        result = item.copy()

        for conversion in self.type_conversions:
            field = conversion.get("field")
            target_type = conversion.get("target_type")

            if field in result:
                value = result[field]
                try:
                    if target_type == "string":
                        result[field] = str(value)
                    elif target_type == "number":
                        result[field] = float(value) if '.' in str(value) else int(value)
                    elif target_type == "integer":
                        result[field] = int(value)
                    elif target_type == "float":
                        result[field] = float(value)
                    elif target_type == "boolean":
                        if isinstance(value, str):
                            result[field] = value.lower() in ('true', '1', 'yes', 'on')
                        else:
                            result[field] = bool(value)
                except (ValueError, TypeError):
                    # Keep original value if conversion fails
                    pass

        return result