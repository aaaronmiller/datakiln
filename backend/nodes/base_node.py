from abc import ABC, abstractmethod
from typing import Dict, List, Optional, Any, Union
from datetime import datetime
import uuid
from pydantic import BaseModel, Field


class BaseNode(BaseModel):
    """Base class for all workflow nodes"""

    # Core properties
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str = Field(..., description="Human-readable node name")
    type: str = Field(..., description="Node type identifier")
    description: Optional[str] = Field(None, description="Node description")

    # Execution properties
    inputs: Dict[str, Any] = Field(default_factory=dict, description="Input data mapping")
    outputs: Dict[str, Any] = Field(default_factory=dict, description="Output data mapping")
    next: Optional[Union[str, List[str]]] = Field(None, description="Next node(s) to execute")

    # Error handling
    retries: int = Field(default=3, description="Number of retry attempts on failure")
    timeout: int = Field(default=300, description="Timeout in seconds")
    retry_delay: int = Field(default=1, description="Delay between retries in seconds")

    # Metadata
    tags: List[str] = Field(default_factory=list, description="Node tags for categorization")
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)

    # Status tracking
    status: str = Field(default="pending", description="Current node status")
    execution_time: Optional[float] = Field(None, description="Time taken to execute")
    error_message: Optional[str] = Field(None, description="Last error message")

    @abstractmethod
    async def execute(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Execute the node's specific logic"""
        pass

    def update_status(self, status: str, error_message: Optional[str] = None):
        """Update node execution status"""
        self.status = status
        self.updated_at = datetime.now()
        if error_message:
            self.error_message = error_message

    def mark_completed(self, outputs: Optional[Dict[str, Any]] = None):
        """Mark node as completed"""
        self.update_status("completed")
        if outputs:
            self.outputs.update(outputs)

    def mark_failed(self, error_message: str):
        """Mark node as failed"""
        self.update_status("failed", error_message)

    def to_dict(self) -> Dict[str, Any]:
        """Convert node to dictionary representation"""
        return {
            "id": self.id,
            "name": self.name,
            "type": self.type,
            "description": self.description,
            "inputs": self.inputs,
            "outputs": self.outputs,
            "next": self.next,
            "retries": self.retries,
            "timeout": self.timeout,
            "retry_delay": self.retry_delay,
            "tags": self.tags,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
            "status": self.status,
            "execution_time": self.execution_time,
            "error_message": self.error_message
        }