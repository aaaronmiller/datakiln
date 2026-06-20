#!/usr/bin/env python3
import json
import sys
import urllib.request
from pathlib import Path

from playwright.sync_api import Error, expect, sync_playwright


REPORT_PATH = Path("/tmp/datakiln-smoke-report.json")
APP_URL = "http://127.0.0.1:3000"
BACKEND_URL = "http://127.0.0.1:8000"


def write_report(status, checks, console_errors):
    REPORT_PATH.write_text(json.dumps({
        "status": status,
        "checks": checks,
        "console_errors": console_errors,
    }, indent=2))


def check_backend():
    with urllib.request.urlopen(f"{BACKEND_URL}/health", timeout=5) as response:
        body = json.loads(response.read().decode("utf-8"))
    assert response.status == 200
    assert body["status"] == "healthy"
    return body


def main():
    checks = []
    console_errors = []

    try:
        checks.append({"backend_health": check_backend()})

        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page()
            page.on("console", lambda msg: console_errors.append(msg.text) if msg.type == "error" else None)
            page.on("dialog", lambda dialog: dialog.accept())

            page.goto(f"{APP_URL}/#/workflows/new")
            page.wait_for_load_state("networkidle")

            expect(page.get_by_text("Add Node:")).to_be_visible()
            expect(page.get_by_role("button", name="AI DOM Action")).to_be_visible()
            assert page.get_by_text("ReactFlow Error").count() == 0
            checks.append({"workflow_editor_loaded": True})

            page.get_by_role("button", name="AI DOM Action").click()
            expect(page.get_by_text("Nodes: 1")).to_be_visible(timeout=5000)
            checks.append({"ai_dom_node_add": True})

            page.get_by_role("button", name="Load Sample Workflow").click()
            expect(page.get_by_text("Nodes: 4 | Edges: 3")).to_be_visible(timeout=5000)
            checks.append({"sample_workflow_loaded": True})

            page.goto(f"{APP_URL}/#/dashboard")
            page.wait_for_load_state("networkidle")
            expect(page.get_by_role("heading", name="Dashboard")).to_be_visible()
            expect(page.get_by_text("Quick Actions")).to_be_visible()
            checks.append({"dashboard_loaded": True})

            browser.close()

        write_report("passed", checks, console_errors)
        print(f"Smoke test passed: {REPORT_PATH}")
        return 0
    except Exception as exc:
        write_report("failed", checks, console_errors + [repr(exc)])
        print(f"Smoke test failed: {REPORT_PATH}", file=sys.stderr)
        print(repr(exc), file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
