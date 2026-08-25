"""
Contract Conformance Tests

Verifies that all endpoints specified in consolidated-contract.md
are implemented and return the expected response shapes.
"""

import pytest
from fastapi.testclient import TestClient
import json


class TestNodeEndpoints:
    """Test /api/v1/nodes/* endpoints per contract."""
    
    def test_get_node_types(self, client: TestClient):
        """GET /api/v1/nodes/types should return NODE_REGISTRY."""
        response = client.get("/api/v1/nodes/types")
        
        assert response.status_code == 200
        data = response.json()
        
        # Contract: Returns NODE_REGISTRY_V1.json content
        assert "version" in data
        assert "nodes" in data
        assert isinstance(data["nodes"], list)
        assert len(data["nodes"]) >= 10  # 10 node types per contract
        
        # Verify each node has required fields
        for node in data["nodes"]:
            assert "type" in node
            assert "version" in node
            assert "inputs" in node
            assert "outputs" in node
            assert "paramsSchema" in node
    
    def test_get_specific_node_type(self, client: TestClient):
        """GET /api/v1/nodes/types/{type} should return specific node."""
        response = client.get("/api/v1/nodes/types/provider")
        
        assert response.status_code == 200
        data = response.json()
        assert data["type"] == "provider"
        assert "paramsSchema" in data
    
    def test_get_unknown_node_type(self, client: TestClient):
        """GET /api/v1/nodes/types/{type} should 404 for unknown type."""
        response = client.get("/api/v1/nodes/types/nonexistent")
        assert response.status_code == 404
    
    def test_validate_node(self, client: TestClient):
        """POST /api/v1/nodes/validate should validate node config."""
        response = client.post("/api/v1/nodes/validate", json={
            "type": "provider",
            "params": {
                "provider_type": "gemini_deep_research"
            }
        })
        
        assert response.status_code == 200
        data = response.json()
        
        # Contract response shape
        assert "valid" in data
        assert "errors" in data
        assert "warnings" in data
        assert isinstance(data["errors"], list)
        assert isinstance(data["warnings"], list)
    
    def test_validate_node_missing_required(self, client: TestClient):
        """Validation should fail when required params missing."""
        response = client.post("/api/v1/nodes/validate", json={
            "type": "provider",
            "params": {}  # Missing required provider_type
        })
        
        assert response.status_code == 200
        data = response.json()
        assert data["valid"] is False
        assert len(data["errors"]) > 0
    
    def test_validate_graph(self, client: TestClient):
        """POST /api/v1/nodes/validate-graph should validate full graph."""
        response = client.post("/api/v1/nodes/validate-graph", json={
            "nodes": [
                {
                    "id": "node1",
                    "type": "provider",
                    "data": {"params": {"provider_type": "gemini_deep_research"}}
                },
                {
                    "id": "node2",
                    "type": "transform",
                    "data": {"params": {"transform_type": "markdown"}}
                }
            ],
            "edges": [
                {"source": "node1", "target": "node2"}
            ]
        })
        
        assert response.status_code == 200
        data = response.json()
        assert "valid" in data
        assert "errors" in data
        assert "warnings" in data


class TestResultsEndpoints:
    """Test /api/v1/results/* endpoints per contract."""
    
    def test_list_results(self, client: TestClient):
        """GET /api/v1/results should return paginated list."""
        response = client.get("/api/v1/results")
        
        assert response.status_code == 200
        data = response.json()
        
        # Contract response shape
        assert "results" in data
        assert "pagination" in data
        assert isinstance(data["results"], list)
        
        pagination = data["pagination"]
        assert "total" in pagination
        assert "offset" in pagination
        assert "limit" in pagination
        assert "has_more" in pagination
    
    def test_list_results_with_filters(self, client: TestClient):
        """GET /api/v1/results should accept query filters."""
        response = client.get("/api/v1/results?status=completed&limit=10&offset=0")
        
        assert response.status_code == 200
        data = response.json()
        assert data["pagination"]["limit"] == 10
        assert data["pagination"]["offset"] == 0
    
    def test_get_result_details_not_found(self, client: TestClient):
        """GET /api/v1/results/{id} should 404 for unknown ID."""
        response = client.get("/api/v1/results/nonexistent-id")
        assert response.status_code == 404
    
    def test_export_results_not_found(self, client: TestClient):
        """GET /api/v1/results/{id}/export should 404 for unknown ID."""
        response = client.get("/api/v1/results/nonexistent-id/export")
        assert response.status_code == 404


