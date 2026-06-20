#!/usr/bin/env python3
import json
import sys
import urllib.request
from pathlib import Path


REPORT_PATH = Path("/tmp/datakiln-api-smoke-report.json")
BACKEND_URL = "http://127.0.0.1:8000"
EXPORT_DIR = Path("/tmp/datakiln-api-smoke-exports")


def write_report(status, checks, response=None, error=None):
    REPORT_PATH.write_text(json.dumps({
        "status": status,
        "checks": checks,
        "response": response,
        "error": error,
    }, indent=2))


def get_json(path):
    with urllib.request.urlopen(f"{BACKEND_URL}{path}", timeout=5) as response:
        body = json.loads(response.read().decode("utf-8"))
    assert response.status == 200
    return body


def post_json(path, payload):
    request = urllib.request.Request(
        f"{BACKEND_URL}{path}",
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=20) as response:
        body = json.loads(response.read().decode("utf-8"))
    assert response.status == 200
    return body


def main():
    checks = []
    response_body = None

    try:
        EXPORT_DIR.mkdir(parents=True, exist_ok=True)
        for path in EXPORT_DIR.glob("api-output.*"):
            path.unlink()

        health = get_json("/health")
        assert health["status"] == "healthy"
        checks.append({"backend_health": health})

        payload = {
            "workflow": {
                "id": "api-smoke-workflow",
                "name": "API Smoke Workflow",
                "nodes": [
                    {
                        "id": "source",
                        "name": "Source",
                        "type": "dataSource",
                        "inputs": {"mock_data": "# API Smoke\n\nBody"},
                    },
                    {
                        "id": "clean",
                        "name": "Clean",
                        "type": "transform",
                        "inputs": {"transform_type": "text_clean"},
                    },
                    {
                        "id": "export",
                        "name": "Export",
                        "type": "export",
                        "inputs": {
                            "format": "markdown",
                            "filename": "api-output",
                            "directory": str(EXPORT_DIR),
                        },
                    },
                ],
                "edges": [
                    {"id": "e1", "source": "source", "target": "clean"},
                    {"id": "e2", "source": "clean", "target": "export"},
                ],
            },
            "execution_options": {},
            "validate_workflow": True,
            "enable_optimization": False,
            "optimization_level": "basic",
        }

        response_body = post_json("/api/v1/workflows/execute", payload)
        summary = response_body["execution_summary"]
        node_results = summary["node_results"]

        assert response_body["status"] == "completed"
        assert summary["success"] is True
        assert node_results["source"]["output"] == "# API Smoke\n\nBody"
        assert node_results["clean"]["output"] == "API Smoke\n\nBody"
        assert node_results["export"]["path"].endswith("api-output.md")
        checks.append({"api_execution_completed": response_body["run_id"]})

        exported = EXPORT_DIR / "api-output.md"
        assert exported.read_text() == "API Smoke\n\nBody"
        checks.append({"filesystem_export": str(exported)})

        status = get_json(f"/api/v1/runs/{response_body['run_id']}/status")
        assert status["status"] == "completed"
        assert status["node_results"]["export"]["path"].endswith("api-output.md")
        assert status["result_count"] == 1
        checks.append({"run_status_contains_artifacts": status["result_count"]})

        write_report("passed", checks, response_body)
        print(f"API smoke test passed: {REPORT_PATH}")
        return 0
    except Exception as exc:
        write_report("failed", checks, response_body, repr(exc))
        print(f"API smoke test failed: {REPORT_PATH}", file=sys.stderr)
        print(repr(exc), file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
