import asyncio
from typing import Dict, Any, Optional, List, Union, Callable
from enum import Enum
from datetime import datetime, timedelta
import json
import os
from pathlib import Path
from dataclasses import dataclass

from nodes.base_node import BaseNode
from nodes.node_factory import node_factory, create_node
from nodes.error_handler import error_handler
from dom_actions import DomActionExecutor
from dom_selectors import default_registry as selectors_registry


class ExecutionState(Enum):
    """Execution states for the workflow executor"""
    IDLE = "idle"
    LOAD_WORKFLOW = "load_workflow"
    RESOLVE_NODE = "resolve_node"
    RESOLVE_SELECTORS = "resolve_selectors"
    EXECUTE_NODE = "execute_node"
    WAIT_FOR_DOM = "wait_for_dom"
    PERFORM_ACTION = "perform_action"
    CAPTURE_OUTPUT = "capture_output"
    NEXT_NODE = "next_node"
    PERSIST_ARTIFACTS = "persist_artifacts"
    COMPLETE = "complete"
    ERROR = "error"
    RETRY = "retry"


@dataclass
class ExecutionContext:
    """Context for workflow execution"""
    workflow: Dict[str, Any]
    nodes: Dict[str, BaseNode]
    current_node_id: Optional[str] = None
    execution_data: Dict[str, Any] = None
    browser_context: Optional[Any] = None
    page: Optional[Any] = None
    artifacts: List[Dict[str, Any]] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None

    def __post_init__(self):
        if self.execution_data is None:
            self.execution_data = {}
        if self.artifacts is None:
            self.artifacts = []


