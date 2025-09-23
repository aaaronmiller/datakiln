import asyncio
import uuid
from enum import Enum
from typing import Dict, List, Any, Optional
from datetime import datetime
import json
from pathlib import Path

class ResearchMode(Enum):
    FAST = "fast"
    BALANCED = "balanced"
    COMPREHENSIVE = "comprehensive"

class ResearchNode:
    """Represents a node in the research tree."""

    def __init__(self, query: str, parent_id: Optional[str] = None):
        self.id = str(uuid.uuid4())
        self.query = query
        self.parent_id = parent_id
        self.children: List[str] = []
        self.status = "pending"  # pending, running, completed, failed
        self.result: Optional[Dict[str, Any]] = None
        self.created_at = datetime.now()
        self.updated_at = datetime.now()
        self.depth = 0
        self.follow_ups: List[str] = []
        self.sources: List[Dict[str, Any]] = []
        self.confidence_score = 0.0

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "query": self.query,
            "parent_id": self.parent_id,
            "children": self.children,
            "status": self.status,
            "result": self.result,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
            "depth": self.depth,
            "follow_ups": self.follow_ups,
            "sources": self.sources,
            "confidence_score": self.confidence_score
        }

class ResearchAgent:
    """Advanced research agent with tree-based research management."""

    def __init__(self, data_dir: str = "research_data"):
        self.data_dir = Path(data_dir)
        self.data_dir.mkdir(exist_ok=True)
        self.research_trees: Dict[str, Dict[str, ResearchNode]] = {}
        self.active_researches: Dict[str, asyncio.Task] = {}

        # Mode configurations
        self.mode_configs = {
            ResearchMode.FAST: {
                "max_concurrent": 3,
                "max_follow_ups": 2,
                "recursion_enabled": False,
                "max_depth": 1,
                "timeout_minutes": 3
            },
            ResearchMode.BALANCED: {
                "max_concurrent": 7,
                "max_follow_ups": 5,
                "recursion_enabled": False,
                "max_depth": 2,
                "timeout_minutes": 6
            },
            ResearchMode.COMPREHENSIVE: {
                "max_concurrent": 5,
                "max_follow_ups": 7,
                "recursion_enabled": True,
                "max_depth": 4,
                "timeout_minutes": 12,
                "counter_arguments": True
            }
        }

    async def run_research(self, query: str, mode: ResearchMode, research_id: Optional[str] = None) -> Dict[str, Any]:
        """Run research with specified mode and return results."""
        if research_id is None:
            research_id = str(uuid.uuid4())

        print(f"Starting research '{research_id}' for '{query}' in {mode.value} mode...")

        # Create root research node
        root_node = ResearchNode(query)
        root_node.status = "running"
        self.research_trees[research_id] = {root_node.id: root_node}

        # Save initial state
        self._save_research_tree(research_id)

        try:
            # Execute research based on mode
            config = self.mode_configs[mode]
            result = await self._execute_research_mode(root_node, mode, config, research_id)

            # Update root node with results
            root_node.status = "completed"
            root_node.result = result
            root_node.updated_at = datetime.now()

            # Save final state
            self._save_research_tree(research_id)

            print(f"Research '{research_id}' completed successfully.")
            return self._get_research_summary(research_id)

        except Exception as e:
            root_node.status = "failed"
            root_node.result = {"error": str(e)}
            root_node.updated_at = datetime.now()
            self._save_research_tree(research_id)
            print(f"Research '{research_id}' failed: {e}")
            raise

    async def _execute_research_mode(self, root_node: ResearchNode, mode: ResearchMode,
                                   config: Dict[str, Any], research_id: str) -> Dict[str, Any]:
        """Execute research based on the specified mode configuration."""

        semaphore = asyncio.Semaphore(config["max_concurrent"])
        follow_up_count = 0
        max_follow_ups = config["max_follow_ups"]

        # Initial research
        initial_result = await self._perform_research_query(root_node.query, semaphore)

        # Generate follow-up questions
        follow_up_questions = await self._generate_follow_ups(root_node.query, initial_result, mode)

        # Process follow-ups based on mode
        follow_up_results = []
        for question in follow_up_questions[:max_follow_ups]:
            if follow_up_count >= max_follow_ups:
                break

            follow_up_result = await self._perform_research_query(question, semaphore)
            follow_up_results.append({
                "question": question,
                "result": follow_up_result
            })
            follow_up_count += 1

        # For comprehensive mode, add counter-arguments
        counter_arguments = []
        if config.get("counter_arguments", False):
            counter_arguments = await self._generate_counter_arguments(root_node.query, initial_result)

        return {
            "query": root_node.query,
            "mode": mode.value,
            "initial_research": initial_result,
            "follow_ups": follow_up_results,
            "counter_arguments": counter_arguments,
            "total_follow_ups": len(follow_up_results),
            "research_depth": config["max_depth"],
            "completed_at": datetime.now().isoformat()
        }

    async def _perform_research_query(self, query: str, semaphore: asyncio.Semaphore) -> Dict[str, Any]:
        """Perform a single research query with concurrency control."""
        async with semaphore:
            # Simulate research work - in real implementation, this would call AI providers
            await asyncio.sleep(1)  # Simulate API call delay

            return {
                "query": query,
                "findings": f"Research findings for: {query}",
                "sources": ["source1", "source2"],
                "confidence": 0.8,
                "timestamp": datetime.now().isoformat()
            }

    async def _generate_follow_ups(self, original_query: str, initial_result: Dict[str, Any],
                                 mode: ResearchMode) -> List[str]:
        """Generate follow-up questions based on initial research."""
        # Simulate follow-up generation
        await asyncio.sleep(0.5)

        base_questions = [
            f"What are the latest developments in {original_query}?",
            f"What are the challenges associated with {original_query}?",
            f"How does {original_query} compare to alternatives?",
            f"What are the future implications of {original_query}?",
            f"What are the practical applications of {original_query}?"
        ]

        # Return different numbers based on mode
        if mode == ResearchMode.FAST:
            return base_questions[:2]
        elif mode == ResearchMode.BALANCED:
            return base_questions[:4]
        else:  # COMPREHENSIVE
            return base_questions

    async def _generate_counter_arguments(self, query: str, result: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Generate counter-arguments for comprehensive research."""
        await asyncio.sleep(0.5)

        return [
            {
                "argument": f"Potential limitation of {query}",
                "evidence": "Counter-evidence from research",
                "impact": "Medium"
            }
        ]

    def _save_research_tree(self, research_id: str):
        """Save research tree to disk."""
        tree_data = {
            "research_id": research_id,
            "nodes": {node_id: node.to_dict() for node_id, node in self.research_trees[research_id].items()},
            "created_at": datetime.now().isoformat()
        }

        filepath = self.data_dir / f"research_{research_id}.json"
        with open(filepath, 'w') as f:
            json.dump(tree_data, f, indent=2)

    def _get_research_summary(self, research_id: str) -> Dict[str, Any]:
        """Get summary of research tree."""
        if research_id not in self.research_trees:
            return {"error": "Research not found"}

        tree = self.research_trees[research_id]
        root_node = next((node for node in tree.values() if node.parent_id is None), None)

        if not root_node:
            return {"error": "Root node not found"}

        return {
            "research_id": research_id,
            "query": root_node.query,
            "status": root_node.status,
            "result": root_node.result,
            "total_nodes": len(tree),
            "created_at": root_node.created_at.isoformat(),
            "updated_at": root_node.updated_at.isoformat()
        }

    def get_research_status(self, research_id: str) -> Dict[str, Any]:
        """Get current status of a research task."""
        return self._get_research_summary(research_id)

    def list_researches(self) -> List[Dict[str, Any]]:
        """List all research tasks."""
        return [self._get_research_summary(rid) for rid in self.research_trees.keys()]
