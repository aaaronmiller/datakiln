from abc import ABC, abstractmethod
from typing import Dict, List, Optional, Any, Union
from datetime import datetime
import uuid
from pydantic import BaseModel, Field

from .parameter_validator import parameter_validator, ValidationResult, ValidationLevel
from .error_handler import error_handler, timeout_manager, handle_node_execution_error, execute_node_with_timeout


class BaseNode(BaseModel):
    """Base class for all workflow nodes"""

    # Core properties
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str = Field(..., description="Human-readable node name")
    type: str = Field(..., description="Node type identifier")
    version: str = Field(default="1.0", description="Node type version")
    description: Optional[str] = Field(None, description="Node description")

    # Parameter validation schema
    params_schema: Dict[str, Any] = Field(default_factory=dict, description="JSON schema for parameter validation")

    # Execution properties
    inputs: Dict[str, Any] = Field(default_factory=dict, description="Input data mapping")
    outputs: Dict[str, Any] = Field(default_factory=dict, description="Output data mapping")
    next: Optional[Union[str, List[str]]] = Field(None, description="Next node(s) to execute")

    # Enhanced error handling
    retries: int = Field(default=3, description="Number of retry attempts on failure")
    timeout: int = Field(default=300, description="Timeout in seconds")
    retry_delay: int = Field(default=1, description="Delay between retries in seconds")
    error_handling_config: Dict[str, Any] = Field(default_factory=dict, description="Error handling configuration")
    circuit_breaker_threshold: int = Field(default=5, description="Circuit breaker failure threshold")
    circuit_breaker_timeout: int = Field(default=5, description="Circuit breaker timeout in minutes")

    # Validation and error tracking
    validation_results: Optional[ValidationResult] = Field(None, description="Last parameter validation results")
    execution_errors: List[Dict[str, Any]] = Field(default_factory=list, description="Execution error history")

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

    def _inject_services(self, context: Dict[str, Any]):
        """Inject services into the node from execution context"""
        # Default implementation - subclasses can override
        pass

    async def validate_parameters(
        self,
        params: Dict[str, Any],
        level: ValidationLevel = ValidationLevel.RUNTIME,
        context: Optional[Dict[str, Any]] = None
    ) -> ValidationResult:
        """Validate node parameters against schema"""
        self.validation_results = await parameter_validator.validate_parameters(
            params, self.params_schema, level, context
        )
        return self.validation_results

    def get_validation_errors(self) -> List[Dict[str, Any]]:
        """Get current validation errors"""
        if not self.validation_results:
            return []
        return [error.to_dict() for error in self.validation_results.errors]

    def get_validation_warnings(self) -> List[Dict[str, Any]]:
        """Get current validation warnings"""
        if not self.validation_results:
            return []
        return [warning.to_dict() for warning in self.validation_results.warnings]

    async def execute_with_error_handling(
        self,
        context: Dict[str, Any],
        attempt_number: int = 1
    ) -> Dict[str, Any]:
        """Execute node with comprehensive error handling and timeout"""
        start_time = datetime.now()

        try:
            # Inject services from context
            self._inject_services(context)

            # Execute with timeout
            result = await execute_node_with_timeout(
                self,
                self._execute_with_validation,
                context
            )

            # Mark as completed
            self.mark_completed(result)
            execution_time = (datetime.now() - start_time).total_seconds()
            self.execution_time = execution_time

            return result

        except Exception as e:
            # Handle execution error
            error_result = await handle_node_execution_error(
                self, e, attempt_number, context
            )

            # Record error
            error_dict = error_result.new_error.to_dict() if error_result.new_error else {
                "message": str(e),
                "attempt_number": attempt_number
            }
            self.execution_errors.append(error_dict)

            # Update node status
            self.mark_failed(str(e))
            execution_time = (datetime.now() - start_time).total_seconds()
            self.execution_time = execution_time

            # Check if should retry
            if error_result.should_retry and attempt_number < self.retries + 1:
                # Wait before retry
                await asyncio.sleep(error_result.delay_seconds)
                return await self.execute_with_error_handling(context, attempt_number + 1)

            # Final failure
            raise e

    async def _execute_with_validation(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Execute node logic with parameter validation"""
        # Validate inputs if schema is defined
        if self.params_schema:
            validation_result = await self.validate_parameters(self.inputs, ValidationLevel.RUNTIME, context)
            if not validation_result.valid:
                error_messages = [e.message for e in validation_result.errors]
                raise ValueError(f"Parameter validation failed: {'; '.join(error_messages)}")

        # Execute the actual node logic
        return await self.execute(context)

    def get_error_summary(self) -> Dict[str, Any]:
        """Get summary of execution errors"""
        if not self.execution_errors:
            return {"total_errors": 0, "last_error": None}

        return {
            "total_errors": len(self.execution_errors),
            "last_error": self.execution_errors[-1] if self.execution_errors else None,
            "error_categories": list(set(
                error.get("category", "unknown") for error in self.execution_errors
            )),
            "retry_attempts": max(
                (error.get("attempt_number", 1) for error in self.execution_errors),
                default=1
            )
        }

    def reset_error_state(self):
        """Reset error state for retry"""
        self.execution_errors.clear()
        self.error_message = None
        self.status = "pending"
        self.execution_time = None

    def to_dict(self) -> Dict[str, Any]:
        """Convert node to dictionary representation"""
        return {
            "id": self.id,
            "name": self.name,
            "type": self.type,
            "version": self.version,
            "description": self.description,
            "params_schema": self.params_schema,
            "inputs": self.inputs,
            "outputs": self.outputs,
            "next": self.next,
            "retries": self.retries,
            "timeout": self.timeout,
            "retry_delay": self.retry_delay,
            "error_handling_config": self.error_handling_config,
            "circuit_breaker_threshold": self.circuit_breaker_threshold,
            "circuit_breaker_timeout": self.circuit_breaker_timeout,
            "validation_results": self.validation_results.to_dict() if self.validation_results else None,
            "execution_errors": self.execution_errors,
            "tags": self.tags,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
            "status": self.status,
            "execution_time": self.execution_time,
            "error_message": self.error_message
        }