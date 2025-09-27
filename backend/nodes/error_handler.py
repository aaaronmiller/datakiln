"""
Runtime Error Handling System

This module provides comprehensive error handling for node execution including:
- Detailed error reporting and classification
- Recovery mechanisms and retry logic
- Error propagation and workflow failure handling
- Timeout management and circuit breaker patterns
"""

import asyncio
import logging
from typing import Dict, Any, List, Optional, Callable, Union, Type
from datetime import datetime, timedelta
from enum import Enum
from dataclasses import dataclass, field
import traceback
import json

# Removed circular imports - BaseNode will be imported when needed
from .parameter_validator import ValidationError, ValidationResult, ValidationSeverity
from .error_reporting import error_logger, log_execution_error


class ErrorCategory(Enum):
    """Categories of errors that can occur during node execution"""
    VALIDATION = "validation"
    NETWORK = "network"
    TIMEOUT = "timeout"
    RESOURCE = "resource"
    CONFIGURATION = "configuration"
    BUSINESS_LOGIC = "business_logic"
    EXTERNAL_SERVICE = "external_service"
    SYSTEM = "system"
    UNKNOWN = "unknown"


class ErrorSeverity(Enum):
    """Severity levels for execution errors"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class RecoveryStrategy(Enum):
    """Strategies for error recovery"""
    RETRY = "retry"
    SKIP = "skip"
    FAIL_FAST = "fail_fast"
    FALLBACK = "fallback"
    CIRCUIT_BREAKER = "circuit_breaker"
    MANUAL_INTERVENTION = "manual_intervention"


@dataclass
class ExecutionError:
    """Detailed execution error information"""
    node_id: str
    node_type: str
    category: ErrorCategory
    severity: ErrorSeverity
    message: str
    code: Optional[str] = None
    details: Optional[Dict[str, Any]] = None
    traceback: Optional[str] = None
    timestamp: datetime = field(default_factory=datetime.now)
    attempt_number: int = 1
    max_attempts: int = 3
    recovery_strategy: Optional[RecoveryStrategy] = None
    recoverable: bool = True
    context: Optional[Dict[str, Any]] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "node_id": self.node_id,
            "node_type": self.node_type,
            "category": self.category.value,
            "severity": self.severity.value,
            "message": self.message,
            "code": self.code,
            "details": self.details,
            "traceback": self.traceback,
            "timestamp": self.timestamp.isoformat(),
            "attempt_number": self.attempt_number,
            "max_attempts": self.max_attempts,
            "recovery_strategy": self.recovery_strategy.value if self.recovery_strategy else None,
            "recoverable": self.recoverable,
            "context": self.context
        }

    @classmethod
    def from_exception(
        cls,
        node: Any,  # BaseNode - imported locally to avoid circular import
        exception: Exception,
        attempt_number: int = 1,
        context: Optional[Dict[str, Any]] = None
    ) -> 'ExecutionError':
        """Create ExecutionError from an exception"""
        category = cls._categorize_exception(exception)
        severity = cls._determine_severity(exception, category)
        recoverable = cls._is_recoverable(exception, category)

        return cls(
            node_id=node.id,
            node_type=node.type,
            category=category,
            severity=severity,
            message=str(exception),
            details={"exception_type": type(exception).__name__},
            traceback=traceback.format_exc(),
            attempt_number=attempt_number,
            max_attempts=getattr(node, 'retries', 3) + 1,
            recoverable=recoverable,
            context=context
        )

    @staticmethod
    def _categorize_exception(exception: Exception) -> ErrorCategory:
        """Categorize an exception based on its type and message"""
        exc_type = type(exception).__name__
        exc_message = str(exception).lower()

        # Network-related errors
        if exc_type in ('ConnectionError', 'TimeoutError', 'HTTPError', 'RequestException'):
            return ErrorCategory.NETWORK
        if 'connection' in exc_message or 'timeout' in exc_message or 'network' in exc_message:
            return ErrorCategory.NETWORK

        # Timeout errors
        if exc_type == 'asyncio.TimeoutError' or 'timeout' in exc_message:
            return ErrorCategory.TIMEOUT

        # Resource errors
        if exc_type in ('MemoryError', 'OSError') or 'resource' in exc_message:
            return ErrorCategory.RESOURCE

        # Validation errors
        if 'validation' in exc_message or 'invalid' in exc_message:
            return ErrorCategory.VALIDATION

        # Configuration errors
        if 'config' in exc_message or 'setting' in exc_message:
            return ErrorCategory.CONFIGURATION

        # External service errors
        if 'api' in exc_message or 'service' in exc_message or 'external' in exc_message:
            return ErrorCategory.EXTERNAL_SERVICE

        # System errors
        if exc_type in ('SystemError', 'RuntimeError'):
            return ErrorCategory.SYSTEM

        return ErrorCategory.UNKNOWN

    @staticmethod
    def _determine_severity(exception: Exception, category: ErrorCategory) -> ErrorSeverity:
        """Determine error severity based on exception and category"""
        exc_type = type(exception).__name__

        # Critical system errors
        if category in (ErrorCategory.SYSTEM, ErrorCategory.RESOURCE):
            if exc_type == 'MemoryError':
                return ErrorSeverity.CRITICAL
            return ErrorSeverity.HIGH

        # High severity network/external errors
        if category in (ErrorCategory.NETWORK, ErrorCategory.EXTERNAL_SERVICE):
            return ErrorSeverity.HIGH

        # Medium severity for timeouts and configuration
        if category in (ErrorCategory.TIMEOUT, ErrorCategory.CONFIGURATION):
            return ErrorSeverity.MEDIUM

        # Low severity for validation and business logic
        return ErrorSeverity.LOW

    @staticmethod
    def _is_recoverable(exception: Exception, category: ErrorCategory) -> bool:
        """Determine if an error is recoverable"""
        # System and resource errors are generally not recoverable
        if category in (ErrorCategory.SYSTEM, ErrorCategory.RESOURCE):
            return False

        # Network and timeout errors are often recoverable
        if category in (ErrorCategory.NETWORK, ErrorCategory.TIMEOUT):
            return True

        # Validation errors are not recoverable (need user input)
        if category == ErrorCategory.VALIDATION:
            return False

        # Default to recoverable for unknown categories
        return True


@dataclass
class ErrorRecoveryResult:
    """Result of error recovery attempt"""
    success: bool
    new_error: Optional[ExecutionError] = None
    recovery_data: Optional[Dict[str, Any]] = None
    should_retry: bool = False
    delay_seconds: float = 0.0
    recovery_strategy: Optional['RecoveryStrategy'] = None


class ErrorHandler:
    """Handles errors during node execution with recovery mechanisms"""

    def __init__(self):
        self._recovery_strategies: Dict[RecoveryStrategy, Callable] = {
            RecoveryStrategy.RETRY: self._retry_recovery,
            RecoveryStrategy.SKIP: self._skip_recovery,
            RecoveryStrategy.FAIL_FAST: self._fail_fast_recovery,
            RecoveryStrategy.FALLBACK: self._fallback_recovery,
            RecoveryStrategy.CIRCUIT_BREAKER: self._circuit_breaker_recovery,
        }
        self._circuit_breaker_state: Dict[str, Dict[str, Any]] = {}
        self._error_history: List[ExecutionError] = []
        self._logger = logging.getLogger(__name__)

    async def handle_execution_error(
        self,
        node: Any,  # BaseNode - imported locally to avoid circular import
        exception: Exception,
        attempt_number: int = 1,
        context: Optional[Dict[str, Any]] = None
    ) -> ErrorRecoveryResult:
        """Handle an execution error and attempt recovery"""
        # Create detailed error object
        error = ExecutionError.from_exception(node, exception, attempt_number, context)

        # Log the error
        self._log_error(error)

        # Store in history
        self._error_history.append(error)

        # Determine recovery strategy
        strategy = self._determine_recovery_strategy(error, node)

        # Attempt recovery
        if strategy and error.recoverable:
            recovery_result = await self._execute_recovery_strategy(strategy, error, node, context)
            if recovery_result.success:
                self._logger.info(f"Successfully recovered from error for node {node.id} using {strategy.value}")
                return recovery_result

        # Recovery failed or not attempted
        return ErrorRecoveryResult(
            success=False,
            new_error=error,
            should_retry=error.attempt_number < error.max_attempts and error.recoverable,
            recovery_strategy=error.recovery_strategy
        )

    def _determine_recovery_strategy(
        self,
        error: ExecutionError,
        node: Any  # BaseNode - imported locally to avoid circular import
    ) -> Optional[RecoveryStrategy]:
        """Determine the appropriate recovery strategy for an error"""
        # Check node-specific configuration
        node_config = getattr(node, 'error_handling_config', {})

        # Explicit strategy in node config
        if 'recovery_strategy' in node_config:
            strategy_name = node_config['recovery_strategy']
            try:
                return RecoveryStrategy(strategy_name)
            except ValueError:
                pass

        # Strategy based on error category
        category_strategies = {
            ErrorCategory.NETWORK: RecoveryStrategy.RETRY,
            ErrorCategory.TIMEOUT: RecoveryStrategy.RETRY,
            ErrorCategory.EXTERNAL_SERVICE: RecoveryStrategy.CIRCUIT_BREAKER,
            ErrorCategory.VALIDATION: RecoveryStrategy.FAIL_FAST,
            ErrorCategory.CONFIGURATION: RecoveryStrategy.FAIL_FAST,
            ErrorCategory.SYSTEM: RecoveryStrategy.FAIL_FAST,
            ErrorCategory.RESOURCE: RecoveryStrategy.FAIL_FAST,
        }

        if error.category in category_strategies:
            return category_strategies[error.category]

        # Default to retry for unknown categories
        return RecoveryStrategy.RETRY

    async def _execute_recovery_strategy(
        self,
        strategy: RecoveryStrategy,
        error: ExecutionError,
        node: Any,  # BaseNode - imported locally to avoid circular import
        context: Optional[Dict[str, Any]] = None
    ) -> ErrorRecoveryResult:
        """Execute a recovery strategy"""
        if strategy in self._recovery_strategies:
            try:
                return await self._recovery_strategies[strategy](error, node, context)
            except Exception as recovery_exc:
                self._logger.error(f"Recovery strategy {strategy.value} failed: {str(recovery_exc)}")
                return ErrorRecoveryResult(
                    success=False,
                    new_error=ExecutionError.from_exception(node, recovery_exc, error.attempt_number + 1, context),
                    recovery_strategy=strategy
                )

        return ErrorRecoveryResult(success=False, new_error=error, recovery_strategy=strategy)

    async def _retry_recovery(
        self,
        error: ExecutionError,
        node: Any,  # BaseNode - imported locally to avoid circular import
        context: Optional[Dict[str, Any]] = None
    ) -> ErrorRecoveryResult:
        """Retry recovery strategy"""
        if error.attempt_number >= error.max_attempts:
            return ErrorRecoveryResult(success=False, new_error=error, recovery_strategy=RecoveryStrategy.RETRY)

        # Calculate delay with exponential backoff
        base_delay = getattr(node, 'retry_delay', 1.0)
        delay = min(base_delay * (2 ** (error.attempt_number - 1)), 30.0)  # Max 30 seconds

        return ErrorRecoveryResult(
            success=True,
            should_retry=True,
            delay_seconds=delay,
            recovery_data={"retry_attempt": error.attempt_number + 1},
            recovery_strategy=RecoveryStrategy.RETRY
        )

    async def _skip_recovery(
        self,
        error: ExecutionError,
        node: Any,  # BaseNode - imported locally to avoid circular import
        context: Optional[Dict[str, Any]] = None
    ) -> ErrorRecoveryResult:
        """Skip recovery strategy - mark as successful but with warning"""
        return ErrorRecoveryResult(
            success=True,
            recovery_data={"skipped": True, "reason": "error_handling_policy"},
            recovery_strategy=RecoveryStrategy.SKIP
        )

    async def _fail_fast_recovery(
        self,
        error: ExecutionError,
        node: Any,  # BaseNode - imported locally to avoid circular import
        context: Optional[Dict[str, Any]] = None
    ) -> ErrorRecoveryResult:
        """Fail fast recovery strategy - immediate failure"""
        return ErrorRecoveryResult(success=False, new_error=error, recovery_strategy=RecoveryStrategy.FAIL_FAST)

    async def _fallback_recovery(
        self,
        error: ExecutionError,
        node: Any,  # BaseNode - imported locally to avoid circular import
        context: Optional[Dict[str, Any]] = None
    ) -> ErrorRecoveryResult:
        """Fallback recovery strategy - use alternative approach"""
        # Check if node has fallback configuration
        fallback_config = getattr(node, 'fallback_config', None)
        if fallback_config:
            return ErrorRecoveryResult(
                success=True,
                recovery_data={"fallback": True, "config": fallback_config},
                recovery_strategy=RecoveryStrategy.FALLBACK
            )

        return ErrorRecoveryResult(success=False, new_error=error, recovery_strategy=RecoveryStrategy.FALLBACK)

    async def _circuit_breaker_recovery(
        self,
        error: ExecutionError,
        node: Any,  # BaseNode - imported locally to avoid circular import
        context: Optional[Dict[str, Any]] = None
    ) -> ErrorRecoveryResult:
        """Circuit breaker recovery strategy"""
        circuit_key = f"{error.node_type}:{error.category.value}"

        # Initialize circuit breaker state
        if circuit_key not in self._circuit_breaker_state:
            self._circuit_breaker_state[circuit_key] = {
                "failures": 0,
                "last_failure": None,
                "state": "closed"  # closed, open, half-open
            }

        circuit_state = self._circuit_breaker_state[circuit_key]

        # Update failure count
        circuit_state["failures"] += 1
        circuit_state["last_failure"] = datetime.now()

        # Check if circuit should open
        failure_threshold = getattr(node, 'circuit_breaker_threshold', 5)
        if circuit_state["failures"] >= failure_threshold:
            circuit_state["state"] = "open"
            timeout_minutes = getattr(node, 'circuit_breaker_timeout', 5)
            circuit_state["open_until"] = datetime.now() + timedelta(minutes=timeout_minutes)

            return ErrorRecoveryResult(
                success=False,
                new_error=ExecutionError(
                    node_id=error.node_id,
                    node_type=error.node_type,
                    category=ErrorCategory.SYSTEM,
                    severity=ErrorSeverity.HIGH,
                    message=f"Circuit breaker opened for {circuit_key} after {circuit_state['failures']} failures",
                    recoverable=False,
                    context={"circuit_breaker": circuit_state}
                ),
                recovery_strategy=RecoveryStrategy.CIRCUIT_BREAKER
            )

        # Circuit still closed, allow retry
        return await self._retry_recovery(error, node, context)

    def _log_error(self, error: ExecutionError):
        """Log an error using the centralized error logger"""
        # Log to centralized error logger
        log_execution_error(error, {
            "handler": "ErrorHandler",
            "recovery_strategy": error.recovery_strategy.value if error.recovery_strategy else None,
            "workflow_context": getattr(self, '_current_context', None)
        })

        # Also log to local logger for backward compatibility
        log_message = f"Node {error.node_id} ({error.node_type}) error: {error.message}"
        log_data = {
            "node_id": error.node_id,
            "category": error.category.value,
            "severity": error.severity.value,
            "attempt": error.attempt_number,
            "traceback": error.traceback
        }

        if error.severity == ErrorSeverity.CRITICAL:
            self._logger.critical(log_message, extra=log_data)
        elif error.severity == ErrorSeverity.HIGH:
            self._logger.error(log_message, extra=log_data)
        elif error.severity == ErrorSeverity.MEDIUM:
            self._logger.warning(log_message, extra=log_data)
        else:
            self._logger.info(log_message, extra=log_data)

    def get_error_history(
        self,
        node_id: Optional[str] = None,
        category: Optional[ErrorCategory] = None,
        since: Optional[datetime] = None,
        limit: int = 100
    ) -> List[ExecutionError]:
        """Get error history with optional filtering"""
        errors = self._error_history

        if node_id:
            errors = [e for e in errors if e.node_id == node_id]

        if category:
            errors = [e for e in errors if e.category == category]

        if since:
            errors = [e for e in errors if e.timestamp >= since]

        return errors[-limit:]  # Return most recent errors

    def get_error_statistics(
        self,
        since: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """Get error statistics"""
        errors = self._error_history
        if since:
            errors = [e for e in errors if e.timestamp >= since]

        stats = {
            "total_errors": len(errors),
            "by_category": {},
            "by_severity": {},
            "by_node_type": {},
            "recoverable_errors": len([e for e in errors if e.recoverable]),
            "unrecoverable_errors": len([e for e in errors if not e.recoverable])
        }

        for error in errors:
            # Category stats
            cat = error.category.value
            stats["by_category"][cat] = stats["by_category"].get(cat, 0) + 1

            # Severity stats
            sev = error.severity.value
            stats["by_severity"][sev] = stats["by_severity"].get(sev, 0) + 1

            # Node type stats
            node_type = error.node_type
            stats["by_node_type"][node_type] = stats["by_node_type"].get(node_type, 0) + 1

        return stats

    def reset_circuit_breaker(self, circuit_key: str):
        """Reset a circuit breaker"""
        if circuit_key in self._circuit_breaker_state:
            self._circuit_breaker_state[circuit_key] = {
                "failures": 0,
                "last_failure": None,
                "state": "closed"
            }

    def check_circuit_breaker_state(self, circuit_key: str) -> Dict[str, Any]:
        """Check the state of a circuit breaker"""
        if circuit_key not in self._circuit_breaker_state:
            return {"state": "closed", "failures": 0}

        state = self._circuit_breaker_state[circuit_key]

        # Check if open circuit should transition to half-open
        if state.get("state") == "open":
            open_until = state.get("open_until")
            if open_until and datetime.now() >= open_until:
                state["state"] = "half-open"

        return state


class TimeoutManager:
    """Manages execution timeouts for nodes"""

    def __init__(self):
        self._active_timeouts: Dict[str, asyncio.Task] = {}

    async def execute_with_timeout(
        self,
        node: Any,  # BaseNode - imported locally to avoid circular import
        execution_func: Callable,
        *args,
        **kwargs
    ) -> Any:
        """Execute a function with timeout"""
        timeout_seconds = getattr(node, 'timeout', 300)  # Default 5 minutes

        try:
            # Create timeout task
            timeout_task = asyncio.create_task(asyncio.sleep(timeout_seconds))
            execution_task = asyncio.create_task(execution_func(*args, **kwargs))

            self._active_timeouts[node.id] = timeout_task

            # Wait for either completion or timeout
            done, pending = await asyncio.wait(
                [execution_task, timeout_task],
                return_when=asyncio.FIRST_COMPLETED
            )

            # Cancel timeout task
            timeout_task.cancel()
            if node.id in self._active_timeouts:
                del self._active_timeouts[node.id]

            # Check results
            if execution_task in done:
                return await execution_task
            else:
                # Timeout occurred
                execution_task.cancel()
                raise asyncio.TimeoutError(f"Node {node.id} execution timed out after {timeout_seconds} seconds")

        except asyncio.TimeoutError:
            raise
        except Exception as e:
            if node.id in self._active_timeouts:
                del self._active_timeouts[node.id]
            raise

    def cancel_timeout(self, node_id: str):
        """Cancel a timeout for a node"""
        if node_id in self._active_timeouts:
            self._active_timeouts[node_id].cancel()
            del self._active_timeouts[node_id]

    def get_active_timeouts(self) -> List[str]:
        """Get list of nodes with active timeouts"""
        return list(self._active_timeouts.keys())


# Global instances
error_handler = ErrorHandler()
timeout_manager = TimeoutManager()


# Convenience functions
async def handle_node_execution_error(
    node: Any,  # BaseNode - imported locally to avoid circular import
    exception: Exception,
    attempt_number: int = 1,
    context: Optional[Dict[str, Any]] = None
) -> ErrorRecoveryResult:
    """Handle an error during node execution"""
    return await error_handler.handle_execution_error(node, exception, attempt_number, context)


async def execute_node_with_timeout(
    node: Any,  # BaseNode - imported locally to avoid circular import
    execution_func: Callable,
    *args,
    **kwargs
) -> Any:
    """Execute a node function with timeout management"""
    return await timeout_manager.execute_with_timeout(node, execution_func, *args, **kwargs)