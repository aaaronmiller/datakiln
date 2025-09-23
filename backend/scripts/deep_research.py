#!/usr/bin/env python3
"""
Deep Research Script
Performs comprehensive research using multiple AI providers and web sources.
"""

import asyncio
import json
import os
import sys
from datetime import datetime
from typing import Dict, List, Optional, Any
from pathlib import Path
import uuid

# Add backend to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from providers import get_provider
from research_agent import ResearchAgent, ResearchMode

class DeepResearchEngine:
    """Engine for performing deep research tasks."""

    def __init__(self):
        self.providers = {}
        self.research_agent = ResearchAgent()
        self.output_dir = Path("research_results")
        self.output_dir.mkdir(exist_ok=True)

    def initialize_providers(self, selector_profile: str = "balanced"):
        """Initialize AI providers based on selector profile."""
        try:
            # Load selectors configuration
            selectors_path = Path(__file__).parent.parent / "selectors.json"
            with open(selectors_path, 'r') as f:
                selectors = json.load(f)

            profile = selectors.get(selector_profile, selectors.get("balanced", {}))

            # Initialize providers based on profile
            for provider_name, config in profile.items():
                if config.get("enabled", False):
                    try:
                        provider = get_provider(provider_name, config)
                        self.providers[provider_name] = provider
                    except Exception as e:
                        print(f"Failed to initialize provider {provider_name}: {e}")

            if not self.providers:
                # Fallback to basic providers
                self.providers["gemini"] = get_provider("gemini", {"enabled": True})

        except Exception as e:
            print(f"Error loading selectors: {e}")
            # Fallback
            self.providers["gemini"] = get_provider("gemini", {"enabled": True})

    async def perform_research(self, query: str, mode: str = "balanced",
                             concurrency: int = 3, retries: int = 2) -> Dict[str, Any]:
        """Perform deep research on a query."""

        research_id = str(uuid.uuid4())
        start_time = datetime.now()

        print(f"Starting deep research: {query} (mode: {mode})")

        # Initialize providers
        self.initialize_providers("balanced")  # Use balanced profile for now

        # Map string mode to enum
        mode_map = {
            "fast": ResearchMode.FAST,
            "balanced": ResearchMode.BALANCED,
            "comprehensive": ResearchMode.COMPREHENSIVE
        }
        research_mode = mode_map.get(mode, ResearchMode.BALANCED)

        try:
            # Perform research using the agent
            result = await self.research_agent.run_research(query, research_mode)

            # Enhance with provider-based analysis
            enhanced_result = await self.enhance_with_providers(query, result, concurrency, retries)

            # Save results
            output_file = self.save_research_results(research_id, query, enhanced_result, start_time)

            return {
                "research_id": research_id,
                "query": query,
                "mode": mode,
                "status": "completed",
                "results": enhanced_result,
                "output_file": output_file,
                "start_time": start_time.isoformat(),
                "end_time": datetime.now().isoformat(),
                "duration_seconds": (datetime.now() - start_time).total_seconds()
            }

        except Exception as e:
            print(f"Research failed: {e}")
            return {
                "research_id": research_id,
                "query": query,
                "mode": mode,
                "status": "failed",
                "error": str(e),
                "start_time": start_time.isoformat(),
                "end_time": datetime.now().isoformat()
            }

    async def enhance_with_providers(self, query: str, base_result: Dict[str, Any],
                                   concurrency: int, retries: int) -> Dict[str, Any]:
        """Enhance research results using AI providers."""

        enhanced = base_result.copy()

        # Prepare analysis prompts
        analysis_tasks = [
            self.analyze_with_provider(provider_name, provider, query, base_result)
            for provider_name, provider in self.providers.items()
        ]

        # Execute with concurrency control
        semaphore = asyncio.Semaphore(concurrency)
        async def limited_task(task):
            async with semaphore:
                return await task

        # Run analysis tasks
        results = await asyncio.gather(
            *[limited_task(task) for task in analysis_tasks],
            return_exceptions=True
        )

        # Collect successful results
        provider_analyses = {}
        for i, result in enumerate(results):
            provider_name = list(self.providers.keys())[i]
            if not isinstance(result, Exception):
                provider_analyses[provider_name] = result

        enhanced["provider_analyses"] = provider_analyses
        enhanced["analysis_summary"] = self.summarize_analyses(provider_analyses)

        return enhanced

    async def analyze_with_provider(self, provider_name: str, provider, query: str,
                                  base_result: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze query using a specific provider."""

        prompt = f"""
        Perform deep analysis on the following research query and provide comprehensive insights:

        Query: {query}

        Base Research Results: {json.dumps(base_result, indent=2)}

        Please provide:
        1. Key findings and insights
        2. Supporting evidence or data points
        3. Potential implications or applications
        4. Areas for further investigation
        5. Confidence level in the analysis (high/medium/low)

        Structure your response as a JSON object with these keys: findings, evidence, implications, further_investigation, confidence.
        """

        try:
            response = await provider.generate(prompt)
            # Try to parse as JSON
            try:
                analysis = json.loads(response)
            except:
                # Fallback to text analysis
                analysis = {
                    "findings": response,
                    "evidence": "Generated by AI analysis",
                    "implications": "See findings",
                    "further_investigation": "Additional research recommended",
                    "confidence": "medium"
                }

            return {
                "provider": provider_name,
                "analysis": analysis,
                "timestamp": datetime.now().isoformat()
            }

        except Exception as e:
            return {
                "provider": provider_name,
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            }

    def summarize_analyses(self, provider_analyses: Dict[str, Any]) -> Dict[str, Any]:
        """Summarize multiple provider analyses."""

        if not provider_analyses:
            return {"summary": "No analyses available"}

        # Simple aggregation
        total_providers = len(provider_analyses)
        successful_analyses = [a for a in provider_analyses.values() if "analysis" in a]

        confidence_levels = []
        for analysis in successful_analyses:
            conf = analysis.get("analysis", {}).get("confidence", "medium")
            confidence_map = {"high": 3, "medium": 2, "low": 1}
            confidence_levels.append(confidence_map.get(conf, 2))

        avg_confidence = sum(confidence_levels) / len(confidence_levels) if confidence_levels else 2

        return {
            "total_providers_used": total_providers,
            "successful_analyses": len(successful_analyses),
            "average_confidence": "high" if avg_confidence >= 2.5 else "medium" if avg_confidence >= 1.5 else "low",
            "key_themes": self.extract_key_themes(successful_analyses)
        }

    def extract_key_themes(self, analyses: List[Dict[str, Any]]) -> List[str]:
        """Extract key themes from analyses."""
        themes = []
        for analysis in analyses:
            findings = analysis.get("analysis", {}).get("findings", "")
            if isinstance(findings, str) and len(findings) > 50:
                # Simple theme extraction - first sentence or key phrases
                first_sentence = findings.split('.')[0] if '.' in findings else findings[:100]
                themes.append(first_sentence.strip())

        return themes[:5]  # Limit to top 5

    def save_research_results(self, research_id: str, query: str, results: Dict[str, Any],
                            start_time: datetime) -> str:
        """Save research results to file."""

        timestamp = start_time.strftime("%Y%m%d_%H%M%S")
        filename = f"deep_research_{research_id}_{timestamp}.json"
        filepath = self.output_dir / filename

        research_document = {
            "metadata": {
                "research_id": research_id,
                "query": query,
                "timestamp": start_time.isoformat(),
                "duration_seconds": (datetime.now() - start_time).total_seconds(),
                "script_version": "1.0.0"
            },
            "results": results
        }

        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(research_document, f, indent=2, ensure_ascii=False)

        print(f"Research results saved to: {filepath}")
        return str(filepath)

async def main():
    """Main entry point for deep research script."""
    import argparse

    parser = argparse.ArgumentParser(description='Perform deep research')
    parser.add_argument('query', help='Research query')
    parser.add_argument('--mode', choices=['fast', 'balanced', 'comprehensive'],
                       default='balanced', help='Research mode')
    parser.add_argument('--concurrency', type=int, default=3,
                       help='Number of concurrent operations')
    parser.add_argument('--retries', type=int, default=2,
                       help='Number of retries for failed operations')
    parser.add_argument('--output-dir', default='research_results',
                       help='Output directory')

    args = parser.parse_args()

    # Create research engine
    engine = DeepResearchEngine()
    if args.output_dir != 'research_results':
        engine.output_dir = Path(args.output_dir)
        engine.output_dir.mkdir(exist_ok=True)

    try:
        # Perform research
        result = await engine.perform_research(
            query=args.query,
            mode=args.mode,
            concurrency=args.concurrency,
            retries=args.retries
        )

        # Print summary
        print(f"\nResearch completed successfully!")
        print(f"Research ID: {result['research_id']}")
        print(f"Query: {result['query']}")
        print(f"Mode: {result['mode']}")
        print(f"Duration: {result['duration_seconds']:.2f} seconds")
        print(f"Results saved to: {result['output_file']}")

        # Print status for API consumption
        print(f"STATUS: {result['status']}")

    except Exception as e:
        print(f"Research failed: {e}")
        print("STATUS: failed")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())