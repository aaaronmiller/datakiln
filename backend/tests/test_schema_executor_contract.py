import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.models.workflow import Edge, Node, Workflow
from app.models.workflow_schema import ExecutableNode
from app.services.artifact_service import ArtifactService
from app.services.workflow_service import WorkflowService
from dag_executor import WorkflowPlanner, convert_and_execute, execute_dom_sequence, legacy_workflow_to_composition


def run(coro):
    return asyncio.run(coro)


class FakeLocator:
    def __init__(self, text="", count=0):
        self._text = text
        self._count = count
        self.first = self

    async def inner_text(self, timeout=0):
        return self._text

    async def count(self):
        return self._count


class FakePage:
    def __init__(self, title="", body="", url="https://example.test"):
        self._title = title
        self._body = body
        self.url = url
        self.actions = []

    async def goto(self, target, wait_until="domcontentloaded"):
        self.actions.append(("goto", target, wait_until))
        self.url = target

    async def title(self):
        return self._title

    def locator(self, selector):
        if selector == "body":
            return FakeLocator(self._body, 1)
        return FakeLocator("", 0)

    async def wait_for_timeout(self, timeout):
        self.actions.append(("wait", timeout))

    async def fill(self, target, value, timeout=0):
        self.actions.append(("fill", target, value))

    async def click(self, target, timeout=0):
        self.actions.append(("click", target))


def test_gui_datasource_transform_export_workflow_normalizes_and_executes(tmp_path):
    workflow = Workflow(
        id="gui-normalization",
        name="GUI Normalization",
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
                    "filename": "gui-output",
                    "directory": str(tmp_path),
                },
            ),
        ],
        edges=[
            Edge(id="e1", source="source", target="clean"),
            Edge(id="e2", source="clean", target="export"),
        ],
    )

    composition = legacy_workflow_to_composition(workflow)
    assert [node.type for node in composition.nodes] == [
        "data_source.inline",
        "transform.markdown",
        "export.file",
    ]
    assert [(edge.source_port, edge.target_port) for edge in composition.edges] == [
        ("output", "input"),
        ("output", "data"),
    ]

    result = run(convert_and_execute(workflow, {"project_root": "/"}))

    assert result["success"] is True
    assert result["node_results"]["source"]["output"] == "# Title\n\nBody"
    assert result["node_results"]["clean"]["output"] == "Title\n\nBody"
    assert result["node_results"]["export"]["path"].endswith("gui-output.md")


def test_registry_dom_template_compiles_to_known_executor():
    planner = WorkflowPlanner()

    dom_def = planner.registry.get_node_def("dom.gemini.deep_research")
    perplexity_def = planner.registry.get_node_def("dom.perplexity.pro_search")

    assert dom_def is not None
    assert dom_def.executor == "dom.sequence"
    assert [port.name for port in dom_def.input_ports] == ["query"]
    assert [port.name for port in dom_def.output_ports] == ["result", "actions"]
    assert perplexity_def is not None
    assert perplexity_def.executor == "dom.sequence"
    assert [port.name for port in perplexity_def.input_ports] == ["query"]


def test_dom_sequence_executes_in_dry_run_mode():
    workflow = Workflow(
        id="dom-dry-run",
        name="DOM Dry Run",
        nodes=[
            Node(
                id="research",
                name="Research",
                type="provider",
                inputs={
                    "provider_type": "gemini_deep_research",
                    "query": "workflow builders for arbitrary websites",
                },
            )
        ],
        edges=[],
    )

    result = run(convert_and_execute(workflow, {"dom_dry_run": True}))

    assert result["success"] is True
    outputs = result["node_results"]["research"]
    assert "workflow builders for arbitrary websites" in outputs["result"]
    assert outputs["actions"][0]["action"] == "goto"
    assert outputs["actions"][2]["target"] == "rich-textarea [contenteditable='true']"
    assert "[role='textbox']" in outputs["actions"][2]["fallback_targets"]
    assert outputs["actions"][-1]["action"] == "capture"


