#!/usr/bin/env python3
"""
Test script for workflow-based deep research execution
"""

import asyncio
import json
import httpx

async def test_workflow_deep_research():
    """Test deep research through workflow execution"""
    print("Testing workflow-based deep research...")

    # Create a simple workflow with deep research node
    workflow = {
        "id": "test-deep-research-workflow",
        "name": "Simple Deep Research Workflow",
        "description": "A simple workflow that performs deep research",
        "nodes": [
            {
                "id": "deep-research-node-1",
                "type": "provider",
                "name": "Deep Research Provider",
                "position": {"x": 100, "y": 100},
                "data": {
                    "type": "provider",
                    "name": "Deep Research Provider",
                    "provider_type": "gemini_deep_research",
                    "research_depth": "fast",
                    "follow_up_questions": 2,
                    "max_tokens": 2000,
                    "temperature": 0.7
                }
            }
        ],
        "edges": []
    }

    # Execution options with a query
    execution_options = {
        "query": "What are the benefits of renewable energy?"
    }

    try:
        # Execute the workflow via HTTP API
        print("Executing workflow with deep research node...")
        async with httpx.AsyncClient() as client:
            # Merge execution options into workflow
            workflow_request = {**workflow, **execution_options}
            response = await client.post(
                "http://localhost:8000/workflow/execute",
                json=workflow_request,
                timeout=60.0
            )

            if response.status_code == 200:
                result = response.json()
                print("✅ Workflow execution successful!")
                print(f"Response: {json.dumps(result, indent=2)}")

                if result.get("success"):
                    print(f"Run ID: {result.get('run_id')}")
                    print(f"Message: {result.get('message')}")
                else:
                    print(f"Error: {result.get('error', 'Unknown error')}")
            else:
                print(f"❌ HTTP error: {response.status_code}")
                print(f"Response: {response.text}")

    except Exception as e:
        print(f"❌ Test failed with exception: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_workflow_deep_research())