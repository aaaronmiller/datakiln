"""
Query Optimization and Validation System
Provides comprehensive optimization, validation, and performance analysis for workflow graphs.
"""

import asyncio
import json
import time
import hashlib
from typing import Dict, List, Any, Optional, Tuple, Set, Union
from datetime import datetime, timedelta
from dataclasses import dataclass, field
from enum import Enum
import logging
from collections import defaultdict, deque

logger = logging.getLogger(__name__)

class OptimizationLevel(Enum):
    """Optimization levels for different use cases."""
    BASIC = "basic"  # Simple reordering and basic validations
    STANDARD = "standard"  # Cost-based optimization and caching
    ADVANCED = "advanced"  # Full optimization with ML-based predictions
    AGGRESSIVE = "aggressive"  # Maximum optimization with potential trade-offs

class NodeExecutionCost:
    """Represents the execution cost of a node."""
    def __init__(self, node_id: str, node_type: str, estimated_time: float = 0.0,
                 cpu_cost: float = 0.0, memory_cost: float = 0.0, io_cost: float = 0.0):
        self.node_id = node_id
        self.node_type = node_type
        self.estimated_time = estimated_time
        self.cpu_cost = cpu_cost
        self.memory_cost = memory_cost
        self.io_cost = io_cost
        self.total_cost = estimated_time + cpu_cost + memory_cost + io_cost

    def to_dict(self) -> Dict[str, Any]:
        return {
            'node_id': self.node_id,
            'node_type': self.node_type,
            'estimated_time': self.estimated_time,
            'cpu_cost': self.cpu_cost,
            'memory_cost': self.memory_cost,
            'io_cost': self.io_cost,
            'total_cost': self.total_cost
        }

@dataclass
class QueryExecutionPlan:
    """Represents an optimized execution plan for a query graph."""
    original_graph: Dict[str, Any]
    optimized_graph: Dict[str, Any]
    execution_order: List[List[str]]
    cost_analysis: Dict[str, NodeExecutionCost]
    optimization_applied: List[str]
    estimated_total_time: float
    estimated_total_cost: float
    validation_results: Dict[str, Any]
    performance_projections: Dict[str, Any]
    cache_hits: List[str] = field(default_factory=list)
    bottlenecks_identified: List[Dict[str, Any]] = field(default_factory=list)
    created_at: datetime = field(default_factory=datetime.now)

    def to_dict(self) -> Dict[str, Any]:
        return {
            'original_graph': self.original_graph,
            'optimized_graph': self.optimized_graph,
            'execution_order': self.execution_order,
            'cost_analysis': {k: v.to_dict() for k, v in self.cost_analysis.items()},
            'optimization_applied': self.optimization_applied,
            'estimated_total_time': self.estimated_total_time,
            'estimated_total_cost': self.estimated_total_cost,
            'validation_results': self.validation_results,
            'performance_projections': self.performance_projections,
            'cache_hits': self.cache_hits,
            'bottlenecks_identified': self.bottlenecks_identified,
            'created_at': self.created_at.isoformat()
        }

