import pytest
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock, MagicMock, patch
import json
from datetime import datetime

from main import app
from research_agent import ResearchMode
from query_engine import QueryEngine
from providers import ProviderManager
from dom_selectors import default_registry as selectors_registry


@pytest.fixture
def client():
    """Test client fixture"""
    return TestClient(app)


@pytest.fixture
def mock_query_engine():
    """Mock query engine fixture"""
    with patch('main.query_engine') as mock_engine:
        yield mock_engine


@pytest.fixture
def mock_provider_manager():
    """Mock provider manager fixture"""
    with patch('main.provider_manager') as mock_manager:
        yield mock_manager


class TestBasicEndpoints:
    """Test basic API endpoints"""

    def test_read_root(self, client):
        """Test root endpoint"""
        response = client.get("/")
        assert response.status_code == 200
        assert "DataKiln Backend API v2.0.0" in response.json()["message"]

    def test_research_endpoint(self, client):
        """Test research endpoint"""
        request_data = {
            "query": "test query",
            "mode": ResearchMode.BALANCED.value
        }

        response = client.post("/research", json=request_data)
        assert response.status_code == 200
        assert "status" in response.json()
        assert "result" in response.json()

    def test_chat_logs_endpoint(self, client):
        """Test chat logs endpoint"""
        request_data = {
            "site": "test.com",
            "userId": "user123",
            "timestamp": "2023-01-01T00:00:00",
            "model": "gpt-3.5",
            "messages": ["test message"]
        }

        response = client.post("/chat-logs", json=request_data)
        assert response.status_code == 200
        assert response.json()["status"] == "received"


class TestWorkflowEndpoints:
    """Test workflow-related endpoints"""

    def test_execute_workflow_success(self, client, mock_query_engine):
        """Test successful workflow execution"""
        mock_query_engine.execute_query.return_value = {
            "success": True,
            "execution_id": "test_123",
            "execution_time": 5.5
        }

        workflow = {
            "name": "Test Workflow",
            "nodes": {
                "node1": {
                    "name": "Test Node",
                    "type": "provider",
                    "provider_type": "gemini_deep_research"
                }
            }
        }

        request_data = {
            "workflow": workflow,
            "execution_options": {"test": "option"}
        }

        response = client.post("/workflow/execute", json=request_data)
        assert response.status_code == 200
        assert response.json()["status"] == "completed"
        assert response.json()["execution_id"] == "test_123"

    def test_execute_workflow_failure(self, client, mock_query_engine):
        """Test workflow execution failure"""
        mock_query_engine.execute_query.return_value = {
            "success": False,
            "error": "Execution failed"
        }

        request_data = {
            "workflow": {"name": "Test"},
            "execution_options": {}
        }

        response = client.post("/workflow/execute", json=request_data)
        assert response.status_code == 400
        assert "Workflow execution failed" in response.json()["detail"]

    def test_validate_workflow_success(self, client, mock_query_engine):
        """Test successful workflow validation"""
        mock_query_engine.validate_workflow_graph.return_value = {
            "valid": True,
            "errors": [],
            "warnings": []
        }

        workflow = {
            "name": "Test Workflow",
            "start_node": "node1",
            "nodes": {
                "node1": {
                    "name": "Test Node",
                    "type": "provider"
                }
            }
        }

        response = client.post("/workflow/validate", json={"workflow": workflow})
        assert response.status_code == 200
        assert response.json()["valid"] == True
        assert response.json()["errors"] == []

    def test_validate_workflow_failure(self, client, mock_query_engine):
        """Test workflow validation failure"""
        mock_query_engine.validate_workflow_graph.return_value = {
            "valid": False,
            "errors": ["Missing start_node"],
            "warnings": ["No description"]
        }

        workflow = {"name": "Test"}

        response = client.post("/workflow/validate", json={"workflow": workflow})
        assert response.status_code == 200
        assert response.json()["valid"] == False
        assert len(response.json()["errors"]) == 1

    def test_optimize_workflow(self, client, mock_query_engine):
        """Test workflow optimization"""
        mock_query_engine.optimize_workflow.return_value = {
            "original_workflow": {"name": "test"},
            "optimizations": [{"type": "test_optimization"}],
            "performance_improvements": [{"type": "time_reduction"}]
        }

        workflow = {"name": "Test Workflow"}

        response = client.post("/workflow/optimize", json=workflow)
        assert response.status_code == 200
        assert response.json()["success"] == True
        assert "optimization_result" in response.json()

    def test_create_workflow_success(self, client, mock_query_engine):
        """Test successful workflow creation"""
        mock_query_engine.create_custom_workflow.return_value = {
            "success": True,
            "workflow": {"name": "Created Workflow"},
            "validation": {"valid": True}
        }

        nodes_config = {"node1": {"name": "Test", "type": "provider"}}
        connections = []

        response = client.post(
            "/workflow/create",
            json={
                "nodes_config": nodes_config,
                "connections": connections,
                "name": "Test Workflow"
            }
        )

        assert response.status_code == 200
        assert response.json()["status"] == "created"
        assert response.json()["workflow"]["name"] == "Created Workflow"

    def test_create_workflow_failure(self, client, mock_query_engine):
        """Test workflow creation failure"""
        mock_query_engine.create_custom_workflow.return_value = {
            "success": False,
            "error": "Invalid node configuration"
        }

        response = client.post(
            "/workflow/create",
            json={
                "nodes_config": {},
                "connections": []
            }
        )

        assert response.status_code == 400
        assert "Workflow creation failed" in response.json()["detail"]


