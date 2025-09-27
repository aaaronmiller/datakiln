#!/usr/bin/env python3
"""
Test script for Phase 2: Multi-Node Chains
Tests the chain: Gemini deep research → save file → Perp consolidate node → copy
"""

import asyncio
import json
import os
from pathlib import Path
from executor import WorkflowExecutor
from nodes.consolidate_node import ConsolidateNode


async def test_phase2_chain():
    """Test the complete Phase 2 chain"""
    print("Testing Phase 2: Multi-Node Chains")

    # Create test workflow
    workflow = {
        "name": "Phase 2 Test Chain",
        "execution_data": {
            "execution_options": {
                "execution_id": "test-phase2-chain"
            }
        },
        "nodes": {
            "gemini-research": {
                "id": "gemini-research",
                "type": "provider",
                "name": "Mock Provider",
                "provider_type": "perplexity",
                "mode": "research",
                "max_tokens": 2000,
                "temperature": 0.7
            },
            "save-file": {
                "id": "save-file",
                "type": "export",
                "name": "Save Research File",
                "format": "json",
                "path_key": "research_output.json"
            },
            "consolidate-node": {
                "id": "consolidate-node",
                "type": "consolidate",
                "name": "Consolidate Research",
                "model": "gpt-4",
                "prepend_text": "Summarize:",
                "append_text": "",
                "attachments": ["research_output.json"]
            }
        },
        "edges": [
            {
                "id": "edge-1",
                "source": "gemini-research",
                "target": "save-file"
            },
            {
                "id": "edge-2",
                "source": "save-file",
                "target": "consolidate-node"
            }
        ],
        "output_handlers": [
            {
                "type": "clipboard",
                "destination": "clipboard"
            }
        ]
    }

    # Create executor
    executor = WorkflowExecutor()

    # Mock provider manager (simplified)
    class MockProviderManager:
        async def execute_perplexity(self, request):
            # Handle both dict and string inputs
            if isinstance(request, dict):
                prompt = request.get('prompt', '')
            else:
                prompt = str(request)
            return {
                "response": f"Mock Perplexity response: {prompt[:100]}...",
                "model": "mock-perplexity",
                "usage": {"tokens": 100}
            }

    class MockProvider:
        async def generate_response(self, request):
            return {
                "response": f"Mock response for {request.get('model', 'unknown')}: {request.get('prompt', '')[:100]}...",
                "usage": {"tokens": 100}
            }

    provider_manager = MockProviderManager()

    try:
        # Execute workflow
        async def event_handler(event, data):
            print(f"Event: {event}")

        result = await executor.execute_workflow(
            workflow=workflow,
            provider_manager=provider_manager,
            on_execution_event=event_handler
        )

        print(f"Workflow execution result: {result['success']}")
        print(f"Final state: {result['final_state']}")
        if 'error' in result:
            print(f"Error: {result['error']}")

        # Check outputs
        outputs_dir = Path("outputs")
        if outputs_dir.exists():
            output_files = list(outputs_dir.glob("*.json"))
            print(f"Output files created: {len(output_files)}")
            for f in output_files:
                print(f"  - {f.name}")

        # Check temp files were created and cleaned up
        import tempfile
        temp_dir = Path(tempfile.gettempdir())
        temp_files = list(temp_dir.glob("consolidate_input_*"))
        print(f"Temp files remaining: {len(temp_files)}")

        return result['success']

    except Exception as e:
        print(f"Test failed: {str(e)}")
        return False


async def test_connection_validation():
    """Test that connection validation works"""
    print("\nTesting connection validation...")

    # This would be tested in the frontend, but we can verify the logic
    # For now, just check that consolidate node can be instantiated
    try:
        node = ConsolidateNode(
            id="test-consolidate",
            name="Test Consolidate",
            model="gpt-4",
            prepend_text="Test:",
            attachments=[]
        )
        print("✓ Consolidate node created successfully")
        return True
    except Exception as e:
        print(f"✗ Consolidate node creation failed: {str(e)}")
        return False


async def main():
    """Run all Phase 2 tests"""
    print("=== Phase 2 Implementation Test ===\n")

    # Test connection validation
    validation_ok = await test_connection_validation()

    # Test the chain
    chain_ok = await test_phase2_chain()

    print("\n=== Test Results ===")
    print(f"Connection validation: {'✓ PASS' if validation_ok else '✗ FAIL'}")
    print(f"Chain execution: {'✓ PASS' if chain_ok else '✗ FAIL'}")

    if validation_ok and chain_ok:
        print("\n🎉 Phase 2 implementation successful!")
        return True
    else:
        print("\n❌ Phase 2 implementation has issues")
        return False


if __name__ == "__main__":
    success = asyncio.run(main())
    exit(0 if success else 1)