import pytest
import asyncio
from unittest.mock import AsyncMock, MagicMock
from app.services.query_engine import (
    QueryExecutionEngine,
    QueryNodeType,
    DataSourceNode,
    FilterNode,
    TransformNode,
    AggregateNode,
    ExecutionStatus
)


class TestQueryExecutionEngine:
    """Test the QueryExecutionEngine functionality."""

    @pytest.fixture
    def engine(self):
        """Create a query execution engine instance."""
        return QueryExecutionEngine()

    def test_parse_query_graph_valid(self, engine):
        """Test parsing a valid query graph."""
        query_graph = {
            'nodes': [
                {'id': '1', 'type': 'dataSource', 'data': {'source_type': 'users'}},
                {'id': '2', 'type': 'filter', 'data': {'condition': 'age > 25'}}
            ],
            'edges': [{'source': '1', 'target': '2'}]
        }

        nodes = engine.parse_query_graph(query_graph)

        assert len(nodes) == 2
        assert '1' in nodes
        assert '2' in nodes
        assert isinstance(nodes['1'], DataSourceNode)
        assert isinstance(nodes['2'], FilterNode)

    def test_parse_query_graph_invalid_node_type(self, engine):
        """Test parsing a query graph with invalid node type."""
        query_graph = {
            'nodes': [
                {'id': '1', 'type': 'invalidType', 'data': {}}
            ],
            'edges': []
        }

        nodes = engine.parse_query_graph(query_graph)

        # Invalid node should be skipped
        assert len(nodes) == 0

    def test_build_execution_order_simple_chain(self, engine):
        """Test building execution order for a simple chain."""
        nodes = {
            '1': DataSourceNode('1', {}),
            '2': FilterNode('2', {})
        }
        edges = [{'source': '1', 'target': '2'}]

        order = engine.build_execution_order(nodes, edges)

        assert len(order) == 2
        assert order[0] == ['1']  # Data source first
        assert order[1] == ['2']  # Filter second

    def test_build_execution_order_parallel_nodes(self, engine):
        """Test building execution order for parallel nodes."""
        nodes = {
            '1': DataSourceNode('1', {}),
            '2': DataSourceNode('2', {}),
            '3': FilterNode('3', {})
        }
        edges = [
            {'source': '1', 'target': '3'},
            {'source': '2', 'target': '3'}
        ]

        order = engine.build_execution_order(nodes, edges)

        assert len(order) == 2
        # First level should contain both data sources
        assert set(order[0]) == {'1', '2'}
        # Second level should contain the filter
        assert order[1] == ['3']

    def test_build_execution_order_cycle_detection(self, engine):
        """Test cycle detection in execution order."""
        nodes = {
            '1': DataSourceNode('1', {}),
            '2': FilterNode('2', {})
        }
        # Create a cycle: 1 -> 2 -> 1
        edges = [
            {'source': '1', 'target': '2'},
            {'source': '2', 'target': '1'}
        ]

        order = engine.build_execution_order(nodes, edges)

        # Should fallback to single level execution
        assert len(order) == 1
        assert set(order[0]) == {'1', '2'}

    @pytest.mark.asyncio
    async def test_execute_query_graph_simple_chain(self, engine):
        """Test executing a simple query graph chain."""
        query_graph = {
            'nodes': [
                {'id': '1', 'type': 'dataSource', 'data': {'source_type': 'users'}},
                {'id': '2', 'type': 'filter', 'data': {'condition': 'age > 25'}}
            ],
            'edges': [{'source': '1', 'target': '2'}]
        }

        result = await engine.execute_query_graph(query_graph)

        assert result['success'] == True
        assert result['total_nodes'] == 2
        assert result['completed_nodes'] == 2
        assert result['failed_nodes'] == 0

        # Check node results
        assert '1' in result['results']
        assert '2' in result['results']
        assert result['results']['1']['status'] == 'completed'
        assert result['results']['2']['status'] == 'completed'

        # Check data flow - filter should have fewer results
        data_result = result['results']['1']['result']
        filter_result = result['results']['2']['result']
        assert len(filter_result) <= len(data_result)

    @pytest.mark.asyncio
    async def test_execute_query_graph_with_aggregation(self, engine):
        """Test executing a query graph with aggregation."""
        query_graph = {
            'nodes': [
                {'id': '1', 'type': 'dataSource', 'data': {'source_type': 'users'}},
                {'id': '2', 'type': 'aggregate', 'data': {'aggregation': 'count'}}
            ],
            'edges': [{'source': '1', 'target': '2'}]
        }

        result = await engine.execute_query_graph(query_graph)

        assert result['success'] == True
        assert result['completed_nodes'] == 2

        # Check aggregation result
        agg_result = result['results']['2']['result']
        assert 'count' in agg_result
        assert agg_result['count'] == 4  # Mock data has 4 users

    def test_validate_query_graph_valid(self, engine):
        """Test validating a valid query graph."""
        query_graph = {
            'nodes': [
                {'id': '1', 'type': 'dataSource', 'data': {}},
                {'id': '2', 'type': 'filter', 'data': {}}
            ],
            'edges': [{'source': '1', 'target': '2'}]
        }

        result = engine.validate_query_graph(query_graph)

        assert result['valid'] == True
        assert len(result['errors']) == 0

    def test_validate_query_graph_missing_nodes(self, engine):
        """Test validating a query graph with no nodes."""
        query_graph = {'nodes': [], 'edges': []}

        result = engine.validate_query_graph(query_graph)

        assert result['valid'] == False
        assert len(result['errors']) > 0
        assert "must contain at least one node" in result['errors'][0]

    def test_validate_query_graph_invalid_edge(self, engine):
        """Test validating a query graph with invalid edge."""
        query_graph = {
            'nodes': [{'id': '1', 'type': 'dataSource', 'data': {}}],
            'edges': [{'source': '1', 'target': 'nonexistent'}]
        }

        result = engine.validate_query_graph(query_graph)

        assert result['valid'] == False
        assert len(result['errors']) > 0

    def test_validate_query_graph_unknown_node_type(self, engine):
        """Test validating a query graph with unknown node type."""
        query_graph = {
            'nodes': [
                {'id': '1', 'type': 'dataSource', 'data': {}},
                {'id': '2', 'type': 'unknownType', 'data': {}}
            ],
            'edges': []
        }

        result = engine.validate_query_graph(query_graph)

        assert result['valid'] == True  # Still valid, just warnings
        assert len(result['warnings']) > 0
        assert "Unknown node type" in result['warnings'][0]