class TestSelectorsEndpoints:
    """Test selector-related endpoints"""

    def test_get_selectors_registry(self, client):
        """Test selectors registry endpoint"""
        response = client.get("/selectors/registry")
        assert response.status_code == 200

        data = response.json()
        assert "selectors" in data
        assert "total_selectors" in data
        assert data["total_selectors"] > 0

        # Check that a known selector is present
        assert "google_search_input" in data["selectors"]


class TestProviderEndpoints:
    """Test provider-related endpoints"""

    def test_test_provider_success(self, client, mock_provider_manager):
        """Test successful provider test"""
        mock_provider = MagicMock()
        mock_provider.validate_connection.return_value = {"valid": True}
        mock_provider.get_usage_stats.return_value = {"requests": 5}
        mock_provider_manager.get_provider.return_value = mock_provider

        response = client.post("/providers/test", json={"provider_name": "gemini"})
        assert response.status_code == 200

        data = response.json()
        assert data["provider"] == "gemini"
        assert data["connection_test"]["valid"] == True
        assert data["usage_stats"]["requests"] == 5

    def test_test_provider_not_found(self, client, mock_provider_manager):
        """Test provider not found"""
        mock_provider_manager.get_provider.return_value = None

        response = client.post("/providers/test", json={"provider_name": "nonexistent"})
        assert response.status_code == 404
        assert "not found" in response.json()["detail"]

    def test_get_providers_status(self, client, mock_query_engine):
        """Test providers status endpoint"""
        mock_query_engine.get_provider_status.return_value = {
            "providers": {"gemini": {"valid": True}},
            "usage_stats": {"gemini": {"requests": 10}},
            "default_provider": "gemini"
        }

        response = client.get("/providers/status")
        assert response.status_code == 200

        data = response.json()
        assert "providers" in data
        assert "usage_stats" in data
        assert data["default_provider"] == "gemini"

    def test_get_providers_status_error(self, client, mock_query_engine):
        """Test providers status error"""
        mock_query_engine.get_provider_status.side_effect = Exception("Test error")

        response = client.get("/providers/status")
        assert response.status_code == 500
        assert "Failed to get provider status" in response.json()["detail"]


class TestExecutionEndpoints:
    """Test execution-related endpoints"""

    def test_get_execution_history(self, client, mock_query_engine):
        """Test execution history endpoint"""
        mock_query_engine.get_execution_history.return_value = {
            "executions": [
                {
                    "execution_id": "exec_123",
                    "timestamp": "2023-01-01T00:00:00",
                    "success": True,
                    "execution_time": 5.5
                }
            ],
            "total": 1
        }

        response = client.get("/execution/history?limit=5")
        assert response.status_code == 200

        data = response.json()
        assert "executions" in data
        assert "total" in data
        assert len(data["executions"]) == 1

    def test_get_execution_history_with_details(self, client, mock_query_engine):
        """Test execution history with details"""
        mock_query_engine.get_execution_history.return_value = {
            "executions": [{"execution_id": "exec_123", "details": "test"}],
            "total": 1
        }

        response = client.get("/execution/history?include_details=true")
        assert response.status_code == 200
        assert len(response.json()["executions"]) == 1


class TestSystemEndpoints:
    """Test system-related endpoints"""

    def test_health_check(self, client):
        """Test health check endpoint"""
        response = client.get("/health")
        assert response.status_code == 200

        data = response.json()
        assert data["status"] == "healthy"
        assert "components" in data
        assert "timestamp" in data
        assert "version" in data

    def test_cleanup_endpoint(self, client):
        """Test cleanup endpoint"""
        response = client.post("/admin/cleanup?days=30")
        assert response.status_code == 200

        data = response.json()
        assert data["status"] == "cleanup_completed"
        assert "message" in data


class TestErrorHandling:
    """Test error handling"""

    def test_http_exception_handler(self, client):
        """Test HTTP exception handler"""
        # This would normally be triggered by an endpoint that raises HTTPException
        # For testing, we'll make a request that should fail
        response = client.get("/nonexistent")
        assert response.status_code == 404

    def test_general_exception_handler(self, client, mock_query_engine):
        """Test general exception handler"""
        mock_query_engine.execute_query.side_effect = Exception("Test error")

        workflow = {"name": "Test"}
        request_data = {"workflow": workflow}

        response = client.post("/workflow/execute", json=request_data)
        assert response.status_code == 500
        assert "Internal server error" in response.json()["error"]
        assert "Test error" in response.json()["detail"]


class TestAPIModels:
    """Test API request/response models"""

    def test_workflow_execution_request_model(self):
        """Test WorkflowExecutionRequest model"""
        from main import WorkflowExecutionRequest

        data = {
            "workflow": {
                "name": "Test Workflow",
                "nodes": {"node1": {"name": "Test", "type": "provider"}}
            },
            "execution_options": {"test": "option"}
        }

        request = WorkflowExecutionRequest(**data)
        assert request.workflow["name"] == "Test Workflow"
        assert request.execution_options == {"test": "option"}

    def test_workflow_validation_request_model(self):
        """Test WorkflowValidationRequest model"""
        from main import WorkflowValidationRequest

        data = {
            "workflow": {
                "name": "Test Workflow",
                "nodes": {"node1": {"name": "Test", "type": "provider"}}
            }
        }

        request = WorkflowValidationRequest(**data)
        assert request.workflow["name"] == "Test Workflow"

    def test_provider_test_request_model(self):
        """Test ProviderTestRequest model"""
        from main import ProviderTestRequest

        data = {"provider_name": "gemini"}
        request = ProviderTestRequest(**data)
        assert request.provider_name == "gemini"