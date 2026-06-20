#!/usr/bin/env python3
import json
from pathlib import Path

from playwright.sync_api import TimeoutError as PlaywrightTimeoutError
from playwright.sync_api import sync_playwright


REPORT_PATH = Path("/tmp/datakiln-live-dom-interaction-report.json")


TARGETS = [
    {
        "name": "gemini",
        "url": "https://gemini.google.com/app",
        "input_selector": "rich-textarea [contenteditable='true']",
        "send_candidates": [
            "mat-icon[fonticon='send']",
            "button[aria-label*='Send']",
            "button[aria-label*='Submit']",
            "button:has(mat-icon[fonticon='send'])",
        ],
    },
    {
        "name": "perplexity",
        "url": "https://www.perplexity.ai",
        "input_selector": "[contenteditable='true'], [role='textbox'], .ProseMirror, [data-lexical-editor='true']",
        "send_candidates": [
            "button[aria-label*='Submit']",
            "button[aria-label*='Send']",
            "button[data-testid='send-button']",
            "button:has-text('Ask')",
        ],
    },
]


def visible_count(page, selector):
    locator = page.locator(selector)
    total = locator.count()
    visible = 0
    for index in range(min(total, 20)):
        try:
            if locator.nth(index).is_visible(timeout=500):
                visible += 1
        except Exception:
            pass
    return total, visible


def button_inventory(page):
    items = []
    buttons = page.locator("button")
    for index in range(min(buttons.count(), 30)):
        button = buttons.nth(index)
        try:
            items.append({
                "text": " ".join(button.inner_text(timeout=500).split())[:80],
                "aria_label": button.get_attribute("aria-label"),
                "disabled": button.get_attribute("disabled"),
                "type": button.get_attribute("type"),
                "visible": button.is_visible(timeout=500),
            })
        except Exception:
            continue
    return items


def probe_target(page, target):
    result = {
        "name": target["name"],
        "url": target["url"],
        "final_url": None,
        "input_selector": target["input_selector"],
        "input_count": 0,
        "input_visible_count": 0,
        "send_candidates": [],
        "buttons_after_fill": [],
        "error": None,
    }
    try:
        page.goto(target["url"], wait_until="domcontentloaded", timeout=30000)
        try:
            page.wait_for_load_state("networkidle", timeout=8000)
        except PlaywrightTimeoutError:
            pass
        result["final_url"] = page.url

        total, visible = visible_count(page, target["input_selector"])
        result["input_count"] = total
        result["input_visible_count"] = visible

        input_box = page.locator(target["input_selector"]).first
        input_box.click(timeout=5000)
        input_box.fill("DataKiln live DOM selector smoke", timeout=5000)
        page.wait_for_timeout(1000)

        for selector in target["send_candidates"]:
            total, visible = visible_count(page, selector)
            result["send_candidates"].append({
                "selector": selector,
                "count": total,
                "visible_count": visible,
            })

        result["buttons_after_fill"] = button_inventory(page)
    except Exception as exc:
        result["error"] = repr(exc)
    return result


def main():
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        context = browser.new_context(
            viewport={"width": 1440, "height": 1000},
            user_agent=(
                "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
                "(KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36"
            ),
        )
        results = []
        for target in TARGETS:
            page = context.new_page()
            results.append(probe_target(page, target))
            page.close()
        browser.close()

    REPORT_PATH.write_text(json.dumps({"targets": results}, indent=2))
    print(f"Live DOM interaction report written: {REPORT_PATH}")
    return 1 if any(result["error"] for result in results) else 0


if __name__ == "__main__":
    raise SystemExit(main())
