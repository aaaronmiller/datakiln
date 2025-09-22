"""
Node Schema Validation System

This module provides comprehensive validation for custom node definitions
using JSON Schema and custom validation rules.
"""

import jsonschema
from typing import Dict, Any, List, Optional, Set
import re
from pathlib import Path

from .node_factory import CustomNodeDefinition, NodeValidationError


class NodeSchemaValidator:
    """Validator for custom node definitions"""

    def __init__(self):
        self._base_schema = self._create_base_schema()
        self._reserved_types = self._get_reserved_types()

    def _get_reserved_types(self) -> Set[str]:
        """Get reserved node types that cannot be overridden"""
        return {
            "provider", "dom_action", "transform", "filter", "condition",
            "export", "aggregate", "join", "union", "prompt"
        }

    def _create_base_schema(self) -> Dict[str, Any]:
        """Create the base JSON schema for node definitions"""
        return {
            "type": "object",
            "required": ["type", "name", "description", "version", "inputs", "outputs", "params_schema"],
            "properties": {
                "type": {
                    "type": "string",
                    "minLength": 1,
                    "maxLength": 50,
                    "pattern": "^[a-z][a-z0-9_]*$"
                },
                "name": {
                    "type": "string",
                    "minLength": 1,
                    "maxLength": 100
                },
                "description": {
                    "type": "string",
                    "minLength": 1,
                    "maxLength": 500
                },
                "version": {
                    "type": "string",
                    "pattern": "^\\d+\\.\\d+\\.\\d+$"
                },
                "inputs": {
                    "type": "array",
                    "items": {
                        "type": "string",
                        "minLength": 1,
                        "maxLength": 50
                    },
                    "maxItems": 20
                },
                "outputs": {
                    "type": "array",
                    "items": {
                        "type": "string",
                        "minLength": 1,
                        "maxLength": 50
                    },
                    "maxItems": 20
                },
                "params_schema": {
                    "type": "object",
                    "required": ["type"],
                    "properties": {
                        "type": {"const": "object"},
                        "required": {
                            "type": "array",
                            "items": {"type": "string"}
                        },
                        "properties": {
                            "type": "object",
                            "additionalProperties": {"$ref": "#/$defs/param_schema"}
                        }
                    },
                    "additionalProperties": True
                },
                "implementation": {
                    "type": "string",
                    "minLength": 10
                },
                "config": {
                    "type": "object"
                },
                "metadata": {
                    "type": "object",
                    "properties": {
                        "author": {"type": "string"},
                        "tags": {
                            "type": "array",
                            "items": {"type": "string"}
                        },
                        "category": {"type": "string"},
                        "icon": {"type": "string"},
                        "color": {"type": "string"}
                    }
                }
            },
            "$defs": {
                "param_schema": {
                    "oneOf": [
                        {"$ref": "#/$defs/simple_param"},
                        {"$ref": "#/$defs/object_param"},
                        {"$ref": "#/$defs/array_param"}
                    ]
                },
                "simple_param": {
                    "type": "object",
                    "required": ["type"],
                    "properties": {
                        "type": {
                            "enum": ["string", "number", "integer", "boolean"]
                        },
                        "default": True,
                        "description": {"type": "string"},
                        "minLength": {"type": "integer", "minimum": 0},
                        "maxLength": {"type": "integer", "minimum": 1},
                        "minimum": {"type": "number"},
                        "maximum": {"type": "number"},
                        "enum": {
                            "type": "array",
                            "minItems": 1
                        },
                        "pattern": {"type": "string"}
                    },
                    "additionalProperties": False
                },
                "object_param": {
                    "type": "object",
                    "required": ["type"],
                    "properties": {
                        "type": {"const": "object"},
                        "properties": {
                            "type": "object",
                            "additionalProperties": {"$ref": "#/$defs/param_schema"}
                        },
                        "required": {
                            "type": "array",
                            "items": {"type": "string"}
                        },
                        "default": {"type": "object"}
                    },
                    "additionalProperties": False
                },
                "array_param": {
                    "type": "object",
                    "required": ["type"],
                    "properties": {
                        "type": {"const": "array"},
                        "items": {"$ref": "#/$defs/param_schema"},
                        "minItems": {"type": "integer", "minimum": 0},
                        "maxItems": {"type": "integer", "minimum": 1},
                        "default": {"type": "array"}
                    },
                    "additionalProperties": False
                }
            }
        }

    def validate_definition(self, definition: CustomNodeDefinition) -> Dict[str, Any]:
        """Validate a complete node definition"""
        errors = []

        # Convert to dict for validation
        def_dict = {
            "type": definition.type,
            "name": definition.name,
            "description": definition.description,
            "version": definition.version,
            "inputs": definition.inputs,
            "outputs": definition.outputs,
            "params_schema": definition.params_schema,
            "implementation": definition.implementation,
            "config": definition.config,
            "metadata": definition.metadata
        }

        # Validate against base schema
        try:
            jsonschema.validate(def_dict, self._base_schema)
        except jsonschema.ValidationError as e:
            errors.append(f"Schema validation error: {e.message}")
        except jsonschema.SchemaError as e:
            errors.append(f"Schema error: {e.message}")

        # Custom validation rules
        custom_errors = self._validate_custom_rules(definition)
        errors.extend(custom_errors)

        if errors:
            raise NodeValidationError("; ".join(errors))

        return {"valid": True, "errors": []}

    def _validate_custom_rules(self, definition: CustomNodeDefinition) -> List[str]:
        """Apply custom validation rules"""
        errors = []

        # Check reserved types
        if definition.type in self._reserved_types:
            errors.append(f"Node type '{definition.type}' is reserved and cannot be used")

        # Validate type naming
        if not re.match(r'^[a-z][a-z0-9_]*$', definition.type):
            errors.append("Node type must start with lowercase letter and contain only lowercase letters, numbers, and underscores")

        # Validate input/output names
        for input_name in definition.inputs:
            if not re.match(r'^[a-z][a-z0-9_]*$', input_name):
                errors.append(f"Input name '{input_name}' must start with lowercase letter and contain only lowercase letters, numbers, and underscores")

        for output_name in definition.outputs:
            if not re.match(r'^[a-z][a-z0-9_]*$', output_name):
                errors.append(f"Output name '{output_name}' must start with lowercase letter and contain only lowercase letters, numbers, and underscores")

        # Validate implementation if provided
        if definition.implementation:
            impl_errors = self._validate_implementation(definition.implementation)
            errors.extend(impl_errors)

        # Validate params schema consistency
        schema_errors = self._validate_params_schema(definition.params_schema, definition.inputs, definition.outputs)
        errors.extend(schema_errors)

        return errors

    def _validate_implementation(self, implementation: str) -> List[str]:
        """Validate node implementation code"""
        errors = []

        # Check for required BaseNode import
        if "BaseNode" not in implementation:
            errors.append("Implementation must import or reference BaseNode")

        # Check for class definition
        if "class " not in implementation:
            errors.append("Implementation must define a class")

        # Check for execute method
        if "async def execute" not in implementation and "def execute" not in implementation:
            errors.append("Implementation must define an execute method")

        # Basic security checks
        dangerous_patterns = [
            "import os", "import subprocess", "import sys",
            "eval(", "exec(", "__import__("
        ]

        for pattern in dangerous_patterns:
            if pattern in implementation:
                errors.append(f"Implementation contains potentially dangerous code: {pattern}")

        return errors

    def _validate_params_schema(self, schema: Dict[str, Any],
                               inputs: List[str], outputs: List[str]) -> List[str]:
        """Validate parameter schema consistency"""
        errors = []

        if "properties" not in schema:
            return errors

        properties = schema["properties"]

        # Check for input/output parameters
        for input_name in inputs:
            if input_name not in properties:
                errors.append(f"Input '{input_name}' not defined in params schema")

        for output_name in outputs:
            if output_name not in properties:
                errors.append(f"Output '{output_name}' not defined in params schema")

        # Validate enum values are not empty
        for param_name, param_schema in properties.items():
            if isinstance(param_schema, dict) and "enum" in param_schema:
                enum_values = param_schema["enum"]
                if not enum_values:
                    errors.append(f"Parameter '{param_name}' has empty enum")

        return errors

    def validate_node_config(self, definition: CustomNodeDefinition,
                           config: Dict[str, Any]) -> Dict[str, Any]:
        """Validate a node configuration against its schema"""
        try:
            jsonschema.validate(config, definition.params_schema)
            return {"valid": True, "errors": []}
        except jsonschema.ValidationError as e:
            return {"valid": False, "errors": [e.message]}

    def get_schema_summary(self, definition: CustomNodeDefinition) -> Dict[str, Any]:
        """Get a summary of the node schema"""
        return {
            "type": definition.type,
            "name": definition.name,
            "inputs": definition.inputs,
            "outputs": definition.outputs,
            "required_params": definition.params_schema.get("required", []),
            "optional_params": [
                param for param in definition.params_schema.get("properties", {}).keys()
                if param not in definition.params_schema.get("required", [])
            ]
        }


# Global validator instance
node_validator = NodeSchemaValidator()

# Convenience functions
def validate_custom_node_definition(definition: CustomNodeDefinition) -> Dict[str, Any]:
    """Validate a custom node definition"""
    return node_validator.validate_definition(definition)

def validate_node_configuration(definition: CustomNodeDefinition,
                               config: Dict[str, Any]) -> Dict[str, Any]:
    """Validate a node configuration"""
    return node_validator.validate_node_config(definition, config)