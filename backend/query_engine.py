import asyncio
from typing import Dict, Any, Optional, List, Union, Set
from datetime import datetime
import json
import logging
from pathlib import Path
import time
import psutil
import os

from executor import WorkflowExecutor, ExecutionContext
from providers import ProviderManager, GeminiProvider, PerplexityProvider
from selectors import default_registry as selectors_registry

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class QueryEngine:
    """Enhanced query engine with node system integration"""

    def __init__(self):
        self.workflow_executor = WorkflowExecutor()
        self.provider_manager = ProviderManager()
        self.performance_monitor = PerformanceMonitor()
        self.graph_validator = GraphValidator()

        # Initialize default providers
        self._initialize_providers()

    def _initialize_providers(self):
        """Initialize AI providers"""
        try:
            # Initialize Gemini provider
            gemini_api_key = os.getenv("GEMINI_API_KEY")
            if gemini_api_key:
                gemini_provider = GeminiProvider(api_key=gemini_api_key)
                self.provider_manager.register_provider("gemini", gemini_provider, set_default=True)

            # Initialize Perplexity provider
            perplexity_api_key = os.getenv("PERPLEXITY_API_KEY")
            if perplexity_api_key:
                perplexity_provider = PerplexityProvider(api_key=perplexity_api_key)
                self.provider_manager.register_provider("perplexity", perplexity_provider)

        except Exception as e:
            logger.warning(f"Failed to initialize some providers: {str(e)}")

    async def execute_query(
        self,
        query: str,
        workflow_config: Optional[Dict[str, Any]] = None,
        execution_options: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Execute a query using the node system"""
        start_time = time.time()
        execution_id = f"exec_{int(start_time * 1000)}"

        try:
            # Use default workflow if none provided
            if not workflow_config:
                workflow_config = await self._create_default_workflow(query)

            # Validate workflow
            validation_result = self.graph_validator.validate_workflow(workflow_config)
            if not validation_result["valid"]:
                raise ValueError(f"Invalid workflow: {validation_result['errors']}")

            # Set up execution options
            if not execution_options:
                execution_options = {}

            execution_options.update({
                "execution_id": execution_id,
                "query": query,
                "start_time": datetime.now().isoformat()
            })

            # Execute workflow
            result = await self.workflow_executor.execute_workflow(
                workflow=workflow_config,
                on_state_change=self._on_execution_state_change,
                **execution_options
            )

            # Add performance metrics
            execution_time = time.time() - start_time
            result["performance"] = self.performance_monitor.get_metrics()
            result["execution_time"] = execution_time
            result["execution_id"] = execution_id

            logger.info(f"Query execution completed in {execution_time:.2f}s")
            return result

        except Exception as e:
            error_result = {
                "success": False,
                "error": str(e),
                "execution_id": execution_id,
                "execution_time": time.time() - start_time,
                "timestamp": datetime.now().isoformat()
            }
            logger.error(f"Query execution failed: {str(e)}")
            return error_result

    async def _create_default_workflow(self, query: str) -> Dict[str, Any]:
        """Create a default workflow for a query"""
        return {
            "name": f"Query Workflow: {query[:50]}...",
            "description": f"Automated workflow for query: {query}",
            "start_node": "research_node",
            "nodes": {
                "research_node": {
                    "name": "Research Query",
                    "type": "provider",
                    "provider_type": "gemini_deep_research",
                    "research_depth": "balanced",
                    "max_tokens": 3000,
                    "temperature": 0.3,
                    "next": "transform_node"
                },
                "transform_node": {
                    "name": "Transform Results",
                    "type": "transform",
                    "transform_type": "markdown",
                    "output_key": "formatted_content",
                    "next": "export_node"
                },
                "export_node": {
                    "name": "Export Results",
                    "type": "export",
                    "format": "md_yaml",
                    "path_key": f"research_output_{int(time.time())}.md",
                    "include_metadata": True
                }
            }
        }

    async def create_custom_workflow(
        self,
        nodes_config: Dict[str, Any],
        connections: List[Dict[str, str]],
        name: str = "Custom Workflow",
        description: str = ""
    ) -> Dict[str, Any]:
        """Create a custom workflow from node configurations"""
        try:
            # Build workflow structure
            workflow = {
                "name": name,
                "description": description,
                "start_node": nodes_config.get("start_node", list(nodes_config.keys())[0] if nodes_config else None),
                "nodes": nodes_config,
                "connections": connections,
                "created_at": datetime.now().isoformat()
            }

            # Validate workflow
            validation_result = self.graph_validator.validate_workflow(workflow)
            if not validation_result["valid"]:
                return {
                    "success": False,
                    "error": "Invalid workflow structure",
                    "validation_errors": validation_result["errors"]
                }

            # Save workflow
            await self._save_workflow(workflow)

            return {
                "success": True,
                "workflow": workflow,
                "validation": validation_result
            }

        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }

    async def validate_workflow_graph(
        self,
        workflow: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Validate workflow graph structure and dependencies"""
        return self.graph_validator.validate_workflow(workflow)

    async def get_provider_status(self) -> Dict[str, Any]:
        """Get status of all providers"""
        try:
            # Test all providers
            validation_results = await self.provider_manager.validate_all_providers()

            # Get usage statistics
            usage_stats = self.provider_manager.get_all_usage_stats()

            return {
                "providers": validation_results,
                "usage_stats": usage_stats,
                "default_provider": self.provider_manager.default_provider
            }

        except Exception as e:
            return {
                "error": str(e),
                "providers": {},
                "usage_stats": {}
            }

    async def get_execution_history(
        self,
        limit: int = 10,
        include_details: bool = False
    ) -> Dict[str, Any]:
        """Get execution history"""
        try:
            history_file = Path("execution_history.json")

            if not history_file.exists():
                return {"executions": [], "total": 0}

            with open(history_file, 'r') as f:
                history_data = json.load(f)

            executions = history_data.get("executions", [])

            # Sort by timestamp (newest first)
            executions.sort(key=lambda x: x.get("timestamp", ""), reverse=True)

            # Apply limit
            if limit > 0:
                executions = executions[:limit]

            # Include details if requested
            if not include_details:
                # Return summary only
                executions = [{
                    "execution_id": exec.get("execution_id"),
                    "timestamp": exec.get("timestamp"),
                    "success": exec.get("success", False),
                    "execution_time": exec.get("execution_time"),
                    "workflow_name": exec.get("workflow", {}).get("name", "Unknown")
                } for exec in executions]

            return {
                "executions": executions,
                "total": len(history_data.get("executions", []))
            }

        except Exception as e:
            return {
                "error": str(e),
                "executions": [],
                "total": 0
            }

    async def optimize_workflow(
        self,
        workflow: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Optimize workflow for better performance"""
        try:
            optimization_result = {
                "original_workflow": workflow,
                "optimizations": [],
                "performance_improvements": [],
                "optimized_workflow": None
            }

            # Analyze node dependencies
            dependency_analysis = self._analyze_dependencies(workflow)
            optimization_result["optimizations"].append({
                "type": "dependency_analysis",
                "description": "Analyzed node dependencies",
                "details": dependency_analysis
            })

            # Identify parallel execution opportunities
            parallel_opportunities = self._find_parallel_opportunities(workflow)
            if parallel_opportunities:
                optimization_result["optimizations"].append({
                    "type": "parallel_execution",
                    "description": "Identified opportunities for parallel execution",
                    "details": parallel_opportunities
                })

            # Optimize node ordering
            optimized_workflow = self._optimize_node_order(workflow, dependency_analysis)
            optimization_result["optimized_workflow"] = optimized_workflow

            # Estimate performance improvement
            original_estimate = self._estimate_execution_time(workflow)
            optimized_estimate = self._estimate_execution_time(optimized_workflow)

            if optimized_estimate < original_estimate:
                improvement = (original_estimate - optimized_estimate) / original_estimate * 100
                optimization_result["performance_improvements"].append({
                    "type": "execution_time",
                    "description": f"Estimated {improvement:.1f}% reduction in execution time",
                    "original_estimate": original_estimate,
                    "optimized_estimate": optimized_estimate
                })

            return optimization_result

        except Exception as e:
            return {
                "error": str(e),
                "original_workflow": workflow
            }

    def _on_execution_state_change(self, state: str, context: Dict[str, Any]):
        """Handle execution state changes"""
        logger.info(f"Execution state changed to: {state}")

        # Log performance metrics
        self.performance_monitor.record_state_change(state, context)

    async def _save_workflow(self, workflow: Dict[str, Any]):
        """Save workflow to disk"""
        workflows_dir = Path("workflows")
        workflows_dir.mkdir(exist_ok=True)

        workflow_file = workflows_dir / f"workflow_{int(time.time())}.json"

        with open(workflow_file, 'w') as f:
            json.dump(workflow, f, indent=2, default=str)

    def _analyze_dependencies(self, workflow: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze node dependencies in workflow"""
        nodes = workflow.get("nodes", {})
        dependencies = {}

        for node_id, node_config in nodes.items():
            node_deps = []

            # Check input dependencies
            if "inputs" in node_config:
                for input_key, input_value in node_config["inputs"].items():
                    if isinstance(input_value, str) and input_value.startswith("output."):
                        # This input depends on another node's output
                        source_node = input_value.split(".")[1]
                        node_deps.append(source_node)

            dependencies[node_id] = {
                "depends_on": node_deps,
                "used_by": []
            }

        # Build reverse dependencies
        for node_id, deps in dependencies.items():
            for dep in deps["depends_on"]:
                if dep in dependencies:
                    dependencies[dep]["used_by"].append(node_id)

        return dependencies

    def _find_parallel_opportunities(self, workflow: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Find opportunities for parallel execution"""
        dependencies = self._analyze_dependencies(workflow)
        opportunities = []

        for node_id, node_deps in dependencies.items():
            if not node_deps["depends_on"]:
                # This node has no dependencies - could be parallel candidate
                parallel_group = self._find_parallel_group(node_id, dependencies)
                if len(parallel_group) > 1:
                    opportunities.append({
                        "nodes": parallel_group,
                        "reason": "No dependencies - can execute in parallel"
                    })

        return opportunities

    def _find_parallel_group(self, start_node: str, dependencies: Dict[str, Any]) -> List[str]:
        """Find a group of nodes that can execute in parallel"""
        parallel_group = [start_node]
        candidates = [start_node]

        while candidates:
            current = candidates.pop(0)
            current_deps = dependencies.get(current, {})

            # Look for nodes that this node depends on
            for dep in current_deps.get("depends_on", []):
                if dep not in parallel_group:
                    parallel_group.append(dep)
                    candidates.append(dep)

        return parallel_group

    def _optimize_node_order(self, workflow: Dict[str, Any], dependencies: Dict[str, Any]) -> Dict[str, Any]:
        """Optimize node execution order"""
        optimized = workflow.copy()

        # Topological sort to optimize order
        visited = set()
        temp_visited = set()
        order = []

        def visit(node_id):
            if node_id in temp_visited:
                return  # Skip if already being processed
            if node_id in visited:
                return  # Skip if already processed

            temp_visited.add(node_id)

            # Visit dependencies first
            node_deps = dependencies.get(node_id, {})
            for dep in node_deps.get("depends_on", []):
                visit(dep)

            temp_visited.remove(node_id)
            visited.add(node_id)
            order.append(node_id)

        # Visit all nodes
        for node_id in workflow.get("nodes", {}):
            visit(node_id)

        # Reorder nodes in optimized workflow
        optimized_nodes = {}
        for node_id in order:
            if node_id in workflow.get("nodes", {}):
                optimized_nodes[node_id] = workflow["nodes"][node_id]

        optimized["nodes"] = optimized_nodes

        return optimized

    def _estimate_execution_time(self, workflow: Dict[str, Any]) -> float:
        """Estimate execution time for workflow"""
        nodes = workflow.get("nodes", {})
        estimated_time = 0

        for node_config in nodes.values():
            node_type = node_config.get("type", "")

            # Base time estimates by node type
            base_times = {
                "dom_action": 2.0,
                "prompt": 3.0,
                "provider": 5.0,
                "transform": 0.5,
                "export": 0.3,
                "condition": 0.1
            }

            estimated_time += base_times.get(node_type, 1.0)

        return estimated_time


class GraphValidator:
    """Validates workflow graphs"""

    def __init__(self):
        self.errors: List[str] = []
        self.warnings: List[str] = []

    def validate_workflow(self, workflow: Dict[str, Any]) -> Dict[str, Any]:
        """Validate complete workflow"""
        self.errors = []
        self.warnings = []

        if not isinstance(workflow, dict):
            self.errors.append("Workflow must be a dictionary")
            return self._get_validation_result()

        # Validate required fields
        required_fields = ["nodes", "start_node"]
        for field in required_fields:
            if field not in workflow:
                self.errors.append(f"Missing required field: {field}")

        if self.errors:
            return self._get_validation_result()

        # Validate nodes
        nodes = workflow.get("nodes", {})
        if not nodes:
            self.errors.append("Workflow must contain at least one node")
            return self._get_validation_result()

        # Validate start node
        start_node = workflow.get("start_node")
        if start_node not in nodes:
            self.errors.append(f"Start node '{start_node}' not found in nodes")

        # Validate each node
        for node_id, node_config in nodes.items():
            self._validate_node(node_id, node_config)

        # Validate connections
        self._validate_connections(workflow)

        # Check for cycles
        self._check_cycles(workflow)

        return self._get_validation_result()

    def _validate_node(self, node_id: str, node_config: Dict[str, Any]):
        """Validate individual node"""
        required_fields = ["name", "type"]
        for field in required_fields:
            if field not in node_config:
                self.errors.append(f"Node {node_id}: missing required field '{field}'")

        # Validate node type
        node_type = node_config.get("type")
        if node_type:
            valid_types = ["dom_action", "prompt", "provider", "transform", "export", "condition"]
            if node_type not in valid_types:
                self.errors.append(f"Node {node_id}: invalid node type '{node_type}'")

        # Validate node-specific fields
        if node_type == "dom_action":
            self._validate_dom_action_node(node_id, node_config)
        elif node_type == "provider":
            self._validate_provider_node(node_id, node_config)
        elif node_type == "condition":
            self._validate_condition_node(node_id, node_config)

    def _validate_dom_action_node(self, node_id: str, node_config: Dict[str, Any]):
        """Validate DOM action node"""
        if "selector_key" not in node_config:
            self.errors.append(f"Node {node_id}: missing selector_key")
        if "action" not in node_config:
            self.errors.append(f"Node {node_id}: missing action")

    def _validate_provider_node(self, node_id: str, node_config: Dict[str, Any]):
        """Validate provider node"""
        if "provider_type" not in node_config:
            self.errors.append(f"Node {node_id}: missing provider_type")

        provider_type = node_config.get("provider_type")
        valid_providers = ["gemini_deep_research", "gemini_canvas", "perplexity"]
        if provider_type and provider_type not in valid_providers:
            self.errors.append(f"Node {node_id}: invalid provider_type '{provider_type}'")

    def _validate_condition_node(self, node_id: str, node_config: Dict[str, Any]):
        """Validate condition node"""
        if "expr" not in node_config:
            self.errors.append(f"Node {node_id}: missing expr")

    def _validate_connections(self, workflow: Dict[str, Any]):
        """Validate node connections"""
        nodes = workflow.get("nodes", {})
        node_connections = {}

        # Build connection map
        for node_id, node_config in nodes.items():
            if "next" in node_config:
                next_node = node_config["next"]
                if isinstance(next_node, list):
                    node_connections[node_id] = next_node
                else:
                    node_connections[node_id] = [next_node] if next_node else []

        # Check that all referenced nodes exist
        for node_id, connections in node_connections.items():
            for connected_node in connections:
                if connected_node and connected_node not in nodes:
                    self.errors.append(
                        f"Node {node_id}: references non-existent node '{connected_node}'"
                    )

    def _check_cycles(self, workflow: Dict[str, Any]):
        """Check for cycles in workflow graph"""
        nodes = workflow.get("nodes", {})
        visited = set()
        rec_stack = set()

        def has_cycle(node_id):
            if node_id in rec_stack:
                return True
            if node_id in visited:
                return False

            visited.add(node_id)
            rec_stack.add(node_id)

            # Check all outgoing connections
            node_config = nodes.get(node_id, {})
            next_node = node_config.get("next")

            if next_node:
                if isinstance(next_node, list):
                    connections = next_node
                else:
                    connections = [next_node]

                for connected_node in connections:
                    if connected_node and has_cycle(connected_node):
                        return True

            rec_stack.remove(node_id)
            return False

        # Check all nodes for cycles
        for node_id in nodes:
            if has_cycle(node_id):
                self.errors.append(f"Cycle detected involving node {node_id}")

    def _get_validation_result(self) -> Dict[str, Any]:
        """Get validation result"""
        return {
            "valid": len(self.errors) == 0,
            "errors": self.errors,
            "warnings": self.warnings
        }


class PerformanceMonitor:
    """Monitor performance metrics"""

    def __init__(self):
        self.metrics: Dict[str, Any] = {
            "start_time": None,
            "end_time": None,
            "state_changes": [],
            "memory_usage": [],
            "cpu_usage": []
        }

    def start_monitoring(self):
        """Start performance monitoring"""
        self.metrics["start_time"] = datetime.now()
        self._record_system_metrics()

    def stop_monitoring(self):
        """Stop performance monitoring"""
        self.metrics["end_time"] = datetime.now()
        self._record_system_metrics()

    def record_state_change(self, state: str, context: Dict[str, Any]):
        """Record state change"""
        self.metrics["state_changes"].append({
            "state": state,
            "timestamp": datetime.now().isoformat(),
            "context": context
        })
        self._record_system_metrics()

    def _record_system_metrics(self):
        """Record system performance metrics"""
        try:
            process = psutil.Process()
            self.metrics["memory_usage"].append({
                "timestamp": datetime.now().isoformat(),
                "memory_mb": process.memory_info().rss / 1024 / 1024
            })

            self.metrics["cpu_usage"].append({
                "timestamp": datetime.now().isoformat(),
                "cpu_percent": process.cpu_percent()
            })
        except Exception:
            # Silently handle metrics recording failures
            pass

    def get_metrics(self) -> Dict[str, Any]:
        """Get performance metrics"""
        if self.metrics["start_time"] and self.metrics["end_time"]:
            duration = (self.metrics["end_time"] - self.metrics["start_time"]).total_seconds()
            self.metrics["duration_seconds"] = duration

        return self.metrics.copy()