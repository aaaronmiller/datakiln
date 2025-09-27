"""
Dynamic Node Factory for Custom Node Creation

This module provides a factory pattern for dynamically creating and registering
custom node types at runtime. It supports loading nodes from configuration files,
API endpoints, and programmatic registration.
"""

import importlib
import inspect
import json
import os
from abc import ABC, abstractmethod
from typing import Dict, Any, Type, Optional, List, Callable
from pathlib import Path
import asyncio
from dataclasses import dataclass

from .base_node import BaseNode
from .node_validator import node_validator
from .exceptions import NodeFactoryError, NodeValidationError, NodeRegistrationError
from .definitions import CustomNodeDefinition






class BaseNodeFactory(ABC):
    """Abstract base class for node factories"""

    @abstractmethod
    async def create_node(self, node_type: str, **kwargs) -> BaseNode:
        """Create a node instance"""
        pass

    @abstractmethod
    def get_node_definition(self, node_type: str) -> Optional[CustomNodeDefinition]:
        """Get node definition by type"""
        pass

    @abstractmethod
    def list_node_types(self) -> List[str]:
        """List all registered node types"""
        pass


class DynamicNodeFactory(BaseNodeFactory):
    """Dynamic factory for creating custom nodes"""

    def __init__(self):
        self._node_definitions: Dict[str, CustomNodeDefinition] = {}
        self._node_classes: Dict[str, Type[BaseNode]] = {}
        self._custom_implementations: Dict[str, Callable] = {}

    async def create_node(self, node_type: str, **kwargs) -> BaseNode:
        """Create a node instance dynamically"""
        if node_type in self._node_classes:
            # Use registered class
            node_class = self._node_classes[node_type]
            return node_class(**kwargs)

        elif node_type in self._custom_implementations:
            # Use custom implementation function
            impl_func = self._custom_implementations[node_type]
            return await self._create_from_function(impl_func, **kwargs)

        elif node_type in self._node_definitions:
            # Create from definition
            definition = self._node_definitions[node_type]
            return await self._create_from_definition(definition, **kwargs)

        else:
            raise NodeFactoryError(f"Unknown node type: {node_type}")

    async def _create_from_function(self, impl_func: Callable, **kwargs) -> BaseNode:
        """Create node from implementation function"""
        try:
            # Call the implementation function to get the node instance
            if inspect.iscoroutinefunction(impl_func):
                node = await impl_func(**kwargs)
            else:
                node = impl_func(**kwargs)

            if not isinstance(node, BaseNode):
                raise NodeValidationError(f"Implementation function must return BaseNode instance")

            return node

        except Exception as e:
            raise NodeFactoryError(f"Failed to create node from function: {str(e)}")

    async def _create_from_definition(self, definition: CustomNodeDefinition, **kwargs) -> BaseNode:
        """Create node from definition"""
        try:
            if definition.implementation:
                # Load from Python code
                node_class = self._load_node_class_from_code(definition.implementation)
                return node_class(**kwargs)
            else:
                # Create generic custom node
                return CustomNode(definition=definition, **kwargs)

        except Exception as e:
            raise NodeFactoryError(f"Failed to create node from definition: {str(e)}")

    def _load_node_class_from_code(self, code: str) -> Type[BaseNode]:
        """Load node class from Python code string"""
        try:
            # Create a temporary module
            import types
            module = types.ModuleType("custom_node_module")

            # Execute the code in the module
            exec(code, module.__dict__)

            # Find the node class (should inherit from BaseNode)
            for name, obj in module.__dict__.items():
                if (inspect.isclass(obj) and
                    issubclass(obj, BaseNode) and
                    obj != BaseNode):
                    return obj

            raise NodeValidationError("No BaseNode subclass found in implementation code")

        except Exception as e:
            raise NodeValidationError(f"Invalid node implementation code: {str(e)}")

    def register_node_class(self, node_type: str, node_class: Type[BaseNode],
                          definition: Optional[CustomNodeDefinition] = None):
        """Register a node class"""
        if not issubclass(node_class, BaseNode):
            raise NodeRegistrationError(f"Node class must inherit from BaseNode")

        self._node_classes[node_type] = node_class

        if definition:
            self._node_definitions[node_type] = definition

    def register_node_definition(self, definition: CustomNodeDefinition):
        """Register a node definition"""
        self.validate_definition(definition)
        self._node_definitions[definition.type] = definition

    def register_custom_implementation(self, node_type: str, implementation: Callable,
                                     definition: Optional[CustomNodeDefinition] = None):
        """Register a custom implementation function"""
        if not callable(implementation):
            raise NodeRegistrationError("Implementation must be callable")

        self._custom_implementations[node_type] = implementation

        if definition:
            self._node_definitions[node_type] = definition

    def unregister_node(self, node_type: str):
        """Unregister a node type"""
        self._node_definitions.pop(node_type, None)
        self._node_classes.pop(node_type, None)
        self._custom_implementations.pop(node_type, None)

    def get_node_definition(self, node_type: str) -> Optional[CustomNodeDefinition]:
        """Get node definition by type"""
        return self._node_definitions.get(node_type)

    def list_node_types(self) -> List[str]:
        """List all registered node types"""
        all_types = set()
        all_types.update(self._node_definitions.keys())
        all_types.update(self._node_classes.keys())
        all_types.update(self._custom_implementations.keys())
        return sorted(list(all_types))

    def validate_definition(self, definition: CustomNodeDefinition):
        """Validate a node definition using the schema validator"""
        return node_validator.validate_definition(definition)

    async def load_from_config_file(self, config_path: str):
        """Load node definitions from a JSON configuration file"""
        try:
            with open(config_path, 'r', encoding='utf-8') as f:
                config = json.load(f)

            if "nodes" not in config:
                raise NodeValidationError("Config file must contain 'nodes' array")

            for node_config in config["nodes"]:
                definition = CustomNodeDefinition(**node_config)
                self.register_node_definition(definition)

        except FileNotFoundError:
            raise NodeFactoryError(f"Config file not found: {config_path}")
        except json.JSONDecodeError as e:
            raise NodeValidationError(f"Invalid JSON in config file: {str(e)}")

    async def load_from_directory(self, directory_path: str):
        """Load node definitions from a directory of config files"""
        directory = Path(directory_path)

        if not directory.exists():
            raise NodeFactoryError(f"Directory not found: {directory_path}")

        for config_file in directory.glob("*.json"):
            await self.load_from_config_file(str(config_file))

    def to_dict(self) -> Dict[str, Any]:
        """Export factory state to dictionary"""
        return {
            "node_definitions": {
                node_type: {
                    "type": defn.type,
                    "name": defn.name,
                    "description": defn.description,
                    "version": defn.version,
                    "inputs": defn.inputs,
                    "outputs": defn.outputs,
                    "params_schema": defn.params_schema,
                    "config": defn.config,
                    "metadata": defn.metadata
                }
                for node_type, defn in self._node_definitions.items()
            },
            "registered_classes": list(self._node_classes.keys()),
            "custom_implementations": list(self._custom_implementations.keys())
        }


