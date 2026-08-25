#!/usr/bin/env python3
"""
DataKiln CLI - Command Line Interface for executing workflows and actions.

Usage:
    python cli.py research "your query here" --mode balanced
    python cli.py youtube "https://youtube.com/watch?v=VIDEO_ID"
    python cli.py workflow execute WORKFLOW_ID --input '{"key": "value"}'
    python cli.py status EXECUTION_ID
"""

import argparse
import json
import sys
import time
from pathlib import Path

try:
    import requests
except ImportError:
    print("Error: requests library required. Run: pip install requests")
    sys.exit(1)

# Configuration
DEFAULT_API_URL = "http://localhost:8000"


class DataKilnCLI:
    """CLI interface for DataKiln API."""

    def __init__(self, api_url: str = DEFAULT_API_URL):
        self.api_url = api_url.rstrip('/')

    def _request(self, method: str, endpoint: str, **kwargs) -> dict:
        """Make an API request."""
        url = f"{self.api_url}{endpoint}"
        try:
            response = requests.request(method, url, timeout=60, **kwargs)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.ConnectionError:
            print(f"Error: Cannot connect to DataKiln server at {self.api_url}")
            print("Make sure the backend is running: uvicorn app.main:app")
            sys.exit(1)
        except requests.exceptions.HTTPError as e:
            print(f"Error: API returned status {e.response.status_code}")
            try:
                print(f"Details: {e.response.json()}")
            except:
                print(f"Response: {e.response.text[:500]}")
            sys.exit(1)

    def health_check(self) -> bool:
        """Check if API is available."""
        try:
            requests.get(f"{self.api_url}/api/v1/health", timeout=5)
            return True
        except:
            return False

    # ==================== RESEARCH ====================
    def research(self, query: str, mode: str = "balanced", interface: str = "deep_research", 
                 wait: bool = True, poll_interval: int = 5) -> dict:
        """Start a deep research job."""
        print(f"Starting research: '{query}' (mode: {mode}, interface: {interface})")
        
        result = self._request("POST", "/api/v1/research/start", json={
            "query": query,
            "mode": mode,
            "interface": interface
        })
        
        research_id = result.get("research_id")
        print(f"Research ID: {research_id}")
        
        if wait:
            return self._wait_for_research(research_id, poll_interval)
        return result

    def _wait_for_research(self, research_id: str, poll_interval: int = 5) -> dict:
        """Wait for research to complete."""
        while True:
            status = self._request("GET", f"/api/v1/research/status/{research_id}")
            state = status.get("status")
            progress = status.get("progress", 0)
            
            print(f"Status: {state} ({progress*100:.0f}%)")
            
            if state == "completed":
                print("\n✅ Research completed!")
                return status
            elif state == "failed":
                print(f"\n❌ Research failed: {status.get('error')}")
                return status
            
            time.sleep(poll_interval)

    def research_status(self, research_id: str) -> dict:
        """Get research status."""
        return self._request("GET", f"/api/v1/research/status/{research_id}")

    # ==================== YOUTUBE ====================
    def youtube_transcript(self, url: str) -> dict:
        """Extract transcript from YouTube video."""
        print(f"Extracting transcript from: {url}")
        
        result = self._request("POST", f"/api/v1/youtube/transcript?url={url}")
        
        if result.get("success"):
            file_path = result.get("files", {}).get("transcript")
            word_count = result.get("word_count", 0)
            print(f"\n✅ Transcript extracted!")
            print(f"   Word count: {word_count}")
            print(f"   Saved to: {file_path}")
        else:
            print(f"\n❌ Failed to extract transcript")
        
        return result

    # ==================== WORKFLOWS ====================
    def workflow_execute(self, workflow_id: str, inputs: dict = None) -> dict:
        """Execute a workflow."""
        print(f"Executing workflow: {workflow_id}")
        
        payload = {
            "workflow_id": workflow_id,
            "inputs": inputs or {}
        }
        
        result = self._request("POST", "/api/v1/workflows/execute", json=payload)
        
        execution_id = result.get("execution_id")
        print(f"Execution ID: {execution_id}")
        print(f"Status: {result.get('status')}")
        
        return result

    def workflow_status(self, execution_id: str) -> dict:
        """Get workflow execution status."""
        return self._request("GET", f"/api/v1/results/{execution_id}")

    def list_workflows(self) -> list:
        """List available workflows."""
        result = self._request("GET", "/api/v1/workflows")
        return result

    def list_results(self, limit: int = 20) -> dict:
        """List recent results."""
        return self._request("GET", f"/api/v1/results?limit={limit}")