class TestExtensionEndpoints:
    """Test /api/v1/extension/* endpoints per contract."""
    
    def test_get_extension_workflows(self, client: TestClient):
        """GET /api/v1/extension/workflows should return workflow list."""
        response = client.get("/api/v1/extension/workflows")
        
        assert response.status_code == 200
        data = response.json()
        
        # Contract response shape
        assert "workflows" in data
        assert isinstance(data["workflows"], list)
        
        if data["workflows"]:
            wf = data["workflows"][0]
            assert "id" in wf
            assert "name" in wf
            assert "description" in wf
            assert "input_type" in wf
            assert "output_destination" in wf
            assert "category" in wf
    
    def test_trigger_workflow(self, client: TestClient):
        """POST /api/v1/extension/trigger-workflow should start execution."""
        response = client.post("/api/v1/extension/trigger-workflow", json={
            "workflow_id": "youtube-analysis",
            "input_data": {
                "type": "url",
                "content": "https://youtube.com/watch?v=test123",
                "metadata": {}
            },
            "output_config": {
                "destination": "obsidian"
            }
        })
        
        assert response.status_code == 200
        data = response.json()
        
        # Contract response shape
        assert "execution_id" in data
        assert "status" in data
        assert "estimated_duration" in data
        assert "output_destination" in data
        assert data["status"] == "started"
    
    def test_trigger_workflow_not_found(self, client: TestClient):
        """POST /api/v1/extension/trigger-workflow should 404 for unknown workflow."""
        response = client.post("/api/v1/extension/trigger-workflow", json={
            "workflow_id": "nonexistent",
            "input_data": {"type": "url", "content": "test"},
            "output_config": {}
        })
        assert response.status_code == 404
    
    def test_define_selector(self, client: TestClient):
        """POST /api/v1/extension/define-selector should create selector."""
        response = client.post("/api/v1/extension/define-selector", json={
            "url_pattern": "^https://example\\.com/.*",
            "selector_name": "main-content",
            "dom_selector": "article.main-content",
            "extraction_type": "text",
            "description": "Test selector"
        })
        
        assert response.status_code == 200
        data = response.json()
        
        assert "status" in data
        assert "selector_id" in data
        assert data["status"] == "success"
    
    def test_define_selector_invalid_regex(self, client: TestClient):
        """POST /api/v1/extension/define-selector should reject invalid regex."""
        response = client.post("/api/v1/extension/define-selector", json={
            "url_pattern": "[invalid(regex",
            "selector_name": "test",
            "dom_selector": "div",
            "extraction_type": "text"
        })
        assert response.status_code == 400
    
    def test_get_selectors(self, client: TestClient):
        """GET /api/v1/extension/selectors should return selector list."""
        response = client.get("/api/v1/extension/selectors")
        
        assert response.status_code == 200
        data = response.json()
        
        # Contract response shape
        assert "selectors" in data
        assert isinstance(data["selectors"], list)
    
    def test_get_selectors_with_url(self, client: TestClient):
        """GET /api/v1/extension/selectors?url=... should filter by URL."""
        response = client.get("/api/v1/extension/selectors?url=https://example.com/page")
        
        assert response.status_code == 200
        assert "selectors" in response.json()
    
    def test_get_extension_status(self, client: TestClient):
        """GET /api/v1/extension/status should return status info."""
        response = client.get("/api/v1/extension/status")
        
        assert response.status_code == 200
        data = response.json()
        
        # Contract response shape
        assert "connected" in data
        assert "version" in data
        assert "permissions" in data
        assert "available_workflows" in data


class TestHealthEndpoint:
    """Test health check endpoint."""
    
    def test_health_check(self, client: TestClient):
        """GET /health should return healthy status."""
        response = client.get("/health")
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"


# ==============================================================================
# Pytest Fixtures
# ==============================================================================

@pytest.fixture
def client():
    """Create test client for API testing."""
    from backend.app.main import app
    return TestClient(app)


# Helper to run tests directly
if __name__ == "__main__":
    pytest.main([__file__, "-v"])