def test_perplexity_dom_template_normalizes_and_dry_runs():
    workflow = Workflow(
        id="perplexity-dom-dry-run",
        name="Perplexity DOM Dry Run",
        nodes=[
            Node(
                id="search",
                name="Search",
                type="dk://templates/dom/perplexity/pro-search",
                inputs={"query": "current workflow automation selector strategy"},
            )
        ],
        edges=[],
    )

    composition = legacy_workflow_to_composition(workflow)
    assert composition.nodes[0].type == "dom.perplexity.pro_search"

    result = run(convert_and_execute(workflow, {"dom_dry_run": True}))

    assert result["success"] is True
    outputs = result["node_results"]["search"]
    assert "current workflow automation selector strategy" in outputs["result"]
    assert outputs["actions"][1]["target"] == "[contenteditable='true']"
    assert "[data-lexical-editor='true']" in outputs["actions"][1]["fallback_targets"]


def test_dom_sequence_reports_cloudflare_challenge_without_retry_loop():
    node = ExecutableNode(
        id="blocked",
        type="dom.test",
        config={"dom_action_sequence": [{"action": "goto", "target": "https://blocked.example"}]},
    )
    page = FakePage(title="Just a moment...", body="Checking your browser before accessing the site")

    result = run(execute_dom_sequence(node, {}, {"page": page, "dom_action_delay_ms": 0}))

    assert result["blocked"] is True
    assert result["blocker"]["kind"] == "cloudflare_challenge"
    assert "API fallback required" in result["error"]


def test_dom_sequence_tracks_supplied_authenticated_page_metadata():
    node = ExecutableNode(
        id="auth-page",
        type="dom.test",
        config={
            "dom_action_sequence": [
                {"action": "fill", "target": "[contenteditable='true']", "value": "hello"},
            ]
        },
    )
    page = FakePage(title="Ready", body="Application ready")

    result = run(execute_dom_sequence(node, {}, {"page": page, "dom_action_delay_ms": 0}))

    assert result["error"] is None if "error" in result else True
    assert result["metadata"]["auth_state"] == "supplied_page"
    assert ("fill", "[contenteditable='true']", "hello") in page.actions


def test_code_template_extracts_youtube_ids_without_arbitrary_exec():
    workflow = Workflow(
        id="youtube-id-template",
        name="YouTube ID Template",
        nodes=[
            Node(
                id="extract",
                name="Extract IDs",
                type="dk://templates/code/string-extract/youtube-ids",
                inputs={"input": "Watch https://youtu.be/dQw4w9WgXcQ and https://www.youtube.com/watch?v=abc123XYZ09"},
            )
        ],
        edges=[],
    )

    result = run(convert_and_execute(workflow))

    assert result["success"] is True
    assert result["node_results"]["extract"]["ids"] == ["dQw4w9WgXcQ", "abc123XYZ09"]


def test_workflow_service_persists_execution_and_node_output_artifacts(tmp_path):
    service = WorkflowService()
    service.artifact_service = ArtifactService(storage_path=str(tmp_path / "artifacts"))

    export_dir = tmp_path / "exports"
    workflow = Workflow(
        id="service-artifact-contract",
        name="Service Artifact Contract",
        nodes=[
            Node(
                id="source",
                name="Source",
                type="dataSource",
                inputs={"mock_data": "# Artifact Title\n\nArtifact body"},
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
                    "filename": "artifact-output",
                    "directory": str(export_dir),
                },
            ),
        ],
        edges=[
            Edge(id="e1", source="source", target="clean"),
            Edge(id="e2", source="clean", target="export"),
        ],
    )

    run_id, summary = run(
        service.execute_workflow(
            workflow,
            validate_workflow=True,
            enable_optimization=False,
        )
    )

    assert summary["status"] == "completed"
    assert summary["node_results"]["clean"]["output"] == "Artifact Title\n\nArtifact body"

    results = service.get_results_for_run(run_id)
    assert len(results) == 1
    artifact_index = results[0].data["artifact_index"]
    artifact_names = {artifact["name"] for artifact in artifact_index["artifacts"]}

    assert "execution_result.json" in artifact_names
    assert "nodes/export/artifact-output.md" in artifact_names

    node_artifact = next(
        artifact
        for artifact in artifact_index["artifacts"]
        if artifact["name"] == "nodes/export/artifact-output.md"
    )
    assert node_artifact["metadata"]["node_id"] == "export"
    assert node_artifact["metadata"]["type"] == "node_output"

    content = service.artifact_service.get_artifact_content(node_artifact["id"])
    assert content is not None
    assert content.decode("utf-8") == "Artifact Title\n\nArtifact body"
