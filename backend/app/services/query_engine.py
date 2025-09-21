"""
Query Execution Engine
Processes node-based query graphs and executes them against data sources.
"""

import asyncio
import json
import time
from datetime import datetime
from typing import Dict, List, Any, Optional, Union
from abc import ABC, abstractmethod
from enum import Enum
import logging

logger = logging.getLogger(__name__)

class QueryNodeType(Enum):
    """Types of query nodes."""
    DATA_SOURCE = "dataSource"
    FILTER = "filter"
    TRANSFORM = "transform"
    AGGREGATE = "aggregate"
    JOIN = "join"
    UNION = "union"

class ExecutionStatus(Enum):
    """Execution status of query nodes."""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    SKIPPED = "skipped"

class QueryNode(ABC):
    """Abstract base class for query nodes."""

    def __init__(self, node_id: str, node_type: QueryNodeType, data: Dict[str, Any]):
        self.node_id = node_id
        self.node_type = node_type
        self.data = data
        self.status = ExecutionStatus.PENDING
        self.start_time: Optional[datetime] = None
        self.end_time: Optional[datetime] = None
        self.result: Optional[Any] = None
        self.error: Optional[str] = None
        self.execution_time: Optional[float] = None

    @abstractmethod
    async def execute(self, input_data: Any = None, context: Dict[str, Any] = None) -> Any:
        """Execute the node logic."""
        pass

    def mark_started(self):
        """Mark node execution as started."""
        self.status = ExecutionStatus.RUNNING
        self.start_time = datetime.now()

    def mark_completed(self, result: Any):
        """Mark node execution as completed."""
        self.status = ExecutionStatus.COMPLETED
        self.end_time = datetime.now()
        if self.start_time:
            self.execution_time = (self.end_time - self.start_time).total_seconds()
        self.result = result

    def mark_failed(self, error: str):
        """Mark node execution as failed."""
        self.status = ExecutionStatus.FAILED
        self.end_time = datetime.now()
        self.error = error

    def to_dict(self) -> Dict[str, Any]:
        """Convert node to dictionary representation."""
        return {
            'node_id': self.node_id,
            'node_type': self.node_type.value,
            'data': self.data,
            'status': self.status.value,
            'start_time': self.start_time.isoformat() if self.start_time else None,
            'end_time': self.end_time.isoformat() if self.end_time else None,
            'execution_time': self.execution_time,
            'result': self.result,
            'error': self.error
        }

