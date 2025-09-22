from typing import Dict, List, Any, Set, Optional, Tuple, Callable
from collections import defaultdict, deque
import asyncio
import logging
from dataclasses import dataclass
from nodes.base_node import BaseNode
from nodes.data_source_node import DataSourceNode
from nodes.transform_node import TransformNode
from nodes.filter_node import FilterNode
from nodes.dom_action_node import DomActionNode
from nodes.provider_node import ProviderNode
from nodes.condition_node import ConditionNode
from nodes.export_node import ExportNode
from nodes.prompt_node import PromptNode
from nodes.aggregate_node import AggregateNode
from nodes.join_node import JoinNode
from nodes.union_node import UnionNode
from app.models.workflow import Workflow, Node, Edge

logger = logging.getLogger(__name__)


@dataclass
class DataFlowConnection:
    """Represents a data connection between nodes"""
    source_node_id: str
    target_node_id: str
    source_output_key: Optional[str] = None
    target_input_key: Optional[str] = None
    transform_function: Optional[callable] = None


@dataclass
class ExecutionResult:
    """Result of node execution"""
    node_id: str
    success: bool
    outputs: Dict[str, Any]
    execution_time: float
    error: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


@dataclass
class WorkflowExecutionContext:
    """Enhanced execution context with data flow tracking"""
    workflow_id: str
    execution_id: str
    global_context: Dict[str, Any]
    node_results: Dict[str, ExecutionResult]
    data_flow: Dict[str, Dict[str, Any]]  # node_id -> input_data
    execution_options: Dict[str, Any]


