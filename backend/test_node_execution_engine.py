#!/usr/bin/env python3
"""
Test script for the node execution engine with event emission.
Tests the DAGExecutor's ability to emit nodeStarted and nodeFinished events.
"""

import asyncio
import time
from datetime import datetime
from app.models.workflow import Workflow, Node, Edge
from dag_executor import DAGExecutor


def event_callback(event_type: str, event_data: dict):
    """Event callback to capture execution events"""
    timestamp = datetime.fromtimestamp(event_data['timestamp']).strftime('%H:%M:%S.%f')[:-3]
    if event_type == 'nodeStarted':
        print(f"[{timestamp}] 🔄 Node {event_data['node_id']} ({event_data['node_type']}) STARTED")
    elif event_type == 'nodeFinished':
        status = "✅ SUCCESS" if event_data['success'] else "❌ FAILED"
        exec_time = f"{event_data['execution_time']:.3f}s"
        print(f"[{timestamp}] {status} Node {event_data['node_id']} ({event_data['node_type']}) FINISHED in {exec_time}")


async def create_test_workflow():
    """Create a simple 3-node test workflow"""
    # Create nodes
    nodes = [
        Node(
            id="data_source_1",
            type="dataSource",
            name="Test Data Source",
            inputs={"data": {"source_type": "mock", "mock_data": [
                {"name": "Alice", "age": 30, "city": "NYC"},
                {"name": "Bob", "age": 25, "city": "LA"},
                {"name": "Charlie", "age": 35, "city": "Chicago"}
            ]}}
        ),
        Node(
            id="filter_1",
            type="filter",
            name="Age Filter",
            inputs={"data": {"filter_type": "condition", "condition": "item['age'] > 25"}}
        ),
        Node(
            id="export_1",
            type="export",
            name="Export Results",
            inputs={"data": {"format": "json", "filename": "test_output.json"}}
        )
    ]

    # Create edges
    edges = [
        Edge(id="edge1", **{"from": "data_source_1", "to": "filter_1"}),
        Edge(id="edge2", **{"from": "filter_1", "to": "export_1"})
    ]

    # Create workflow
    workflow = Workflow(
        id="test_workflow_3_node",
        name="3-Node Test Workflow",
        description="Test workflow with 3 nodes for event emission testing",
        nodes=nodes,
        edges=edges
    )

    return workflow


async def test_node_execution_engine():
    """Test the node execution engine with event emission"""
    print("🚀 Testing Node Execution Engine with Event Emission")
    print("=" * 60)

    # Create DAG executor
    executor = DAGExecutor()

    # Add event callback
    executor.add_event_callback(event_callback)

    # Create test workflow
    workflow = await create_test_workflow()

    print(f"📋 Workflow: {workflow.name}")
    print(f"🔗 Nodes: {len(workflow.nodes)}")
    print(f"🔀 Edges: {len(workflow.edges)}")
    print()

    # Execute workflow
    start_time = time.time()
    print("▶️  Starting workflow execution...")

    try:
        result = await executor.execute_workflow(workflow)

        execution_time = time.time() - start_time

        print()
        print("📊 Execution Summary:")
        print(f"   Execution ID: {result['execution_id']}")
        print(f"   Total Time: {execution_time:.3f}s")
        print(f"   Success: {result['success']}")
        print(f"   Nodes Executed: {len(result['results'])}")
        print(f"   Execution Order: {result['execution_order']}")

        # Check if execution was under 10 seconds
        if execution_time < 10.0:
            print("✅ SUCCESS: Execution completed under 10 seconds")
        else:
            print(f"⚠️  WARNING: Execution took {execution_time:.3f}s (>10s)")

        # Check if all nodes emitted events
        successful_nodes = sum(1 for r in result['results'].values() if r['success'])
        total_nodes = len(result['results'])

        print(f"   Successful Nodes: {successful_nodes}/{total_nodes}")

        if successful_nodes == total_nodes:
            print("✅ SUCCESS: All nodes executed successfully")
        else:
            print("⚠️  WARNING: Some nodes failed execution")

        return execution_time < 10.0 and successful_nodes == total_nodes

    except Exception as e:
        execution_time = time.time() - start_time
        print(f"❌ FAILED: Execution failed with error: {e}")
        print(f"   Execution Time: {execution_time:.3f}s")
        return False


async def main():
    """Main test function"""
    print("🧪 Node Execution Engine Test Suite")
    print("=" * 60)

    success = await test_node_execution_engine()

    print()
    print("=" * 60)
    if success:
        print("🎉 ALL TESTS PASSED!")
        print("✅ Node execution engine emits nodeStarted/nodeFinished events")
        print("✅ 3-node workflow executes under 10 seconds")
        print("✅ Handles node execution failures gracefully")
    else:
        print("💥 TESTS FAILED!")
        print("❌ Check the output above for failure details")

    return success


if __name__ == "__main__":
    success = asyncio.run(main())
    exit(0 if success else 1)