#!/usr/bin/env python3
"""
Capture authenticated storage state for free 24-7 DOM workflows.

Opens a headed Playwright browser so you can log in manually, then saves
the storage state to a file that `dom.sequence` / `storage_state_path`
can reuse for headless repeat runs (e.g., Gemini web UI).

Usage:
  python scripts/capture_auth_state.py --url https://gemini.google.com/app --out storage_state.json
  python scripts/capture_auth_state.py --url https://example.com --out storage_state.json --timeout 300

Prerequisites: `pip install playwright && playwright install chromium`
"""
import argparse
import asyncio
import json
import sys
from pathlib import Path

async def main(url: str, out_path: Path, timeout: int, headed: bool):
    try:
        from playwright.async_api import async_playwright
    except ImportError:
        print("playwright is required: pip install playwright && playwright install chromium", file=sys.stderr)
        sys.exit(2)

    out_path = out_path.expanduser().resolve()
    out_path.parent.mkdir(parents=True, exist_ok=True)

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=not headed)
        context = await browser.new_context()
        page = await context.new_page()
        await page.goto(url, wait_until="domcontentloaded")
        print(f"Opened {url}")
        print("Log in manually in the opened window. Press Enter here when done (or wait for timeout)...")
        # Wait for user confirmation with timeout
        try:
            await asyncio.wait_for(asyncio.to_thread(input, f"Waiting {timeout}s — press Enter when authenticated: "), timeout=timeout)
        except asyncio.TimeoutError:
            print(f"Timeout {timeout}s reached, saving current state...")
        # Also give a moment for cookies to settle
        await page.wait_for_timeout(1000)
        await context.storage_state(path=str(out_path))
        print(f"Saved storage state to {out_path}")
        # Print summary
        try:
            data = json.loads(out_path.read_text())
            origins = len(data.get("origins", []))
            cookies = len(data.get("cookies", []))
            print(f"  cookies: {cookies}, origins: {origins}")
            print(f"Use as: storage_state_path={out_path}")
            print(f"Or set env STORAGE_STATE_PATH and pass context storage_state_path in workflow execution.")
        except Exception as e:
            print(f"Saved but could not summarize: {e}")
        await browser.close()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Capture Playwright storage state for authenticated workflows")
    parser.add_argument("--url", required=True, help="URL to open for login (e.g., https://gemini.google.com/app)")
    parser.add_argument("--out", required=True, help="Output path for storage_state JSON")
    parser.add_argument("--timeout", type=int, default=300, help="Seconds to wait before auto-saving (default 300)")
    parser.add_argument("--headless", action="store_true", help="Run headless (not useful for manual login)")
    args = parser.parse_args()
    asyncio.run(main(args.url, Path(args.out), args.timeout, not args.headless))
