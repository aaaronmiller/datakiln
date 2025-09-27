#!/usr/bin/env python3
"""
Test Phase 3: Multi-Node Chaining & Data Routing
"""

import asyncio
import networkx as nx

def test_graph_construction():
    """Test that networkx graph construction and topological sort works"""

    # Create workflow with edges
    workflow = {
        "name": "Test Chain",
        "nodes": {
            "node1": {"id": "node1", "type": "test"},
            "node2": {"id": "node2", "type": "test"},
            "node3": {"id": "node3", "type": "test"}
        },
        "edges": [
            {"from": "node1", "to": "node2"},
            {"from": "node2", "to": "node3"}
        ]
    }

    # Build graph from edges
    graph = nx.DiGraph()
    graph.add_nodes_from(workflow["nodes"].keys())

    for edge in workflow["edges"]:
        source = edge.get("from") or edge.get("source")
        target = edge.get("to") or edge.get("target")
        if source and target:
            graph.add_edge(source, target)

    # Perform topological sort
    try:
        execution_order = list(nx.topological_sort(graph))
        print(f"✅ Graph construction successful")
        print(f"   Execution order: {execution_order}")

        # Verify order
        expected_order = ["node1", "node2", "node3"]
        if execution_order == expected_order:
            print("✅ Topological sort correct")
            return True
        else:
            print(f"❌ Expected {expected_order}, got {execution_order}")
            return False

    except nx.NetworkXError as e:
        print(f"❌ Topological sort failed: {str(e)}")
        return False

def test_output_handlers():
    """Test output handler methods exist"""
    from executor import WorkflowExecutor
    import os

    executor = WorkflowExecutor()

    # Check if output handler methods exist
    has_file_handler = hasattr(executor, '_handle_file_output')
    has_clipboard_handler = hasattr(executor, '_handle_clipboard_output')
    has_screen_handler = hasattr(executor, '_handle_screen_output')

    print("Output handler methods:")
    print(f"   File handler: {'✅' if has_file_handler else '❌'}")
    print(f"   Clipboard handler: {'✅' if has_clipboard_handler else '❌'}")
    print(f"   Screen handler: {'✅' if has_screen_handler else '❌'}")

    return all([has_file_handler, has_clipboard_handler, has_screen_handler])

async def test_workflow_loading():
    """Test workflow loading with graph construction"""
    from executor import WorkflowExecutor

    # Create workflow with edges using delay nodes (which should exist)
    workflow = {
        "name": "Test Chain",
        "nodes": {
            "node1": {"id": "node1", "type": "delay"},
            "node2": {"id": "node2", "type": "delay"}
        },
        "edges": [
            {"from": "node1", "to": "node2"}
        ]
    }

    executor = WorkflowExecutor()

    try:
        # Test loading (this will fail at node creation but should pass graph construction)
        await executor._handle_load_workflow()
        print("❌ Should have failed due to missing workflow in context")
        return False
    except:
        # Set workflow in context manually to test
        executor.context = type('MockContext', (), {'workflow': workflow, 'nodes': {}, 'execution_order': []})()

        try:
            await executor._handle_load_workflow()
            print("❌ Expected workflow loading to fail due to node creation issues")
            return False
        except Exception as e:
            # This is expected - node creation should fail, but graph construction should have worked
            print("✅ Workflow loading failed as expected (node creation issues)")
            print(f"   Error: {str(e)}")
            # Check if execution order was set (indicating graph construction worked)
            if hasattr(executor.context, 'execution_order') and executor.context.execution_order:
                print(f"   Execution order: {executor.context.execution_order}")
                return len(executor.context.execution_order) == 2
            else:
                print("❌ Graph construction did not work")
                return False

async def test_perp_deep_research():
    """Test Perp deep research with no approval and ~2m wait"""
    from executor import WorkflowExecutor
    import time

    print("Testing Perp deep research workflow...")

    # Create workflow: Perp deep research node
    workflow = {
        "name": "Perp Deep Research Test",
        "nodes": {
            "perp_node": {
                "id": "perp_node",
                "type": "provider",
                "name": "Perp Deep Research",
                "provider_type": "perplexity",
                "mode": "deep_research",
                "query": "Latest developments in AI safety research",
                "max_tokens": 2000
            }
        },
        "edges": [],
        "execution_options": {
            "execution_id": "test-perp-deep-research",
            "no_approval": True,
            "wait_time_seconds": 120  # ~2 minutes
        }
    }

    executor = WorkflowExecutor()

    try:
        start_time = time.time()

        # Execute workflow
        result = await executor.execute_workflow(workflow)

        execution_time = time.time() - start_time

        print(f"✅ Perp deep research completed in {execution_time:.1f}s")
        print(f"   Success: {result.get('success', False)}")
        print(f"   Expected wait: ~120s, Actual: {execution_time:.1f}s")

        # Check if it waited approximately 2 minutes
        if 100 <= execution_time <= 140:  # Allow some tolerance
            print("✅ Wait time correct (~2 minutes)")
            return True
        else:
            print(f"❌ Wait time incorrect. Expected ~120s, got {execution_time:.1f}s")
            return False

    except Exception as e:
        print(f"❌ Perp deep research test failed: {str(e)}")
        return False

