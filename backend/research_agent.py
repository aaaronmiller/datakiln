import asyncio
from enum import Enum

class ResearchMode(Enum):
    FAST = "fast"
    BALANCED = "balanced"
    COMPREHENSIVE = "comprehensive"

class ResearchAgent:
    def __init__(self):
        self.research_tree = {}

    async def run_research(self, query: str, mode: ResearchMode):
        print(f"Starting research for '{query}' in {mode.value} mode...")
        # Placeholder for actual research logic
        await asyncio.sleep(2) # Simulate work
        self.research_tree[query] = {"status": "completed", "mode": mode.value, "result": f"Research results for {query}"}
        print(f"Research for '{query}' completed.")
        return self.research_tree[query]
