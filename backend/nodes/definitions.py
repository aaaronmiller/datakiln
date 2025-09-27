"""
Node definitions and data structures

This module contains shared data structures and definitions used by the node system
to avoid circular import issues.
"""

from typing import Dict, Any, List, Optional
from dataclasses import dataclass


@dataclass
class CustomNodeDefinition:
    """Definition for a custom node type"""
    type: str
    name: str
    description: str
    version: str
    inputs: List[str]
    outputs: List[str]
    params_schema: Dict[str, Any]
    implementation: Optional[str] = None  # Python code or module path
    config: Optional[Dict[str, Any]] = None
    metadata: Optional[Dict[str, Any]] = None