"""
Custom Node API Models

Pydantic models for custom node API endpoints.
"""

from typing import Dict, Any, List, Optional
from datetime import datetime
from pydantic import BaseModel, Field


class CustomNodeDefinition(BaseModel):
    """Custom node definition model"""
    type: str = Field(..., description="Node type identifier")
    name: str = Field(..., description="Human-readable node name")
    description: str = Field(..., description="Node description")
    version: str = Field(..., description="Node version")
    inputs: List[str] = Field(default_factory=list, description="Input parameter names")
    outputs: List[str] = Field(default_factory=list, description="Output parameter names")
    params_schema: Dict[str, Any] = Field(..., description="JSON schema for parameters")
    implementation: Optional[str] = Field(None, description="Python implementation code")
    config: Optional[Dict[str, Any]] = Field(None, description="Custom configuration")
    metadata: Optional[Dict[str, Any]] = Field(None, description="Additional metadata")


class CustomNodeValidationResult(BaseModel):
    """Result of node validation"""
    valid: bool = Field(..., description="Whether validation passed")
    errors: List[str] = Field(default_factory=list, description="Validation error messages")


class CustomNodeRegistration(BaseModel):
    """Result of node registration"""
    id: str = Field(..., description="Registration ID")
    node_type: str = Field(..., description="Registered node type")
    user_id: Optional[str] = Field(None, description="User who registered the node")
    created_at: datetime = Field(..., description="Registration timestamp")
    status: str = Field(..., description="Registration status")
    validation_result: CustomNodeValidationResult = Field(..., description="Validation results")


class CustomNodeMetadata(BaseModel):
    """Node metadata"""
    registration_id: str = Field(..., description="Registration ID")
    created_at: str = Field(..., description="Creation timestamp")
    updated_at: str = Field(..., description="Last update timestamp")
    user_id: Optional[str] = Field(None, description="Owner user ID")
    version: str = Field(..., description="Node version")
    status: str = Field(..., description="Node status")
    usage_count: int = Field(default=0, description="Number of times used")


class CustomNodeInfo(BaseModel):
    """Complete node information"""
    definition: CustomNodeDefinition = Field(..., description="Node definition")
    metadata: Optional[CustomNodeMetadata] = Field(None, description="Node metadata")


class CustomNodeListItem(BaseModel):
    """Node list item"""
    type: str = Field(..., description="Node type")
    name: str = Field(..., description="Node name")
    description: str = Field(..., description="Node description")
    version: str = Field(..., description="Node version")
    metadata: Optional[CustomNodeMetadata] = Field(None, description="Node metadata")


class CustomNodeDeployment(BaseModel):
    """Node deployment information"""
    deployment_id: str = Field(..., description="Deployment ID")
    node_type: str = Field(..., description="Deployed node type")
    status: str = Field(..., description="Deployment status")
    message: str = Field(..., description="Deployment message")
    config: Optional[Dict[str, Any]] = Field(None, description="Deployment configuration")


class CustomNodeLoadRequest(BaseModel):
    """Request to load nodes from external source"""
    source_type: str = Field(..., description="Source type (file, directory, url, etc.)")
    source_path: Optional[str] = Field(None, description="File or directory path")
    source_url: Optional[str] = Field(None, description="URL to load from")
    config: Optional[Dict[str, Any]] = Field(None, description="Additional configuration")


class CustomNodeLoadResult(BaseModel):
    """Result of loading nodes"""
    loaded_types: List[str] = Field(default_factory=list, description="Successfully loaded node types")
    failed_types: List[str] = Field(default_factory=list, description="Failed node types")
    errors: List[str] = Field(default_factory=list, description="Error messages")


class CustomNodeExportRequest(BaseModel):
    """Request to export nodes"""
    node_types: Optional[List[str]] = Field(None, description="Specific node types to export")
    include_metadata: bool = Field(default=True, description="Include metadata in export")


class CustomNodeImportRequest(BaseModel):
    """Request to import nodes"""
    data: Dict[str, Any] = Field(..., description="Import data")
    overwrite: bool = Field(default=False, description="Overwrite existing nodes")


class RegistryStats(BaseModel):
    """Registry statistics"""
    total_nodes: int = Field(..., description="Total number of nodes")
    active_nodes: int = Field(..., description="Number of active nodes")
    inactive_nodes: int = Field(..., description="Number of inactive nodes")
    user_counts: Dict[str, int] = Field(default_factory=dict, description="Nodes per user")