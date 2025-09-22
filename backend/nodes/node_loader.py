"""
Runtime Node Loading System

This module provides mechanisms for loading custom nodes at runtime
from various sources including files, URLs, and programmatic definitions.
"""

import asyncio
import importlib.util
import sys
from typing import Dict, Any, List, Optional, Callable
from pathlib import Path
import json
import tempfile
import urllib.request
import zipfile
import shutil

from .node_factory import (
    CustomNodeDefinition,
    DynamicNodeFactory,
    node_factory,
    NodeValidationError
)
from .node_registry import node_registry


class NodeLoader:
    """Loader for custom nodes from various sources"""

    def __init__(self):
        self._loaded_modules: Dict[str, Any] = {}
        self._temp_dirs: List[str] = []

    async def load_from_file(self, file_path: str, register: bool = True) -> List[str]:
        """Load node definitions from a JSON file"""
        file_path = Path(file_path)

        if not file_path.exists():
            raise FileNotFoundError(f"Node definition file not found: {file_path}")

        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)

            if "nodes" not in data:
                raise ValueError("File must contain a 'nodes' array")

            loaded_types = []

            for node_config in data["nodes"]:
                definition = CustomNodeDefinition(**node_config)

                if register:
                    node_registry.register_node(definition)
                else:
                    node_factory.register_node_definition(definition)

                loaded_types.append(definition.type)

            return loaded_types

        except json.JSONDecodeError as e:
            raise ValueError(f"Invalid JSON in file {file_path}: {e}")

    async def load_from_directory(self, directory_path: str, register: bool = True) -> List[str]:
        """Load all node definitions from a directory"""
        directory = Path(directory_path)

        if not directory.exists():
            raise FileNotFoundError(f"Directory not found: {directory_path}")

        loaded_types = []

        # Load JSON files
        for json_file in directory.glob("*.json"):
            try:
                types = await self.load_from_file(str(json_file), register)
                loaded_types.extend(types)
            except Exception as e:
                print(f"Warning: Failed to load {json_file}: {e}")

        # Load Python modules
        for py_file in directory.glob("*.py"):
            try:
                types = await self.load_from_python_file(str(py_file), register)
                loaded_types.extend(types)
            except Exception as e:
                print(f"Warning: Failed to load {py_file}: {e}")

        return loaded_types

    async def load_from_python_file(self, file_path: str, register: bool = True) -> List[str]:
        """Load node definitions from a Python file"""
        file_path = Path(file_path)

        if not file_path.exists():
            raise FileNotFoundError(f"Python file not found: {file_path}")

        # Load the module
        module_name = f"custom_node_{file_path.stem}_{hash(str(file_path))}"

        try:
            spec = importlib.util.spec_from_file_location(module_name, file_path)
            if spec is None or spec.loader is None:
                raise ImportError(f"Could not load spec for {file_path}")

            module = importlib.util.module_from_spec(spec)
            sys.modules[module_name] = module
            spec.loader.exec_module(module)

            self._loaded_modules[module_name] = module

            # Extract node definitions and classes
            loaded_types = []

            # Look for node definitions
            if hasattr(module, 'NODE_DEFINITIONS'):
                definitions = getattr(module, 'NODE_DEFINITIONS')
                if isinstance(definitions, list):
                    for defn_data in definitions:
                        definition = CustomNodeDefinition(**defn_data)

                        if register:
                            node_registry.register_node(definition)
                        else:
                            node_factory.register_node_definition(definition)

                        loaded_types.append(definition.type)

            # Look for node classes
            for attr_name in dir(module):
                attr = getattr(module, attr_name)
                if (hasattr(attr, '__bases__') and
                    any('BaseNode' in str(base) for base in attr.__bases__)):

                    # Try to get node type from class
                    node_type = getattr(attr, 'NODE_TYPE', attr_name.lower())

                    if register:
                        node_registry.register_node_class(node_type, attr)
                    else:
                        node_factory.register_node_class(node_type, attr)

                    loaded_types.append(node_type)

            return loaded_types

        except Exception as e:
            # Clean up failed module
            sys.modules.pop(module_name, None)
            raise RuntimeError(f"Failed to load Python module {file_path}: {e}")

    async def load_from_url(self, url: str, register: bool = True) -> List[str]:
        """Load node definitions from a URL"""
        try:
            with urllib.request.urlopen(url) as response:
                data = json.loads(response.read().decode('utf-8'))

            if "nodes" not in data:
                raise ValueError("URL response must contain a 'nodes' array")

            loaded_types = []

            for node_config in data["nodes"]:
                definition = CustomNodeDefinition(**node_config)

                if register:
                    node_registry.register_node(definition)
                else:
                    node_factory.register_node_definition(definition)

                loaded_types.append(definition.type)

            return loaded_types

        except Exception as e:
            raise RuntimeError(f"Failed to load from URL {url}: {e}")

    async def load_from_zip_url(self, zip_url: str, register: bool = True) -> List[str]:
        """Load node definitions from a ZIP file URL"""
        # Create temporary directory
        temp_dir = tempfile.mkdtemp()
        self._temp_dirs.append(temp_dir)

        try:
            # Download ZIP file
            zip_path = Path(temp_dir) / "nodes.zip"
            with urllib.request.urlopen(zip_url) as response:
                with open(zip_path, 'wb') as f:
                    f.write(response.read())

            # Extract ZIP
            extract_dir = Path(temp_dir) / "extracted"
            with zipfile.ZipFile(zip_path, 'r') as zip_ref:
                zip_ref.extractall(extract_dir)

            # Load from extracted directory
            loaded_types = await self.load_from_directory(str(extract_dir), register)

            return loaded_types

        except Exception as e:
            raise RuntimeError(f"Failed to load from ZIP URL {zip_url}: {e}")

    async def load_from_package(self, package_name: str, register: bool = True) -> List[str]:
        """Load node definitions from a Python package"""
        try:
            # Import the package
            package = importlib.import_module(package_name)
            self._loaded_modules[package_name] = package

            loaded_types = []

            # Look for node definitions
            if hasattr(package, 'NODE_DEFINITIONS'):
                definitions = getattr(package, 'NODE_DEFINITIONS')
                if isinstance(definitions, list):
                    for defn_data in definitions:
                        definition = CustomNodeDefinition(**defn_data)

                        if register:
                            node_registry.register_node(definition)
                        else:
                            node_factory.register_node_definition(definition)

                        loaded_types.append(defn_data['type'])

            # Look for node classes in the package
            self._load_node_classes_from_package(package, loaded_types, register)

            return loaded_types

        except ImportError as e:
            raise RuntimeError(f"Failed to import package {package_name}: {e}")

    def _load_node_classes_from_package(self, package, loaded_types: List[str], register: bool):
        """Load node classes from a package"""
        for attr_name in dir(package):
            attr = getattr(package, attr_name)
            if hasattr(attr, '__bases__'):
                # Check if it's a BaseNode subclass
                if any('BaseNode' in str(base) for base in attr.__bases__):
                    node_type = getattr(attr, 'NODE_TYPE', attr_name.lower())

                    if register:
                        node_registry.register_node_class(node_type, attr)
                    else:
                        node_factory.register_node_class(node_type, attr)

                    loaded_types.append(node_type)

    async def load_from_config(self, config: Dict[str, Any], register: bool = True) -> List[str]:
        """Load nodes from a configuration dictionary"""
        loaded_types = []

        # Handle different config formats
        if "nodes" in config:
            # List of node definitions
            for node_config in config["nodes"]:
                definition = CustomNodeDefinition(**node_config)

                if register:
                    node_registry.register_node(definition)
                else:
                    node_factory.register_node_definition(definition)

                loaded_types.append(definition.type)

        elif "node" in config:
            # Single node definition
            definition = CustomNodeDefinition(**config["node"])

            if register:
                node_registry.register_node(definition)
            else:
                node_factory.register_node_definition(definition)

            loaded_types.append(definition.type)

        elif "sources" in config:
            # Multiple sources
            for source in config["sources"]:
                source_types = await self._load_from_source_config(source, register)
                loaded_types.extend(source_types)

        return loaded_types

    async def _load_from_source_config(self, source_config: Dict[str, Any], register: bool) -> List[str]:
        """Load from a source configuration"""
        source_type = source_config.get("type")

        if source_type == "file":
            return await self.load_from_file(source_config["path"], register)
        elif source_type == "directory":
            return await self.load_from_directory(source_config["path"], register)
        elif source_type == "url":
            return await self.load_from_url(source_config["url"], register)
        elif source_type == "zip_url":
            return await self.load_from_zip_url(source_config["url"], register)
        elif source_type == "package":
            return await self.load_from_package(source_config["name"], register)
        else:
            raise ValueError(f"Unknown source type: {source_type}")

    def unload_module(self, module_name: str):
        """Unload a loaded module"""
        if module_name in sys.modules:
            del sys.modules[module_name]

        self._loaded_modules.pop(module_name, None)

    def cleanup(self):
        """Clean up temporary directories and loaded modules"""
        # Clean up temp directories
        for temp_dir in self._temp_dirs:
            try:
                shutil.rmtree(temp_dir)
            except Exception:
                pass

        self._temp_dirs.clear()

        # Unload modules
        for module_name in list(self._loaded_modules.keys()):
            self.unload_module(module_name)

    def get_loaded_modules(self) -> List[str]:
        """Get list of loaded module names"""
        return list(self._loaded_modules.keys())


# Global loader instance
node_loader = NodeLoader()

# Convenience functions
async def load_custom_nodes_from_file(file_path: str) -> List[str]:
    """Load custom nodes from a file"""
    return await node_loader.load_from_file(file_path)

async def load_custom_nodes_from_directory(directory_path: str) -> List[str]:
    """Load custom nodes from a directory"""
    return await node_loader.load_from_directory(directory_path)

async def load_custom_nodes_from_config(config: Dict[str, Any]) -> List[str]:
    """Load custom nodes from configuration"""
    return await node_loader.load_from_config(config)