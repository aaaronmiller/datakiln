"""
Test Workflow Error Handling

Tests for workflow error handling when node execution fails mid-workflow.
"""

import pytest
from unittest.mock import Mock, patch, AsyncMock
import asyncio
from backend.app.services.workflow_service import WorkflowService
from backend.app.models.workflow import Workflow, Node, Edge


class TestWorkflowErrorHandling:
    """Test cases for workflow error handling"""

    def setup_method(self):
        """Set up test fixtures"""
        self.workflow_service = WorkflowService()

    @pytest.mark.asyncio
    async def test_workflow_stops_on_node_failure(self):
        """Test that workflow execution stops when a node fails"""
        # Create a workflow with 3 nodes where the middle one will fail
        workflow = Workflow(
            id="test-workflow-stop-on-failure",
            name="Test Workflow Stop on Failure",
            nodes=[
                Node(
                    id="node1",
                    type="provider",
                    name="Working Provider",
                    version="1.0",
                    data={"provider_type": "gemini_deep_research"}
                ),
                Node(
                    id="node2",
                    type="transform",
                    name="Failing Transform",
                    version="1.0",
                    data={"transform_type": "markdown"}
                ),
                Node(
                    id="node3",
                    type="export",
                    name="Never Reached Export",
                    version="1.0",
                    data={"format": "json"}
                )
            ],
            edges=[
                Edge(id="edge1", from_="node1", to="node2"),
                Edge(id="edge2", from_="node2", to="node3")
            ]
        )

        # Mock the DAG executor to simulate node2 failing
        with patch.object(self.workflow_service.dag_executor, 'execute_workflow', new_callable=AsyncMock) as mock_execute:
            # Simulate execution result where node2 fails and execution stops
            mock_execute.return_value = {
                "success": False,
                "execution_id": "test-exec-123",
                "execution_time": 1.5,
                "execution_order": ["node1", "node2"],  # node3 not executed
                "results": {
                    "node1": {
                        "success": True,
                        "outputs": {"data": "test"},
                        "execution_time": 0.5,
                        "error": None
                    },
                    "node2": {
                        "success": False,
                        "outputs": {},
                        "execution_time": 0.8,
                        "error": "Transform failed: invalid input"
                    },
                    "node3": {
                        "success": False,
                        "outputs": {},
                        "execution_time": 0.0,
                        "error": "Workflow stopped due to failure of upstream node node2"
                    }
                },
                "node_states": {}
            }

            # Execute workflow with stop_on_failure enabled (default)
            run_id, summary = await self.workflow_service.execute_workflow(
                workflow,
                execution_options={"stop_on_failure": True}
            )

            # Verify execution was attempted
            mock_execute.assert_called_once()

            # Verify that the workflow failed overall
            assert summary["status"] == "failed"
            assert summary["success"] is False

            # Verify that node3 was marked as cancelled/not executed
            assert "node3" in summary["node_results"]
            node3_result = summary["node_results"]["node3"]
            assert node3_result["success"] is False
            assert "upstream node node2 failed" in node3_result["error"]

    @pytest.mark.asyncio
    async def test_workflow_emits_error_event_on_failure(self):
        """Test that workflow emits error event when node execution fails"""
        workflow = Workflow(
            id="test-workflow-error-event",
            name="Test Workflow Error Event",
            nodes=[
                Node(
                    id="failing-node",
                    type="provider",
                    name="Failing Provider",
                    version="1.0",
                    data={"provider_type": "gemini_deep_research"}
                )
            ],
            edges=[]
        )

        # Track emitted events
        emitted_events = []

        def event_callback(event_type, event_data):
            emitted_events.append((event_type, event_data))

        # Add event callback
        self.workflow_service.dag_executor.add_event_callback(event_callback)

        try:
            # Mock execution to fail
            with patch.object(self.workflow_service.dag_executor, 'execute_workflow', new_callable=AsyncMock) as mock_execute:
                mock_execute.return_value = {
                    "success": False,
                    "execution_id": "test-exec-456",
                    "execution_time": 0.3,
                    "execution_order": ["failing-node"],
                    "results": {
                        "failing-node": {
                            "success": False,
                            "outputs": {},
                            "execution_time": 0.3,
                            "error": "Provider execution failed"
                        }
                    },
                    "node_states": {}
                }

                # Execute workflow
                run_id, summary = await self.workflow_service.execute_workflow(workflow)

                # Verify events were emitted
                assert len(emitted_events) >= 2  # At least nodeStarted and nodeFinished

                # Find the nodeFinished event for the failing node
                finished_events = [e for e in emitted_events if e[0] == "nodeFinished"]
                assert len(finished_events) > 0

                failing_event = None
                for event_type, event_data in finished_events:
                    if event_data.get("node_id") == "failing-node":
                        failing_event = (event_type, event_data)
                        break

                assert failing_event is not None
                event_type, event_data = failing_event
                assert event_data["success"] is False
                assert "Provider execution failed" in event_data["error"]

        finally:
            # Clean up event callback
            self.workflow_service.dag_executor.remove_event_callback(event_callback)

    @pytest.mark.asyncio
    async def test_workflow_continues_on_failure_when_disabled(self):
        """Test that workflow can continue executing when stop_on_failure is disabled"""
        workflow = Workflow(
            id="test-workflow-continue-on-failure",
            name="Test Workflow Continue on Failure",
            nodes=[
                Node(
                    id="node1",
                    type="provider",
                    name="Working Provider",
                    version="1.0",
                    data={"provider_type": "gemini_deep_research"}
                ),
                Node(
                    id="node2",
                    type="transform",
                    name="Failing Transform",
                    version="1.0",
                    data={"transform_type": "markdown"}
                ),
                Node(
                    id="node3",
                    type="export",
                    name="Export Node",
                    version="1.0",
                    data={"format": "json"}
                )
            ],
            edges=[
                Edge(id="edge1", from_="node1", to="node2"),
                Edge(id="edge2", from_="node2", to="node3")
            ]
        )

        # Mock execution to continue despite failure
        with patch.object(self.workflow_service.dag_executor, 'execute_workflow', new_callable=AsyncMock) as mock_execute:
            mock_execute.return_value = {
                "success": False,  # Overall failure due to node2
                "execution_id": "test-exec-789",
                "execution_time": 2.1,
                "execution_order": ["node1", "node2", "node3"],  # All nodes executed
                "results": {
                    "node1": {
                        "success": True,
                        "outputs": {"data": "test"},
                        "execution_time": 0.5,
                        "error": None
                    },
                    "node2": {
                        "success": False,
                        "outputs": {},
                        "execution_time": 0.8,
                        "error": "Transform failed"
                    },
                    "node3": {
                        "success": False,  # Failed due to upstream failure
                        "outputs": {},
                        "execution_time": 0.8,
                        "error": "Upstream node node2 failed"
                    }
                },
                "node_states": {}
            }

            # Execute workflow with stop_on_failure disabled
            run_id, summary = await self.workflow_service.execute_workflow(
                workflow,
                execution_options={"stop_on_failure": False}
            )

            # Verify all nodes were attempted
            assert "node1" in summary["node_results"]
            assert "node2" in summary["node_results"]
            assert "node3" in summary["node_results"]

            # Verify workflow failed overall
            assert summary["status"] == "failed"
            assert summary["success"] is False

    def test_error_event_contains_proper_metadata(self):
        """Test that error events contain proper metadata"""
        from backend.dag_executor import DAGExecutor

        executor = DAGExecutor()
        emitted_events = []

        def event_callback(event_type, event_data):
            emitted_events.append((event_type, event_data))

        executor.add_event_callback(event_callback)

        try:
            # Simulate emitting a failure event
            executor._emit_event("nodeFinished", {
                "node_id": "test-node",
                "node_type": "provider",
                "execution_id": "test-exec",
                "workflow_id": "test-workflow",
                "success": False,
                "execution_time": 1.2,
                "error": "Test error message",
                "timestamp": 1234567890.123
            })

            # Verify event was captured
            assert len(emitted_events) == 1
            event_type, event_data = emitted_events[0]

            assert event_type == "nodeFinished"
            assert event_data["node_id"] == "test-node"
            assert event_data["success"] is False
            assert event_data["error"] == "Test error message"
            assert "timestamp" in event_data

        finally:
            executor.remove_event_callback(event_callback)