class QueryGraphAnalyzer:
    """Analyzes query graph structure and dependencies."""

    def __init__(self):
        self.node_cost_estimates = {
            'dataSource': {'time': 2.0, 'cpu': 0.5, 'memory': 1.0, 'io': 2.0},
            'filter': {'time': 0.5, 'cpu': 0.3, 'memory': 0.2, 'io': 0.1},
            'transform': {'time': 1.0, 'cpu': 0.8, 'memory': 0.5, 'io': 0.2},
            'aggregate': {'time': 1.5, 'cpu': 1.0, 'memory': 0.8, 'io': 0.3},
            'join': {'time': 3.0, 'cpu': 2.0, 'memory': 2.0, 'io': 1.0},
            'union': {'time': 1.0, 'cpu': 0.5, 'memory': 0.3, 'io': 0.2},
            'provider': {'time': 5.0, 'cpu': 1.0, 'memory': 1.5, 'io': 0.5},
            'dom_action': {'time': 2.0, 'cpu': 0.5, 'memory': 0.5, 'io': 1.0},
            'export': {'time': 0.3, 'cpu': 0.1, 'memory': 0.1, 'io': 2.0},
            'condition': {'time': 0.1, 'cpu': 0.05, 'memory': 0.05, 'io': 0.0}
        }

    def analyze_graph(self, query_graph: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze the structure and properties of a query graph."""
        nodes = query_graph.get('nodes', [])
        edges = query_graph.get('edges', [])

        analysis = {
            'node_count': len(nodes),
            'edge_count': len(edges),
            'node_types': defaultdict(int),
            'connectivity': self._analyze_connectivity(nodes, edges),
            'dependencies': self._build_dependency_graph(nodes, edges),
            'parallel_opportunities': self._find_parallel_opportunities(nodes, edges),
            'estimated_complexity': self._estimate_complexity(nodes, edges),
            'data_flow_patterns': self._analyze_data_flow_patterns(nodes, edges)
        }

        # Count node types
        for node in nodes:
            node_type = node.get('type', 'unknown')
            analysis['node_types'][node_type] += 1

        return analysis

    def _analyze_connectivity(self, nodes: List[Dict[str, Any]], edges: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Analyze graph connectivity properties."""
        node_ids = {node['id'] for node in nodes}
        connected_nodes = set()

        for edge in edges:
            connected_nodes.add(edge.get('source', ''))
            connected_nodes.add(edge.get('target', ''))

        return {
            'total_nodes': len(node_ids),
            'connected_nodes': len(connected_nodes),
            'isolated_nodes': len(node_ids - connected_nodes),
            'connectivity_ratio': len(connected_nodes) / len(node_ids) if node_ids else 0
        }

    def _build_dependency_graph(self, nodes: List[Dict[str, Any]], edges: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Build a dependency graph for topological analysis."""
        graph = defaultdict(list)
        reverse_graph = defaultdict(list)

        for edge in edges:
            source = edge.get('source')
            target = edge.get('target')
            if source and target:
                graph[source].append(target)
                reverse_graph[target].append(source)

        return {
            'forward_dependencies': dict(graph),
            'reverse_dependencies': dict(reverse_graph),
            'has_cycles': self._detect_cycles(graph)
        }

    def _detect_cycles(self, graph: Dict[str, List[str]]) -> bool:
        """Detect cycles in the dependency graph."""
        visited = set()
        rec_stack = set()

        def has_cycle(node: str) -> bool:
            visited.add(node)
            rec_stack.add(node)

            for neighbor in graph.get(node, []):
                if neighbor not in visited:
                    if has_cycle(neighbor):
                        return True
                elif neighbor in rec_stack:
                    return True

            rec_stack.remove(node)
            return False

        for node in graph:
            if node not in visited:
                if has_cycle(node):
                    return True
        return False

    def _find_parallel_opportunities(self, nodes: List[Dict[str, Any]], edges: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Find opportunities for parallel execution."""
        opportunities = []
        node_inputs = defaultdict(list)
        node_outputs = defaultdict(list)

        for edge in edges:
            source = edge.get('source')
            target = edge.get('target')
            if source and target:
                node_outputs[source].append(target)
                node_inputs[target].append(source)

        # Find nodes with no dependencies (can run in parallel)
        independent_nodes = []
        for node in nodes:
            node_id = node['id']
            if not node_inputs[node_id]:
                independent_nodes.append(node_id)

        if len(independent_nodes) > 1:
            opportunities.append({
                'type': 'independent_nodes',
                'nodes': independent_nodes,
                'description': f'{len(independent_nodes)} nodes can execute in parallel'
            })

        return opportunities

    def _estimate_complexity(self, nodes: List[Dict[str, Any]], edges: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Estimate the computational complexity of the graph."""
        complexity_score = 0
        complexity_factors = {
            'node_count': len(nodes) * 0.1,
            'edge_count': len(edges) * 0.2,
            'branching_factor': self._calculate_branching_factor(edges),
            'data_transformation_complexity': self._estimate_transformation_complexity(nodes)
        }

        complexity_score = sum(complexity_factors.values())

        return {
            'score': complexity_score,
            'factors': complexity_factors,
            'complexity_class': self._classify_complexity(complexity_score)
        }

    def _calculate_branching_factor(self, edges: List[Dict[str, Any]]) -> float:
        """Calculate the average branching factor of the graph."""
        if not edges:
            return 0

        source_counts = defaultdict(int)
        for edge in edges:
            source = edge.get('source')
            if source:
                source_counts[source] += 1

        if not source_counts:
            return 0

        avg_branching = sum(source_counts.values()) / len(source_counts)
        return avg_branching

    def _estimate_transformation_complexity(self, nodes: List[Dict[str, Any]]) -> float:
        """Estimate complexity based on transformation operations."""
        complexity_map = {
            'join': 3.0,
            'aggregate': 2.0,
            'transform': 1.5,
            'filter': 1.0,
            'provider': 2.5,
            'dataSource': 0.5
        }

        total_complexity = 0
        for node in nodes:
            node_type = node.get('type', 'unknown')
            total_complexity += complexity_map.get(node_type, 1.0)

        return total_complexity

    def _classify_complexity(self, score: float) -> str:
        """Classify complexity based on score."""
        if score < 5:
            return 'simple'
        elif score < 15:
            return 'moderate'
        elif score < 30:
            return 'complex'
        else:
            return 'very_complex'

    def _analyze_data_flow_patterns(self, nodes: List[Dict[str, Any]], edges: List[Dict[str, Any]]) -> List[str]:
        """Analyze data flow patterns in the graph."""
        patterns = []

        # Check for linear flow
        if self._is_linear_flow(edges):
            patterns.append('linear_flow')

        # Check for fan-out patterns
        if self._has_fan_out_pattern(edges):
            patterns.append('fan_out')

        # Check for fan-in patterns
        if self._has_fan_in_pattern(edges):
            patterns.append('fan_in')

        # Check for diamond patterns (conditional branching)
        if self._has_diamond_pattern(nodes, edges):
            patterns.append('conditional_branching')

        return patterns

    def _is_linear_flow(self, edges: List[Dict[str, Any]]) -> bool:
        """Check if the graph represents a linear flow."""
        if not edges:
            return True

        # Build adjacency list
        outgoing = defaultdict(list)
        incoming = defaultdict(list)

        for edge in edges:
            source = edge.get('source')
            target = edge.get('target')
            if source and target:
                outgoing[source].append(target)
                incoming[target].append(source)

        # Check if each node has at most one outgoing and one incoming edge
        for node_id in set(list(outgoing.keys()) + list(incoming.keys())):
            if len(outgoing[node_id]) > 1 or len(incoming[node_id]) > 1:
                return False

        return True

    def _has_fan_out_pattern(self, edges: List[Dict[str, Any]]) -> bool:
        """Check for fan-out patterns (one node feeding multiple others)."""
        outgoing_counts = defaultdict(int)
        for edge in edges:
            source = edge.get('source')
            if source:
                outgoing_counts[source] += 1

        return any(count > 1 for count in outgoing_counts.values())

    def _has_fan_in_pattern(self, edges: List[Dict[str, Any]]) -> bool:
        """Check for fan-in patterns (multiple nodes feeding one)."""
        incoming_counts = defaultdict(int)
        for edge in edges:
            target = edge.get('target')
            if target:
                incoming_counts[target] += 1

        return any(count > 1 for count in incoming_counts.values())

    def _has_diamond_pattern(self, nodes: List[Dict[str, Any]], edges: List[Dict[str, Any]]) -> bool:
        """Check for diamond patterns (conditional logic)."""
        condition_nodes = [node for node in nodes if node.get('type') == 'condition']
        return len(condition_nodes) > 0

class CostBasedOptimizer:
    """Performs cost-based optimization of query execution plans."""

    def __init__(self, graph_analyzer: QueryGraphAnalyzer):
        self.graph_analyzer = graph_analyzer
        self.cost_history = {}  # Cache for cost calculations

    def optimize_execution_order(self, query_graph: Dict[str, Any], optimization_level: OptimizationLevel = OptimizationLevel.STANDARD) -> Tuple[List[List[str]], Dict[str, NodeExecutionCost]]:
        """Optimize the execution order of nodes based on cost analysis."""
        nodes = query_graph.get('nodes', [])
        edges = query_graph.get('edges', [])

        # Calculate costs for all nodes
        node_costs = self._calculate_node_costs(nodes)

        # Build dependency graph
        dependencies = self.graph_analyzer._build_dependency_graph(nodes, edges)

        if dependencies.get('has_cycles', False):
            logger.warning("Graph contains cycles, using basic topological sort")
            execution_order = self._topological_sort(nodes, edges)
        else:
            execution_order = self._cost_based_sort(nodes, edges, node_costs, optimization_level)

        return execution_order, node_costs

    def _calculate_node_costs(self, nodes: List[Dict[str, Any]]) -> Dict[str, NodeExecutionCost]:
        """Calculate execution costs for all nodes."""
        node_costs = {}

        for node in nodes:
            node_id = node['id']
            node_type = node.get('type', 'unknown')

            # Get base cost estimates
            base_costs = self.graph_analyzer.node_cost_estimates.get(node_type, {
                'time': 1.0, 'cpu': 0.5, 'memory': 0.5, 'io': 0.5
            })

            # Adjust costs based on node configuration
            adjusted_costs = self._adjust_costs_based_on_config(node, base_costs)

            cost = NodeExecutionCost(
                node_id=node_id,
                node_type=node_type,
                estimated_time=adjusted_costs['time'],
                cpu_cost=adjusted_costs['cpu'],
                memory_cost=adjusted_costs['memory'],
                io_cost=adjusted_costs['io']
            )

            node_costs[node_id] = cost

        return node_costs

    def _adjust_costs_based_on_config(self, node: Dict[str, Any], base_costs: Dict[str, float]) -> Dict[str, float]:
        """Adjust base costs based on node configuration."""
        adjusted = base_costs.copy()
        node_data = node.get('data', {})

        # Adjust for data size/complexity
        if 'source' in node_data:
            # Data source nodes - adjust based on data size hints
            if 'large' in str(node_data).lower():
                adjusted['time'] *= 2.0
                adjusted['memory'] *= 1.5
                adjusted['io'] *= 2.0

        # Adjust for transformation complexity
        if node.get('type') == 'transform' and 'transformation' in node_data:
            transformation = str(node_data['transformation']).lower()
            if 'complex' in transformation or 'multiple' in transformation:
                adjusted['time'] *= 1.5
                adjusted['cpu'] *= 1.3

        # Adjust for join complexity
        if node.get('type') == 'join':
            join_type = node_data.get('joinType', 'inner')
            if join_type in ['left', 'right', 'full']:
                adjusted['time'] *= 1.2
                adjusted['memory'] *= 1.3

        # Adjust for provider nodes based on model size
        if node.get('type') == 'provider':
            model = node_data.get('model', '').lower()
            if 'large' in model or 'gpt-4' in model:
                adjusted['time'] *= 2.0
                adjusted['cpu'] *= 1.5

        return adjusted

    def _topological_sort(self, nodes: List[Dict[str, Any]], edges: List[Dict[str, Any]]) -> List[List[str]]:
        """Perform basic topological sort for execution ordering."""
        # Build adjacency list
        graph = defaultdict(list)
        in_degree = defaultdict(int)

        node_ids = {node['id'] for node in nodes}
        for node_id in node_ids:
            in_degree[node_id] = 0

        for edge in edges:
            source = edge.get('source')
            target = edge.get('target')
            if source and target and source in node_ids and target in node_ids:
                graph[source].append(target)
                in_degree[target] += 1

        # Kahn's algorithm
        queue = deque([node for node in in_degree if in_degree[node] == 0])
        result = []

        while queue:
            level = []
            for _ in range(len(queue)):
                node = queue.popleft()
                level.append(node)

                for neighbor in graph[node]:
                    in_degree[neighbor] -= 1
                    if in_degree[neighbor] == 0:
                        queue.append(neighbor)

            if level:
                result.append(level)

        return result

    def _cost_based_sort(self, nodes: List[Dict[str, Any]], edges: List[Dict[str, Any]],
                        node_costs: Dict[str, NodeExecutionCost], optimization_level: OptimizationLevel) -> List[List[str]]:
        """Perform cost-based topological sort."""
        # For now, use basic topological sort with cost hints
        # Advanced optimization would consider cost trade-offs
        basic_order = self._topological_sort(nodes, edges)

        if optimization_level in [OptimizationLevel.ADVANCED, OptimizationLevel.AGGRESSIVE]:
            # Apply cost-based reordering within levels
            basic_order = self._optimize_within_levels(basic_order, node_costs)

        return basic_order

    def _optimize_within_levels(self, execution_order: List[List[str]], node_costs: Dict[str, NodeExecutionCost]) -> List[List[str]]:
        """Optimize node ordering within execution levels based on cost."""
        optimized_order = []

        for level in execution_order:
            if len(level) <= 1:
                optimized_order.append(level)
                continue

            # Sort nodes in level by total cost (cheapest first for parallel execution)
            level_sorted = sorted(level, key=lambda node_id: node_costs.get(node_id, NodeExecutionCost(node_id, 'unknown')).total_cost)
            optimized_order.append(level_sorted)

        return optimized_order

class QueryValidator:
    """Validates query graphs against schemas and business rules."""

    def __init__(self):
        self.validation_rules = {
            'node_required_fields': self._validate_node_required_fields,
            'edge_validity': self._validate_edge_validity,
            'schema_compatibility': self._validate_schema_compatibility,
            'business_rules': self._validate_business_rules,
            'data_type_consistency': self._validate_data_type_consistency,
            'cycle_detection': self._validate_no_cycles
        }

    def validate_query_graph(self, query_graph: Dict[str, Any], schema: Optional[Dict[str, Any]] = None,
                           business_rules: Optional[List[Dict[str, Any]]] = None) -> Dict[str, Any]:
        """Comprehensive validation of a query graph."""
        validation_results = {
            'valid': True,
            'errors': [],
            'warnings': [],
            'rule_results': {}
        }

        # Run all validation rules
        for rule_name, rule_func in self.validation_rules.items():
            try:
                rule_result = rule_func(query_graph, schema, business_rules)
                validation_results['rule_results'][rule_name] = rule_result

                if rule_result.get('errors'):
                    validation_results['errors'].extend(rule_result['errors'])
                    validation_results['valid'] = False

                if rule_result.get('warnings'):
                    validation_results['warnings'].extend(rule_result['warnings'])

            except Exception as e:
                error_msg = f"Validation rule '{rule_name}' failed: {str(e)}"
                validation_results['errors'].append(error_msg)
                validation_results['valid'] = False
                logger.error(error_msg)

        return validation_results

    def _validate_node_required_fields(self, query_graph: Dict[str, Any], schema: Optional[Dict[str, Any]] = None,
                                     business_rules: Optional[List[Dict[str, Any]]] = None) -> Dict[str, Any]:
        """Validate that all nodes have required fields."""
        errors = []
        warnings = []

        nodes = query_graph.get('nodes', [])
        required_fields = ['id', 'type']

        for node in nodes:
            node_id = node.get('id', 'unknown')

            for field in required_fields:
                if field not in node:
                    errors.append(f"Node {node_id}: missing required field '{field}'")

            # Validate node type
            node_type = node.get('type')
            if node_type:
                valid_types = ['dataSource', 'filter', 'transform', 'aggregate', 'join', 'union',
                             'provider', 'dom_action', 'export', 'condition', 'ml', 'nlp', 'validation']
                if node_type not in valid_types:
                    warnings.append(f"Node {node_id}: unknown node type '{node_type}'")

        return {'errors': errors, 'warnings': warnings}

    def _validate_edge_validity(self, query_graph: Dict[str, Any], schema: Optional[Dict[str, Any]] = None,
                               business_rules: Optional[List[Dict[str, Any]]] = None) -> Dict[str, Any]:
        """Validate edge connections."""
        errors = []
        warnings = []

        nodes = query_graph.get('nodes', [])
        edges = query_graph.get('edges', [])

        node_ids = {node['id'] for node in nodes}

        for edge in edges:
            source = edge.get('source')
            target = edge.get('target')

            if not source:
                errors.append("Edge missing source node")
                continue

            if not target:
                errors.append("Edge missing target node")
                continue

            if source not in node_ids:
                errors.append(f"Edge source '{source}' not found in nodes")

            if target not in node_ids:
                errors.append(f"Edge target '{target}' not found in nodes")

            # Check for self-loops
            if source == target:
                warnings.append(f"Edge creates self-loop on node '{source}'")

        return {'errors': errors, 'warnings': warnings}

    def _validate_schema_compatibility(self, query_graph: Dict[str, Any], schema: Optional[Dict[str, Any]] = None,
                                     business_rules: Optional[List[Dict[str, Any]]] = None) -> Dict[str, Any]:
        """Validate schema compatibility between connected nodes."""
        errors = []
        warnings = []

        if not schema:
            return {'errors': errors, 'warnings': warnings}

        nodes = query_graph.get('nodes', [])
        edges = query_graph.get('edges', [])

        # Build node output schemas
        node_schemas = {}
        for node in nodes:
            node_id = node['id']
            node_type = node.get('type')
            node_data = node.get('data', {})

            # Infer output schema based on node type and configuration
            output_schema = self._infer_node_output_schema(node_type, node_data, schema)
            node_schemas[node_id] = output_schema

        # Validate schema compatibility along edges
        for edge in edges:
            source = edge.get('source')
            target = edge.get('target')

            if source in node_schemas and target in node_schemas:
                source_schema = node_schemas[source]
                target_schema = node_schemas[target]

                compatibility = self._check_schema_compatibility(source_schema, target_schema)
                if not compatibility['compatible']:
                    errors.append(f"Schema incompatibility between {source} and {target}: {compatibility['reason']}")

        return {'errors': errors, 'warnings': warnings}

    def _infer_node_output_schema(self, node_type: str, node_data: Dict[str, Any], global_schema: Dict[str, Any]) -> Dict[str, Any]:
        """Infer the output schema of a node."""
        # Simplified schema inference - in practice this would be more sophisticated
        if node_type == 'dataSource':
            source = node_data.get('source')
            if source and source in global_schema.get('tables', {}):
                return global_schema['tables'][source]
            return {'type': 'unknown'}

        elif node_type in ['filter', 'transform']:
            # Assume schema preservation with possible modifications
            return {'type': 'derived', 'preserves_input_schema': True}

        elif node_type == 'aggregate':
            # Aggregation typically changes schema
            return {'type': 'aggregated', 'fields': ['count', 'sum', 'avg', 'min', 'max']}

        elif node_type == 'join':
            # Join combines schemas
            return {'type': 'joined', 'combined_fields': True}

        else:
            return {'type': 'unknown'}

    def _check_schema_compatibility(self, source_schema: Dict[str, Any], target_schema: Dict[str, Any]) -> Dict[str, Any]:
        """Check if two schemas are compatible for data flow."""
        # Simplified compatibility check
        source_type = source_schema.get('type', 'unknown')
        target_type = target_schema.get('type', 'unknown')

        if source_type == 'unknown' or target_type == 'unknown':
            return {'compatible': True, 'reason': 'Unknown schema types'}

        if target_schema.get('preserves_input_schema'):
            return {'compatible': True, 'reason': 'Target preserves input schema'}

        # For now, assume compatibility unless we have specific incompatibility rules
        return {'compatible': True, 'reason': 'Schemas assumed compatible'}

    def _validate_business_rules(self, query_graph: Dict[str, Any], schema: Optional[Dict[str, Any]] = None,
                               business_rules: Optional[List[Dict[str, Any]]] = None) -> Dict[str, Any]:
        """Validate against business rules."""
        errors = []
        warnings = []

        if not business_rules:
            return {'errors': errors, 'warnings': warnings}

        nodes = query_graph.get('nodes', [])

        for rule in business_rules:
            rule_type = rule.get('type')
            rule_config = rule.get('config', {})

            if rule_type == 'max_nodes_per_type':
                self._validate_max_nodes_per_type(nodes, rule_config, errors, warnings)
            elif rule_type == 'required_node_sequence':
                self._validate_required_sequence(nodes, query_graph.get('edges', []), rule_config, errors, warnings)
            elif rule_type == 'forbidden_node_combinations':
                self._validate_forbidden_combinations(nodes, rule_config, errors, warnings)

        return {'errors': errors, 'warnings': warnings}

    def _validate_max_nodes_per_type(self, nodes: List[Dict[str, Any]], rule_config: Dict[str, Any],
                                   errors: List[str], warnings: List[str]):
        """Validate maximum number of nodes per type."""
        node_counts = defaultdict(int)
        for node in nodes:
            node_type = node.get('type', 'unknown')
            node_counts[node_type] += 1

        for node_type, max_count in rule_config.items():
            if node_counts[node_type] > max_count:
                errors.append(f"Too many {node_type} nodes: {node_counts[node_type]} > {max_count}")

    def _validate_required_sequence(self, nodes: List[Dict[str, Any]], edges: List[Dict[str, Any]],
                                  rule_config: Dict[str, Any], errors: List[str], warnings: List[str]):
        """Validate required node sequences."""
        # Simplified sequence validation
        required_sequence = rule_config.get('sequence', [])
        if not required_sequence:
            return

        # Check if required node types exist in sequence
        node_types = [node.get('type') for node in nodes]
        for required_type in required_sequence:
            if required_type not in node_types:
                warnings.append(f"Required node type '{required_type}' not found in workflow")

    def _validate_forbidden_combinations(self, nodes: List[Dict[str, Any]], rule_config: Dict[str, Any],
                                       errors: List[str], warnings: List[str]):
        """Validate forbidden node combinations."""
        node_types = {node.get('type') for node in nodes}

        for combination in rule_config.get('combinations', []):
            if set(combination).issubset(node_types):
                errors.append(f"Forbidden node combination detected: {combination}")

    def _validate_data_type_consistency(self, query_graph: Dict[str, Any], schema: Optional[Dict[str, Any]] = None,
                                      business_rules: Optional[List[Dict[str, Any]]] = None) -> Dict[str, Any]:
        """Validate data type consistency across the graph."""
        errors = []
        warnings = []

        # Simplified data type validation
        # In practice, this would track data types through the graph

        nodes = query_graph.get('nodes', [])
        for node in nodes:
            node_type = node.get('type')
            node_data = node.get('data', {})

            if node_type == 'filter':
                condition = node_data.get('condition', '')
                # Basic validation of filter conditions
                if condition and not self._is_valid_condition_syntax(condition):
                    warnings.append(f"Node {node['id']}: potentially invalid filter condition syntax")

        return {'errors': errors, 'warnings': warnings}

    def _is_valid_condition_syntax(self, condition: str) -> bool:
        """Basic syntax validation for filter conditions."""
        # Very basic validation - in practice this would be more sophisticated
        if not condition.strip():
            return False

        # Check for balanced parentheses
        paren_count = 0
        for char in condition:
            if char == '(':
                paren_count += 1
            elif char == ')':
                paren_count -= 1
                if paren_count < 0:
                    return False

        return paren_count == 0

    def _validate_no_cycles(self, query_graph: Dict[str, Any], schema: Optional[Dict[str, Any]] = None,
                          business_rules: Optional[List[Dict[str, Any]]] = None) -> Dict[str, Any]:
        """Validate that the graph has no cycles."""
        errors = []
        warnings = []

        edges = query_graph.get('edges', [])

        # Build adjacency list
        graph = defaultdict(list)
        for edge in edges:
            source = edge.get('source')
            target = edge.get('target')
            if source and target:
                graph[source].append(target)

        # Detect cycles using DFS
        visited = set()
        rec_stack = set()

        def has_cycle(node: str) -> bool:
            visited.add(node)
            rec_stack.add(node)

            for neighbor in graph.get(node, []):
                if neighbor not in visited:
                    if has_cycle(neighbor):
                        return True
                elif neighbor in rec_stack:
                    return True

            rec_stack.remove(node)
            return False

        for node in graph:
            if node not in visited:
                if has_cycle(node):
                    errors.append("Query graph contains cycles")
                    break

        return {'errors': errors, 'warnings': warnings}

class PerformanceProfiler:
    """Profiles query execution performance and identifies bottlenecks."""

    def __init__(self):
        self.execution_history: List[Dict[str, Any]] = []

    def profile_execution(self, execution_results: Dict[str, Any], execution_time: float) -> Dict[str, Any]:
        """Profile the performance of a query execution."""
        profile = {
            'total_execution_time': execution_time,
            'node_performance': {},
            'bottlenecks': [],
            'optimization_suggestions': [],
            'performance_score': 0.0
        }

        # Analyze individual node performance
        results = execution_results.get('results', {})
        for node_id, node_result in results.items():
            node_profile = self._analyze_node_performance(node_id, node_result)
            profile['node_performance'][node_id] = node_profile

        # Identify bottlenecks
        profile['bottlenecks'] = self._identify_bottlenecks(profile['node_performance'], execution_time)

        # Generate optimization suggestions
        profile['optimization_suggestions'] = self._generate_optimization_suggestions(profile['bottlenecks'], execution_results)

        # Calculate overall performance score
        profile['performance_score'] = self._calculate_performance_score(profile)

        # Store in history for trend analysis
        self._store_execution_profile(profile)

        return profile

    def _analyze_node_performance(self, node_id: str, node_result: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze performance of a single node."""
        execution_time = node_result.get('execution_time', 0)
        status = node_result.get('status', 'unknown')
        error = node_result.get('error')

        analysis = {
            'node_id': node_id,
            'execution_time': execution_time,
            'status': status,
            'error': error,
            'efficiency_score': 0.0,
            'resource_usage': {}
        }

        # Calculate efficiency score based on node type and execution time
        node_type = node_result.get('node_type', 'unknown')
        expected_time = self._get_expected_execution_time(node_type)

        if expected_time > 0:
            if execution_time <= expected_time:
                analysis['efficiency_score'] = 1.0
            else:
                analysis['efficiency_score'] = expected_time / execution_time

        # Estimate resource usage
        analysis['resource_usage'] = self._estimate_resource_usage(node_type, execution_time)

        return analysis

    def _get_expected_execution_time(self, node_type: str) -> float:
        """Get expected execution time for a node type."""
        expected_times = {
            'dataSource': 2.0,
            'filter': 0.5,
            'transform': 1.0,
            'aggregate': 1.5,
            'join': 3.0,
            'union': 1.0,
            'provider': 5.0,
            'dom_action': 2.0,
            'export': 0.3,
            'condition': 0.1
        }
        return expected_times.get(node_type, 1.0)

    def _estimate_resource_usage(self, node_type: str, execution_time: float) -> Dict[str, float]:
        """Estimate resource usage for a node."""
        base_usage = {
            'cpu_percent': 10.0,
            'memory_mb': 50.0,
            'io_operations': 100.0
        }

        # Adjust based on node type
        multipliers = {
            'dataSource': {'cpu': 0.8, 'memory': 1.5, 'io': 2.0},
            'join': {'cpu': 2.0, 'memory': 3.0, 'io': 1.5},
            'aggregate': {'cpu': 1.5, 'memory': 2.0, 'io': 1.0},
            'provider': {'cpu': 1.2, 'memory': 2.5, 'io': 0.5}
        }

        if node_type in multipliers:
            mult = multipliers[node_type]
            base_usage['cpu_percent'] *= mult['cpu']
            base_usage['memory_mb'] *= mult['memory']
            base_usage['io_operations'] *= mult['io']

        # Scale by execution time
        time_factor = max(0.1, execution_time / self._get_expected_execution_time(node_type))
        for key in base_usage:
            base_usage[key] *= time_factor

        return base_usage

    def _identify_bottlenecks(self, node_performance: Dict[str, Any], total_execution_time: float) -> List[Dict[str, Any]]:
        """Identify performance bottlenecks."""
        bottlenecks = []

        # Check for slow nodes
        for node_id, perf in node_performance.items():
            execution_time = perf.get('execution_time', 0)
            if execution_time > 5.0:  # Slow node threshold
                bottlenecks.append({
                    'type': 'slow_node',
                    'node_id': node_id,
                    'severity': 'high' if execution_time > 10.0 else 'medium',
                    'description': f"Node {node_id} execution time ({execution_time:.2f}s) exceeds threshold",
                    'impact': execution_time / total_execution_time if total_execution_time > 0 else 0
                })

        # Check for high memory usage
        total_memory = sum(perf.get('resource_usage', {}).get('memory_mb', 0) for perf in node_performance.values())
        if total_memory > 1000:  # Arbitrary threshold
            bottlenecks.append({
                'type': 'high_memory_usage',
                'severity': 'high',
                'description': f"Total memory usage ({total_memory:.0f}MB) is high",
                'impact': 0.8
            })

        return bottlenecks

    def _generate_optimization_suggestions(self, bottlenecks: List[Dict[str, Any]], execution_results: Dict[str, Any]) -> List[str]:
        """Generate optimization suggestions based on identified bottlenecks."""
        suggestions = []

        for bottleneck in bottlenecks:
            bottleneck_type = bottleneck.get('type')

            if bottleneck_type == 'slow_node':
                node_id = bottleneck.get('node_id')
                suggestions.append(f"Consider optimizing node {node_id} - execution time is too high")
                suggestions.append(f"Check if node {node_id} can be cached or parallelized")

            elif bottleneck_type == 'high_memory_usage':
                suggestions.append("Consider reducing memory usage through data streaming or pagination")
                suggestions.append("Review data structures for memory optimization opportunities")

        # General suggestions
        if not bottlenecks:
            suggestions.append("Execution performance is good - consider monitoring for regressions")

        return suggestions

    def _calculate_performance_score(self, profile: Dict[str, Any]) -> float:
        """Calculate an overall performance score (0-100)."""
        base_score = 100.0

        # Penalize for bottlenecks
        bottlenecks = profile.get('bottlenecks', [])
        for bottleneck in bottlenecks:
            severity = bottleneck.get('severity', 'low')
            impact = bottleneck.get('impact', 0)

            penalty = 0
            if severity == 'high':
                penalty = 20 * impact
            elif severity == 'medium':
                penalty = 10 * impact
            else:
                penalty = 5 * impact

            base_score -= penalty

        # Penalize for low efficiency scores
        node_performance = profile.get('node_performance', {})
        avg_efficiency = sum(perf.get('efficiency_score', 0) for perf in node_performance.values()) / len(node_performance) if node_performance else 1.0

        if avg_efficiency < 0.7:
            base_score -= 15

        return max(0.0, min(100.0, base_score))

    def _store_execution_profile(self, profile: Dict[str, Any]):
        """Store execution profile for trend analysis."""
        profile_entry = {
            'timestamp': datetime.now().isoformat(),
            'profile': profile
        }

        self.execution_history.append(profile_entry)

        # Keep only last 100 entries
        if len(self.execution_history) > 100:
            self.execution_history = self.execution_history[-100:]

    def get_performance_trends(self, hours: int = 24) -> Dict[str, Any]:
        """Get performance trends over the specified time period."""
        cutoff_time = datetime.now() - timedelta(hours=hours)

        recent_profiles = [
            entry for entry in self.execution_history
            if datetime.fromisoformat(entry['timestamp']) > cutoff_time
        ]

        if not recent_profiles:
            return {'error': 'No recent performance data available'}

        trends = {
            'period_hours': hours,
            'total_executions': len(recent_profiles),
            'avg_execution_time': sum(p['profile']['total_execution_time'] for p in recent_profiles) / len(recent_profiles),
            'avg_performance_score': sum(p['profile']['performance_score'] for p in recent_profiles) / len(recent_profiles),
            'performance_trend': self._calculate_trend(recent_profiles)
        }

        return trends

    def _calculate_trend(self, profiles: List[Dict[str, Any]]) -> str:
        """Calculate performance trend."""
        if len(profiles) < 2:
            return 'insufficient_data'

        # Simple trend calculation based on performance scores
        scores = [p['profile']['performance_score'] for p in profiles]
        first_half = scores[:len(scores)//2]
        second_half = scores[len(scores)//2:]

        avg_first = sum(first_half) / len(first_half) if first_half else 0
        avg_second = sum(second_half) / len(second_half) if second_half else 0

        if avg_second > avg_first + 5:
            return 'improving'
        elif avg_first > avg_second + 5:
            return 'degrading'
        else:
            return 'stable'

class QueryRewriter:
    """Applies query rewriting and transformation rules."""

    def __init__(self):
        self.rewrite_rules = {
            'filter_pushdown': self._apply_filter_pushdown,
            'projection_pushdown': self._apply_projection_pushdown,
            'join_reordering': self._apply_join_reordering,
            'constant_folding': self._apply_constant_folding,
            'dead_code_elimination': self._apply_dead_code_elimination
        }

    def rewrite_query_graph(self, query_graph: Dict[str, Any], optimization_level: OptimizationLevel = OptimizationLevel.STANDARD) -> Tuple[Dict[str, Any], List[str]]:
        """Apply query rewriting rules to optimize the graph."""
        rewritten_graph = query_graph.copy()
        applied_rules = []

        # Apply rules based on optimization level
        rules_to_apply = []
        if optimization_level == OptimizationLevel.BASIC:
            rules_to_apply = ['constant_folding', 'dead_code_elimination']
        elif optimization_level == OptimizationLevel.STANDARD:
            rules_to_apply = ['filter_pushdown', 'constant_folding', 'dead_code_elimination']
        elif optimization_level in [OptimizationLevel.ADVANCED, OptimizationLevel.AGGRESSIVE]:
            rules_to_apply = list(self.rewrite_rules.keys())

        for rule_name in rules_to_apply:
            if rule_name in self.rewrite_rules:
                try:
                    rule_func = self.rewrite_rules[rule_name]
                    modified, rule_applied = rule_func(rewritten_graph)
                    if modified:
                        rewritten_graph = modified
                        applied_rules.append(rule_name)
                        logger.info(f"Applied rewrite rule: {rule_name}")
                except Exception as e:
                    logger.warning(f"Failed to apply rewrite rule {rule_name}: {str(e)}")

        return rewritten_graph, applied_rules

    def _apply_filter_pushdown(self, query_graph: Dict[str, Any]) -> Tuple[Optional[Dict[str, Any]], bool]:
        """Push filter conditions closer to data sources."""
        nodes = query_graph.get('nodes', [])
        edges = query_graph.get('edges', [])

        # Find filter nodes and their data sources
        filter_nodes = [node for node in nodes if node.get('type') == 'filter']

        if not filter_nodes:
            return None, False

        # For each filter, check if it can be pushed to a data source
        modified = False
        for filter_node in filter_nodes:
            filter_id = filter_node['id']
            filter_condition = filter_node.get('data', {}).get('condition', '')

            # Find data sources that feed into this filter
            source_data_nodes = self._find_upstream_nodes(filter_id, edges, nodes, ['dataSource'])

            if source_data_nodes:
                # Check if the data source supports filtering
                for source_node in source_data_nodes:
                    if self._can_push_filter_to_source(source_node, filter_condition):
                        # Modify the data source to include the filter condition
                        if 'data' not in source_node:
                            source_node['data'] = {}
                        if 'filters' not in source_node['data']:
                            source_node['data']['filters'] = []
                        source_node['data']['filters'].append(filter_condition)

                        # Mark filter node for removal (or modification)
                        filter_node['data']['pushed_down'] = True
                        modified = True
                        break

        if modified:
            # Remove or modify pushed-down filter nodes
            updated_nodes = []
            for node in nodes:
                if node.get('type') == 'filter' and node.get('data', {}).get('pushed_down'):
                    # Could remove the node entirely or convert to pass-through
                    continue
                updated_nodes.append(node)

            updated_graph = query_graph.copy()
            updated_graph['nodes'] = updated_nodes
            return updated_graph, True

        return None, False

    def _find_upstream_nodes(self, node_id: str, edges: List[Dict[str, Any]], nodes: List[Dict[str, Any]],
                           node_types: List[str]) -> List[Dict[str, Any]]:
        """Find upstream nodes of specific types."""
        upstream_nodes = []
        node_map = {node['id']: node for node in nodes}

        # Find edges that target this node
        incoming_edges = [edge for edge in edges if edge.get('target') == node_id]

        for edge in incoming_edges:
            source_id = edge.get('source')
            if source_id and source_id in node_map:
                source_node = node_map[source_id]
                if source_node.get('type') in node_types:
                    upstream_nodes.append(source_node)
                else:
                    # Recursively find upstream nodes
                    upstream_nodes.extend(self._find_upstream_nodes(source_id, edges, nodes, node_types))

        return upstream_nodes

    def _can_push_filter_to_source(self, source_node: Dict[str, Any], filter_condition: str) -> bool:
        """Check if a filter can be pushed to a data source."""
        source_type = source_node.get('data', {}).get('source_type', '')

        # For now, assume filters can be pushed to database sources
        if source_type in ['postgresql', 'mysql', 'sqlite', 'mongodb']:
            return True

        # For API sources, check if they support filtering
        if source_type == 'api':
            return source_node.get('data', {}).get('supports_filtering', False)

        return False

    def _apply_projection_pushdown(self, query_graph: Dict[str, Any]) -> Tuple[Optional[Dict[str, Any]], bool]:
        """Push projection operations closer to data sources."""
        nodes = query_graph.get('nodes', [])
        modified = False

        # Find transform nodes that only select columns
        for node in nodes:
            if node.get('type') == 'transform':
                transformation = node.get('data', {}).get('transformation', '').lower()
                if 'select' in transformation or 'project' in transformation:
                    # Find upstream data sources
                    source_nodes = self._find_upstream_nodes(node['id'], query_graph.get('edges', []), nodes, ['dataSource'])
                    for source_node in source_nodes:
                        if 'data' not in source_node:
                            source_node['data'] = {}
                        if 'projections' not in source_node['data']:
                            source_node['data']['projections'] = []
                        source_node['data']['projections'].append(transformation)
                        node['data']['pushed_down'] = True
                        modified = True
                        break

        if modified:
            updated_graph = query_graph.copy()
            return updated_graph, True

        return None, False

    def _apply_join_reordering(self, query_graph: Dict[str, Any]) -> Tuple[Optional[Dict[str, Any]], bool]:
        """Reorder joins for better performance."""
        nodes = query_graph.get('nodes', [])
        edges = query_graph.get('edges', [])

        join_nodes = [node for node in nodes if node.get('type') == 'join']
        if len(join_nodes) < 2:
            return None, False

        # For multiple joins, reorder based on estimated table sizes
        # This is a simplified version - real implementation would be much more complex
        modified = False
        for join_node in join_nodes:
            # Check if join order can be optimized
            join_condition = join_node.get('data', {}).get('join_condition', '')
            if 'large' in join_condition.lower():
                # Move large table joins earlier
                join_node['data']['priority'] = 'high'
                modified = True

        if modified:
            updated_graph = query_graph.copy()
            return updated_graph, True

        return None, False

    def _apply_constant_folding(self, query_graph: Dict[str, Any]) -> Tuple[Optional[Dict[str, Any]], bool]:
        """Fold constant expressions."""
        nodes = query_graph.get('nodes', [])
        modified = False

        for node in nodes:
            if node.get('type') == 'transform':
                transformation = node.get('data', {}).get('transformation', '')
                # Simple constant folding for basic arithmetic
                if ' + ' in transformation or ' - ' in transformation:
                    try:
                        # Evaluate simple expressions
                        result = eval(transformation.replace('add_field:', '').strip())
                        node['data']['transformation'] = f"constant:{result}"
                        modified = True
                    except:
                        pass

        if modified:
            updated_graph = query_graph.copy()
            return updated_graph, True

        return None, False

    def _apply_dead_code_elimination(self, query_graph: Dict[str, Any]) -> Tuple[Optional[Dict[str, Any]], bool]:
        """Eliminate unreachable or unnecessary code."""
        nodes = query_graph.get('nodes', [])
        edges = query_graph.get('edges', [])

        # Find nodes that don't contribute to final output
        reachable_nodes = set()
        output_nodes = [node for node in nodes if node.get('type') in ['export', 'output']]

        # Start from output nodes and work backwards
        for output_node in output_nodes:
            self._mark_reachable(output_node['id'], edges, reachable_nodes)

        if len(reachable_nodes) < len(nodes):
            # Remove unreachable nodes
            updated_nodes = [node for node in nodes if node['id'] in reachable_nodes]
            updated_graph = query_graph.copy()
            updated_graph['nodes'] = updated_nodes
            return updated_graph, True

        return None, False

    def _mark_reachable(self, node_id: str, edges: List[Dict[str, Any]], reachable: Set[str]):
        """Mark nodes as reachable from the given node."""
        if node_id in reachable:
            return

        reachable.add(node_id)

        # Find upstream nodes
        incoming_edges = [edge for edge in edges if edge.get('target') == node_id]
        for edge in incoming_edges:
            source_id = edge.get('source')
            if source_id:
                self._mark_reachable(source_id, edges, reachable)

class QueryCache:
    """Caching system for repeated query patterns."""

    def __init__(self, max_cache_size: int = 1000, ttl_seconds: int = 3600):
        self.cache: Dict[str, Dict[str, Any]] = {}
        self.max_cache_size = max_cache_size
        self.ttl_seconds = ttl_seconds
        self.access_times: Dict[str, datetime] = {}

    def get_cache_key(self, query_graph: Dict[str, Any]) -> str:
        """Generate a cache key for a query graph."""
        # Create a normalized representation of the graph
        normalized = self._normalize_query_graph(query_graph)
        key_data = json.dumps(normalized, sort_keys=True)
        return hashlib.md5(key_data.encode()).hexdigest()

    def _normalize_query_graph(self, query_graph: Dict[str, Any]) -> Dict[str, Any]:
        """Normalize query graph for consistent caching."""
        normalized = {
            'nodes': [],
            'edges': []
        }

        # Normalize nodes (remove runtime-specific data)
        for node in query_graph.get('nodes', []):
            normalized_node = {
                'id': node['id'],
                'type': node.get('type'),
                'data': {}
            }

            # Include only structural data, not runtime data
            node_data = node.get('data', {})
            for key, value in node_data.items():
                if key not in ['execution_time', 'result', 'status', 'start_time', 'end_time']:
                    normalized_node['data'][key] = value

            normalized['nodes'].append(normalized_node)

        # Normalize edges
        for edge in query_graph.get('edges', []):
            normalized_edge = {
                'source': edge.get('source'),
                'target': edge.get('target'),
                'sourceHandle': edge.get('sourceHandle'),
                'targetHandle': edge.get('targetHandle')
            }
            normalized['edges'].append(normalized_edge)

        # Sort for consistency
        normalized['nodes'].sort(key=lambda x: x['id'])
        normalized['edges'].sort(key=lambda x: (x['source'], x['target']))

        return normalized

    def get(self, cache_key: str) -> Optional[Dict[str, Any]]:
        """Retrieve cached result."""
        if cache_key not in self.cache:
            return None

        cached_item = self.cache[cache_key]

        # Check TTL
        cached_time = cached_item.get('timestamp')
        if cached_time:
            age = (datetime.now() - datetime.fromisoformat(cached_time)).total_seconds()
            if age > self.ttl_seconds:
                del self.cache[cache_key]
                del self.access_times[cache_key]
                return None

        # Update access time
        self.access_times[cache_key] = datetime.now()

        return cached_item.get('result')

    def put(self, cache_key: str, result: Dict[str, Any]):
        """Store result in cache."""
        # Evict old entries if cache is full
        if len(self.cache) >= self.max_cache_size:
            self._evict_oldest()

        self.cache[cache_key] = {
            'result': result,
            'timestamp': datetime.now().isoformat()
        }
        self.access_times[cache_key] = datetime.now()

    def _evict_oldest(self):
        """Evict the least recently accessed items."""
        if not self.access_times:
            return

        # Find oldest access time
        oldest_key = min(self.access_times.keys(), key=lambda k: self.access_times[k])

        del self.cache[oldest_key]
        del self.access_times[oldest_key]

    def clear(self):
        """Clear all cached results."""
        self.cache.clear()
        self.access_times.clear()

    def get_stats(self) -> Dict[str, Any]:
        """Get cache statistics."""
        total_size = len(self.cache)
        hit_rate = 0.0  # Would need to track hits/misses for this

        return {
            'total_entries': total_size,
            'max_size': self.max_cache_size,
            'ttl_seconds': self.ttl_seconds,
            'utilization_percent': (total_size / self.max_cache_size) * 100
        }

class QueryOptimizer:
    """Main query optimization and validation system."""

    def __init__(self):
        self.graph_analyzer = QueryGraphAnalyzer()
        self.cost_optimizer = CostBasedOptimizer(self.graph_analyzer)
        self.validator = QueryValidator()
        self.profiler = PerformanceProfiler()
        self.rewriter = QueryRewriter()
        self.cache = QueryCache()

    async def optimize_query_graph(
        self,
        query_graph: Dict[str, Any],
        optimization_level: OptimizationLevel = OptimizationLevel.STANDARD,
        schema: Optional[Dict[str, Any]] = None,
        business_rules: Optional[List[Dict[str, Any]]] = None,
        enable_caching: bool = True
    ) -> QueryExecutionPlan:
        """Optimize and validate a query graph."""
        start_time = time.time()

        # Check cache first
        cache_key = None
        cached_result = None
        if enable_caching:
            cache_key = self.cache.get_cache_key(query_graph)
            cached_result = self.cache.get(cache_key)

        if cached_result:
            logger.info(f"Cache hit for query graph")
            cached_plan = QueryExecutionPlan(**cached_result)
            cached_plan.cache_hits = [cache_key]
            return cached_plan

        # Step 1: Analyze the graph
        graph_analysis = self.graph_analyzer.analyze_graph(query_graph)

        # Step 2: Validate the graph
        validation_results = self.validator.validate_query_graph(query_graph, schema, business_rules)

        if not validation_results['valid']:
            # Return plan with validation errors
            return QueryExecutionPlan(
                original_graph=query_graph,
                optimized_graph=query_graph,
                execution_order=[],
                cost_analysis={},
                optimization_applied=[],
                estimated_total_time=0.0,
                estimated_total_cost=0.0,
                validation_results=validation_results,
                performance_projections={},
                bottlenecks_identified=[]
            )

        # Step 3: Apply query rewriting
        rewritten_graph, rewrite_rules = self.rewriter.rewrite_query_graph(query_graph, optimization_level)

        # Step 4: Cost-based optimization
        execution_order, node_costs = self.cost_optimizer.optimize_execution_order(
            rewritten_graph, optimization_level
        )

        # Step 5: Calculate total costs
        total_time = sum(cost.estimated_time for cost in node_costs.values())
        total_cost = sum(cost.total_cost for cost in node_costs.values())

        # Step 6: Identify bottlenecks
        bottlenecks = self._identify_bottlenecks(node_costs, execution_order, graph_analysis)

        # Step 7: Generate performance projections
        performance_projections = self._generate_performance_projections(
            node_costs, execution_order, optimization_level
        )

        # Create execution plan
        plan = QueryExecutionPlan(
            original_graph=query_graph,
            optimized_graph=rewritten_graph,
            execution_order=execution_order,
            cost_analysis=node_costs,
            optimization_applied=rewrite_rules,
            estimated_total_time=total_time,
            estimated_total_cost=total_cost,
            validation_results=validation_results,
            performance_projections=performance_projections,
            bottlenecks_identified=bottlenecks
        )

        # Cache the result
        if enable_caching and cache_key:
            self.cache.put(cache_key, plan.to_dict())

        optimization_time = time.time() - start_time
        logger.info(f"Query optimization completed in {optimization_time:.3f}s")

        return plan

    def _identify_bottlenecks(self, node_costs: Dict[str, NodeExecutionCost],
                            execution_order: List[List[str]], graph_analysis: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Identify potential bottlenecks in the execution plan."""
        bottlenecks = []

        # Check for expensive sequential operations
        for level in execution_order:
            level_cost = sum(node_costs.get(node_id, NodeExecutionCost(node_id, 'unknown')).total_cost for node_id in level)
            if level_cost > 10.0 and len(level) == 1:  # Expensive single-node level
                bottlenecks.append({
                    'type': 'expensive_sequential_operation',
                    'node_ids': level,
                    'estimated_cost': level_cost,
                    'description': f"High-cost sequential operation in level: {level}"
                })

        # Check for memory-intensive operations
        for node_id, cost in node_costs.items():
            if cost.memory_cost > 5.0:
                bottlenecks.append({
                    'type': 'high_memory_usage',
                    'node_ids': [node_id],
                    'estimated_cost': cost.memory_cost,
                    'description': f"High memory usage in node {node_id}"
                })

        # Check for I/O intensive operations
        for node_id, cost in node_costs.items():
            if cost.io_cost > 3.0:
                bottlenecks.append({
                    'type': 'io_intensive_operation',
                    'node_ids': [node_id],
                    'estimated_cost': cost.io_cost,
                    'description': f"I/O intensive operation in node {node_id}"
                })

        return bottlenecks

    def _generate_performance_projections(self, node_costs: Dict[str, NodeExecutionCost],
                                        execution_order: List[List[str]], optimization_level: OptimizationLevel) -> Dict[str, Any]:
        """Generate performance projections for the optimized plan."""
        projections = {
            'estimated_parallelism': self._estimate_parallelism(execution_order),
            'resource_utilization': self._estimate_resource_utilization(node_costs),
            'scalability_score': self._calculate_scalability_score(node_costs, execution_order),
            'optimization_level': optimization_level.value
        }

        return projections

    def _estimate_parallelism(self, execution_order: List[List[str]]) -> float:
        """Estimate the degree of parallelism in the execution plan."""
        if not execution_order:
            return 0.0

        total_nodes = sum(len(level) for level in execution_order)
        max_parallelism = max(len(level) for level in execution_order)

        return min(1.0, max_parallelism / total_nodes) if total_nodes > 0 else 0.0

    def _estimate_resource_utilization(self, node_costs: Dict[str, NodeExecutionCost]) -> Dict[str, float]:
        """Estimate resource utilization."""
        if not node_costs:
            return {'cpu': 0.0, 'memory': 0.0, 'io': 0.0}

        total_cpu = sum(cost.cpu_cost for cost in node_costs.values())
        total_memory = sum(cost.memory_cost for cost in node_costs.values())
        total_io = sum(cost.io_cost for cost in node_costs.values())

        # Normalize to utilization percentages (simplified)
        return {
            'cpu_utilization': min(100.0, total_cpu * 10),  # Arbitrary scaling
            'memory_utilization': min(100.0, total_memory * 5),
            'io_utilization': min(100.0, total_io * 20)
        }

    def _calculate_scalability_score(self, node_costs: Dict[str, NodeExecutionCost],
                                   execution_order: List[List[str]]) -> float:
        """Calculate a scalability score (0-100)."""
        if not node_costs or not execution_order:
            return 0.0

        # Factors that affect scalability
        parallelism_factor = self._estimate_parallelism(execution_order)
        memory_efficiency = 1.0 - (sum(cost.memory_cost for cost in node_costs.values()) / len(node_costs) / 10.0)
        memory_efficiency = max(0.0, memory_efficiency)

        # Calculate score
        score = (parallelism_factor * 0.6 + memory_efficiency * 0.4) * 100
        return min(100.0, max(0.0, score))

    async def validate_query_graph(
        self,
        query_graph: Dict[str, Any],
        schema: Optional[Dict[str, Any]] = None,
        business_rules: Optional[List[Dict[str, Any]]] = None
    ) -> Dict[str, Any]:
        """Validate a query graph."""
        return self.validator.validate_query_graph(query_graph, schema, business_rules)

    async def profile_execution(self, execution_results: Dict[str, Any], execution_time: float) -> Dict[str, Any]:
        """Profile execution performance and provide insights."""
        return self.profiler.profile_execution(execution_results, execution_time)

    def get_performance_trends(self, hours: int = 24) -> Dict[str, Any]:
        """Get performance trends."""
        return self.profiler.get_performance_trends(hours)

    def get_cache_stats(self) -> Dict[str, Any]:
        """Get cache statistics."""
        return self.cache.get_stats()

    def clear_cache(self):
        """Clear the query cache."""
        self.cache.clear()

# Singleton instance
_query_optimizer = None

def get_query_optimizer() -> QueryOptimizer:
    """Get the query optimizer instance."""
    global _query_optimizer
    if _query_optimizer is None:
        _query_optimizer = QueryOptimizer()
    return _query_optimizer
