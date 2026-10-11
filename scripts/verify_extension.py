#!/usr/bin/env python3
"""
E2E verification for the DataKiln element recorder extension.

Loads the unpacked extension into a real Chromium (persistent context),
drives the picker on example.com, captures DOM elements, saves them via
the background's shared save path, and verifies the workflow landed in
the backend API with the expected node graph.

Prereqs: backend running on :8000.  Run from repo root:
  backend/venv/bin/python scripts/verify_extension.py
"""
import asyncio
import json
import pathlib
import sys
import tempfile
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parent.parent
EXT = ROOT / "chrome-extension"
BACKEND = "http://localhost:8000"


async def main() -> int:
    from playwright.async_api import async_playwright

    results = {}

    async with async_playwright() as p:
        user_data_dir = tempfile.mkdtemp(prefix="dk-ext-test-")
        ctx = await p.chromium.launch_persistent_context(
            user_data_dir,
            headless=False,
            viewport={"width": 1280, "height": 860},
            args=[
                f"--disable-extensions-except={EXT}",
                f"--load-extension={EXT}",
            ],
        )

        # ---- locate extension via MV3 service worker --------------------
        ext_id = None
        sw = None
        for _ in range(40):
            workers = ctx.service_workers + ctx.background_pages
            if workers:
                worker = workers[0]
                url = worker.url if hasattr(worker, "url") else str(worker)
                if "chrome-extension://" in url:
                    ext_id = url.split("/")[2]
                    sw = worker
                    break
            await asyncio.sleep(0.25)
        results["extension_id"] = ext_id
        assert ext_id, "extension service worker not found"

        # ---- open target page -------------------------------------------
        page = await ctx.new_page()
        await page.goto("https://example.com", wait_until="domcontentloaded")
        tab_id = await sw.evaluate(
            "new Promise(res => chrome.tabs.query({url:'https://example.com/*'}, t => res(t[0].id)))"
        )
        results["tab_id"] = tab_id

        # ---- inject picker + start --------------------------------------
        await sw.evaluate(
            """(tabId) => chrome.scripting.executeScript(
                 { target: { tabId }, files: ['lib/selector-builder.js', 'picker.js'] })""",
            tab_id,
        )
        state = await sw.evaluate(
            """(tabId) => new Promise(res =>
                 chrome.tabs.sendMessage(tabId, {type:'DATAKILN_TOGGLE_PICKER', on:true},
                   r => res(r)))""",
            tab_id,
        )
        results["picker_started"] = state

        # ---- capture two elements (picker intercepts clicks) ------------
        await page.evaluate("document.querySelector('h1').click()")
        await asyncio.sleep(0.3)
        link = page.locator("a", has_text="More information").first
        await page.evaluate("document.querySelector('a').click()")
        await asyncio.sleep(0.3)

        captured = await sw.evaluate(
            "chrome.storage.session.get('datakilnCaptured').then(d => d.datakilnCaptured || [])"
        )
        results["captured_count"] = len(captured)
        results["captured"] = [
            {"action": c["action"], "selector": c["selector"], "tag": c["tag"]} for c in captured
        ]

        # ---- save through the shared background path ---------------------
        save = await sw.evaluate("datakilnSaveCaptured({workflowId: null})")
        results["save"] = save
        assert save.get("ok"), f"save failed: {save}"

        wf_id = save["workflow_id"]

        # ---- verify workflow in backend ----------------------------------
        with urllib.request.urlopen(f"{BACKEND}/api/v1/workflows/{wf_id}", timeout=10) as r:
            wf = json.loads(r.read())
        types = [n["type"] for n in wf["nodes"]]
        results["backend_nodes"] = types
        results["backend_edges"] = len(wf["edges"])
        results["backend_name"] = wf["name"]

        # ---- context menus present ---------------------------------------
        await sw.evaluate("datakilnRefreshMenus()")
        await asyncio.sleep(0.8)
        menus = await sw.evaluate(
            """new Promise(res => {
              chrome.contextMenus.update('datakiln-recorder-root', {title: 'DataKiln Recorder'}, () => {
                if (chrome.runtime.lastError) res([]);
                else res(['datakiln-recorder-root']);
              });
            })"""
        )
        results["recorder_menus"] = menus
        results["recorder_menus"] = [m for m in menus if str(m).startswith("datakiln-rec")]

        await ctx.close()

    # ---- assertions ------------------------------------------------------
    ok = True
    def check(name, cond):
        nonlocal ok
        print(f"  {'PASS' if cond else 'FAIL'}  {name}")
        ok = ok and cond

    print(json.dumps(results, indent=1)[:1600])
    check("picker started on tab", bool(results["picker_started"]) and results["picker_started"].get("active") is True)
    check("captured 2 elements", results["captured_count"] == 2)
    check("first capture is extract on heading", results["captured"][0]["action"] == "extract" and results["captured"][0]["tag"] == "h1")
    check("second capture is click on link", results["captured"][1]["action"] == "click" and results["captured"][1]["tag"] == "a")
    check("save returned workflow id", bool(results["save"].get("workflow_id")))
    check("backend graph: dataSource + 2 dom_action + export", results["backend_nodes"] == ["dataSource", "dom_action", "dom_action", "export"])
    check("backend edges chain (3)", results["backend_edges"] == 3)
    check("workflow named from host", "example.com" in results["backend_name"])
    check("recorder context menus registered", "datakiln-recorder-root" in results["recorder_menus"])

    print("\nE2E RESULT:", "PASS" if ok else "FAIL")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
