from pydantic import BaseModel, Field, ConfigDict
from typing import Dict, Any, Optional, List
from datetime import datetime

class WorkflowExecutionRequest(BaseModel):
    """Request model for workflow execution"""
    workflow: Dict[str, Any] = Field(..., description="Workflow configuration with nodes and edges")
    execution_options: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Optional execution parameters")
    validate_workflow: bool = Field(default=True, description="Whether to validate workflow before execution")
    enable_optimization: bool = Field(default=True, description="Whether to apply query optimization")
    optimization_level: str = Field(default="standard", description="Optimization level: 'standard', 'aggressive', 'conservative'")

class WorkflowExecutionResponse(BaseModel):
    """Response model for workflow execution"""
    run_id: str = Field(..., description="Unique execution run identifier")
    workflow_id: Optional[str] = Field(None, description="Workflow identifier")
    status: str = Field(..., description="Execution status: 'running', 'completed', 'failed'")
    started_at: str = Field(..., description="Execution start timestamp")
    execution_summary: Dict[str, Any] = Field(default_factory=dict, description="Execution summary with metrics")

class WorkflowStatusResponse(BaseModel):
    """Response model for workflow execution status"""
    run_id: str
    workflow_id: Optional[str]
    status: str
    started_at: Optional[str]
    completed_at: Optional[str]
    execution_time: Optional[float]
    execution_order: List[str]
    node_results: Dict[str, Any]
    error: Optional[str]
    execution_options: Dict[str, Any]
    result_count: int
    results: List[Dict[str, Any]]

class WorkflowResultResponse(BaseModel):
    """Response model for workflow execution results"""
    id: str
    run_id: str
    workflow_id: str
    data: Dict[str, Any]
    created_at: str

class WorkflowValidationRequest(BaseModel):
    """Request model for workflow validation"""
    workflow: Dict[str, Any] = Field(..., description="Workflow to validate")

class WorkflowValidationResponse(BaseModel):
    """Response model for workflow validation"""
    valid: bool
    errors: List[str]
    warnings: List[str]
    timestamp: str

class WorkflowOptimizationRequest(BaseModel):
    """Request model for workflow optimization"""
    workflow: Dict[str, Any] = Field(..., description="Workflow to optimize")
    optimization_level: str = Field(default="standard", description="Optimization level")
    schema: Optional[Dict[str, Any]] = Field(None, description="Optional schema for validation")
    business_rules: Optional[List[Dict[str, Any]]] = Field(None, description="Optional business rules")

class WorkflowOptimizationResponse(BaseModel):
    """Response model for workflow optimization"""
    success: bool
    optimized_workflow: Optional[Dict[str, Any]]
    optimization_applied: List[str]
    validation_results: Dict[str, Any]
    performance_improvements: List[Dict[str, Any]]
    error: Optional[str]

class WorkflowStatsResponse(BaseModel):
    """Response model for workflow statistics"""
    total_runs: int
    completed_runs: int
    failed_runs: int
    running_runs: int
    success_rate: float
    average_execution_time: float
    total_results: int

class ExecutionCancelRequest(BaseModel):
    """Request model for canceling execution"""
    run_id: str = Field(..., description="Run ID to cancel")

class ExecutionCancelResponse(BaseModel):
    """Response model for execution cancellation"""
    success: bool
    run_id: str
    message: str