class DAGExecutor:
    """Minimal DAG executor for workflow nodes with event emission"""

    def __init__(self):
        self.node_classes = {
            "dataSource": DataSourceNode,
            "transform": TransformNode,
            "filter": FilterNode,
            "dom_action": DomActionNode,
            "provider": ProviderNode,
            "condition": ConditionNode,
            "export": ExportNode,
            "prompt": PromptNode,
            "aggregate": AggregateNode,
            "join": JoinNode,
            "union": UnionNode,
        }
        self.event_callbacks: List[Callable[[str, Dict[str, Any]], None]] = []

    def add_event_callback(self, callback: Callable[[str, Dict[str, Any]], None]):
        """Add an event callback for execution events"""
        self.event_callbacks.append(callback)

    def remove_event_callback(self, callback: Callable[[str, Dict[str, Any]], None]):
        """Remove an event callback"""
        if callback in self.event_callbacks:
            self.event_callbacks.remove(callback)

    def _emit_event(self, event_type: str, event_data: Dict[str, Any]):
        """Emit an event to all registered callbacks"""
        for callback in self.event_callbacks:
            try:
                callback(event_type, event_data)
            except Exception as e:
                logger.error(f"Error in event callback: {e}")

    async def execute_workflow(self, workflow: Workflow, context: Dict[str, Any] = None) -> Dict[str, Any]:
        """Execute a workflow DAG with enhanced data flow management"""
        import time
        import uuid

        start_time = time.time()
        execution_id = f"exec_{int(start_time * 1000)}_{uuid.uuid4().hex[:8]}"

        try:
            # Initialize execution context
            execution_context = WorkflowExecutionContext(
                workflow_id=getattr(workflow, 'id', 'unknown'),
                execution_id=execution_id,
                global_context=context or {},
                node_results={},
                data_flow={},
                execution_options=getattr(workflow, 'execution_data', {}).get('execution_options', {})
            )

            # Build node instances with enhanced setup
            nodes = await self._build_nodes(workflow, execution_context)

            # Analyze data flow requirements
            data_connections = self._analyze_data_flow(workflow, nodes)

            # Validate workflow structure
            execution_order = self._validate_and_order_workflow(workflow, nodes)

            # Execute nodes with proper data flow
            await self._execute_with_data_flow(
                workflow, nodes, execution_order, data_connections, execution_context
            )

            # Prepare final results
            execution_time = time.time() - start_time
            return self._prepare_execution_results(
                execution_context, execution_order, execution_time
            )

        except Exception as e:
            logger.error(f"Workflow execution failed: {str(e)}")
            execution_time = time.time() - start_time
            return {
                "success": False,
                "execution_id": execution_id,
                "execution_time": execution_time,
                "error": str(e),
                "execution_order": [],
                "results": {},
                "node_states": {}
            }

    async def _build_nodes(self, workflow: Workflow, context: WorkflowExecutionContext) -> Dict[str, BaseNode]:
        """Build and initialize node instances"""
        nodes = {}

        for node_data in workflow.nodes:
            node_class = self.node_classes.get(node_data.type)
            if not node_class:
                raise ValueError(f"Unsupported node type: {node_data.type}")

            # Create node instance with proper field mapping
            node_dict = self._prepare_node_dict(node_data)
            node = node_class(**node_dict)

            # Inject services into node if available
            if hasattr(node, '_inject_services'):
                node._inject_services(context.global_context)

            # Initialize data flow tracking
            context.data_flow[node.id] = {}

            nodes[node.id] = node

        logger.info(f"Built {len(nodes)} workflow nodes")
        return nodes

    def _prepare_node_dict(self, node_data: Node) -> Dict[str, Any]:
        """Prepare node dictionary for instantiation, handling field mapping"""
        from datetime import datetime

        node_dict = {
            "id": node_data.id,
            "name": node_data.name,
            "type": node_data.type,
            "description": node_data.description,
            "inputs": node_data.inputs,
            "outputs": node_data.outputs,
            "next": node_data.next,
            "retries": node_data.retries,
            "timeout": node_data.timeout,
            "retry_delay": node_data.retry_delay,
            "tags": node_data.tags,
            "created_at": datetime.now() if node_data.created_at is None else node_data.created_at,
            "updated_at": datetime.now() if node_data.updated_at is None else node_data.updated_at,
            "status": node_data.status,
            "execution_time": node_data.execution_time,
            "error_message": node_data.error_message,
        }

        # Handle node-specific data from extra fields or inputs
        extra_data = getattr(node_data, '__pydantic_extra__', {}) or {}

        # For backward compatibility, also check for 'data' in inputs
        if 'data' in node_data.inputs and isinstance(node_data.inputs['data'], dict):
            extra_data.update(node_data.inputs['data'])

        # Map common fields based on node type
        if node_data.type == "dataSource":
            node_dict.update({
                "source_type": extra_data.get("source_type", "mock"),
                "url": extra_data.get("url"),
                "file_path": extra_data.get("file_path"),
                "api_endpoint": extra_data.get("api_endpoint"),
                "headers": extra_data.get("headers", {}),
                "method": extra_data.get("method", "GET"),
                "body": extra_data.get("body"),
                "mock_data": extra_data.get("mock_data", extra_data.get("data")),
                "output_key": extra_data.get("output_key", "data"),
            })
        elif node_data.type == "filter":
            node_dict.update({
                "filter_type": extra_data.get("filter_type", "condition"),
                "input_key": extra_data.get("input_key"),
                "output_key": extra_data.get("output_key", "filtered"),
                "invert_filter": extra_data.get("invert_filter", False),
                "condition": extra_data.get("condition"),
                "regex_pattern": extra_data.get("regex_pattern"),
                "regex_field": extra_data.get("regex_field"),
                "jsonpath_query": extra_data.get("jsonpath_query"),
                "range_field": extra_data.get("range_field"),
                "min_value": extra_data.get("min_value"),
                "max_value": extra_data.get("max_value"),
                "allowed_types": extra_data.get("allowed_types"),
                "exists_field": extra_data.get("exists_field"),
                "exists_check": extra_data.get("exists_check", "exists"),
                "custom_function": extra_data.get("custom_function"),
            })
        elif node_data.type == "transform":
            node_dict.update({
                "transform_type": extra_data.get("transform_type", "markdown"),
                "input_key": extra_data.get("input_key"),
                "output_key": extra_data.get("output_key", "transformed"),
                "merge_keys": extra_data.get("merge_keys"),
                "filter_condition": extra_data.get("filter_condition"),
                "json_path": extra_data.get("json_path"),
                "regex_pattern": extra_data.get("regex_pattern"),
                "replacement": extra_data.get("replacement"),
                "markdown_format": extra_data.get("markdown_format", "plain"),
                "clean_operations": extra_data.get("clean_operations", []),
            })
        elif node_data.type == "aggregate":
            node_dict.update({
                "input_key": extra_data.get("input_key"),
                "output_key": extra_data.get("output_key", "aggregated"),
                "functions": extra_data.get("functions", []),
                "group_by": extra_data.get("group_by"),
                "field_mappings": extra_data.get("field_mappings", {}),
            })
        elif node_data.type == "join":
            node_dict.update({
                "join_type": extra_data.get("join_type", "inner"),
                "left_input_key": extra_data.get("left_input_key", "left"),
                "right_input_key": extra_data.get("right_input_key", "right"),
                "left_join_key": extra_data.get("left_join_key", "id"),
                "right_join_key": extra_data.get("right_join_key", "id"),
                "output_key": extra_data.get("output_key", "joined"),
                "select_fields": extra_data.get("select_fields"),
            })
        elif node_data.type == "union":
            node_dict.update({
                "input_keys": extra_data.get("input_keys", []),
                "output_key": extra_data.get("output_key", "unioned"),
                "union_mode": extra_data.get("union_mode", "distinct"),
                "align_fields": extra_data.get("align_fields", True),
            })
        elif node_data.type == "export":
            node_dict.update({
                "format": extra_data.get("format", "json"),
                "path_key": extra_data.get("filename", extra_data.get("path_key", "output.json")),
                "input_key": extra_data.get("input_key"),
                "include_metadata": extra_data.get("include_metadata", True),
                "pretty_print": extra_data.get("pretty_print", True),
                "include_timestamp": extra_data.get("include_timestamp", True),
                "csv_delimiter": extra_data.get("csv_delimiter", ","),
                "csv_headers": extra_data.get("csv_headers"),
                "md_title": extra_data.get("md_title"),
                "md_sections": extra_data.get("md_sections", []),
            })

        return node_dict

    def _analyze_data_flow(self, workflow: Workflow, nodes: Dict[str, BaseNode]) -> List[DataFlowConnection]:
        """Analyze data flow connections between nodes"""
        connections = []

        for edge in workflow.edges:
            source_node = nodes.get(edge.from_)
            target_node = nodes.get(edge.to)

            if not source_node or not target_node:
                continue

            # Create data flow connection
            connection = DataFlowConnection(
                source_node_id=edge.from_,
                target_node_id=edge.to,
                source_output_key=None,  # Default to all outputs
                target_input_key=None    # Default to merge into inputs
            )

            connections.append(connection)

        logger.info(f"Analyzed {len(connections)} data flow connections")
        return connections

    def _validate_and_order_workflow(self, workflow: Workflow, nodes: Dict[str, BaseNode]) -> List[str]:
        """Validate workflow and return execution order"""
        # Build adjacency list and indegree
        graph = defaultdict(list)
        indegree = {node_id: 0 for node_id in nodes}

        for edge in workflow.edges:
            graph[edge.from_].append(edge.to)
            indegree[edge.to] += 1

        # Topological sort using Kahn's algorithm
        queue = deque([node_id for node_id, degree in indegree.items() if degree == 0])
        execution_order = []

        while queue:
            node_id = queue.popleft()
            execution_order.append(node_id)

            for neighbor in graph[node_id]:
                indegree[neighbor] -= 1
                if indegree[neighbor] == 0:
                    queue.append(neighbor)

        # Check for cycles
        if len(execution_order) != len(nodes):
            raise ValueError("Workflow contains cycles")

        logger.info(f"Validated workflow with execution order: {execution_order}")
        return execution_order

    async def _execute_with_data_flow(
        self,
        workflow: Workflow,
        nodes: Dict[str, BaseNode],
        execution_order: List[str],
        data_connections: List[DataFlowConnection],
        context: WorkflowExecutionContext
    ) -> None:
        """Execute nodes with proper data flow management"""
        import time

        for node_id in execution_order:
            node = nodes[node_id]
            node_start_time = time.time()

            # Emit nodeStarted event
            self._emit_event("nodeStarted", {
                "node_id": node_id,
                "node_type": node.type,
                "execution_id": context.execution_id,
                "workflow_id": context.workflow_id,
                "timestamp": time.time()
            })

            try:
                # Prepare input data for this node
                node_inputs = self._prepare_node_inputs(node_id, data_connections, context)

                # Update node inputs
                node.inputs.update(node_inputs)

                # Prepare execution context
                execution_context = self._prepare_execution_context(workflow, context, node_id)

                # Execute node
                logger.info(f"Executing node {node_id} ({node.type})")
                node_result = await node.execute(execution_context)

                # Record execution result
                execution_time = time.time() - node_start_time
                result = ExecutionResult(
                    node_id=node_id,
                    success=True,
                    outputs=node_result if isinstance(node_result, dict) else {"result": node_result},
                    execution_time=execution_time,
                    metadata={"node_type": node.type, "node_name": getattr(node, 'name', 'Unknown')}
                )

                context.node_results[node_id] = result

                # Update data flow for downstream nodes
                self._update_downstream_data_flow(node_id, result.outputs, data_connections, context)

                # Emit nodeFinished event for success
                self._emit_event("nodeFinished", {
                    "node_id": node_id,
                    "node_type": node.type,
                    "execution_id": context.execution_id,
                    "workflow_id": context.workflow_id,
                    "success": True,
                    "execution_time": execution_time,
                    "outputs": result.outputs,
                    "timestamp": time.time()
                })

                logger.info(f"Node {node_id} executed successfully in {execution_time:.3f}s")

            except Exception as e:
                execution_time = time.time() - node_start_time
                error_msg = f"Node {node_id} execution failed: {str(e)}"
                logger.error(error_msg)

                # Record failed execution
                result = ExecutionResult(
                    node_id=node_id,
                    success=False,
                    outputs={},
                    execution_time=execution_time,
                    error=str(e),
                    metadata={"node_type": node.type, "node_name": getattr(node, 'name', 'Unknown')}
                )

                context.node_results[node_id] = result

                # Emit nodeFinished event for failure
                self._emit_event("nodeFinished", {
                    "node_id": node_id,
                    "node_type": node.type,
                    "execution_id": context.execution_id,
                    "workflow_id": context.workflow_id,
                    "success": False,
                    "execution_time": execution_time,
                    "error": str(e),
                    "timestamp": time.time()
                })

                # Continue execution but mark downstream nodes as affected
                self._handle_node_failure(node_id, data_connections, context)

    def _prepare_node_inputs(
        self,
        node_id: str,
        data_connections: List[DataFlowConnection],
        context: WorkflowExecutionContext
    ) -> Dict[str, Any]:
        """Prepare input data for a node based on data flow connections"""
        node_inputs = {}

        # Get all connections targeting this node
        target_connections = [
            conn for conn in data_connections
            if conn.target_node_id == node_id
        ]

        for connection in target_connections:
            source_result = context.node_results.get(connection.source_node_id)
            if source_result and source_result.success:
                if connection.source_output_key:
                    # Specific output key requested
                    if connection.source_output_key in source_result.outputs:
                        value = source_result.outputs[connection.source_output_key]
                        if connection.target_input_key:
                            node_inputs[connection.target_input_key] = value
                        else:
                            # Merge into inputs
                            if isinstance(value, dict):
                                node_inputs.update(value)
                            else:
                                node_inputs[connection.source_output_key] = value
                else:
                    # All outputs from source node
                    if connection.target_input_key:
                        node_inputs[connection.target_input_key] = source_result.outputs
                    else:
                        node_inputs.update(source_result.outputs)

        return node_inputs

    def _prepare_execution_context(
        self,
        workflow: Workflow,
        context: WorkflowExecutionContext,
        node_id: str
    ) -> Dict[str, Any]:
        """Prepare execution context for a node"""
        execution_context = context.global_context.copy()

        # Add execution options
        execution_context.update({
            "execution_options": context.execution_options,
            "workflow_id": context.workflow_id,
            "execution_id": context.execution_id,
            "node_id": node_id
        })

        # Add workflow execution data if available
        if hasattr(workflow, 'execution_data') and workflow.execution_data:
            execution_context.update(workflow.execution_data)

        return execution_context

    def _update_downstream_data_flow(
        self,
        source_node_id: str,
        outputs: Dict[str, Any],
        data_connections: List[DataFlowConnection],
        context: WorkflowExecutionContext
    ) -> None:
        """Update data flow information for downstream nodes"""
        # This could be enhanced to pre-calculate data availability
        # For now, we rely on the execution order to ensure data is available when needed
        pass

    def _handle_node_failure(
        self,
        failed_node_id: str,
        data_connections: List[DataFlowConnection],
        context: WorkflowExecutionContext
    ) -> None:
        """Handle node execution failure and propagate to downstream nodes"""
        # Mark downstream nodes as affected by failure
        downstream_connections = [
            conn for conn in data_connections
            if conn.source_node_id == failed_node_id
        ]

        for connection in downstream_connections:
            downstream_node_id = connection.target_node_id
            if downstream_node_id not in context.node_results:
                # Create a failure result for downstream node
                context.node_results[downstream_node_id] = ExecutionResult(
                    node_id=downstream_node_id,
                    success=False,
                    outputs={},
                    execution_time=0.0,
                    error=f"Upstream node {failed_node_id} failed",
                    metadata={"upstream_failure": failed_node_id}
                )

    def _prepare_execution_results(
        self,
        context: WorkflowExecutionContext,
        execution_order: List[str],
        total_execution_time: float
    ) -> Dict[str, Any]:
        """Prepare final execution results"""
        # Convert execution results to the expected format
        results = {}
        node_states = {}

        for node_id, exec_result in context.node_results.items():
            results[node_id] = {
                "success": exec_result.success,
                "outputs": exec_result.outputs,
                "execution_time": exec_result.execution_time,
                "error": exec_result.error,
                "metadata": exec_result.metadata
            }

        # Calculate overall success
        all_success = all(result.success for result in context.node_results.values())

        return {
            "success": all_success,
            "execution_id": context.execution_id,
            "execution_time": total_execution_time,
            "execution_order": execution_order,
            "results": results,
            "node_states": node_states,
            "data_flow_summary": {
                "total_connections": len(context.data_flow),
                "successful_executions": sum(1 for r in context.node_results.values() if r.success),
                "failed_executions": sum(1 for r in context.node_results.values() if not r.success)
            }
        }