from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime
import uuid
import logging
from ...dag_executor import DAGExecutor
from ...selectors import load_selectors
from ...providers import ProviderManager, GeminiDeepResearchProvider, PerplexityProvider
from ..models.workflow import Workflow, Run, Result
from .query_optimizer import QueryOptimizer, OptimizationLevel, get_query_optimizer

logger = logging.getLogger(__name__)

class WorkflowService:
    """
    Service for managing and executing workflows.
    """

    def __init__(self):
        self.dag_executor = DAGExecutor()
        # TODO: Replace with durable store (database)
        self.runs: Dict[str, Run] = {}
        self.results: Dict[str, Result] = {}
        self.selectors_registry = load_selectors()

        # Initialize provider manager
        self.provider_manager = ProviderManager()
        # Register providers (without API keys for now - they can be configured per request)
        self.provider_manager.register_provider("gemini", GeminiDeepResearchProvider())
        self.provider_manager.register_provider("perplexity", PerplexityProvider())

        # Initialize query optimizer
        self.query_optimizer = QueryOptimizer()

        # Initialize query optimizer
        self.query_optimizer = get_query_optimizer()

    async def execute_workflow(
        self,
        workflow: Workflow,
        execution_options: Optional[Dict[str, Any]] = None,
        validate_workflow: bool = True,
        enable_optimization: bool = True,
        optimization_level: OptimizationLevel = OptimizationLevel.STANDARD
    ) -> Tuple[str, Dict[str, Any]]:
        """
        Executes a workflow with enhanced monitoring and optional optimization, returns run ID and execution summary.

        Args:
            workflow: The workflow to execute.
            execution_options: Optional execution options (query, parameters, etc.)
            validate_workflow: Whether to validate workflow before execution
            enable_optimization: Whether to apply query optimization
            optimization_level: Level of optimization to apply

        Returns:
            Tuple of (run_id, execution_summary)
        """
        run_id = str(uuid.uuid4())

        # Validate workflow if requested
        if validate_workflow:
            validation_result = self._validate_workflow(workflow)
            if not validation_result["valid"]:
                raise ValueError(f"Workflow validation failed: {validation_result['errors']}")

        # Create run record
        run = Run(
            id=run_id,
            workflow_id=getattr(workflow, 'id', 'unknown'),
            status="running",
            started_at=datetime.now(),
            execution_options=execution_options or {}
        )
        self.runs[run_id] = run

        execution_summary = {
            "run_id": run_id,
            "workflow_id": getattr(workflow, 'id', 'unknown'),
            "status": "running",
            "started_at": run.started_at.isoformat(),
            "optimization_applied": False
        }

        optimization_plan = None

        try:
            logger.info(f"Starting workflow execution: {run_id}")

            # Convert workflow to dict for optimization
            workflow_dict = self._workflow_to_dict(workflow)

            # Apply query optimization if enabled
            if enable_optimization:
                try:
                    logger.info(f"Applying query optimization (level: {optimization_level.value})")
                    optimization_plan = await self.query_optimizer.optimize_query_graph(
                        query_graph=workflow_dict,
                        optimization_level=optimization_level,
                        schema=None,  # Could be passed in execution_options
                        business_rules=None,  # Could be passed in execution_options
                        enable_caching=True
                    )

                    if optimization_plan.validation_results['valid']:
                        # Use optimized workflow if available
                        if optimization_plan.optimized_graph != optimization_plan.original_graph:
                            workflow = self._dict_to_workflow(optimization_plan.optimized_graph)
                            execution_summary["optimization_applied"] = True
                            execution_summary["optimization_rules"] = optimization_plan.optimization_applied
                            logger.info(f"Applied optimization rules: {optimization_plan.optimization_applied}")
                        else:
                            logger.info("Optimization completed but no changes applied")
                    else:
                        logger.warning(f"Query optimization validation failed: {optimization_plan.validation_results['errors']}")
                        # Continue with original workflow

                except Exception as e:
                    logger.warning(f"Query optimization failed, continuing with original workflow: {str(e)}")
                    # Continue with original workflow if optimization fails

            # Prepare execution context with enhanced monitoring
            context = self._prepare_execution_context(execution_options or {})

            # Execute workflow using enhanced DAG executor
            execution_result = await self.dag_executor.execute_workflow(workflow, context)

            # Store results with enhanced metadata
            result = Result(
                id=str(uuid.uuid4()),
                run_id=run_id,
                workflow_id=getattr(workflow, 'id', 'unknown'),
                data=execution_result
            )
            self.results[result.id] = result

            # Update run with detailed results
            run.status = "completed" if execution_result.get("success", False) else "failed"
            run.completed_at = datetime.now()
            run.execution_order = execution_result.get("execution_order", [])
            run.node_results = execution_result.get("results", {})
            run.execution_time = execution_result.get("execution_time", 0)

            # Update execution summary
            execution_summary.update({
                "status": run.status,
                "completed_at": run.completed_at.isoformat(),
                "execution_time": run.execution_time,
                "success": execution_result.get("success", False),
                "execution_id": execution_result.get("execution_id"),
                "node_count": len(run.node_results),
                "successful_nodes": sum(1 for r in run.node_results.values() if r.get("success", False)),
                "failed_nodes": sum(1 for r in run.node_results.values() if not r.get("success", False)),
                "optimization_plan": optimization_plan.to_dict() if optimization_plan else None
            })

            logger.info(f"Workflow execution completed: {run_id} - {run.status}")

        except Exception as e:
            error_msg = f"Workflow execution failed: {str(e)}"
            logger.error(f"{error_msg} (run_id: {run_id})")

            run.status = "failed"
            run.completed_at = datetime.now()
            run.error = str(e)

            execution_summary.update({
                "status": "failed",
                "completed_at": run.completed_at.isoformat(),
                "error": str(e)
            })

        # Legacy method for backward compatibility
        async def execute_workflow_legacy(self, workflow: Workflow, execution_options: Optional[Dict[str, Any]] = None) -> str:
            """Legacy method that returns only run_id"""
            run_id, _ = await self.execute_workflow(workflow, execution_options)
            return run_id

        # Assign legacy method
        self.execute_workflow_legacy = execute_workflow_legacy.__get__(self, WorkflowService)

    async def get_execution_status(self, run_id: str) -> Optional[Dict[str, Any]]:
        """Get detailed execution status for a run"""
        run = self.get_run(run_id)
        if not run:
            return None

        results = self.get_results_for_run(run_id)

        return {
            "run_id": run.id,
            "workflow_id": run.workflow_id,
            "status": run.status,
            "started_at": run.started_at.isoformat() if run.started_at else None,
            "completed_at": run.completed_at.isoformat() if run.completed_at else None,
            "execution_time": run.execution_time,
            "execution_order": run.execution_order,
            "node_results": run.node_results,
            "error": run.error,
            "execution_options": run.execution_options,
            "result_count": len(results),
            "results": [result.data for result in results]
        }

    async def cancel_execution(self, run_id: str) -> bool:
        """Cancel a running execution (future enhancement)"""
        run = self.get_run(run_id)
        if not run or run.status not in ["running", "pending"]:
            return False

        # For now, just mark as cancelled
        # In the future, this would signal the DAG executor to stop
        run.status = "cancelled"
        run.completed_at = datetime.now()
        run.error = "Execution cancelled by user"

        logger.info(f"Execution cancelled: {run_id}")
        return True

    def get_workflow_stats(self) -> Dict[str, Any]:
        """Get workflow execution statistics"""
        total_runs = len(self.runs)
        completed_runs = sum(1 for run in self.runs.values() if run.status == "completed")
        failed_runs = sum(1 for run in self.runs.values() if run.status == "failed")
        running_runs = sum(1 for run in self.runs.values() if run.status == "running")

        total_execution_time = sum(run.execution_time or 0 for run in self.runs.values() if run.execution_time)

        return {
            "total_runs": total_runs,
            "completed_runs": completed_runs,
            "failed_runs": failed_runs,
            "running_runs": running_runs,
            "success_rate": completed_runs / total_runs if total_runs > 0 else 0,
            "average_execution_time": total_execution_time / completed_runs if completed_runs > 0 else 0,
            "total_results": len(self.results)
        }

    def _validate_workflow(self, workflow: Workflow) -> Dict[str, Any]:
        """Validate workflow structure and requirements"""
        errors = []
        warnings = []

        # Check required attributes
        if not hasattr(workflow, 'nodes') or not workflow.nodes:
            errors.append("Workflow must have at least one node")
        else:
            # Validate node types
            supported_types = self.dag_executor.node_classes.keys()
            for node in workflow.nodes:
                if node.type not in supported_types:
                    errors.append(f"Unsupported node type: {node.type}")

        # Check for edges if nodes exist
        if hasattr(workflow, 'edges') and workflow.edges:
            node_ids = {node.id for node in workflow.nodes}
            for edge in workflow.edges:
                if edge.from_ not in node_ids:
                    errors.append(f"Edge references non-existent source node: {edge.from_}")
                if edge.to not in node_ids:
                    errors.append(f"Edge references non-existent target node: {edge.to}")

        return {
            "valid": len(errors) == 0,
            "errors": errors,
            "warnings": warnings
        }

    def _prepare_execution_context(self, execution_options: Dict[str, Any]) -> Dict[str, Any]:
        """Prepare execution context with all necessary services and options"""
        return {
            "selectors_registry": self.selectors_registry,
            "provider_manager": self.provider_manager,
            "execution_options": execution_options,
            "timestamp": datetime.now().isoformat(),
            # TODO: Add page/browser context for dom_action nodes
            # TODO: Add caching layer for performance
            # TODO: Add monitoring and metrics collection
        }

    def get_run(self, run_id: str) -> Optional[Run]:
        """
        Gets a run by ID.

        Args:
            run_id: The run ID to check.

        Returns:
            The Run object if found, None otherwise.
        """
        return self.runs.get(run_id)

    def get_result(self, result_id: str) -> Optional[Result]:
        """
        Gets a result by ID.

        Args:
            result_id: The result ID to check.

        Returns:
            The Result object if found, None otherwise.
        """
        return self.results.get(result_id)

    def get_results_for_run(self, run_id: str) -> List[Result]:
        """
        Gets all results for a run.

        Args:
            run_id: The run ID.

        Returns:
            List of Result objects for the run.
        """
        return [result for result in self.results.values() if result.run_id == run_id]

    def _workflow_to_dict(self, workflow: Workflow) -> Dict[str, Any]:
        """Convert Workflow object to dictionary for optimization."""
        workflow_dict = {
            'id': getattr(workflow, 'id', None),
            'name': getattr(workflow, 'name', None),
            'description': getattr(workflow, 'description', None),
            'nodes': [],
            'edges': []
        }

        # Convert nodes
        if hasattr(workflow, 'nodes'):
            for node in workflow.nodes:
                node_dict = {
                    'id': node.id,
                    'type': getattr(node, 'type', None),
                    'data': getattr(node, 'data', {}) or {}
                }
                workflow_dict['nodes'].append(node_dict)

        # Convert edges
        if hasattr(workflow, 'edges'):
            for edge in workflow.edges:
                edge_dict = {
                    'id': getattr(edge, 'id', None),
                    'source': getattr(edge, 'from_', None),
                    'target': getattr(edge, 'to', None),
                    'sourceHandle': getattr(edge, 'source_handle', None),
                    'targetHandle': getattr(edge, 'target_handle', None)
                }
                workflow_dict['edges'].append(edge_dict)

        return workflow_dict

    def _dict_to_workflow(self, workflow_dict: Dict[str, Any]) -> Workflow:
        """Convert dictionary back to Workflow object."""
        from ..models.workflow import Node, Edge

        nodes = []
        for node_data in workflow_dict.get('nodes', []):
            node = Node(
                id=node_data['id'],
                type=node_data.get('type'),
                data=node_data.get('data', {}),
                created_at=datetime.now().isoformat(),
                updated_at=datetime.now().isoformat()
            )
            nodes.append(node)

        edges = []
        for edge_data in workflow_dict.get('edges', []):
            edge = Edge(
                id=edge_data.get('id', f"{edge_data.get('source')}_{edge_data.get('target')}"),
                from_=edge_data.get('source'),
                to=edge_data.get('target'),
                meta={
                    'sourceHandle': edge_data.get('sourceHandle'),
                    'targetHandle': edge_data.get('targetHandle')
                }
            )
            edges.append(edge)

        return Workflow(
            id=workflow_dict.get('id'),
            name=workflow_dict.get('name'),
            description=workflow_dict.get('description'),
            nodes=nodes,
            edges=edges
        )

    async def optimize_workflow(
        self,
        workflow: Workflow,
        optimization_level: OptimizationLevel = OptimizationLevel.STANDARD,
        schema: Optional[Dict[str, Any]] = None,
        business_rules: Optional[List[Dict[str, Any]]] = None
    ) -> Dict[str, Any]:
        """Optimize a workflow using the query optimizer."""
        try:
            workflow_dict = self._workflow_to_dict(workflow)

            optimization_result = await self.query_optimizer.optimize_query_graph(
                query_graph=workflow_dict,
                optimization_level=optimization_level,
                schema=schema,
                business_rules=business_rules,
                enable_caching=True
            )

            # Convert back to Workflow object if optimized
            if optimization_result.optimized_graph != optimization_result.original_graph:
                optimized_workflow = self._dict_to_workflow(optimization_result.optimized_graph)
                optimization_result.optimized_workflow = optimized_workflow

            return optimization_result.to_dict()

        except Exception as e:
            logger.error(f"Workflow optimization failed: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "original_workflow": workflow
            }

    async def validate_workflow_graph(
        self,
        workflow: Workflow,
        schema: Optional[Dict[str, Any]] = None,
        business_rules: Optional[List[Dict[str, Any]]] = None
    ) -> Dict[str, Any]:
        """Validate a workflow graph."""
        try:
            workflow_dict = self._workflow_to_dict(workflow)

            validation_result = self.query_optimizer.validate_query_graph(
                query_graph=workflow_dict,
                schema=schema,
                business_rules=business_rules
            )

            return validation_result

        except Exception as e:
            logger.error(f"Workflow validation failed: {str(e)}")
            return {
                "valid": False,
                "errors": [str(e)],
                "warnings": []
            }

    async def analyze_workflow_performance(
        self,
        run_id: str
    ) -> Dict[str, Any]:
        """Analyze performance of a completed workflow execution."""
        try:
            run = self.get_run(run_id)
            if not run or run.status != "completed":
                return {"error": "Run not found or not completed"}

            results = self.get_results_for_run(run_id)
            if not results:
                return {"error": "No results found for run"}

            # Get the execution result
            execution_result = results[0].data if results else {}

            # Profile the execution
            profile = await self.query_optimizer.profile_execution(
                execution_results=execution_result,
                execution_time=run.execution_time or 0
            )

            return profile

        except Exception as e:
            logger.error(f"Performance analysis failed: {str(e)}")
            return {"error": str(e)}

    def get_optimization_stats(self) -> Dict[str, Any]:
        """Get optimization statistics."""
        return {
            "cache_stats": self.query_optimizer.get_cache_stats(),
            "performance_trends": self.query_optimizer.get_performance_trends(hours=24),
            "workflow_stats": self.get_workflow_stats()
        }

    # TODO: Implement durable store for runs and results
    # TODO: Implement cursor-paged results retrieval

# Dependency injection provider
def get_workflow_service() -> WorkflowService:
    """
    Dependency injection provider for WorkflowService.
    """
    return WorkflowService()