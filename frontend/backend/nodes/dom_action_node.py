"""
DomActionNode for Phase 1 MVP
Executes AI provider DOM automation using Playwright
"""
import asyncio
import os
import subprocess
import time
from typing import Any, Dict, List, Optional, Tuple
from playwright.async_api import Browser, BrowserContext, Page, async_playwright
from urllib.parse import urlparse

from .base import BaseNode


class DomActionNode(BaseNode):
    """Node for executing AI provider DOM interactions"""

    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        self.provider = config.get('provider', 'gemini')
        self.actions = config.get('actions', [])
        self.output_method = config.get('output', 'clipboard')
        self.timeout = config.get('timeout', 300000)  # 5 minutes default

        # Provider URLs
        self.provider_urls = {
            'gemini': 'https://gemini.google.com',
            'perplexity': 'https://www.perplexity.ai'
            # ytt doesn't need browser execution
        }

    async def execute(self, input_data: Dict[str, Any] = None) -> Dict[str, Any]:
        """Execute DOM actions on AI provider"""
        print(f"DomActionNode executing: {self.name} ({self.provider})")
        print(f"Actions: {len(self.actions)}")

        result = {
            'success': False,
            'output': '',
            'execution_time': 0,
            'logs': []
        }

        start_time = time.time()

        try:
            # Special handling for YTT (URL-based, no browser needed)
            if self.provider == 'ytt':
                return await self._execute_ytt(result),
                start_time

            # Browser automation for other providers
            async with async_playwright() as playwright:
                browser = await playwright.chromium.launch(
                    headless=True,
                    args=[
                        '--no-sandbox',
                        '--disable-dev-shm-usage',
                        '--disable-gpu'
                    ]
                )

                try:
                    context = await browser.new_context(
                        viewport={'width': 1920, 'height': 1080}
                    )

                    page = await context.new_page()

                    # Navigate to provider URL
                    provider_url = self.provider_urls.get(self.provider)
                    if not provider_url:
                        raise ValueError(f"Unknown provider: {self.provider}")

                    print(f"Navigating to {provider_url}")
                    await page.goto(provider_url, wait_until='networkidle', timeout=self.timeout)

                    # Execute action sequence
                    output_data = await self._execute_actions(page, result)
                    result.update(output_data)

                    result['execution_time'] = time.time() - start_time
                    result['success'] = True

                except Exception as e:
                    result['logs'].append(f"Browser error: {str(e)}")
                    result['execution_time'] = time.time() - start_time
                finally:
                    await browser.close()

        except Exception as e:
            print(f"DomActionNode execution failed: {str(e)}")
            result['logs'].append(f"Execution error: {str(e)}")
            result['execution_time'] = time.time() - start_time

        return result

    async def _execute_actions(self, page: Page, result: Dict[str, Any]) -> Dict[str, Any]:
        """Execute the sequence of DOM actions"""
        output_data = {}

        for i, action in enumerate(self.actions):
            try:
                await self._execute_single_action(page, action, i, result)

                # Delay after action if specified
                delay_ms = action.get('delayAfter', 1000)
                if delay_ms > 0:
                    await asyncio.sleep(delay_ms / 1000)  # Convert to seconds

            except Exception as e:
                result['logs'].append(f"Action {i} failed ({action.get('action', 'unknown')}): {str(e)}")
                continue

        # Extract final output based on method
        if self.output_method == 'clipboard':
            output_data['output'] = await self._get_clipboard_output(page, result)
        elif self.output_method == 'screen':
            output_data['output'] = await self._get_screen_output(page, result)
        elif self.output_method == 'file':
            output_data['output'] = await self._save_file_output(page, result)

        return output_data

    async def _execute_single_action(self, page: Page, action: Dict[str, Any], index: int, result: Dict[str, Any]):
        """Execute a single DOM action"""
        action_type = action.get('action', 'wait')
        selector = action.get('selector', '')
        value = action.get('value', '')

        log_msg = f"Action {index}: {action_type.upper()}"
        if selector:
            log_msg += f" on '{selector}'"
        if value:
            log_msg += f" with '{value}'"

        print(log_msg)
        result['logs'].append(log_msg)

        if action_type == 'type':
            element = await page.wait_for_selector(selector, timeout=10000)
            await element.fill('')  # Clear first
            await element.type(value, delay=100)  # Human-like typing

        elif action_type == 'click':
            element = await page.wait_for_selector(selector, timeout=10000)
            await element.click()

        elif action_type == 'select':
            element = await page.wait_for_selector(selector, timeout=10000)
            await element.select_option(value)

        elif action_type == 'wait':
            # Just delay, no selector needed
            pass

    async def _get_clipboard_output(self, page: Page, result: Dict[str, Any]) -> str:
        """Extract output via clipboard (most reliable for AI providers)"""
        try:
            # Try to find output text using provider-specific selectors
            if self.provider == 'gemini':
                selectors_to_try = [
                    '.response-text',
                    '.conversation-turn-latest .markdown-body',
                    'div[data-testid="response-container"]',
                    '.conversation-turn.active'
                ]
            elif self.provider == 'perplexity':
                selectors_to_try = [
                    '.result-container',
                    '.final-answer',
                    '.pro-search-result'
                ]
            else:
                selectors_to_try = ['body']

            for selector in selectors_to_try:
                try:
                    element = await page.query_selector(selector)
                    if element:
                        text = await element.text_content()
                        if text and len(text.strip()) > 50:  # Ensure we have meaningful output
                            return text.strip()
                except Exception:
                    continue

            # Fallback: get all page text
            text = await page.inner_text('body')
            return text.strip()

        except Exception as e:
            result['logs'].append(f"Clipboard output extraction failed: {str(e)}")
            return "Error: Could not extract output"

    async def _get_screen_output(self, page: Page, result: Dict[str, Any]) -> str:
        """Extract output for frontend display"""
        # Similar to clipboard but returns formatted text
        return await self._get_clipboard_output(page, result)

    async def _save_file_output(self, page: Page, result: Dict[str, Any]) -> str:
        """Save output to file"""
        try:
            output_dir = os.path.join(os.getcwd(), 'outputs')
            os.makedirs(output_dir, exist_ok=True)

            output_text = await self._get_clipboard_output(page, result)
            filename = f"{self.name}_{int(time.time())}.txt".replace(' ', '_')
            filepath = os.path.join(output_dir, filename)

            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(output_text)

            result['logs'].append(f"Output saved to: {filepath}")
            return filepath

        except Exception as e:
            result['logs'].append(f"File output failed: {str(e)}")
            return f"Error: Could not save file - {str(e)}"

    async def _execute_ytt(self, result: Dict[str, Any], start_time: float) -> Dict[str, Any]:
        """Execute YTT (YouTube Transcript) - URL-based, no browser needed"""
        print("DomActionNode executing YTT actions (URL-based)")

        # For YTT, we just extract URLs or inject them
        for action in self.actions:
            if action.get('action') == 'type' and action.get('value'):
                # Assume this is a YouTube URL
                video_id = self._extract_video_id(action['value'])
                if video_id:
                    transcript_url = f"https://youtubetotranscript.com/transcript?video_id={video_id}"
                    print(f"YTT URL: {transcript_url}")

                    result['logs'].append(f"YTT URL generated: {transcript_url}")
                    result['output'] = transcript_url
                    result['video_id'] = video_id
                else:
                    result['logs'].append("Invalid YouTube URL provided")

        result['execution_time'] = time.time() - start_time
        result['success'] = True
        return result

    def _extract_video_id(self, url: str) -> Optional[str]:
        """Extract YouTube video ID from URL"""
        try:
            parsed = urlparse(url)
            if parsed.netloc in ['youtube.com', 'youtu.be']:
                if parsed.netloc == 'youtu.be':
                    return parsed.path[1:]
                elif parsed.path == '/watch':
                    return parsed.query.split('v=')[1].split('&')[0]
        except Exception:
            pass
        return None


# Factory function for creating DomActionNode
def create_dom_action_node(config: Dict[str, Any]) -> DomActionNode:
    """Create and return a DomActionNode instance"""
    return DomActionNode(config)