import pytest
from fastapi.testclient import TestClient
from backend.main import app

@pytest.fixture
def client():
    """FastAPI test client fixture"""
    return TestClient(app)

@pytest.fixture
def sample_research_request():
    """Sample research request data"""
    return {
        "query": "test research query",
        "mode": "balanced"
    }

@pytest.fixture
def sample_chat_data():
    """Sample chat data for testing"""
    return {
        "site": "example.com",
        "userId": "user123",
        "timestamp": "2024-01-01T12:00:00Z",
        "model": "gpt-4",
        "messages": [
            {"role": "user", "content": "Hello"},
            {"role": "assistant", "content": "Hi there!"}
        ]
    }