import pytest
from unittest.mock import AsyncMock, patch
from backend.research_agent import ResearchAgent, ResearchMode

class TestResearchAgent:
    """Test cases for ResearchAgent class"""

    @pytest.fixture
    def research_agent(self):
        """ResearchAgent instance for testing"""
        return ResearchAgent()

    @pytest.mark.asyncio
    async def test_run_research_fast_mode(self, research_agent):
        """Test research execution in fast mode"""
        query = "test query"
        result = await research_agent.run_research(query, ResearchMode.FAST)

        assert result["status"] == "completed"
        assert result["mode"] == "fast"
        assert query in result["result"]
        assert research_agent.research_tree[query] == result

    @pytest.mark.asyncio
    async def test_run_research_balanced_mode(self, research_agent):
        """Test research execution in balanced mode"""
        query = "test query"
        result = await research_agent.run_research(query, ResearchMode.BALANCED)

        assert result["status"] == "completed"
        assert result["mode"] == "balanced"
        assert query in result["result"]

    @pytest.mark.asyncio
    async def test_run_research_comprehensive_mode(self, research_agent):
        """Test research execution in comprehensive mode"""
        query = "test query"
        result = await research_agent.run_research(query, ResearchMode.COMPREHENSIVE)

        assert result["status"] == "completed"
        assert result["mode"] == "comprehensive"
        assert query in result["result"]

    def test_research_tree_storage(self, research_agent):
        """Test that research results are stored in research_tree"""
        assert hasattr(research_agent, 'research_tree')
        assert isinstance(research_agent.research_tree, dict)

    @pytest.mark.asyncio
    async def test_multiple_research_queries(self, research_agent):
        """Test running multiple research queries"""
        queries = ["query1", "query2", "query3"]

        for query in queries:
            result = await research_agent.run_research(query, ResearchMode.BALANCED)
            assert result["status"] == "completed"
            assert query in research_agent.research_tree

        assert len(research_agent.research_tree) == len(queries)