class CustomNode(BaseNode):
    """Generic custom node implementation"""

    def __init__(self, definition: CustomNodeDefinition, **kwargs):
        super().__init__(
            name=definition.name,
            type=definition.type,
            description=definition.description,
            **kwargs
        )
        self.definition = definition
        self.custom_config = definition.config or {}

    async def execute(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Execute custom node logic"""
        # Default implementation - can be overridden by custom implementations
        # This is a placeholder that should be replaced with actual custom logic

        # Get input data
        input_data = {}
        for input_name in self.definition.inputs:
            if input_name in self.inputs:
                input_data[input_name] = self.inputs[input_name]

        # Process based on node type or custom config
        result = await self._execute_custom_logic(input_data, context)

        # Set outputs
        self.outputs = result
        return result

    async def _execute_custom_logic(self, input_data: Dict[str, Any],
                                   context: Dict[str, Any]) -> Dict[str, Any]:
        """Execute custom logic - override in subclasses or custom implementations"""
        # Default behavior: pass through inputs to outputs
        result = {}
        for output_name in self.definition.outputs:
            if output_name in input_data:
                result[output_name] = input_data[output_name]
            else:
                result[output_name] = None

        return result


# Global factory instance
node_factory = DynamicNodeFactory()

# Convenience functions
async def create_node(node_type: str, **kwargs) -> BaseNode:
    """Create a node using the global factory"""
    return await node_factory.create_node(node_type, **kwargs)

def register_node_class(node_type: str, node_class: Type[BaseNode],
                       definition: Optional[CustomNodeDefinition] = None):
    """Register a node class with the global factory"""
    node_factory.register_node_class(node_type, node_class, definition)

def register_node_definition(definition: CustomNodeDefinition):
    """Register a node definition with the global factory"""
    node_factory.register_node_definition(definition)

def get_node_definition(node_type: str) -> Optional[CustomNodeDefinition]:
    """Get node definition from global factory"""
    return node_factory.get_node_definition(node_type)

def list_custom_node_types() -> List[str]:
    """List all custom node types"""
    return node_factory.list_node_types()