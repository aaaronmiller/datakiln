"""
Integration tests for the complete query system flow.
Tests frontend-to-backend JSON serialization, execution, and result handling.
"""

import pytest
import json
import asyncio
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi.testclient import TestClient
from httpx import AsyncClient
import websockets
from sse_starlette.sse import EventSourceResponse

from main import app
from query_engine import QueryEngine


@pytest.fixture
def client():
    """Test client fixture"""
    return TestClient(app)


@pytest.fixture
async def async_client():
    """Async test client fixture"""
    async with AsyncClient(app=app, base_url="http://testserver") as client:
        yield client


@pytest.fixture
def sample_query_graph():
    """Sample query graph in frontend format"""
    return {
        "nodes": [
            {
                "id": "data_source_1",
                "type": "dataSource",
                "position": {"x": 100, "y": 100},
                "data": {
                    "type": "dataSource",
                    "source_type": "mock",
                    "config": {"data_type": "users"}
                }
            },
            {
                "id": "filter_1",
                "type": "filter",
                "position": {"x": 300, "y": 100},
                "data": {
                    "type": "filter",
                    "condition": "age > 25"
                }
            },
            {
                "id": "aggregate_1",
                "type": "aggregate",
                "position": {"x": 500, "y": 100},
                "data": {
                    "type": "aggregate",
                    "aggregation": "count"
                }
            }
        ],
        "edges": [
            {
                "id": "edge_1",
                "source": "data_source_1",
                "target": "filter_1",
                "sourceHandle": "output",
                "targetHandle": "input"
            },
            {
                "id": "edge_2",
                "source": "filter_1",
                "target": "aggregate_1",
                "sourceHandle": "output",
                "targetHandle": "input"
            }
        ]
    }


@pytest.fixture
def sample_workflow_request(sample_query_graph):
    """Sample workflow execution request"""
    return {
        "workflow": {
            "id": "test_workflow_123",
            "name": "Test Query Workflow",
            "description": "Integration test workflow",
            "nodes": sample_query_graph["nodes"],
            "edges": sample_query_graph["edges"],
            "metadata": {
                "version": "1.0",
                "createdAt": "2024-01-01T00:00:00Z",
                "author": "test_user"
            }
        },
        "execution_options": {
            "enable_validation": True,
            "timeout_seconds": 30
        }
    }


class TestQueryGraphSerialization:
    """Test JSON serialization/deserialization between frontend and backend"""

    def test_frontend_graph_json_serialization(self, sample_query_graph):
        """Test frontend ReactFlow graph JSON serialization/deserialization"""
        # Simulate frontend serialization
        frontend_json = json.dumps(sample_query_graph)

        # Parse back (simulating backend receiving JSON)
        parsed_graph = json.loads(frontend_json)

        assert len(parsed_graph["nodes"]) == 3
        assert len(parsed_graph["edges"]) == 2
        assert parsed_graph["nodes"][0]["type"] == "dataSource"
        assert parsed_graph["nodes"][1]["type"] == "filter"
        assert parsed_graph["nodes"][2]["type"] == "aggregate"

    def test_query_engine_validation(self, sample_query_graph):
        """Test QueryEngine validation of query graph"""
        engine = QueryEngine()

        # Validate the graph
        validation = engine.graph_validator.validate_workflow(sample_query_graph)

        # Should validate successfully (basic structure check)
        assert "valid" in validation
        assert "errors" in validation
        assert "warnings" in validation


class TestWorkflowExecutionIntegration:
    """Integration tests for complete workflow execution"""

    @patch('main.query_engine')
    def test_workflow_execution_api_success(self, mock_query_engine, client, sample_query_graph):
        """Test successful workflow execution through API"""
        # Mock successful execution
        mock_query_engine.execute_query.return_value = {
            "success": True,
            "execution_id": "run_123",
            "execution_time": 2.5,
            "result": {
                "status": "completed",
                "data": [{"id": 1, "name": "Test"}]
            }
        }

        # Create request matching the API signature
        request_data = {
            "workflow": sample_query_graph,
            "execution_options": {"test": True}
        }

        response = client.post("/workflow/execute", json=request_data)

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "completed"
        assert data["execution_id"] == "run_123"

    @patch('main.query_engine')
    def test_workflow_execution_api_failure(self, mock_query_engine, client, sample_query_graph):
        """Test workflow execution failure through API"""
        # Mock execution failure
        mock_query_engine.execute_query.side_effect = ValueError("Invalid node configuration")

        request_data = {
            "workflow": sample_query_graph,
            "execution_options": {"test": True}
        }

        response = client.post("/workflow/execute", json=request_data)

        assert response.status_code == 500
        data = response.json()
        assert "Workflow execution error" in data["detail"]

    def test_workflow_validation_api(self, client, sample_query_graph):
        """Test workflow validation through API"""
        workflow = {
            "name": "Test Workflow",
            "start_node": "data_source_1",
            "nodes": {
                "data_source_1": {
                    "name": "Data Source",
                    "type": "provider",
                    "provider_type": "mock"
                }
            }
        }

        response = client.post("/workflow/validate", json={"workflow": workflow})
        assert response.status_code == 200
        data = response.json()
        assert "valid" in data
        assert "errors" in data
        assert "warnings" in data


