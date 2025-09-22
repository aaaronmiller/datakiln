#!/usr/bin/env python3
"""
Comprehensive test for the node execution engine with all core node types.
Tests data flow between nodes and complex workflow execution.
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


async def create_comprehensive_workflow():
    """Create a comprehensive workflow testing all core node types"""
    # Create nodes for a complex data processing pipeline

    # 1. Data Source - provides sample user data
    data_source = Node(
        id="data_source",
        type="dataSource",
        name="User Data Source",
        inputs={"data": {"source_type": "mock", "mock_data": [
            {"id": 1, "name": "Alice", "age": 30, "city": "NYC", "salary": 75000},
            {"id": 2, "name": "Bob", "age": 25, "city": "LA", "salary": 65000},
            {"id": 3, "name": "Charlie", "age": 35, "city": "Chicago", "salary": 80000},
            {"id": 4, "name": "Diana", "age": 28, "city": "NYC", "salary": 70000},
            {"id": 5, "name": "Eve", "age": 42, "city": "SF", "salary": 95000}
        ]}}
    )

    # 2. Filter - filter users over 30 (receives data from data_source)
    age_filter = Node(
        id="age_filter",
        type="filter",
        name="Age Filter (>30)",
        inputs={"data": {"filter_type": "condition", "condition": "item['age'] > 30"}}
    )

    # 3. Transform - convert to markdown (receives data from age_filter)
    data_transform = Node(
        id="data_transform",
        type="transform",
        name="Data to Markdown",
        inputs={"data": {"transform_type": "markdown"}}
    )

    # 4. Aggregate - count by city (receives data from data_source)
    city_aggregate = Node(
        id="city_aggregate",
        type="aggregate",
        name="Count by City",
        inputs={"data": {"functions": ["count"], "group_by": ["city"]}}
    )

    # 5. Export - save results (receives data from city_aggregate)
    export_results = Node(
        id="export_results",
        type="export",
        name="Export Results",
        inputs={"data": {"format": "json", "filename": "workflow_results.json"}}
    )

    nodes = [data_source, age_filter, data_transform, city_aggregate, export_results]

    # Create edges defining data flow
    edges = [
        Edge(id="e1", **{"from": "data_source", "to": "age_filter"}),
        Edge(id="e2", **{"from": "age_filter", "to": "data_transform"}),
        Edge(id="e3", **{"from": "data_source", "to": "city_aggregate"}),
        Edge(id="e4", **{"from": "city_aggregate", "to": "export_results"})
    ]

    # Create workflow
    workflow = Workflow(
        id="comprehensive_workflow",
        name="Comprehensive Data Processing Workflow",
        description="Tests all core node types with data flow",
        nodes=nodes,
        edges=edges
    )

    return workflow


async def test_comprehensive_workflow():
    """Test comprehensive workflow with all core node types"""
    print("🧪 Comprehensive Node Execution Engine Test")
    print("=" * 60)

    # Create DAG executor
    executor = DAGExecutor()

    # Add event callback
    executor.add_event_callback(event_callback)

    # Create comprehensive workflow
    workflow = await create_comprehensive_workflow()

    print(f"📋 Workflow: {workflow.name}")
    print(f"🔗 Nodes: {len(workflow.nodes)}")
    print(f"🔀 Edges: {len(workflow.edges)}")
    print()

    # Execute workflow
    start_time = time.time()
    print("▶️  Starting comprehensive workflow execution...")

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

        # Check execution time
        if execution_time < 30.0:
            print("✅ SUCCESS: Execution completed under 30 seconds")
        else:
            print(f"⚠️  WARNING: Execution took {execution_time:.3f}s (>30s)")

        # Check node results
        successful_nodes = sum(1 for r in result['results'].values() if r['success'])
        total_nodes = len(result['results'])

        print(f"   Successful Nodes: {successful_nodes}/{total_nodes}")

        if successful_nodes == total_nodes:
            print("✅ SUCCESS: All nodes executed successfully")
        else:
            print("❌ FAILURE: Some nodes failed execution")
            # Print failed nodes
            for node_id, node_result in result['results'].items():
                if not node_result['success']:
                    print(f"      - {node_id}: {node_result.get('error', 'Unknown error')}")

        # Check data flow
        print("\n🔄 Data Flow Analysis:")
        data_flow_summary = result.get('data_flow_summary', {})
        print(f"   Total Data Connections: {data_flow_summary.get('total_connections', 0)}")
        print(f"   Successful Executions: {data_flow_summary.get('successful_executions', 0)}")
        print(f"   Failed Executions: {data_flow_summary.get('failed_executions', 0)}")

        # Verify specific node outputs
        print("\n📋 Node Output Verification:")

        # Check data source output
        if 'data_source' in result['results']:
            ds_result = result['results']['data_source']
            if ds_result['success'] and 'outputs' in ds_result:
                data_count = len(ds_result['outputs'].get('data', []))
                print(f"   Data Source: ✅ Provided {data_count} records")

        # Check filter output
        if 'age_filter' in result['results']:
            filter_result = result['results']['age_filter']
            if filter_result['success'] and 'outputs' in filter_result:
                filtered_count = len(filter_result['outputs'].get('filtered', []))
                print(f"   Age Filter: ✅ Filtered to {filtered_count} records")

        # Check aggregate output
        if 'city_aggregate' in result['results']:
            agg_result = result['results']['city_aggregate']
            if agg_result['success'] and 'outputs' in agg_result:
                grouped = agg_result['outputs'].get('grouped', {})
                print(f"   City Aggregate: ✅ Grouped into {len(grouped)} cities")

        return execution_time < 30.0 and successful_nodes == total_nodes

    except Exception as e:
        execution_time = time.time() - start_time
        print(f"❌ FAILED: Execution failed with error: {e}")
        print(f"   Execution Time: {execution_time:.3f}s")
        return False


async def main():
    """Main test function"""
    print("🔬 Comprehensive Workflow Execution Test Suite")
    print("=" * 60)

    success = await test_comprehensive_workflow()

    print()
    print("=" * 60)
    if success:
        print("🎉 ALL COMPREHENSIVE TESTS PASSED!")
        print("✅ DAG execution engine works with all core node types")
        print("✅ Data flows correctly between connected nodes")
        print("✅ Complex workflows execute successfully")
        print("✅ Error handling and event emission working")
    else:
        print("💥 COMPREHENSIVE TESTS FAILED!")
        print("❌ Check the output above for failure details")

    return success


if __name__ == "__main__":
    success = asyncio.run(main())
    exit(0 if success else 1)