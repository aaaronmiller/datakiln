#!/usr/bin/env python3
"""
Test script for YouTube transcript extraction workflow
Tests individual DOM actions with sample data and simulated interactions
"""

import asyncio
import json
from pathlib import Path
from typing import Dict, Any
from playwright.async_api import async_playwright, Page, Browser

# Add parent directory to path for imports
import sys
sys.path.insert(0, str(Path(__file__).parent.parent))

from dom_actions import DomActionExecutor
from dom_selectors import SelectorRegistry, SelectorDefinition, TimingPolicy


# YouTube-specific selectors for transcript extraction
YOUTUBE_SELECTORS = [
    {
        "key": "youtube.transcript_button",
        "selector": "button[aria-label='Show transcript']",
        "selector_type": "css",
        "description": "YouTube transcript toggle button",
        "provider": "youtube",
        "context": "video",
        "fallback_selectors": [
            "button:has-text('Transcript')",
            "ytd-video-description-transcript-section-renderer button",
            "#expand >> text=Transcript"
        ],
        "timing_policy": {
            "default_delay_ms": 2000,
            "wait_for_selector_timeout_ms": 8000,
            "action_timeout_ms": 10000
        }
    },
    {
        "key": "youtube.transcript_container",
        "selector": "ytd-transcript-segment-list-renderer",
        "selector_type": "css",
        "description": "YouTube transcript container",
        "provider": "youtube",
        "context": "video",
        "fallback_selectors": [
            "#segments-container",
            "[role='list'] ytd-transcript-segment-renderer",
            ".ytd-transcript-renderer"
        ],
        "timing_policy": {
            "default_delay_ms": 3000,
            "wait_for_selector_timeout_ms": 10000,
            "action_timeout_ms": 15000
        }
    },
    {
        "key": "youtube.transcript_text",
        "selector": "ytd-transcript-segment-renderer .segment-text",
        "selector_type": "css",
        "description": "YouTube transcript text segments",
        "provider": "youtube",
        "context": "video",
        "fallback_selectors": [
            "yt-formatted-string.segment-text",
            "#segments-container .segment-text",
            "[role='listitem'] .segment-text"
        ],
        "timing_policy": {
            "default_delay_ms": 2000,
            "wait_for_selector_timeout_ms": 8000,
            "action_timeout_ms": 10000
        }
    },
    {
        "key": "youtube.video_title",
        "selector": "h1.ytd-watch-metadata yt-formatted-string",
        "selector_type": "css",
        "description": "YouTube video title",
        "provider": "youtube",
        "context": "video",
        "fallback_selectors": [
            "h1.title",
            "#title h1",
            "ytd-watch-metadata h1"
        ],
        "timing_policy": {
            "default_delay_ms": 1000,
            "wait_for_selector_timeout_ms": 5000,
            "action_timeout_ms": 8000
        }
    },
    {
        "key": "youtube.description_text",
        "selector": "ytd-text-inline-expander #description-inline-expander",
        "selector_type": "css",
        "description": "YouTube video description",
        "provider": "youtube",
        "context": "video",
        "fallback_selectors": [
            "#description",
            "ytd-video-secondary-info-renderer #description",
            ".ytd-expander .content"
        ],
        "timing_policy": {
            "default_delay_ms": 1500,
            "wait_for_selector_timeout_ms": 6000,
            "action_timeout_ms": 10000
        }
    }
]


