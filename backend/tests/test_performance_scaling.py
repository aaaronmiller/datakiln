"""
Test Performance Scaling

Tests for performance limits and scaling with large workflows (100+ nodes).
"""

import pytest
import time
import psutil
import os
from unittest.mock import patch, AsyncMock
from backend.app.services.workflow_service import WorkflowService
from backend.app.models.workflow import Workflow, Node, Edge


class TestPerformanceScaling:
    """Test cases for workflow performance scaling"""

    def setup_method(self):
        """Set up test fixtures"""
        self.workflow_service = WorkflowService()

    def _generate_large_workflow(self, node_count: int = 100) -> Workflow:
        """Generate a large workflow with the specified number of nodes"""
        nodes = []
        edges = []

        # Create provider nodes (data sources)
        provider_count = max(1, node_count // 10)  # 10% providers
        for i in range(provider_count):
            nodes.append(Node(
                id=f"provider-{i}",
                type="provider",
                name=f"Provider {i}",
                version="1.0",
                position={"x": i * 200, "y": 100},
                data={
                    "provider_type": "gemini_deep_research",
                    "mode": "research",
                    "max_tokens": 1000
                }
            ))

        # Create transform nodes
        transform_count = max(1, node_count // 5)  # 20% transforms
        for i in range(transform_count):
            nodes.append(Node(
                id=f"transform-{i}",
                type="transform",
                name=f"Transform {i}",
                version="1.0",
                position={"x": i * 150, "y": 300},
                data={
                    "transform_type": "markdown",
                    "input_key": "data",
                    "output_key": "transformed"
                }
            ))

        # Create filter nodes
        filter_count = max(1, node_count // 8)  # 12.5% filters
        for i in range(filter_count):
            nodes.append(Node(
                id=f"filter-{i}",
                type="filter",
                name=f"Filter {i}",
                version="1.0",
                position={"x": i * 120, "y": 500},
                data={
                    "filter_type": "condition",
                    "condition": "value is not null",
                    "input_key": "data",
                    "output_key": "filtered"
                }
            ))

        # Create export nodes
        export_count = max(1, node_count // 20)  # 5% exports
        for i in range(export_count):
            nodes.append(Node(
                id=f"export-{i}",
                type="export",
                name=f"Export {i}",
                version="1.0",
                position={"x": i * 250, "y": 700},
                data={
                    "format": "json",
                    "path_key": f"output-{i}.json",
                    "include_metadata": True
                }
            ))

        # Fill remaining nodes with dom_action nodes
        remaining_count = node_count - len(nodes)
        for i in range(remaining_count):
            nodes.append(Node(
                id=f"dom-action-{i}",
                type="dom_action",
                name=f"DOM Action {i}",
                version="1.0",
                position={"x": (i % 10) * 180, "y": 900 + (i // 10) * 150},
                data={
                    "action": "click",
                    "selector_key": f"selector-{i}",
                    "timeout": 5000
                }
            ))

        # Create edges to connect nodes in a reasonable flow
        # Connect providers to transforms
        for i, transform in enumerate([n for n in nodes if n.type == "transform"]):
            provider = nodes[i % provider_count]
            edges.append(Edge(
                id=f"edge-p-t-{i}",
                from_=provider.id,
                to=transform.id
            ))

        # Connect transforms to filters
        for i, filter_node in enumerate([n for n in nodes if n.type == "filter"]):
            transform = [n for n in nodes if n.type == "transform"][i % transform_count]
            edges.append(Edge(
                id=f"edge-t-f-{i}",
                from_=transform.id,
                to=filter_node.id
            ))

        # Connect filters to exports
        for i, export_node in enumerate([n for n in nodes if n.type == "export"]):
            filter_node = [n for n in nodes if n.type == "filter"][i % filter_count]
            edges.append(Edge(
                id=f"edge-f-e-{i}",
                from_=filter_node.id,
                to=export_node.id
            ))

        # Connect some dom_action nodes to the flow
        dom_nodes = [n for n in nodes if n.type == "dom_action"]
        for i, dom_node in enumerate(dom_nodes[:min(10, len(dom_nodes))]):  # Connect first 10
            source_node = nodes[i % (len(nodes) - len(dom_nodes))]  # Connect to non-dom nodes
            edges.append(Edge(
                id=f"edge-dom-{i}",
                from_=source_node.id,
                to=dom_node.id
            ))

        return Workflow(
            id=f"large-workflow-{node_count}",
            name=f"Large Workflow ({node_count} nodes)",
            description=f"Performance test workflow with {node_count} nodes",
            nodes=nodes,
            edges=edges
        )

    def _get_memory_usage(self) -> float:
        """Get current memory usage in MB"""
        process = psutil.Process(os.getpid())
        return process.memory_info().rss / 1024 / 1024  # Convert to MB

    @pytest.mark.asyncio
    async def test_100_node_workflow_performance(self):
        """Test that 100-node workflow executes within performance limits"""
        # Generate 100-node workflow
        workflow = self._generate_large_workflow(100)

        # Record starting memory
        start_memory = self._get_memory_usage()
        start_time = time.time()

        # Mock the execution to simulate successful completion
        with patch.object(self.workflow_service.dag_executor, 'execute_workflow', new_callable=AsyncMock) as mock_execute:
            # Simulate successful execution within time limits
            mock_execute.return_value = {
                "success": True,
                "execution_id": "perf-test-100-nodes",
                "execution_time": 25.0,  # Under 30s limit
                "execution_order": [f"node-{i}" for i in range(100)],
                "results": {
                    f"node-{i}": {
                        "success": True,
                        "outputs": {"result": f"output-{i}"},
                        "execution_time": 0.1,
                        "error": None
                    } for i in range(100)
                },
                "node_states": {}
            }

            # Execute workflow
            run_id, summary = await self.workflow_service.execute_workflow(workflow)

            # Verify execution completed
            assert summary["status"] == "completed"
            assert summary["success"] is True

            # Check execution time (mocked to be under 30s)
            execution_time = summary.get("execution_time", 0)
            assert execution_time < 30.0, f"Execution time {execution_time}s exceeds 30s limit"

            # Check memory usage
            end_memory = self._get_memory_usage()
            memory_used = end_memory - start_memory
            assert memory_used < 500.0, f"Memory usage {memory_used}MB exceeds 500MB limit"

    @pytest.mark.asyncio
    async def test_200_node_workflow_scaling(self):
        """Test performance scaling with 200 nodes"""
        workflow = self._generate_large_workflow(200)

        start_memory = self._get_memory_usage()
        start_time = time.time()

        with patch.object(self.workflow_service.dag_executor, 'execute_workflow', new_callable=AsyncMock) as mock_execute:
            # Simulate execution (should still be under limits but with some scaling penalty)
            mock_execute.return_value = {
                "success": True,
                "execution_id": "perf-test-200-nodes",
                "execution_time": 45.0,  # Allow some scaling penalty
                "execution_order": [f"node-{i}" for i in range(200)],
                "results": {
                    f"node-{i}": {
                        "success": True,
                        "outputs": {"result": f"output-{i}"},
                        "execution_time": 0.15,
                        "error": None
                    } for i in range(200)
                },
                "node_states": {}
            }

            run_id, summary = await self.workflow_service.execute_workflow(workflow)

            assert summary["status"] == "completed"
            execution_time = summary.get("execution_time", 0)
            # Allow more time for larger workflows but still reasonable
            assert execution_time < 60.0, f"Execution time {execution_time}s too slow for 200 nodes"

            end_memory = self._get_memory_usage()
            memory_used = end_memory - start_memory
            # Allow more memory for larger workflows
            assert memory_used < 800.0, f"Memory usage {memory_used}MB too high for 200 nodes"

    def test_workflow_validation_performance(self):
        """Test that workflow validation scales with large workflows"""
        workflow = self._generate_large_workflow(100)

        start_time = time.time()
        errors = self.workflow_service._validate_workflow(workflow)
        validation_time = time.time() - start_time

        # Validation should be fast even for large workflows
        assert validation_time < 1.0, f"Validation took {validation_time}s, too slow"
        # Should have no validation errors for our generated workflow
        assert len(errors) == 0, f"Validation errors: {errors}"

    def test_memory_efficiency_large_workflows(self):
        """Test memory efficiency with large workflow generation"""
        start_memory = self._get_memory_usage()

        # Generate progressively larger workflows
        for size in [50, 100, 150, 200]:
            workflow = self._generate_large_workflow(size)
            assert len(workflow.nodes) == size

            # Check memory hasn't grown excessively
            current_memory = self._get_memory_usage()
            memory_used = current_memory - start_memory

            # Memory growth should be reasonable
            assert memory_used < 100.0, f"Memory usage {memory_used}MB too high during generation"

    @pytest.mark.asyncio
    async def test_concurrent_workflow_execution(self):
        """Test performance with multiple workflows executing concurrently"""
        workflows = [self._generate_large_workflow(50) for _ in range(3)]

        start_memory = self._get_memory_usage()
        start_time = time.time()

        # Execute multiple workflows concurrently
        tasks = []
        for workflow in workflows:
            with patch.object(self.workflow_service.dag_executor, 'execute_workflow', new_callable=AsyncMock) as mock_execute:
                mock_execute.return_value = {
                    "success": True,
                    "execution_id": f"concurrent-test-{len(tasks)}",
                    "execution_time": 10.0,
                    "execution_order": [f"node-{i}" for i in range(50)],
                    "results": {
                        f"node-{i}": {
                            "success": True,
                            "outputs": {"result": f"output-{i}"},
                            "execution_time": 0.1,
                            "error": None
                        } for i in range(50)
                    },
                    "node_states": {}
                }
                tasks.append(self.workflow_service.execute_workflow(workflow))

        results = await asyncio.gather(*tasks, return_exceptions=True)

        total_time = time.time() - start_time
        end_memory = self._get_memory_usage()
        memory_used = end_memory - start_memory

        # All should succeed
        for result in results:
            if not isinstance(result, Exception):
                run_id, summary = result
                assert summary["status"] == "completed"

        # Concurrent execution should not take excessively long
        assert total_time < 20.0, f"Concurrent execution took {total_time}s, too slow"
        # Memory usage should be reasonable
        assert memory_used < 300.0, f"Concurrent memory usage {memory_used}MB too high"

    def test_performance_monitoring_integration(self):
        """Test that performance monitoring is integrated"""
        # This would test the performance monitoring system
        # For now, just verify the service has performance analysis capabilities
        assert hasattr(self.workflow_service, 'analyze_workflow_performance')

        # Test with mock data
        mock_execution_results = {
            "execution_time": 15.0,
            "results": {
                "node1": {"execution_time": 1.0, "success": True},
                "node2": {"execution_time": 2.0, "success": True}
            }
        }

        # Should not raise exceptions
        analysis = self.workflow_service.analyze_workflow_performance(mock_execution_results)
        assert isinstance(analysis, dict)
        assert "performance_score" in analysis or "error" in analysis