class TestDataSourceNode:
    """Test DataSourceNode functionality."""

    @pytest.mark.asyncio
    async def test_execute_users_data(self):
        """Test executing data source with users."""
        node = DataSourceNode('1', {'source_type': 'users'})

        result = await node.execute()

        assert isinstance(result, list)
        assert len(result) == 4
        assert all('name' in item and 'age' in item for item in result)

    @pytest.mark.asyncio
    async def test_execute_products_data(self):
        """Test executing data source with products."""
        node = DataSourceNode('1', {'source_type': 'products'})

        result = await node.execute()

        assert isinstance(result, list)
        assert len(result) == 4
        assert all('name' in item and 'price' in item for item in result)


class TestFilterNode:
    """Test FilterNode functionality."""

    @pytest.mark.asyncio
    async def test_execute_greater_than_filter(self):
        """Test filtering with greater than condition."""
        node = FilterNode('1', {'condition': 'age > 25'})

        input_data = [
            {'name': 'Alice', 'age': 30},
            {'name': 'Bob', 'age': 20},
            {'name': 'Charlie', 'age': 35}
        ]

        result = await node.execute(input_data)

        assert isinstance(result, list)
        assert len(result) == 2
        assert all(item['age'] > 25 for item in result)

    @pytest.mark.asyncio
    async def test_execute_equality_filter(self):
        """Test filtering with equality condition."""
        node = FilterNode('1', {'condition': 'name = Alice'})

        input_data = [
            {'name': 'Alice', 'age': 30},
            {'name': 'Bob', 'age': 25},
            {'name': 'Alice', 'age': 35}
        ]

        result = await node.execute(input_data)

        assert isinstance(result, list)
        assert len(result) == 2
        assert all(item['name'] == 'Alice' for item in result)

    @pytest.mark.asyncio
    async def test_execute_no_input_data(self):
        """Test filter node with no input data."""
        node = FilterNode('1', {'condition': 'age > 25'})

        with pytest.raises(ValueError, match="No input data provided"):
            await node.execute()


class TestTransformNode:
    """Test TransformNode functionality."""

    @pytest.mark.asyncio
    async def test_execute_uppercase_transform(self):
        """Test uppercase transformation."""
        node = TransformNode('1', {'transformation': 'uppercase'})

        input_data = [
            {'name': 'alice', 'city': 'paris'},
            {'name': 'bob', 'city': 'london'}
        ]

        result = await node.execute(input_data)

        assert isinstance(result, list)
        assert result[0]['name'] == 'ALICE'
        assert result[0]['city'] == 'PARIS'
        assert result[1]['name'] == 'BOB'
        assert result[1]['city'] == 'LONDON'

    @pytest.mark.asyncio
    async def test_execute_add_field_transform(self):
        """Test adding a field transformation."""
        node = TransformNode('1', {'transformation': 'add_field:status=active'})

        input_data = [
            {'name': 'Alice', 'age': 30},
            {'name': 'Bob', 'age': 25}
        ]

        result = await node.execute(input_data)

        assert isinstance(result, list)
        assert result[0]['status'] == 'active'
        assert result[1]['status'] == 'active'


class TestAggregateNode:
    """Test AggregateNode functionality."""

    @pytest.mark.asyncio
    async def test_execute_count_aggregation(self):
        """Test count aggregation."""
        node = AggregateNode('1', {'aggregation': 'count'})

        input_data = [
            {'name': 'Alice', 'age': 30},
            {'name': 'Bob', 'age': 25},
            {'name': 'Charlie', 'age': 35}
        ]

        result = await node.execute(input_data)

        assert isinstance(result, dict)
        assert result['count'] == 3

    @pytest.mark.asyncio
    async def test_execute_sum_aggregation(self):
        """Test sum aggregation."""
        node = AggregateNode('1', {'aggregation': 'sum'})

        input_data = [
            {'name': 'Alice', 'value': 10},
            {'name': 'Bob', 'value': 20},
            {'name': 'Charlie', 'value': 30}
        ]

        result = await node.execute(input_data)

        assert isinstance(result, dict)
        assert result['value'] == 60

    @pytest.mark.asyncio
    async def test_execute_average_aggregation(self):
        """Test average aggregation."""
        node = AggregateNode('1', {'aggregation': 'average'})

        input_data = [
            {'name': 'Alice', 'value': 10},
            {'name': 'Bob', 'value': 20},
            {'name': 'Charlie', 'value': 30}
        ]

        result = await node.execute(input_data)

        assert isinstance(result, dict)
        assert result['value'] == 20.0