class WorkflowExecutor:
    """State machine for executing node-based workflows"""

    def __init__(self):
        self.state = ExecutionState.IDLE
        self.dom_executor = DomActionExecutor()
        self.context: Optional[ExecutionContext] = None
        self.retry_count = 0
        self.max_retries = 3
        self.state_history: List[Dict[str, Any]] = []
        self.provider_manager = None
        self.selectors_registry = None

    async def execute_workflow(
        self,
        workflow: Dict[str, Any],
        browser_context: Optional[Any] = None,
        on_state_change: Optional[Callable[[ExecutionState, Dict[str, Any]], None]] = None,
        provider_manager: Optional[Any] = None,
        selectors_registry: Optional[Any] = None
    ) -> Dict[str, Any]:
        """Execute a complete workflow"""
        try:
            self._reset_execution()
            self.provider_manager = provider_manager
            self.selectors_registry = selectors_registry or selectors_registry
            self.context = ExecutionContext(
                workflow=workflow,
                nodes={},
                browser_context=browser_context,
                start_time=datetime.now()
            )

            # Execute state machine
            while self.state != ExecutionState.COMPLETE and self.state != ExecutionState.ERROR:
                await self._execute_current_state()

                # Notify state change
                if on_state_change:
                    await on_state_change(self.state, self._get_state_info())

                # Add to history
                self.state_history.append({
                    "state": self.state.value,
                    "timestamp": datetime.now().isoformat(),
                    "context": self._get_state_info()
                })

            # Finalize execution
            if self.context:
                self.context.end_time = datetime.now()

            result = {
                "success": self.state == ExecutionState.COMPLETE,
                "final_state": self.state.value,
                "execution_time": self._calculate_execution_time(),
                "artifacts": self.context.artifacts if self.context else [],
                "state_history": self.state_history,
                "error": self._get_error_info() if self.state == ExecutionState.ERROR else None
            }

            return result

        except Exception as e:
            self.state = ExecutionState.ERROR
            return {
                "success": False,
                "final_state": self.state.value,
                "error": str(e),
                "execution_time": self._calculate_execution_time()
            }

    async def _execute_current_state(self):
        """Execute the current state logic"""
        if self.state == ExecutionState.IDLE:
            await self._handle_idle()
        elif self.state == ExecutionState.LOAD_WORKFLOW:
            await self._handle_load_workflow()
        elif self.state == ExecutionState.RESOLVE_NODE:
            await self._handle_resolve_node()
        elif self.state == ExecutionState.RESOLVE_SELECTORS:
            await self._handle_resolve_selectors()
        elif self.state == ExecutionState.EXECUTE_NODE:
            await self._handle_execute_node()
        elif self.state == ExecutionState.WAIT_FOR_DOM:
            await self._handle_wait_for_dom()
        elif self.state == ExecutionState.PERFORM_ACTION:
            await self._handle_perform_action()
        elif self.state == ExecutionState.CAPTURE_OUTPUT:
            await self._handle_capture_output()
        elif self.state == ExecutionState.NEXT_NODE:
            await self._handle_next_node()
        elif self.state == ExecutionState.PERSIST_ARTIFACTS:
            await self._handle_persist_artifacts()
        elif self.state == ExecutionState.COMPLETE:
            await self._handle_complete()
        elif self.state == ExecutionState.RETRY:
            await self._handle_retry()
        else:
            raise ValueError(f"Unknown state: {self.state}")

    async def _handle_idle(self):
        """Handle idle state - transition to load workflow"""
        self.state = ExecutionState.LOAD_WORKFLOW

    async def _handle_load_workflow(self):
        """Load and validate workflow"""
        try:
            if not self.context or not self.context.workflow:
                raise ValueError("No workflow provided")

            workflow = self.context.workflow

            # Validate workflow structure
            if "nodes" not in workflow:
                raise ValueError("Workflow missing nodes definition")

            if "start_node" not in workflow:
                raise ValueError("Workflow missing start_node")

            # Create node instances
            nodes = {}
            for node_id, node_config in workflow["nodes"].items():
                node_type = node_config.get("type")
                if not node_type:
                    raise ValueError(f"Node {node_id} missing type")

                node_class = self._get_node_class(node_type)
                if node_class is None:
                    # Use dynamic factory for custom nodes
                    node = await create_node(node_type, **node_config)
                else:
                    # Use traditional class instantiation for built-in nodes
                    node = node_class(**node_config)
                nodes[node_id] = node

            # Update context
            self.context.nodes = nodes
            self.context.current_node_id = workflow.get("start_node")

            # Validate node dependencies
            self._validate_workflow_dependencies()

            self.state = ExecutionState.RESOLVE_NODE

        except Exception as e:
            self.state = ExecutionState.ERROR
            raise ValueError(f"Workflow loading failed: {str(e)}")

    async def _handle_resolve_node(self):
        """Resolve current node for execution"""
        if not self.context or not self.context.current_node_id:
            self.state = ExecutionState.COMPLETE
            return

        current_node = self.context.nodes.get(self.context.current_node_id)
        if not current_node:
            self.state = ExecutionState.ERROR
            raise ValueError(f"Node {self.context.current_node_id} not found")

        # Update context with current node
        self.context.execution_data["current_node"] = current_node.to_dict()

        self.state = ExecutionState.RESOLVE_SELECTORS

    async def _handle_resolve_selectors(self):
        """Resolve selectors for DOM actions"""
        current_node = self.context.nodes.get(self.context.current_node_id)

        if current_node and current_node.type == "dom_action":
            # Resolve selectors for DOM actions
            selector_key = current_node.selector_key
            resolved_selector = selectors_registry.get_selector(selector_key)

            if not resolved_selector:
                # Try fallback selectors
                if hasattr(current_node, 'fallback_selectors') and current_node.fallback_selectors:
                    for fallback in current_node.fallback_selectors:
                        resolved_selector = selectors_registry.get_selector(fallback)
                        if resolved_selector:
                            break

            if not resolved_selector:
                self.state = ExecutionState.ERROR
                raise ValueError(f"Could not resolve selector: {selector_key}")

            # Store resolved selector in context
            if not self.context.execution_data.get("selectors"):
                self.context.execution_data["selectors"] = {}
            self.context.execution_data["selectors"][selector_key] = resolved_selector

        self.state = ExecutionState.EXECUTE_NODE

    async def _handle_execute_node(self):
        """Execute the current node with enhanced error handling"""
        current_node = self.context.nodes.get(self.context.current_node_id)

        try:
            # Prepare execution context
            execution_context = {
                "workflow": self.context.workflow,
                "execution_data": self.context.execution_data,
                "browser_context": self.context.browser_context,
                "page": self.context.page,
                "selectors_registry": self._get_selectors_dict(),
                "artifacts": self.context.artifacts,
                "provider_manager": self.provider_manager,
                "execution_options": self.context.execution_data.get("execution_options", {})
            }

            # Execute node with comprehensive error handling
            result = await current_node.execute_with_error_handling(execution_context)

            # Store result
            self.context.execution_data[f"node_{current_node.id}_result"] = result

            # Determine next state based on node type
            if current_node.type == "dom_action":
                self.state = ExecutionState.WAIT_FOR_DOM
            elif current_node.type == "condition":
                # Handle branching
                next_nodes = result.get("next_nodes")
                if next_nodes:
                    if isinstance(next_nodes, list):
                        self.context.execution_data["pending_nodes"] = next_nodes
                    else:
                        self.context.current_node_id = next_nodes
                else:
                    self.state = ExecutionState.NEXT_NODE
            else:
                self.state = ExecutionState.NEXT_NODE

        except Exception as e:
            # Enhanced error handling with workflow-level recovery
            await self._handle_workflow_execution_error(current_node, e)

    async def _handle_wait_for_dom(self):
        """Wait for DOM readiness"""
        try:
            if not self.context.page:
                raise ValueError("No page available for DOM operations")

            # Wait for page to be ready
            await self.context.page.wait_for_load_state("networkidle", timeout=10000)

            self.state = ExecutionState.PERFORM_ACTION

        except Exception as e:
            await self._handle_execution_error(None, f"DOM wait failed: {str(e)}")

    async def _handle_perform_action(self):
        """Perform DOM action"""
        current_node = self.context.nodes.get(self.context.current_node_id)

        if current_node.type == "dom_action":
            try:
                if not self.context.page:
                    raise ValueError("No page available for DOM action")

                # Perform DOM action
                action_result = await self.dom_executor.execute_action(
                    page=self.context.page,
                    action=current_node.action,
                    selector_key=current_node.selector_key,
                    value=current_node.value,
                    selectors_registry=self._get_selectors_dict(),
                    timeout=current_node.timeout
                )

                # Store action result
                self.context.execution_data[f"dom_action_{current_node.id}_result"] = action_result

                if action_result.get("success"):
                    self.state = ExecutionState.CAPTURE_OUTPUT
                else:
                    raise ValueError(f"DOM action failed: {action_result.get('error', 'Unknown error')}")

            except Exception as e:
                await self._handle_execution_error(current_node, f"DOM action failed: {str(e)}")
        else:
            self.state = ExecutionState.CAPTURE_OUTPUT

    async def _handle_capture_output(self):
        """Capture output from node execution"""
        current_node = self.context.nodes.get(self.context.current_node_id)

        try:
            # Capture node output
            if current_node and hasattr(current_node, 'outputs'):
                output_data = {
                    "node_id": current_node.id,
                    "node_type": current_node.type,
                    "outputs": current_node.outputs,
                    "execution_time": current_node.execution_time,
                    "timestamp": datetime.now().isoformat()
                }

                self.context.artifacts.append(output_data)

            self.state = ExecutionState.NEXT_NODE

        except Exception as e:
            await self._handle_execution_error(current_node, f"Output capture failed: {str(e)}")

    async def _handle_next_node(self):
        """Determine next node to execute"""
        current_node = self.context.nodes.get(self.context.current_node_id)

        # Get next node(s)
        next_node_id = None
        if current_node and current_node.next:
            if isinstance(current_node.next, list):
                # Handle multiple next nodes
                if "pending_nodes" in self.context.execution_data:
                    pending = self.context.execution_data["pending_nodes"]
                    next_node_id = pending.pop(0) if pending else None
                else:
                    next_node_id = current_node.next[0] if current_node.next else None
            else:
                next_node_id = current_node.next

        if next_node_id:
            self.context.current_node_id = next_node_id
            self.state = ExecutionState.RESOLVE_NODE
        else:
            self.state = ExecutionState.PERSIST_ARTIFACTS

    async def _handle_persist_artifacts(self):
        """Persist execution artifacts"""
        try:
            if self.context and self.context.artifacts:
                # Save artifacts to disk
                artifacts_path = Path("execution_artifacts")
                artifacts_path.mkdir(exist_ok=True)

                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                artifact_file = artifacts_path / f"artifacts_{timestamp}.json"

                with open(artifact_file, 'w', encoding='utf-8') as f:
                    json.dump({
                        "execution_id": self.context.execution_data.get("execution_id", "unknown"),
                        "start_time": self.context.start_time.isoformat() if self.context.start_time else None,
                        "end_time": self.context.end_time.isoformat() if self.context.end_time else None,
                        "artifacts": self.context.artifacts,
                        "workflow": self.context.workflow.get("name", "unknown")
                    }, f, indent=2, ensure_ascii=False)

                self.context.execution_data["artifacts_path"] = str(artifact_file)

            self.state = ExecutionState.COMPLETE

        except Exception as e:
            await self._handle_execution_error(None, f"Artifact persistence failed: {str(e)}")

    async def _handle_complete(self):
        """Handle completion state"""
        pass  # Nothing to do in complete state

    async def _handle_retry(self):
        """Handle retry logic"""
        if self.retry_count < self.max_retries:
            self.retry_count += 1
            self.state = ExecutionState.RESOLVE_NODE  # Go back to resolve current node
        else:
            self.state = ExecutionState.ERROR

    async def _handle_workflow_execution_error(self, node: Optional[BaseNode], exception: Exception):
        """Handle workflow-level execution errors with enhanced error handling"""
        # Get error recovery result from the error handler
        recovery_result = await error_handler.handle_execution_error(
            node, exception, self.retry_count + 1, self.context.execution_data if self.context else None
        )

        # Store error in context
        error_info = {
            "node_id": node.id if node else None,
            "error": str(exception),
            "recovery_strategy": recovery_result.recovery_strategy,
            "should_retry": recovery_result.should_retry,
            "retry_count": self.retry_count,
            "timestamp": datetime.now().isoformat(),
            "error_details": recovery_result.new_error.to_dict() if recovery_result.new_error else None
        }

        if not self.context.execution_data.get("errors"):
            self.context.execution_data["errors"] = []
        self.context.execution_data["errors"].append(error_info)

        # Check if we should retry at workflow level
        if recovery_result.should_retry and self.retry_count < self.max_retries:
            self.retry_count += 1
            # Wait before retry with delay from recovery result
            await asyncio.sleep(recovery_result.delay_seconds)
            self.state = ExecutionState.RETRY
        else:
            # Check for workflow failure handling strategies
            await self._handle_workflow_failure(node, exception, recovery_result)
            self.state = ExecutionState.ERROR

    def _get_node_class(self, node_type: str):
        """Get node class by type using dynamic factory"""
        # First try to get from dynamic factory
        try:
            # Check if it's a registered custom node
            definition = node_factory.get_node_definition(node_type)
            if definition:
                # This is a custom node, let the factory handle it
                return None  # Signal to use factory
        except:
            pass

        # Fall back to built-in nodes
        from nodes.dom_action_node import DomActionNode
        from nodes.prompt_node import PromptNode
        from nodes.provider_node import ProviderNode
        from nodes.transform_node import TransformNode
        from nodes.export_node import ExportNode
        from nodes.condition_node import ConditionNode

        node_classes = {
            "dom_action": DomActionNode,
            "prompt": PromptNode,
            "provider": ProviderNode,
            "transform": TransformNode,
            "export": ExportNode,
            "condition": ConditionNode
        }

        if node_type not in node_classes:
            raise ValueError(f"Unknown node type: {node_type}")

        return node_classes[node_type]

    def _validate_workflow_dependencies(self):
        """Validate workflow node dependencies"""
        if not self.context:
            return

        nodes = self.context.nodes
        visited = set()
        visiting = set()

        def has_cycle(node_id):
            if node_id in visiting:
                return True
            if node_id in visited:
                return False

            visiting.add(node_id)
            node = nodes.get(node_id)

            if node and node.next:
                next_ids = node.next if isinstance(node.next, list) else [node.next]
                for next_id in next_ids:
                    if next_id and has_cycle(next_id):
                        return True

            visiting.remove(node_id)
            visited.add(node_id)
            return False

        # Check for cycles
        for node_id in nodes:
            if has_cycle(node_id):
                raise ValueError(f"Workflow contains cycle involving node {node_id}")

    def _get_selectors_dict(self) -> Dict[str, str]:
        """Get selectors as dictionary"""
        return {
            selector.key: selector.selector
            for selector in selectors_registry.selectors.values()
        }

    def _get_state_info(self) -> Dict[str, Any]:
        """Get current state information"""
        return {
            "current_node_id": self.context.current_node_id if self.context else None,
            "retry_count": self.retry_count,
            "execution_data_keys": list(self.context.execution_data.keys()) if self.context else [],
            "artifacts_count": len(self.context.artifacts) if self.context else 0
        }

    def _get_error_info(self) -> Optional[Dict[str, Any]]:
        """Get error information"""
        if not self.context or not self.context.execution_data.get("errors"):
            return None

        return {
            "errors": self.context.execution_data["errors"],
            "retry_count": self.retry_count,
            "max_retries": self.max_retries
        }

    async def _handle_workflow_failure(
        self,
        node: Optional[BaseNode],
        exception: Exception,
        recovery_result: Any
    ):
        """Handle workflow-level failure with error propagation strategies"""
        # Check workflow configuration for failure handling
        workflow_config = self.context.workflow.get("error_handling", {}) if self.context else {}

        failure_strategy = workflow_config.get("failure_strategy", "fail_fast")

        if failure_strategy == "continue_on_error":
            # Continue workflow execution despite errors
            self._logger.warning(f"Continuing workflow despite error in node {node.id if node else 'unknown'}: {str(exception)}")
            # Mark error in context but don't fail workflow
            self.context.execution_data["workflow_errors"] = self.context.execution_data.get("workflow_errors", [])
            self.context.execution_data["workflow_errors"].append({
                "node_id": node.id if node else None,
                "error": str(exception),
                "strategy": "continue_on_error",
                "timestamp": datetime.now().isoformat()
            })
            # Try to continue to next node
            self.state = ExecutionState.NEXT_NODE

        elif failure_strategy == "rollback":
            # Attempt to rollback workflow state
            await self._rollback_workflow(node, exception)
            self.state = ExecutionState.ERROR

        elif failure_strategy == "compensate":
            # Execute compensation actions
            await self._execute_compensation_actions(node, exception)
            self.state = ExecutionState.ERROR

        else:  # fail_fast (default)
            # Immediate failure
            self.state = ExecutionState.ERROR

    async def _rollback_workflow(self, failed_node: Optional[BaseNode], exception: Exception):
        """Rollback workflow to a safe state"""
        if not self.context:
            return

        # Find completed nodes that might need rollback
        completed_nodes = [
            node for node in self.context.nodes.values()
            if node.status == "completed"
        ]

        # Execute rollback in reverse order
        for node in reversed(completed_nodes):
            if hasattr(node, 'rollback'):
                try:
                    await node.rollback(self.context.execution_data)
                    node.status = "rolled_back"
                except Exception as rollback_error:
                    self._logger.error(f"Rollback failed for node {node.id}: {str(rollback_error)}")

    async def _execute_compensation_actions(self, failed_node: Optional[BaseNode], exception: Exception):
        """Execute compensation actions for failed workflow"""
        if not self.context:
            return

        compensation_actions = self.context.workflow.get("compensation_actions", [])

        for action in compensation_actions:
            try:
                # Execute compensation logic (simplified - would need more implementation)
                self._logger.info(f"Executing compensation action: {action}")
            except Exception as comp_error:
                self._logger.error(f"Compensation action failed: {str(comp_error)}")

    def _calculate_execution_time(self) -> Optional[float]:
        """Calculate execution time in seconds"""
        if not self.context or not self.context.start_time:
            return None

        end_time = self.context.end_time or datetime.now()
        return (end_time - self.context.start_time).total_seconds()

    def _reset_execution(self):
        """Reset execution state"""
        self.state = ExecutionState.IDLE
        self.context = None
        self.retry_count = 0
        self.state_history.clear()