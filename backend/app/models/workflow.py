from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Union, Dict, Any
from datetime import datetime

class WorkflowMetadata(BaseModel):
    createdAt: Optional[str] = Field(None, format="date-time")
    updatedAt: Optional[str] = Field(None, format="date-time")
    tags: List[str] = Field(default_factory=list)
    description: Optional[str] = None
    category: Optional[str] = Field(default="general")
    author: Optional[str] = None
    isPublic: bool = Field(default=False)
    version: int = Field(default=1)
    thumbnail: Optional[str] = None

class Node(BaseModel):
    model_config = ConfigDict(extra='allow')  # Allow extra fields for node-specific configurations

    id: str
    name: str = Field(..., description="Human-readable node name")
    type: str = Field(..., description="Node type identifier")
    description: Optional[str] = None
    inputs: Dict[str, Any] = Field(default_factory=dict, description="Input data mapping")
    outputs: Dict[str, Any] = Field(default_factory=dict, description="Output data mapping")
    next: Optional[Union[str, List[str]]] = Field(None, description="Next node(s) to execute")
    retries: int = Field(default=3, description="Number of retry attempts on failure")
    timeout: int = Field(default=300, description="Timeout in seconds")
    retry_delay: int = Field(default=1, description="Delay between retries in seconds")
    tags: List[str] = Field(default_factory=list, description="Node tags for categorization")
    created_at: Optional[str] = Field(None, format="date-time")
    updated_at: Optional[str] = Field(None, format="date-time")
    status: str = Field(default="pending", description="Current node status")
    execution_time: Optional[float] = Field(None, description="Time taken to execute")
    error_message: Optional[str] = Field(None, description="Last error message")

class Edge(BaseModel):
    id: str
    from_: str = Field(..., alias="from")
    to: str
    meta: Dict[str, Any] = Field(default_factory=dict)

class Workflow(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    metadata: Optional[WorkflowMetadata] = None
    nodes: List[Node] = Field(default_factory=list)
    edges: List[Edge] = Field(default_factory=list)

    @property
    def nodeCount(self) -> int:
        return len(self.nodes)

    @property
    def edgeCount(self) -> int:
        return len(self.edges)

class WorkflowExecution(BaseModel):
    id: str
    workflow_id: str
    status: str  # "pending", "running", "completed", "failed"
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    results: Optional[dict] = None

class Run(BaseModel):
    id: str
    workflow_id: str
    status: str  # "pending", "running", "completed", "failed"
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    execution_order: List[str] = []
    node_results: Dict[str, Any] = {}
    error: Optional[str] = None

class Result(BaseModel):
    id: str
    run_id: str
    workflow_id: str
    data: Dict[str, Any]
    created_at: datetime = datetime.now()