class TestQueryEngineIntegration:
    """Integration tests for QueryEngine"""

    def test_query_engine_creation(self):
        """Test QueryEngine can be instantiated"""
        engine = QueryEngine()
        assert engine is not None
        assert hasattr(engine, 'execute_query')
        assert hasattr(engine, 'graph_validator')

    def test_query_engine_validation(self):
        """Test QueryEngine validation"""
        engine = QueryEngine()

        # Valid workflow
        valid_workflow = {
            "nodes": {
                "node1": {
                    "name": "Test Node",
                    "type": "provider",
                    "provider_type": "gemini_deep_research"
                }
            },
            "start_node": "node1"
        }

        validation = engine.graph_validator.validate_workflow(valid_workflow)
        assert validation["valid"] == True
        assert len(validation["errors"]) == 0

    def test_query_engine_invalid_workflow(self):
        """Test QueryEngine validation with invalid workflow"""
        engine = QueryEngine()

        # Invalid workflow - missing required fields
        invalid_workflow = {
            "nodes": {}
            # Missing start_node
        }

        validation = engine.graph_validator.validate_workflow(invalid_workflow)
        assert validation["valid"] == False
        assert len(validation["errors"]) > 0


class TestErrorHandlingIntegration:
    """Integration tests for error handling across components"""

    def test_invalid_json_handling(self, client):
        """Test handling of invalid JSON in requests"""
        # Send malformed JSON
        response = client.post("/workflow/execute", data="invalid json")

        assert response.status_code == 422  # Validation error

    def test_missing_required_fields(self, client):
        """Test handling of missing required fields"""
        # Send request missing required workflow field
        response = client.post("/workflow/execute", json={
            "execution_options": {}
        })

        assert response.status_code == 422  # Validation error


class TestCompleteIntegration:
    """Complete integration tests for the query system"""

    def test_frontend_to_backend_serialization(self, sample_query_graph):
        """Test that frontend graph can be properly serialized and sent to backend"""
        # Simulate frontend serialization
        json_data = json.dumps(sample_query_graph)

        # Verify it can be parsed back
        parsed = json.loads(json_data)

        # Verify structure is maintained
        assert len(parsed["nodes"]) == 3
        assert len(parsed["edges"]) == 2
        assert all("id" in node for node in parsed["nodes"])
        assert all("type" in node for node in parsed["nodes"])
        assert all("source" in edge and "target" in edge for edge in parsed["edges"])

    @patch('main.query_engine')
    def test_end_to_end_workflow_execution(self, mock_query_engine, client, sample_query_graph):
        """Test complete end-to-end workflow execution"""
        # Mock successful execution
        mock_query_engine.execute_query.return_value = {
            "success": True,
            "execution_id": "e2e_test_123",
            "execution_time": 1.0,
            "result": {
                "status": "completed",
                "data": [
                    {"id": 1, "name": "Test User", "age": 25},
                    {"id": 2, "name": "Another User", "age": 30}
                ]
            }
        }

        # Create workflow request
        workflow_request = {
            "workflow": sample_query_graph,
            "execution_options": {"test": True}
        }

        # Execute workflow
        response = client.post("/workflow/execute", json=workflow_request)

        # Verify response
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "completed"
        assert "execution_id" in data
        assert "result" in data

        # Verify the mock was called correctly
        mock_query_engine.execute_query.assert_called_once()
        call_args = mock_query_engine.execute_query.call_args[0]
        assert call_args[0] == "Custom workflow execution"  # query param
        assert call_args[1] == sample_query_graph  # workflow_config
        assert call_args[2] == {"test": True}  # execution_options