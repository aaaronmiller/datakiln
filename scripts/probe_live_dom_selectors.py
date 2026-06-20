#!/usr/bin/env python3
import json
import sys
from pathlib import Path

from playwright.sync_api import TimeoutError as PlaywrightTimeoutError
from playwright.sync_api import sync_playwright


REPORT_PATH = Path("/tmp/datakiln-live-dom-selector-report.json")


SITES = [
    {
        "name": "gemini",
        "url": "https://gemini.google.com/app",
        "selectors": [
            "[contenteditable='true']",
            "rich-textarea",
            "rich-textarea [contenteditable='true']",
            "textarea",
            "input[type='text']",
            "input[name='q']",
            "div.label:has-text('Deep Research')",
            "button:has-text('Deep Research')",
            "mat-icon[fonticon='send']",
            "button[aria-label*='Send']",
            "button[aria-label*='Submit']",
            "span.mdc-button__label:has-text('Start research')",
            "span.mat-mdc-list-item-title:has-text('Copy')",
            "mat-icon[data-test-id='share-icon']",
            "main",
            "body",
        ],
    },
    {
        "name": "perplexity",
        "url": "https://www.perplexity.ai",
        "selectors": [
            "textarea[data-testid='search-input']",
            "textarea[placeholder]",
            "textarea",
            "[contenteditable='true']",
            "[role='textbox']",
            ".ProseMirror",
            "[data-lexical-editor='true']",
            "div[contenteditable='true']",
            "button[data-testid='send-button']",
            "button[aria-label*='Submit']",
            "button[aria-label*='Send']",
            "button:has-text('Submit')",
            "button:has-text('Ask')",
            "main",
            "body",
        ],
    },
    {
        "name": "youtube_transcript_current_frontend",
        "url": "https://youtubetranscript.com/transcript?url=https%3A%2F%2Fwww.youtube.com%2Fwatch%3Fv%3DdQw4w9WgXcQ",
        "selectors": [
            "span#copy-span",
            "span.copy-span",
            "button:has-text('Copy')",
            "[aria-label*='Copy']",
            "textarea",
            "pre",
            ".transcript",
            "#transcript",
            "main",
            "body",
        ],
    },
    {
        "name": "youtube_transcript_old_docs",
        "url": "https://youtubetotranscript.com/transcript?video_id=dQw4w9WgXcQ",
        "selectors": [
            "span#copy-span",
            "span.copy-span",
            "button:has-text('Copy')",
            "[aria-label*='Copy']",
            "textarea",
            "pre",
            ".transcript",
            "#transcript",
            "main",
            "body",
        ],
    },
]


def sample_text(locator, limit=180):
    try:
        text = locator.first().inner_text(timeout=1500).strip()
    except Exception:
        return ""
    return " ".join(text.split())[:limit]


def element_inventory(page):
    inventory = {}
    for selector in ["input", "textarea", "button", "[contenteditable='true']", "a"]:
        items = []
        locator = page.locator(selector)
        count = min(locator.count(), 20)
        for index in range(count):
            element = locator.nth(index)
            try:
                items.append({
                    "text": " ".join(element.inner_text(timeout=500).split())[:80],
                    "placeholder": element.get_attribute("placeholder"),
                    "aria_label": element.get_attribute("aria-label"),
                    "data_testid": element.get_attribute("data-testid"),
                    "role": element.get_attribute("role"),
                    "type": element.get_attribute("type"),
                })
            except Exception:
                continue
        inventory[selector] = items
    return inventory


def probe_site(page, site):
    result = {
        "name": site["name"],
        "url": site["url"],
        "final_url": None,
        "title": None,
        "selectors": [],
        "inventory": {},
        "error": None,
    }
    try:
        page.goto(site["url"], wait_until="domcontentloaded", timeout=30000)
        try:
            page.wait_for_load_state("networkidle", timeout=8000)
        except PlaywrightTimeoutError:
            pass

        result["final_url"] = page.url
        result["title"] = page.title()
        for selector in site["selectors"]:
            entry = {"selector": selector, "count": 0, "sample_text": "", "error": None}
            try:
                locator = page.locator(selector)
                entry["count"] = locator.count()
                if entry["count"] > 0:
                    entry["sample_text"] = sample_text(locator)
            except Exception as exc:
                entry["error"] = str(exc)
            result["selectors"].append(entry)
        result["inventory"] = element_inventory(page)
    except Exception as exc:
        result["error"] = repr(exc)
    return result


def main():
    results = []
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        context = browser.new_context(
            viewport={"width": 1440, "height": 1000},
            user_agent=(
                "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
                "(KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36"
            ),
        )
        page = context.new_page()
        for site in SITES:
            results.append(probe_site(page, site))
        browser.close()

    REPORT_PATH.write_text(json.dumps({"sites": results}, indent=2))
    print(f"Live DOM selector report written: {REPORT_PATH}")

    failed = [site for site in results if site["error"]]
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