class DataSourceNode(QueryNode):
    """Node for connecting to data sources."""

    def __init__(self, node_id: str, data: Dict[str, Any]):
        super().__init__(node_id, QueryNodeType.DATA_SOURCE, data)

    async def execute(self, input_data: Any = None, context: Dict[str, Any] = None) -> Any:
        """Execute data source connection."""
        self.mark_started()

        try:
            source_type = self.data.get('source_type', 'unknown')
            source_config = self.data.get('config', {})

            # Simulate data source connection
            await asyncio.sleep(0.1)

            # Mock data based on source type
            mock_data = self._generate_mock_data(source_type, source_config)

            self.mark_completed(mock_data)
            return mock_data

        except Exception as e:
            error_msg = f"Data source execution failed: {str(e)}"
            logger.error(error_msg)
            self.mark_failed(error_msg)
            raise

    def _generate_mock_data(self, source_type: str, config: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Generate mock data based on source type."""
        if source_type == 'users':
            return [
                {'id': 1, 'name': 'Alice', 'age': 30, 'email': 'alice@example.com'},
                {'id': 2, 'name': 'Bob', 'age': 25, 'email': 'bob@example.com'},
                {'id': 3, 'name': 'Charlie', 'age': 35, 'email': 'charlie@example.com'},
                {'id': 4, 'name': 'Diana', 'age': 28, 'email': 'diana@example.com'},
            ]
        elif source_type == 'products':
            return [
                {'id': 1, 'name': 'Laptop', 'price': 999.99, 'category': 'Electronics'},
                {'id': 2, 'name': 'Mouse', 'price': 29.99, 'category': 'Electronics'},
                {'id': 3, 'name': 'Book', 'price': 19.99, 'category': 'Books'},
                {'id': 4, 'name': 'Chair', 'price': 149.99, 'category': 'Furniture'},
            ]
        else:
            return [
                {'id': 1, 'value': 'Sample Data 1'},
                {'id': 2, 'value': 'Sample Data 2'},
                {'id': 3, 'value': 'Sample Data 3'},
            ]

class FilterNode(QueryNode):
    """Node for filtering data."""

    def __init__(self, node_id: str, data: Dict[str, Any]):
        super().__init__(node_id, QueryNodeType.FILTER, data)

    async def execute(self, input_data: Any = None, context: Dict[str, Any] = None) -> Any:
        """Execute data filtering."""
        self.mark_started()

        try:
            if not input_data:
                raise ValueError("No input data provided to filter node")

            filter_condition = self.data.get('condition', '')
            if not filter_condition:
                self.mark_completed(input_data)
                return input_data

            # Simple filter implementation
            filtered_data = self._apply_filter(input_data, filter_condition)

            self.mark_completed(filtered_data)
            return filtered_data

        except Exception as e:
            error_msg = f"Filter execution failed: {str(e)}"
            logger.error(error_msg)
            self.mark_failed(error_msg)
            raise

    def _apply_filter(self, data: Any, condition: str) -> Any:
        """Apply filter condition to data."""
        if not isinstance(data, list):
            return data

        # Simple condition parsing (e.g., "age > 25", "name contains 'a'")
        if '>' in condition:
            field, value = condition.split('>', 1)
            field = field.strip()
            try:
                threshold = float(value.strip())
                return [item for item in data if isinstance(item.get(field), (int, float)) and item[field] > threshold]
            except ValueError:
                pass
        elif '<' in condition:
            field, value = condition.split('<', 1)
            field = field.strip()
            try:
                threshold = float(value.strip())
                return [item for item in data if isinstance(item.get(field), (int, float)) and item[field] < threshold]
            except ValueError:
                pass
        elif '==' in condition or '=' in condition:
            field, value = condition.replace('==', '=').split('=', 1)
            field = field.strip()
            value = value.strip().strip("'\"")
            return [item for item in data if str(item.get(field, '')) == value]

        # Default: return original data if condition not understood
        return data

class TransformNode(QueryNode):
    """Node for transforming data."""

    def __init__(self, node_id: str, data: Dict[str, Any]):
        super().__init__(node_id, QueryNodeType.TRANSFORM, data)

    async def execute(self, input_data: Any = None, context: Dict[str, Any] = None) -> Any:
        """Execute data transformation."""
        self.mark_started()

        try:
            if not input_data:
                raise ValueError("No input data provided to transform node")

            transformation = self.data.get('transformation', '')
            if not transformation:
                self.mark_completed(input_data)
                return input_data

            transformed_data = self._apply_transformation(input_data, transformation)

            self.mark_completed(transformed_data)
            return transformed_data

        except Exception as e:
            error_msg = f"Transform execution failed: {str(e)}"
            logger.error(error_msg)
            self.mark_failed(error_msg)
            raise

    def _apply_transformation(self, data: Any, transformation: str) -> Any:
        """Apply transformation to data."""
        if not isinstance(data, list):
            return data

        # Simple transformation operations
        if transformation.lower() == 'uppercase':
            return [{k: str(v).upper() if isinstance(v, str) else v for k, v in item.items()} for item in data]
        elif transformation.lower() == 'lowercase':
            return [{k: str(v).lower() if isinstance(v, str) else v for k, v in item.items()} for item in data]
        elif transformation.lower().startswith('add_field:'):
            field_def = transformation.split(':', 1)[1]
            field_name, field_value = field_def.split('=', 1)
            field_name = field_name.strip()
            field_value = field_value.strip().strip("'\"")
            return [{**item, field_name: field_value} for item in data]
        elif transformation.lower().startswith('calculate:'):
            calc_def = transformation.split(':', 1)[1]
            # Simple calculation support
            return data  # Placeholder for more complex calculations

        return data

class AggregateNode(QueryNode):
    """Node for aggregating data."""

    def __init__(self, node_id: str, data: Dict[str, Any]):
        super().__init__(node_id, QueryNodeType.AGGREGATE, data)

    async def execute(self, input_data: Any = None, context: Dict[str, Any] = None) -> Any:
        """Execute data aggregation."""
        self.mark_started()

        try:
            if not input_data:
                raise ValueError("No input data provided to aggregate node")

            aggregation = self.data.get('aggregation', '')
            if not aggregation:
                self.mark_completed(input_data)
                return input_data

            aggregated_data = self._apply_aggregation(input_data, aggregation)

            self.mark_completed(aggregated_data)
            return aggregated_data

        except Exception as e:
            error_msg = f"Aggregate execution failed: {str(e)}"
            logger.error(error_msg)
            self.mark_failed(error_msg)
            raise

    def _apply_aggregation(self, data: Any, aggregation: str) -> Any:
        """Apply aggregation to data."""
        if not isinstance(data, list) or len(data) == 0:
            return data

        # Simple aggregation operations
        if aggregation.lower() == 'count':
            return {'count': len(data)}
        elif aggregation.lower() == 'sum' and len(data) > 0:
            # Try to sum numeric fields
            first_item = data[0]
            result = {}
            for key, value in first_item.items():
                if isinstance(value, (int, float)):
                    total = sum(item.get(key, 0) for item in data)
                    result[key] = total
            return result
        elif aggregation.lower() == 'average' and len(data) > 0:
            # Try to average numeric fields
            first_item = data[0]
            result = {}
            for key, value in first_item.items():
                if isinstance(value, (int, float)):
                    values = [item.get(key, 0) for item in data]
                    average = sum(values) / len(values)
                    result[key] = average
            return result

        return data

class JoinNode(QueryNode):
    """Node for joining data from multiple sources."""

    def __init__(self, node_id: str, data: Dict[str, Any]):
        super().__init__(node_id, QueryNodeType.JOIN, data)

    async def execute(self, input_data: Any = None, context: Dict[str, Any] = None) -> Any:
        """Execute data join."""
        self.mark_started()

        try:
            if not input_data or not isinstance(input_data, list):
                raise ValueError("Invalid input data for join node")

            join_type = self.data.get('join_type', 'inner')
            join_condition = self.data.get('join_condition', '')

            # For simplicity, implement basic join logic
            # In a real implementation, this would handle multiple inputs
            joined_data = self._apply_join(input_data, join_type, join_condition)

            self.mark_completed(joined_data)
            return joined_data

        except Exception as e:
            error_msg = f"Join execution failed: {str(e)}"
            logger.error(error_msg)
            self.mark_failed(error_msg)
            raise

    def _apply_join(self, data: Any, join_type: str, condition: str) -> Any:
        """Apply join operation."""
        # Simplified join implementation
        # In reality, this would handle left/right/inner/outer joins properly
        return data

class UnionNode(QueryNode):
    """Node for combining data from multiple sources."""

    def __init__(self, node_id: str, data: Dict[str, Any]):
        super().__init__(node_id, QueryNodeType.UNION, data)

    async def execute(self, input_data: Any = None, context: Dict[str, Any] = None) -> Any:
        """Execute data union."""
        self.mark_started()

        try:
            if not input_data:
                raise ValueError("No input data provided to union node")

            # Simple union implementation
            union_result = self._apply_union(input_data)

            self.mark_completed(union_result)
            return union_result

        except Exception as e:
            error_msg = f"Union execution failed: {str(e)}"
            logger.error(error_msg)
            self.mark_failed(error_msg)
            raise

    def _apply_union(self, data: Any) -> Any:
        """Apply union operation."""
        if isinstance(data, list) and all(isinstance(item, list) for item in data):
            # Combine multiple lists
            return [item for sublist in data for item in sublist]
        return data

class QueryExecutionEngine:
    """Engine for executing query graphs."""

    def __init__(self):
        self.node_factory = {
            QueryNodeType.DATA_SOURCE: lambda id, data: DataSourceNode(id, data),
            QueryNodeType.FILTER: lambda id, data: FilterNode(id, data),
            QueryNodeType.TRANSFORM: lambda id, data: TransformNode(id, data),
            QueryNodeType.AGGREGATE: lambda id, data: AggregateNode(id, data),
            QueryNodeType.JOIN: lambda id, data: JoinNode(id, data),
            QueryNodeType.UNION: lambda id, data: UnionNode(id, data),
        }

    def parse_query_graph(self, query_graph: Dict[str, Any]) -> Dict[str, QueryNode]:
        """Parse query graph and create node instances."""
        nodes = {}

        for node_data in query_graph.get('nodes', []):
            node_id = node_data['id']
            node_type_str = node_data.get('type', '')
            node_data_dict = node_data.get('data', {})

            try:
                node_type = QueryNodeType(node_type_str)
                node = self.node_factory[node_type](node_id, node_data_dict)
                nodes[node_id] = node
            except (KeyError, ValueError) as e:
                logger.error(f"Failed to create node {node_id}: {e}")
                continue

        return nodes

    def build_execution_order(self, nodes: Dict[str, QueryNode], edges: List[Dict[str, str]]) -> List[List[str]]:
        """Build execution order based on node dependencies."""
        # Simple topological sort for linear execution
        # In a real implementation, this would handle complex DAGs
        node_ids = list(nodes.keys())

        # For simplicity, execute in the order nodes appear in the graph
        return [node_ids]

    async def execute_query_graph(self, query_graph: Dict[str, Any], context: Dict[str, Any] = None) -> Dict[str, Any]:
        """Execute a complete query graph."""
        start_time = datetime.now()

        try:
            # Parse nodes
            nodes = self.parse_query_graph(query_graph)
            if not nodes:
                raise ValueError("No valid nodes found in query graph")

            edges = query_graph.get('edges', [])
            execution_order = self.build_execution_order(nodes, edges)

            # Execute nodes in order
            execution_results = []
            for level in execution_order:
                level_results = {}

                for node_id in level:
                    if node_id in nodes:
                        node = nodes[node_id]
                        try:
                            # Get input data from previous results
                            input_data = self._get_node_input(node_id, edges, execution_results)
                            result = await node.execute(input_data, context or {})
                            level_results[node_id] = result
                        except Exception as e:
                            logger.error(f"Node {node_id} execution failed: {e}")
                            node.mark_failed(str(e))

                execution_results.append(level_results)

            # Collect final results
            final_results = {}
            execution_time = (datetime.now() - start_time).total_seconds()

            for node in nodes.values():
                final_results[node.node_id] = node.to_dict()

            return {
                'success': True,
                'results': final_results,
                'execution_time': execution_time,
                'total_nodes': len(nodes),
                'completed_nodes': len([n for n in nodes.values() if n.status == ExecutionStatus.COMPLETED]),
                'failed_nodes': len([n for n in nodes.values() if n.status == ExecutionStatus.FAILED])
            }

        except Exception as e:
            error_msg = f"Query graph execution failed: {str(e)}"
            logger.error(error_msg)
            return {
                'success': False,
                'error': error_msg,
                'execution_time': (datetime.now() - start_time).total_seconds()
            }

    def _get_node_input(self, node_id: str, edges: List[Dict[str, str]], execution_results: List[Dict[str, Any]]) -> Any:
        """Get input data for a node from previous execution results."""
        # Find edges that target this node
        input_edges = [edge for edge in edges if edge.get('target') == node_id]

        if not input_edges:
            return None

        # For simplicity, return the last execution result
        # In a real implementation, this would properly handle multiple inputs
        if execution_results:
            last_result = execution_results[-1]
            # Find the source node result
            for edge in input_edges:
                source_id = edge.get('source')
                if source_id in last_result:
                    return last_result[source_id]

        return None

    def validate_query_graph(self, query_graph: Dict[str, Any]) -> Dict[str, Any]:
        """Validate a query graph structure."""
        validation_result = {
            'valid': True,
            'errors': [],
            'warnings': []
        }

        nodes = query_graph.get('nodes', [])
        edges = query_graph.get('edges', [])

        if not nodes:
            validation_result['errors'].append("Query graph must contain at least one node")
            validation_result['valid'] = False

        # Check for required node properties
        for i, node in enumerate(nodes):
            if not node.get('id'):
                validation_result['errors'].append(f"Node {i} missing required 'id' property")
                validation_result['valid'] = False

            if not node.get('type'):
                validation_result['errors'].append(f"Node {node.get('id', i)} missing required 'type' property")
                validation_result['valid'] = False

            node_type = node.get('type')
            if node_type and node_type not in [nt.value for nt in QueryNodeType]:
                validation_result['warnings'].append(f"Unknown node type: {node_type}")

        # Check edge validity
        node_ids = {node['id'] for node in nodes}
        for edge in edges:
            if edge.get('source') not in node_ids:
                validation_result['errors'].append(f"Edge source '{edge.get('source')}' not found in nodes")
                validation_result['valid'] = False

            if edge.get('target') not in node_ids:
                validation_result['errors'].append(f"Edge target '{edge.get('target')}' not found in nodes")
                validation_result['valid'] = False

        return validation_result

# Singleton instance
_query_engine = None

def get_query_engine() -> QueryExecutionEngine:
    """Get the query execution engine instance."""
    global _query_engine
    if _query_engine is None:
        _query_engine = QueryExecutionEngine()
    return _query_engine