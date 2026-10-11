import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import pytest

from app.models.workflow import Edge, Node, Workflow
from app.services.workflow_service import WorkflowService


def _three_node_workflow(tmp_path) -> Workflow:
    return Workflow(
        id="timeline-wf",
        name="Timeline WF",
        nodes=[
            Node(
                id="source",
                name="Source",
                type="dataSource",
                inputs={"mock_data": "# Title\n\nBody"},
            ),
            Node(
                id="clean",
                name="Clean",
                type="transform",
                inputs={"transform_type": "text_clean"},
            ),
            Node(
                id="export",
                name="Export",
                type="export",
                inputs={
                    "format": "markdown",
                    "filename": "timeline-out",
                    "directory": str(tmp_path),
                },
            ),
        ],
        edges=[
            Edge(id="e1", source="source", target="clean"),
            Edge(id="e2", source="clean", target="export"),
        ],
    )


@pytest.mark.asyncio
async def test_run_records_node_timings_and_types(tmp_path):
    """A dataSource -> transform -> export run records timings + types keyed by node id."""
    from app.api.v1.endpoints.results import get_result_by_id

    svc = WorkflowService()
    wf = _three_node_workflow(tmp_path)
    run_id, summary = await svc.execute_workflow(wf, validate_workflow=False)

    assert summary.get("success") is True, summary.get("error")
    run = svc.runs[run_id]
    assert set(run.node_timings.keys()) == {"source", "clean", "export"}
    assert set(run.node_types.keys()) == {"source", "clean", "export"}
    assert all(
        isinstance(v, (int, float)) and v >= 0 for v in run.node_timings.values()
    )

    # Extended result endpoint exposes the timing fields
    result = await get_result_by_id(run_id, svc)
    assert set(result["node_timings"].keys()) == {"source", "clean", "export"}
    assert result["node_types"]["source"] == run.node_types["source"]
    assert result["execution_order"] == ["source", "clean", "export"]


@pytest.mark.asyncio
async def test_timeline_endpoint_returns_ordered_nodes_with_durations(tmp_path):
    """GET /runs/{run_id}/timeline returns ordered nodes with durations."""
    from app.api.v1.endpoints.results import get_run_timeline

    svc = WorkflowService()
    wf = _three_node_workflow(tmp_path)
    run_id, summary = await svc.execute_workflow(wf, validate_workflow=False)
    assert summary.get("success") is True, summary.get("error")

    timeline = await get_run_timeline(run_id, svc)

    assert timeline["run_id"] == run_id
    assert timeline["workflow_id"] == wf.id
    assert timeline["status"] == "completed"
    nodes = timeline["nodes"]
    assert [n["order"] for n in nodes] == [0, 1, 2]
    assert [n["node_id"] for n in nodes] == ["source", "clean", "export"]
    for node in nodes:
        assert isinstance(node["duration_ms"], (int, float))
        assert node["duration_ms"] >= 0
        assert node["status"] == "completed"
        assert node["node_type"]
    assert timeline["total_ms"] == pytest.approx(
        sum(n["duration_ms"] for n in nodes)
    )


@pytest.mark.asyncio
async def test_timeline_endpoint_404_for_missing_run():
    from fastapi import HTTPException

    from app.api.v1.endpoints.results import get_run_timeline

    svc = WorkflowService()
    with pytest.raises(HTTPException) as exc_info:
        await get_run_timeline("no-such-run", svc)
    assert exc_info.value.status_code == 404