def main():
    parser = argparse.ArgumentParser(
        description="DataKiln CLI - Execute workflows and actions from the command line",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Deep research on a topic
  python cli.py research "quantum computing applications" --mode comprehensive

  # Extract YouTube transcript  
  python cli.py youtube "https://www.youtube.com/watch?v=dQw4w9WgXcQ"

  # Execute a custom workflow
  python cli.py workflow execute my-workflow --input '{"query": "test"}'

  # Check status of an execution
  python cli.py status abc123-execution-id

  # List recent results
  python cli.py results --limit 10
        """
    )
    
    parser.add_argument("--api-url", default=DEFAULT_API_URL, 
                        help=f"API base URL (default: {DEFAULT_API_URL})")
    
    subparsers = parser.add_subparsers(dest="command", help="Available commands")

    # Research command
    research_parser = subparsers.add_parser("research", help="Perform deep research")
    research_parser.add_argument("query", help="Research query")
    research_parser.add_argument("--mode", choices=["fast", "balanced", "comprehensive"],
                                 default="balanced", help="Research mode")
    research_parser.add_argument("--interface", choices=["deep_research", "canvas"],
                                 default="deep_research", help="Gemini interface")
    research_parser.add_argument("--no-wait", action="store_true", 
                                 help="Don't wait for completion")

    # YouTube command
    youtube_parser = subparsers.add_parser("youtube", help="Extract YouTube transcript")
    youtube_parser.add_argument("url", help="YouTube video URL")

    # Workflow command
    workflow_parser = subparsers.add_parser("workflow", help="Workflow operations")
    workflow_subs = workflow_parser.add_subparsers(dest="workflow_action")
    
    wf_exec = workflow_subs.add_parser("execute", help="Execute a workflow")
    wf_exec.add_argument("workflow_id", help="Workflow ID to execute")
    wf_exec.add_argument("--input", type=json.loads, default={}, 
                         help="JSON input for workflow")
    
    wf_list = workflow_subs.add_parser("list", help="List workflows")

    # Status command
    status_parser = subparsers.add_parser("status", help="Get execution status")
    status_parser.add_argument("id", help="Execution or Research ID")
    status_parser.add_argument("--type", choices=["research", "workflow"], 
                               default="workflow", help="ID type")

    # Results command
    results_parser = subparsers.add_parser("results", help="List recent results")
    results_parser.add_argument("--limit", type=int, default=20, help="Max results")

    # Health command
    subparsers.add_parser("health", help="Check API health")

    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        sys.exit(0)

    cli = DataKilnCLI(args.api_url)

    # Execute command
    if args.command == "health":
        if cli.health_check():
            print("✅ DataKiln API is healthy")
        else:
            print("❌ DataKiln API is not reachable")
            sys.exit(1)

    elif args.command == "research":
        result = cli.research(args.query, args.mode, args.interface, 
                              wait=not args.no_wait)
        if result.get("result"):
            print(f"\nResult preview:\n{json.dumps(result.get('result', {})[:500] if isinstance(result.get('result'), str) else result.get('result'), indent=2)[:1000]}...")

    elif args.command == "youtube":
        result = cli.youtube_transcript(args.url)
        if result.get("full_text"):
            preview = result["full_text"][:500]
            print(f"\nTranscript preview:\n{preview}...")

    elif args.command == "workflow":
        if args.workflow_action == "execute":
            result = cli.workflow_execute(args.workflow_id, args.input)
            print(json.dumps(result, indent=2))
        elif args.workflow_action == "list":
            result = cli.list_workflows()
            print(json.dumps(result, indent=2))
        else:
            workflow_parser.print_help()

    elif args.command == "status":
        if args.type == "research":
            result = cli.research_status(args.id)
        else:
            result = cli.workflow_status(args.id)
        print(json.dumps(result, indent=2))

    elif args.command == "results":
        result = cli.list_results(args.limit)
        print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
