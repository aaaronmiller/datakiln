#!/usr/bin/env python3
"""
Gemini Automation Module
Handles browser automation for Gemini Canvas and Deep Research interfaces using Playwright.
"""

import asyncio
import json
import os
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime, timedelta
import re
from pathlib import Path

from playwright.async_api import async_playwright, Browser, Page, BrowserContext
from playwright._impl._errors import TimeoutError as PlaywrightTimeoutError
from enum import Enum

class GeminiAutomationError(Exception):
    """Custom exception for Gemini automation errors."""
    pass

class GeminiInterface(Enum):
    """Gemini interface types."""
    CANVAS = "canvas"
    DEEP_RESEARCH = "deep_research"

class GeminiAutomation:
    """Handles browser automation for Gemini interfaces."""

    def __init__(self, headless: bool = True, timeout_seconds: int = 30):
        self.headless = headless
        self.timeout_seconds = timeout_seconds
        self.browser: Optional[Browser] = None
        self.context: Optional[BrowserContext] = None
        self.page: Optional[Page] = None

        # Gemini URLs
        self.urls = {
            GeminiInterface.CANVAS: "https://gemini.google.com/canvas",
            GeminiInterface.DEEP_RESEARCH: "https://gemini.google.com/deep-research"
        }

        # Selectors for Gemini interfaces (may need updates based on actual DOM)
        self.selectors = {
            "prompt_input": [
                'textarea[placeholder*="Ask"]',
                'textarea[placeholder*="Enter"]',
                'div[contenteditable="true"]',
                '[data-testid="prompt-input"]'
            ],
            "submit_button": [
                'button[type="submit"]',
                'button:has-text("Submit")',
                'button:has-text("Send")',
                '[data-testid="submit-button"]',
                'button svg'  # Often has send icon
            ],
            "response_area": [
                '[data-testid="response"]',
                '.response-content',
                '.message-content',
                '[role="main"] .prose'
            ],
            "copy_button": [
                'button:has-text("Copy")',
                '[data-testid="copy-button"]',
                'button svg[aria-label*="copy"]'
            ],
            "share_button": [
                'button:has-text("Share")',
                '[data-testid="share-button"]'
            ],
            "loading_indicator": [
                '[data-testid="loading"]',
                '.loading',
                'div[aria-label="Loading"]'
            ]
        }

    async def __aenter__(self):
        """Async context manager entry."""
        await self.initialize()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit."""
        await self.cleanup()

    async def initialize(self):
        """Initialize Playwright browser and context."""
        try:
            playwright = await async_playwright().start()
            self.browser = await playwright.chromium.launch(
                headless=self.headless,
                args=[
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--no-first-run',
                    '--no-zygote',
                    '--disable-gpu'
                ]
            )

            self.context = await self.browser.new_context(
                viewport={'width': 1280, 'height': 720},
                user_agent='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            )

            self.page = await self.context.new_page()

            # Set default timeout
            self.page.set_default_timeout(self.timeout_seconds * 1000)

        except Exception as e:
            raise GeminiAutomationError(f"Failed to initialize browser: {e}")

    async def cleanup(self):
        """Clean up browser resources."""
        try:
            if self.page:
                await self.page.close()
            if self.context:
                await self.context.close()
            if self.browser:
                await self.browser.close()
        except Exception as e:
            print(f"Warning: Error during cleanup: {e}")

    async def navigate_to_interface(self, interface: GeminiInterface) -> bool:
        """Navigate to the specified Gemini interface."""
        if not self.page:
            raise GeminiAutomationError("Browser not initialized")

        try:
            url = self.urls[interface]
            await self.page.goto(url, wait_until="networkidle")

            # Wait for interface to load
            await self._wait_for_interface_ready(interface)
            return True

        except Exception as e:
            raise GeminiAutomationError(f"Failed to navigate to {interface.value}: {e}")

    async def _wait_for_interface_ready(self, interface: GeminiInterface):
        """Wait for the Gemini interface to be ready for interaction."""
        if not self.page:
            return

        # Wait for common interface elements
        await self.page.wait_for_load_state("domcontentloaded")

        # Try to find prompt input to confirm interface is ready
        for selector in self.selectors["prompt_input"]:
            try:
                await self.page.wait_for_selector(selector, timeout=5000)
                return  # Interface is ready
            except PlaywrightTimeoutError:
                continue

        # If we get here, interface might not be ready, but don't fail
        print(f"Warning: Could not confirm {interface.value} interface readiness")

    async def submit_research_query(self, query: str, interface: GeminiInterface = GeminiInterface.DEEP_RESEARCH,
                                  files: Optional[List[str]] = None) -> Dict[str, Any]:
        """Submit a research query to Gemini and wait for response."""

        if not self.page:
            raise GeminiAutomationError("Browser not initialized")

        try:
            # Ensure we're on the correct interface
            await self.navigate_to_interface(interface)

            # Find and fill prompt input
            prompt_input = await self._find_element(self.selectors["prompt_input"])
            if not prompt_input:
                raise GeminiAutomationError("Could not find prompt input field")

            await prompt_input.fill(query)

            # Handle file attachments if provided
            if files:
                await self._attach_files(files)

            # Find and click submit button
            submit_button = await self._find_element(self.selectors["submit_button"])
            if not submit_button:
                raise GeminiAutomationError("Could not find submit button")

            await submit_button.click()

            # Wait for response to start loading
            await self._wait_for_response_start()

            # Wait for response to complete
            response_data = await self._wait_for_response_complete()

            return {
                "success": True,
                "query": query,
                "interface": interface.value,
                "response": response_data,
                "timestamp": datetime.now().isoformat()
            }

        except Exception as e:
            return {
                "success": False,
                "query": query,
                "interface": interface.value,
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            }

    async def _find_element(self, selectors: List[str]) -> Optional[Any]:
        """Find an element using multiple selector attempts."""
        if not self.page:
            return None

        for selector in selectors:
            try:
                element = await self.page.query_selector(selector)
                if element:
                    return element
            except Exception:
                continue
        return None

    async def _attach_files(self, file_paths: List[str]):
        """Attach files to the research query."""
        # Implementation depends on Gemini's file attachment UI
        # This is a placeholder for the actual implementation
        for file_path in file_paths:
            if os.path.exists(file_path):
                print(f"Would attach file: {file_path}")
                # TODO: Implement actual file attachment logic
                # This might involve finding file input elements or drag-drop zones

    async def _wait_for_response_start(self):
        """Wait for the response to start loading."""
        if not self.page:
            return

        # Look for loading indicators
        for selector in self.selectors["loading_indicator"]:
            try:
                await self.page.wait_for_selector(selector, timeout=10000)
                return
            except PlaywrightTimeoutError:
                continue

        # Fallback: wait for response area to appear
        for selector in self.selectors["response_area"]:
            try:
                await self.page.wait_for_selector(selector, timeout=5000)
                return
            except PlaywrightTimeoutError:
                continue

    async def _wait_for_response_complete(self, timeout_minutes: int = 10) -> Dict[str, Any]:
        """Wait for the research response to complete and extract results."""

        if not self.page:
            raise GeminiAutomationError("Browser not initialized")

        timeout_seconds = timeout_minutes * 60
        start_time = datetime.now()

        while (datetime.now() - start_time).total_seconds() < timeout_seconds:
            try:
                # Check if loading indicators are gone
                loading_visible = False
                for selector in self.selectors["loading_indicator"]:
                    try:
                        element = await self.page.query_selector(selector)
                        if element and await element.is_visible():
                            loading_visible = True
                            break
                    except Exception:
                        continue

                if not loading_visible:
                    # Try to extract response content
                    response_content = await self._extract_response_content()
                    if response_content:
                        return response_content

                await asyncio.sleep(2)  # Check every 2 seconds

            except Exception as e:
                print(f"Error checking response status: {e}")
                await asyncio.sleep(2)

        raise GeminiAutomationError(f"Response timeout after {timeout_minutes} minutes")

    async def _extract_response_content(self) -> Optional[Dict[str, Any]]:
        """Extract the response content from the page."""

        if not self.page:
            return None

        try:
            # Find response area
            response_element = None
            for selector in self.selectors["response_area"]:
                try:
                    element = await self.page.query_selector(selector)
                    if element:
                        response_element = element
                        break
                except Exception:
                    continue

            if not response_element:
                return None

            # Extract text content
            text_content = await response_element.text_content()

            # Try to extract structured data if available
            structured_data = await self._extract_structured_response()

            return {
                "text_content": text_content,
                "structured_data": structured_data,
                "extracted_at": datetime.now().isoformat()
            }

        except Exception as e:
            print(f"Error extracting response content: {e}")
            return None

    async def _extract_structured_response(self) -> Optional[Dict[str, Any]]:
        """Extract structured response data if available."""
        # This would depend on how Gemini structures its responses
        # Placeholder for future implementation
        return None

    async def copy_response(self) -> Optional[str]:
        """Copy the response content using the interface's copy functionality."""

        if not self.page:
            return None

        try:
            # Try to find and click copy button
            copy_button = await self._find_element(self.selectors["copy_button"])
            if copy_button:
                await copy_button.click()
                await asyncio.sleep(1)  # Wait for clipboard operation

                # Try to get clipboard content
                clipboard_content = await self.page.evaluate("navigator.clipboard.readText()")
                return clipboard_content

            # Fallback: extract content directly
            response_data = await self._extract_response_content()
            return response_data.get("text_content") if response_data else None

        except Exception as e:
            print(f"Error copying response: {e}")
            return None

    async def get_page_screenshot(self, name: str) -> Optional[str]:
        """Take a screenshot of the current page."""
        if not self.page:
            return None

        try:
            screenshot_path = f"screenshot_{name}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.png"
            await self.page.screenshot(path=screenshot_path, full_page=True)
            return screenshot_path
        except Exception as e:
            print(f"Error taking screenshot: {e}")
            return None

    async def perform_research_with_retries(self, query: str, interface: GeminiInterface = GeminiInterface.DEEP_RESEARCH,
                                          max_retries: int = 3, retry_delay: int = 5) -> Dict[str, Any]:
        """Perform research with retry logic and error handling."""

        last_error = None

        for attempt in range(max_retries):
            try:
                result = await self.submit_research_query(query, interface)

                if result["success"]:
                    return result
                else:
                    last_error = result.get("error", "Unknown error")

            except Exception as e:
                last_error = str(e)

            if attempt < max_retries - 1:
                print(f"Research attempt {attempt + 1} failed: {last_error}. Retrying in {retry_delay}s...")
                await asyncio.sleep(retry_delay)

                # Try refreshing the page for next attempt
                try:
                    await self.page.reload()
                    await asyncio.sleep(2)
                except Exception:
                    pass

        return {
            "success": False,
            "query": query,
            "interface": interface.value,
            "error": f"Failed after {max_retries} attempts. Last error: {last_error}",
            "timestamp": datetime.now().isoformat()
        }

# Utility functions for external use
async def perform_gemini_research(query: str, interface: str = "deep_research",
                                headless: bool = True) -> Dict[str, Any]:
    """Convenience function to perform Gemini research."""

    interface_enum = GeminiInterface.DEEP_RESEARCH
    if interface.lower() == "canvas":
        interface_enum = GeminiInterface.CANVAS

    async with GeminiAutomation(headless=headless) as automation:
        return await automation.perform_research_with_retries(query, interface_enum)

if __name__ == "__main__":
    # Example usage
    async def main():
        result = await perform_gemini_research("What are the latest developments in AI research?")
        print(json.dumps(result, indent=2))

    asyncio.run(main())