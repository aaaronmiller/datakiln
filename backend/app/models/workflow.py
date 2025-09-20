from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class Task(BaseModel):
    id: str
    name: str
    type: str  # e.g., "deep_research", "youtube_transcript"
    parameters: dict

class Workflow(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    tasks: List[Task]
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

class WorkflowExecution(BaseModel):
    id: str
    workflow_id: str
    status: str  # "pending", "running", "completed", "failed"
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    results: Optional[dict] = None