class YouTubeWorkflowTester:
    """Test YouTube transcript extraction workflow"""

    def __init__(self):
        self.selector_registry = SelectorRegistry()
        self.executor = DomActionExecutor()
        self.test_results = []

    async def setup_youtube_selectors(self):
        """Register YouTube selectors"""
        print("\n=== Registering YouTube Selectors ===")
        for selector_data in YOUTUBE_SELECTORS:
            definition = SelectorDefinition(**selector_data)
            success = self.selector_registry.register_selector(definition)
            if success:
                print(f"✓ Registered: {selector_data['key']}")
            else:
                print(f"✗ Failed: {selector_data['key']}")

    async def test_selector_resolution(self):
        """Test selector resolution and fallback logic"""
        print("\n=== Testing Selector Resolution ===")

        test_cases = [
            "youtube.transcript_button",
            "youtube.transcript_container",
            "youtube.transcript_text",
            "youtube.video_title",
            "youtube.description_text"
        ]

        for selector_key in test_cases:
            definition = self.selector_registry.get_selector(selector_key)
            if definition:
                print(f"\n✓ {selector_key}:")
                print(f"  Primary: {definition.selector}")
                print(f"  Fallbacks: {len(definition.fallback_selectors)}")
                print(f"  Timing: {definition.timing_policy.default_delay_ms}ms delay")
            else:
                print(f"✗ {selector_key}: Not found")

    async def test_transcript_extraction_mock(self):
        """Test transcript extraction with mock data (no real browser)"""
        print("\n=== Testing Transcript Extraction (Mock) ===")

        # Simulate the workflow steps
        workflow_steps = [
            {
                "step": 1,
                "action": "navigate",
                "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
                "description": "Navigate to YouTube video"
            },
            {
                "step": 2,
                "action": "click",
                "selector_key": "youtube.transcript_button",
                "description": "Click transcript button to reveal transcript"
            },
            {
                "step": 3,
                "action": "waitForVisible",
                "selector_key": "youtube.transcript_container",
                "description": "Wait for transcript container to appear"
            },
            {
                "step": 4,
                "action": "extract",
                "selector_key": "youtube.transcript_text",
                "description": "Extract all transcript text segments"
            },
            {
                "step": 5,
                "action": "extract",
                "selector_key": "youtube.video_title",
                "description": "Extract video title"
            }
        ]

        # Mock execution results
        for step in workflow_steps:
            print(f"\nStep {step['step']}: {step['description']}")
            print(f"  Action: {step['action']}")
            print(f"  Selector: {step.get('selector_key', 'N/A')}")

            # Get selector details if applicable
            if step.get('selector_key'):
                definition = self.selector_registry.get_selector(step['selector_key'])
                if definition:
                    print(f"  Primary Selector: {definition.selector}")
                    print(f"  Timeout: {definition.timing_policy.action_timeout_ms}ms")

            # Simulate result
            result = {
                "step": step['step'],
                "action": step['action'],
                "success": True,
                "timing_ms": step.get('timing_policy', {}).get('default_delay_ms', 1000) if step.get('selector_key') else 500
            }

            self.test_results.append(result)
            print(f"  Status: ✓ SUCCESS")

        # Mock transcript data
        mock_transcript = """
        [00:00] Never gonna give you up
        [00:04] Never gonna let you down
        [00:08] Never gonna run around and desert you
        [00:12] Never gonna make you cry
        [00:16] Never gonna say goodbye
        [00:20] Never gonna tell a lie and hurt you
        """

        print(f"\n=== Mock Transcript Extracted ===")
        print(mock_transcript)

        return {
            "success": True,
            "video_title": "Rick Astley - Never Gonna Give You Up (Official Video)",
            "video_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
            "transcript": mock_transcript,
            "steps_executed": len(workflow_steps),
            "total_time_ms": sum(r['timing_ms'] for r in self.test_results)
        }

    async def test_real_browser_workflow(self, url: str = None):
        """Test with real Playwright browser (optional)"""
        print("\n=== Testing with Real Browser (Playwright) ===")

        if not url:
            print("⚠ No URL provided, skipping real browser test")
            return None

        try:
            async with async_playwright() as p:
                # Launch browser
                browser = await p.chromium.launch(headless=False)
                page = await browser.new_page()

                print(f"✓ Browser launched")

                # Navigate to YouTube video
                print(f"→ Navigating to: {url}")
                await page.goto(url, wait_until="domcontentloaded")
                await asyncio.sleep(3)  # Wait for page to load

                # Try to click transcript button
                print(f"→ Looking for transcript button...")
                transcript_def = self.selector_registry.get_selector("youtube.transcript_button")

                if transcript_def:
                    try:
                        # Try primary selector
                        await page.wait_for_selector(
                            transcript_def.selector,
                            timeout=transcript_def.timing_policy.wait_for_selector_timeout_ms
                        )
                        await page.click(transcript_def.selector)
                        print(f"✓ Clicked transcript button (primary selector)")
                    except Exception as e:
                        print(f"⚠ Primary selector failed: {e}")

                        # Try fallbacks
                        for fallback in transcript_def.fallback_selectors:
                            try:
                                await page.wait_for_selector(fallback, timeout=5000)
                                await page.click(fallback)
                                print(f"✓ Clicked transcript button (fallback: {fallback})")
                                break
                            except:
                                continue

                    # Wait for transcript to appear
                    await asyncio.sleep(2)

                    # Extract transcript text
                    transcript_text_def = self.selector_registry.get_selector("youtube.transcript_text")
                    if transcript_text_def:
                        try:
                            # Get all transcript segments
                            segments = await page.query_selector_all(transcript_text_def.selector)
                            transcript_texts = []

                            for segment in segments:
                                text = await segment.text_content()
                                if text:
                                    transcript_texts.append(text.strip())

                            transcript = "\n".join(transcript_texts)
                            print(f"✓ Extracted {len(transcript_texts)} transcript segments")
                            print(f"\nFirst 300 characters:")
                            print(transcript[:300] + "...")

                            result = {
                                "success": True,
                                "url": url,
                                "transcript_segments": len(transcript_texts),
                                "transcript": transcript
                            }

                        except Exception as e:
                            print(f"✗ Failed to extract transcript: {e}")
                            result = {"success": False, "error": str(e)}
                    else:
                        print(f"✗ Transcript text selector not found")
                        result = {"success": False, "error": "Selector not found"}

                else:
                    print(f"✗ Transcript button selector not found")
                    result = {"success": False, "error": "Selector not found"}

                await browser.close()
                return result

        except Exception as e:
            print(f"✗ Browser test failed: {e}")
            return {"success": False, "error": str(e)}

    async def test_dom_action_node_format(self):
        """Test DOM action configuration format for workflow nodes"""
        print("\n=== Testing DOM Action Node Format ===")

        # Example workflow configuration for YouTube transcript extraction
        workflow_config = {
            "id": "youtube-transcript-workflow",
            "name": "YouTube Transcript Extraction",
            "start_node": "navigate",
            "nodes": {
                "navigate": {
                    "id": "navigate",
                    "type": "dom_action",
                    "name": "Navigate to YouTube Video",
                    "data": {
                        "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
                        "actions": []
                    }
                },
                "click_transcript": {
                    "id": "click_transcript",
                    "type": "dom_action",
                    "name": "Click Transcript Button",
                    "config": {
                        "provider": "youtube",
                        "output": "next",
                        "actions": [
                            {
                                "selector_key": "youtube.transcript_button",
                                "action": "click",
                                "delayAfter": 2000
                            }
                        ]
                    }
                },
                "extract_transcript": {
                    "id": "extract_transcript",
                    "type": "dom_action",
                    "name": "Extract Transcript Text",
                    "config": {
                        "provider": "youtube",
                        "output": "next",
                        "actions": [
                            {
                                "selector_key": "youtube.transcript_container",
                                "action": "waitForVisible",
                                "delay": 3000
                            },
                            {
                                "selector_key": "youtube.transcript_text",
                                "action": "extract"
                            }
                        ]
                    }
                },
                "extract_metadata": {
                    "id": "extract_metadata",
                    "type": "dom_action",
                    "name": "Extract Video Metadata",
                    "config": {
                        "provider": "youtube",
                        "output": "next",
                        "actions": [
                            {
                                "selector_key": "youtube.video_title",
                                "action": "extract"
                            },
                            {
                                "selector_key": "youtube.description_text",
                                "action": "extract"
                            }
                        ]
                    }
                }
            },
            "edges": [
                {"source": "navigate", "target": "click_transcript"},
                {"source": "click_transcript", "target": "extract_transcript"},
                {"source": "extract_transcript", "target": "extract_metadata"}
            ]
        }

        # Save workflow configuration
        workflow_path = Path(__file__).parent.parent / "workflows" / "youtube_transcript.json"
        workflow_path.parent.mkdir(parents=True, exist_ok=True)

        with open(workflow_path, 'w') as f:
            json.dump(workflow_config, f, indent=2)

        print(f"✓ Workflow configuration created: {workflow_path}")
        print(f"  Nodes: {len(workflow_config['nodes'])}")
        print(f"  Edges: {len(workflow_config['edges'])}")

        # Print workflow summary
        print(f"\n  Workflow Steps:")
        for node_id, node in workflow_config['nodes'].items():
            actions_count = len(node.get('config', {}).get('actions', node.get('data', {}).get('actions', [])))
            print(f"    {node_id}: {node['name']} ({actions_count} actions)")

        return workflow_config

    async def generate_test_report(self):
        """Generate comprehensive test report"""
        print("\n" + "="*60)
        print("=== YouTube Workflow Test Report ===")
        print("="*60)

        print(f"\nTotal Tests Run: {len(self.test_results)}")
        successful = sum(1 for r in self.test_results if r.get('success'))
        print(f"Successful: {successful}/{len(self.test_results)}")

        if self.test_results:
            total_time = sum(r.get('timing_ms', 0) for r in self.test_results)
            print(f"Total Estimated Time: {total_time}ms ({total_time/1000:.2f}s)")

        print(f"\nSelectors Registered: {len(YOUTUBE_SELECTORS)}")
        for selector in YOUTUBE_SELECTORS:
            print(f"  • {selector['key']}")

        print("\n" + "="*60)


async def main():
    """Run all tests"""
    print("\n" + "="*60)
    print("YouTube Workflow Testing Suite")
    print("="*60)

    tester = YouTubeWorkflowTester()

    # Run tests
    await tester.setup_youtube_selectors()
    await tester.test_selector_resolution()
    mock_result = await tester.test_transcript_extraction_mock()
    workflow_config = await tester.test_dom_action_node_format()

    # Optional: Test with real browser (uncomment to enable)
    # real_result = await tester.test_real_browser_workflow(
    #     url="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
    # )

    await tester.generate_test_report()

    print("\n✓ All tests completed!")
    print("\nTo test with a real browser, uncomment the real_result line in main()")
    print("and provide a YouTube URL.")


if __name__ == "__main__":
    asyncio.run(main())
