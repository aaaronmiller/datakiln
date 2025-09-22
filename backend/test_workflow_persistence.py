#!/usr/bin/env python3
"""
Test script for workflow persistence functionality.
Tests the WorkflowPersistenceService with sample query graphs.
"""

import asyncio
import json
from datetime import datetime
from app.services.workflow_persistence_service import get_workflow_persistence_service
from app.models.workflow import Workflow, Node, Edge, WorkflowMetadata

async def test_workflow_persistence():
    """Test workflow persistence operations."""
    print("Testing Workflow Persistence Service...")

    # Get the persistence service
    persistence = get_workflow_persistence_service()

    # Create a sample workflow
    sample_workflow = Workflow(
        id="test_workflow_001",
        name="Sample Query Graph",
        description="A test query graph for persistence testing",
        metadata=WorkflowMetadata(
            createdAt=datetime.now().isoformat(),
            updatedAt=datetime.now().isoformat(),
            tags=["test", "sample"],
            description="Test workflow metadata",
            category="testing",
            author="test_user",
            isPublic=False,
            version=1
        ),
        nodes=[
            Node(
                id="node_1",
                name="Data Source Node",
                type="data_source",
                description="Sample data source",
                inputs={},
                outputs={"data": "output data"},
                next=["node_2"],
                retries=3,
                timeout=300,
                tags=["data"],
                created_at=datetime.now().isoformat(),
                updated_at=datetime.now().isoformat(),
                status="pending",
                data={
                    "source": "sample_data",
                    "query": "SELECT * FROM test_table"
                }
            ),
            Node(
                id="node_2",
                name="Filter Node",
                type="filter",
                description="Sample filter",
                inputs={"input": "data from node_1"},
                outputs={"filtered_data": "filtered output"},
                retries=3,
                timeout=300,
                tags=["filter"],
                created_at=datetime.now().isoformat(),
                updated_at=datetime.now().isoformat(),
                status="pending",
                data={
                    "condition": "status = 'active'"
                }
            )
        ],
        edges=[
            Edge(
                id="edge_1",
                **{"from": "node_1", "to": "node_2"}
            )
        ]
    )

    print("1. Testing workflow save...")
    try:
        workflow_id = persistence.save_workflow(sample_workflow)
        print(f"   ✓ Workflow saved with ID: {workflow_id}")
    except Exception as e:
        print(f"   ✗ Failed to save workflow: {e}")
        return

    print("2. Testing workflow load...")
    try:
        loaded_workflow = persistence.load_workflow(workflow_id)
        if loaded_workflow:
            print(f"   ✓ Workflow loaded successfully: {loaded_workflow.name}")
            print(f"   ✓ Node count: {loaded_workflow.nodeCount}")
            print(f"   ✓ Edge count: {loaded_workflow.edgeCount}")
        else:
            print("   ✗ Failed to load workflow")
            return
    except Exception as e:
        print(f"   ✗ Failed to load workflow: {e}")
        return

    print("3. Testing workflow listing...")
    try:
        workflows = persistence.list_workflows()
        print(f"   ✓ Found {len(workflows)} workflows")
        if workflows:
            print(f"   ✓ First workflow: {workflows[0]['name']}")
    except Exception as e:
        print(f"   ✗ Failed to list workflows: {e}")

    print("4. Testing workflow export...")
    try:
        exported_json = persistence.export_workflow(workflow_id)
        if exported_json:
            print("   ✓ Workflow exported to JSON successfully")
            # Parse to verify it's valid JSON
            parsed = json.loads(exported_json)
            print(f"   ✓ Exported JSON is valid (nodes: {len(parsed['nodes'])}, edges: {len(parsed['edges'])})")
        else:
            print("   ✗ Failed to export workflow")
    except Exception as e:
        print(f"   ✗ Failed to export workflow: {e}")

    print("5. Testing workflow import...")
    try:
        if exported_json:
            imported_id = persistence.import_workflow(exported_json)
            if imported_id:
                print(f"   ✓ Workflow imported successfully with new ID: {imported_id}")
            else:
                print("   ✗ Failed to import workflow")
    except Exception as e:
        print(f"   ✗ Failed to import workflow: {e}")

    print("6. Testing workflow validation...")
    try:
        errors = persistence.validate_workflow(sample_workflow)
        if not errors:
            print("   ✓ Workflow validation passed")
        else:
            print(f"   ⚠ Workflow validation found errors: {errors}")
    except Exception as e:
        print(f"   ✗ Failed to validate workflow: {e}")

    print("7. Testing workflow versioning...")
    try:
        new_version_id = persistence.create_version(workflow_id, "Version 2")
        if new_version_id:
            print(f"   ✓ New version created: {new_version_id}")
            versions = persistence.get_workflow_versions(workflow_id)
            print(f"   ✓ Found {len(versions)} versions")
        else:
            print("   ✗ Failed to create version")
    except Exception as e:
        print(f"   ✗ Failed to create version: {e}")

    print("8. Testing storage stats...")
    try:
        stats = persistence.get_storage_stats()
        print(f"   ✓ Storage stats: {stats['totalWorkflows']} workflows, {stats['totalSize']} bytes")
    except Exception as e:
        print(f"   ✗ Failed to get storage stats: {e}")

    print("9. Testing workflow deletion...")
    try:
        success = persistence.delete_workflow(workflow_id)
        if success:
            print("   ✓ Workflow deleted successfully")
        else:
            print("   ✗ Failed to delete workflow")
    except Exception as e:
        print(f"   ✗ Failed to delete workflow: {e}")

    print("\nAll tests completed!")

if __name__ == "__main__":
    asyncio.run(test_workflow_persistence())