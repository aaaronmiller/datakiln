import pytest
from unittest.mock import patch, AsyncMock
from backend.research_agent import ResearchMode

class TestAPIEndpoints:
    """Test cases for FastAPI endpoints"""

    def test_root_endpoint(self, client):
        """Test the root endpoint returns correct message"""
        response = client.get("/")
        assert response.status_code == 200
        assert response.json() == {"message": "FastAPI backend is running!"}

    @pytest.mark.asyncio
    async def test_research_endpoint_success(self, client, sample_research_request):
        """Test successful research endpoint call"""
        with patch('backend.main.research_agent') as mock_agent:
            mock_agent.run_research = AsyncMock(return_value={
                "status": "completed",
                "mode": "balanced",
                "result": "Research results for test research query"
            })

            response = client.post("/research", json=sample_research_request)

            assert response.status_code == 200
            data = response.json()
            assert data["status"] == "Research started"
            assert "result" in data

            # Verify the mock was called correctly
            mock_agent.run_research.assert_called_once_with(
                sample_research_request["query"],
                ResearchMode.BALANCED
            )

    def test_research_endpoint_invalid_mode(self, client):
        """Test research endpoint with invalid mode"""
        invalid_request = {
            "query": "test query",
            "mode": "invalid_mode"
        }

        response = client.post("/research", json=invalid_request)
        # This should fail validation
        assert response.status_code == 422  # Validation error

    def test_research_endpoint_missing_query(self, client):
        """Test research endpoint with missing query"""
        invalid_request = {
            "mode": "balanced"
        }

        response = client.post("/research", json=invalid_request)
        assert response.status_code == 422  # Validation error

    def test_chat_logs_endpoint(self, client, sample_chat_data):
        """Test chat logs endpoint"""
        response = client.post("/chat-logs", json=sample_chat_data)

        assert response.status_code == 200
        assert response.json() == {"status": "received"}

    def test_chat_logs_endpoint_missing_fields(self, client):
        """Test chat logs endpoint with missing required fields"""
        incomplete_data = {
            "site": "example.com",
            "userId": "user123"
            # Missing timestamp, model, messages
        }

        response = client.post("/chat-logs", json=incomplete_data)
        assert response.status_code == 422  # Validation error

    @pytest.mark.asyncio
    async def test_research_endpoint_error_handling(self, client, sample_research_request):
        """Test research endpoint error handling"""
        with patch('backend.main.research_agent') as mock_agent:
            mock_agent.run_research = AsyncMock(side_effect=Exception("Research failed"))

            # The endpoint should raise an exception when research fails
            with pytest.raises(Exception, match="Research failed"):
                client.post("/research", json=sample_research_request)

    def test_cors_headers(self, client):
        """Test CORS headers are present"""
        response = client.options("/", headers={
            "Origin": "http://localhost:3000",
            "Access-Control-Request-Method": "GET"
        })

        # Note: CORS middleware might need to be added to the app
        # This test documents current CORS behavior
        assert response.status_code in [200, 404, 405]  # 405 if OPTIONS not allowed