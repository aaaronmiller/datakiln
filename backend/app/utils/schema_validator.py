import json
from typing import Dict, List, Any, Optional
import os

class SchemaValidationError(Exception):
    def __init__(self, message: str, path: str = ""):
        self.message = message
        self.path = path
        super().__init__(f"{path}: {message}")

class WorkflowSchemaValidator:
    def __init__(self):
        # Load the workflow schema
        schema_path = os.path.join(os.path.dirname(__file__), '../../../specs/contracts/WORKFLOW_SCHEMA_V1.json')
        with open(schema_path, 'r') as f:
            self.schema = json.load(f)

    def validate_workflow(self, workflow: Dict[str, Any]) -> Dict[str, Any]:
        """
        Validate a workflow against the schema.

        Args:
            workflow: The workflow dictionary to validate

        Returns:
            Validation result with 'valid', 'errors', and 'warnings'
        """
        errors = []
        warnings = []

        try:
            # Check required top-level properties
            required = self.schema.get('required', [])
            for prop in required:
                if prop not in workflow:
                    errors.append(f"Missing required property: {prop}")

            # Validate id
            if 'id' in workflow:
                if not isinstance(workflow['id'], str):
                    errors.append("id must be a string")

            # Validate name
            if 'name' in workflow:
                if not isinstance(workflow['name'], str):
                    errors.append("name must be a string")

            # Validate description
            if 'description' in workflow:
                if not isinstance(workflow['description'], str):
                    errors.append("description must be a string")

            # Validate metadata
            if 'metadata' in workflow:
                if not isinstance(workflow['metadata'], dict):
                    errors.append("metadata must be an object")
                else:
                    self._validate_metadata(workflow['metadata'], errors, warnings)

            # Validate nodes
            if 'nodes' not in workflow:
                errors.append("nodes is required")
            elif not isinstance(workflow['nodes'], list):
                errors.append("nodes must be an array")
            else:
                node_schema = self.schema['properties']['nodes']['items']
                for i, node in enumerate(workflow['nodes']):
                    self._validate_node(node, node_schema, f"nodes[{i}]", errors, warnings)

            # Validate edges
            if 'edges' not in workflow:
                errors.append("edges is required")
            elif not isinstance(workflow['edges'], list):
                errors.append("edges must be an array")
            else:
                edge_schema = self.schema['properties']['edges']['items']
                for i, edge in enumerate(workflow['edges']):
                    self._validate_edge(edge, edge_schema, f"edges[{i}]", errors, warnings)

            # Check for unexpected properties
            if not self.schema.get('additionalProperties', True):
                allowed_props = set(self.schema['properties'].keys())
                for prop in workflow:
                    if prop not in allowed_props:
                        errors.append(f"Unexpected property: {prop}")

        except Exception as e:
            errors.append(f"Validation error: {str(e)}")

        return {
            'valid': len(errors) == 0,
            'errors': errors,
            'warnings': warnings
        }

    def _validate_metadata(self, metadata: Dict[str, Any], errors: List[str], warnings: List[str]):
        """Validate metadata object"""
        # Basic validation for known metadata fields
        if 'createdAt' in metadata:
            # Should be ISO date string, but we'll be lenient
            pass
        if 'updatedAt' in metadata:
            pass
        if 'tags' in metadata:
            if not isinstance(metadata['tags'], list):
                errors.append("metadata.tags must be an array")
            else:
                for tag in metadata['tags']:
                    if not isinstance(tag, str):
                        errors.append("metadata.tags must contain strings")

    def _validate_node(self, node: Dict[str, Any], schema: Dict[str, Any], path: str, errors: List[str], warnings: List[str]):
        """Validate a single node"""
        # Check required properties
        required = schema.get('required', [])
        for prop in required:
            if prop not in node:
                errors.append(f"{path}: Missing required property: {prop}")

        # Validate id
        if 'id' in node and not isinstance(node['id'], str):
            errors.append(f"{path}.id: must be a string")

        # Validate name
        if 'name' in node and not isinstance(node['name'], str):
            errors.append(f"{path}.name: must be a string")

        # Validate type
        if 'type' in node and not isinstance(node['type'], str):
            errors.append(f"{path}.type: must be a string")

        # Validate description
        if 'description' in node and not isinstance(node['description'], str):
            errors.append(f"{path}.description: must be a string")

        # Validate inputs
        if 'inputs' in node and not isinstance(node['inputs'], dict):
            errors.append(f"{path}.inputs: must be an object")

        # Validate outputs
        if 'outputs' in node and not isinstance(node['outputs'], dict):
            errors.append(f"{path}.outputs: must be an object")

        # Validate next
        if 'next' in node:
            if not isinstance(node['next'], (str, list)):
                errors.append(f"{path}.next: must be a string or array")
            elif isinstance(node['next'], list):
                for item in node['next']:
                    if not isinstance(item, str):
                        errors.append(f"{path}.next: array must contain strings")

        # Validate numeric fields
        numeric_fields = ['retries', 'timeout', 'retry_delay', 'execution_time']
        for field in numeric_fields:
            if field in node:
                if not isinstance(node[field], (int, float)) or node[field] < 0:
                    errors.append(f"{path}.{field}: must be a non-negative number")

        # Validate status
        if 'status' in node:
            valid_statuses = ['pending', 'running', 'completed', 'failed']
            if node['status'] not in valid_statuses:
                errors.append(f"{path}.status: must be one of {valid_statuses}")

        # Validate tags
        if 'tags' in node:
            if not isinstance(node['tags'], list):
                errors.append(f"{path}.tags: must be an array")
            else:
                for tag in node['tags']:
                    if not isinstance(tag, str):
                        errors.append(f"{path}.tags: must contain strings")

        # Check for unexpected properties
        if not schema.get('additionalProperties', True):
            allowed_props = set(schema['properties'].keys())
            for prop in node:
                if prop not in allowed_props:
                    warnings.append(f"{path}: Additional property: {prop}")

    def _validate_edge(self, edge: Dict[str, Any], schema: Dict[str, Any], path: str, errors: List[str], warnings: List[str]):
        """Validate a single edge"""
        # Check required properties
        required = schema.get('required', [])
        for prop in required:
            if prop not in edge:
                errors.append(f"{path}: Missing required property: {prop}")

        # Validate string fields
        string_fields = ['id', 'from', 'to']
        for field in string_fields:
            if field in edge and not isinstance(edge[field], str):
                errors.append(f"{path}.{field}: must be a string")

        # Validate meta
        if 'meta' in edge and not isinstance(edge['meta'], dict):
            errors.append(f"{path}.meta: must be an object")

        # Check for unexpected properties
        if not schema.get('additionalProperties', False):
            allowed_props = set(schema['properties'].keys())
            for prop in edge:
                if prop not in allowed_props:
                    errors.append(f"{path}: Unexpected property: {prop}")

# Global validator instance
workflow_schema_validator = WorkflowSchemaValidator()

def validate_workflow_json(workflow_json: str) -> Dict[str, Any]:
    """
    Validate workflow JSON string against schema.

    Args:
        workflow_json: JSON string of the workflow

    Returns:
        Validation result
    """
    try:
        workflow = json.loads(workflow_json)
        return workflow_schema_validator.validate_workflow(workflow)
    except json.JSONDecodeError as e:
        return {
            'valid': False,
            'errors': [f"Invalid JSON: {str(e)}"],
            'warnings': []
        }
    except Exception as e:
        return {
            'valid': False,
            'errors': [f"Validation error: {str(e)}"],
            'warnings': []
        }