async def test_ytt_url_inject_copy():
    """Test YTT URL inject and copy functionality"""
    from executor import WorkflowExecutor

    print("Testing YTT URL inject and copy...")

    # Create workflow: YTT node with URL injection
    workflow = {
        "name": "YTT URL Test",
        "nodes": {
            "ytt_node": {
                "id": "ytt_node",
                "type": "provider",
                "name": "YouTube Transcript",
                "provider_type": "youtube_transcript",
                "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",  # Test URL
                "inject_url": True,
                "copy_to_clipboard": True
            }
        },
        "edges": [],
        "execution_options": {
            "execution_id": "test-ytt-url-inject"
        }
    }

    executor = WorkflowExecutor()

    try:
        result = await executor.execute_workflow(workflow)

        print(f"✅ YTT URL inject/copy completed")
        print(f"   Success: {result.get('success', False)}")

        # Check artifacts for URL injection and copy
        artifacts = result.get('artifacts', [])
        has_url_injection = any('url' in str(artifact.get('outputs', {})) for artifact in artifacts)
        has_copy_action = any('clipboard' in str(artifact.get('outputs', {})) for artifact in artifacts)

        print(f"   URL injection: {'✅' if has_url_injection else '❌'}")
        print(f"   Copy to clipboard: {'✅' if has_copy_action else '❌'}")

        return result.get('success', False) and has_url_injection and has_copy_action

    except Exception as e:
        print(f"❌ YTT URL test failed: {str(e)}")
        return False

async def test_full_workflow_chain():
    """Test full workflow: YTT → Gemini (attach transcript, Deep Research) → Perp (consolidate) → Obsidian export"""
    from executor import WorkflowExecutor

    print("Testing full workflow chain...")

    # Create comprehensive workflow
    workflow = {
        "name": "Full Workflow Test",
        "nodes": {
            "ytt_node": {
                "id": "ytt_node",
                "type": "provider",
                "name": "YouTube Transcript",
                "provider_type": "youtube_transcript",
                "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
            },
            "gemini_node": {
                "id": "gemini_node",
                "type": "provider",
                "name": "Gemini with Transcript",
                "provider_type": "gemini_deep_research",
                "mode": "deep_research",
                "attach_transcript": True,
                "query": "Analyze this transcript and provide insights"
            },
            "perp_node": {
                "id": "perp_node",
                "type": "consolidate",
                "name": "Perp Consolidate",
                "model": "gpt-4",
                "consolidate_mode": "comprehensive"
            },
            "export_node": {
                "id": "export_node",
                "type": "export",
                "name": "Obsidian Export",
                "format": "markdown",
                "path_key": "obsidian_export.md",
                "destination": "obsidian"
            }
        },
        "edges": [
            {"from": "ytt_node", "to": "gemini_node"},
            {"from": "gemini_node", "to": "perp_node"},
            {"from": "perp_node", "to": "export_node"}
        ],
        "execution_options": {
            "execution_id": "test-full-workflow"
        }
    }

    executor = WorkflowExecutor()

    try:
        result = await executor.execute_workflow(workflow)

        print(f"✅ Full workflow completed")
        print(f"   Success: {result.get('success', False)}")

        # Check execution order
        state_history = result.get('state_history', [])
        execution_states = [state['state'] for state in state_history if state['state'] == 'execute_node']

        print(f"   Execution steps: {len(execution_states)}")
        print(f"   Expected nodes: 4, Executed: {len(execution_states)}")

        # Check artifacts
        artifacts = result.get('artifacts', [])
        print(f"   Artifacts generated: {len(artifacts)}")

        # Check final export
        has_export = any('obsidian' in str(artifact.get('outputs', {})) for artifact in artifacts)
        print(f"   Obsidian export: {'✅' if has_export else '❌'}")

        return result.get('success', False) and len(artifacts) >= 4 and has_export

    except Exception as e:
        print(f"❌ Full workflow test failed: {str(e)}")
        return False

def main():
    """Run all tests"""
    print("🧪 Phase 3 Advanced Features Tests")
    print("=" * 50)

    # Test 1: Graph construction
    print("\n1. Testing graph construction and topological sort...")
    test1_pass = test_graph_construction()

    # Test 2: Output handlers
    print("\n2. Testing output handler methods...")
    test2_pass = test_output_handlers()

    # Test 3: Workflow loading
    print("\n3. Testing workflow loading with graph...")
    test3_pass = asyncio.run(test_workflow_loading())

    # Test 4: Perp deep research
    print("\n4. Testing Perp deep research (no approve, ~2m wait)...")
    test4_pass = asyncio.run(test_perp_deep_research())

    # Test 5: YTT URL inject and copy
    print("\n5. Testing YTT URL inject and copy...")
    test5_pass = asyncio.run(test_ytt_url_inject_copy())

    # Test 6: Full workflow chain
    print("\n6. Testing full workflow chain (YTT → Gemini → Perp → Obsidian)...")
    test6_pass = asyncio.run(test_full_workflow_chain())

    # Summary
    print("\n" + "=" * 50)
    all_passed = all([test1_pass, test2_pass, test3_pass, test4_pass, test5_pass, test6_pass])
    print(f"Overall result: {'✅ ALL TESTS PASSED' if all_passed else '❌ SOME TESTS FAILED'}")

    return all_passed

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)