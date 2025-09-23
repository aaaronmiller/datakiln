#!/usr/bin/env python3
"""
Test script for the Deep Research Engine
"""

import asyncio
import sys
from pathlib import Path

# Add backend to path
backend_path = Path(__file__).parent / "backend"
sys.path.insert(0, str(backend_path))

from research_agent import ResearchAgent, ResearchMode

async def test_research_agent():
    """Test the research agent functionality."""
    print("Testing Research Agent...")

    agent = ResearchAgent()

    # Test fast mode
    print("\n=== Testing FAST Mode ===")
    result = await agent.run_research(
        "What are the benefits of renewable energy?",
        ResearchMode.FAST
    )
    print(f"Fast mode result: {result['status']}")

    # Test balanced mode
    print("\n=== Testing BALANCED Mode ===")
    result = await agent.run_research(
        "How does artificial intelligence work?",
        ResearchMode.BALANCED
    )
    print(f"Balanced mode result: {result['status']}")

    # Test comprehensive mode
    print("\n=== Testing COMPREHENSIVE Mode ===")
    result = await agent.run_research(
        "What are the implications of quantum computing?",
        ResearchMode.COMPREHENSIVE
    )
    print(f"Comprehensive mode result: {result['status']}")

    print("\n=== Research Agent Tests Completed ===")

if __name__ == "__main__":
    asyncio.run(test_research_agent())