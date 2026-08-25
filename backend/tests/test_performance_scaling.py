"""
Test Performance Scaling (ported from datakiln copy, 2026-08-25)

Adapted to the unified backend: builds large workflows with the unified
Node model (inputs dict, extra='allow') and executes through
WorkflowService. Targets the PRD requirement: ReactFlow 50+ nodes and
workflow execution staying responsive at 100+ nodes.

Source: docs/reference/datakiln-copy/backend/tests/test_performance_scaling.py
"""

import time

import pytest

from app.models.workflow import Edge, Node, Workflow
from app.services.workflow_service import WorkflowService


def _generate_large_workflow(node_count: int = 100) -> Workflow:
    """Generate a large linear workflow using cheap node types."""
    nodes = []
    edges = []

    nodes.append(Node(
        id="src-0",
        name="Source",
        type="dataSource",
        inputs={"source_type": "mock", "mock_data": "perf test payload"},
    ))
    prev = "src-0"

    transform_count = max(1, node_count - 2)
    for i in range(transform_count):
        nid = f"transform-{i}"
        nodes.append(Node(
            id=nid,
            name=f"Transform {i}",
            type="transform",
            inputs={"transform_type": "text_clean", "template": "{content}"},
        ))
        edges.append(Edge(id=f"e-{prev}-{nid}", source=prev, target=nid))
        prev = nid

    nodes.append(Node(
        id="export-final",
        name="Export",
        type="export",
        inputs={"format": "json", "path_key": "perf-test-output"},
    ))
    edges.append(Edge(id=f"e-{prev}-export-final", source=prev, target="export-final"))

    return Workflow(
        id=f"perf-test-{node_count}",
        name=f"Performance Test {node_count}",
        nodes=nodes,
        edges=edges,
    )


class TestPerformanceScaling:
    """Workflow execution scaling with large graphs."""

    def test_build_100_node_workflow_is_fast(self):
        start = time.time()
        wf = _generate_large_workflow(100)
        build_time = time.time() - start
        assert len(wf.nodes) == 100
        assert len(wf.edges) == 99
        assert build_time < 2.0, f"Building 100 nodes took {build_time:.2f}s"

    def test_model_validation_scales_linearly(self):
        sizes = [25, 50, 100]
        timings = []
        for n in sizes:
            start = time.time()
            _generate_large_workflow(n)
            timings.append(time.time() - start)
        # No exponential blowup building models
        assert timings[-1] < max(2.0, timings[0] * 20)

    @pytest.mark.asyncio
    async def test_50_node_execution_completes(self):
        """50-node pipeline executes through the schema executor."""
        svc = WorkflowService()
        wf = _generate_large_workflow(50)
        run_id, summary = await svc.execute_workflow(wf, validate_workflow=False)
        assert summary.get("success") is True, summary.get("error")
        assert len(summary.get("node_results", {})) == 50
        assert summary.get("execution_time", 99) < 60

    @pytest.mark.asyncio
    async def test_100_node_execution_completes(self):
        """100+ node pipeline stays functional (PRD scaling requirement)."""
        svc = WorkflowService()
        wf = _generate_large_workflow(100)
        start = time.time()
        run_id, summary = await svc.execute_workflow(wf, validate_workflow=False)
        elapsed = time.time() - start
        assert summary.get("success") is True, summary.get("error")
        assert len(summary.get("node_results", {})) == 100
        assert elapsed < 120, f"100-node execution took {elapsed:.1f}s"

    @pytest.mark.asyncio
    async def test_execution_time_reported(self):
        svc = WorkflowService()
        wf = _generate_large_workflow(30)
        _, summary = await svc.execute_workflow(wf, validate_workflow=False)
        assert isinstance(summary.get("execution_time"), (int, float))
