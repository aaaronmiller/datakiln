#!/usr/bin/env python3
"""
Gemini Deep Research Workflow Automation
Implements the exact workflow specified: navigate, click input, select deep research,
input query, submit, wait, approve, wait for results, copy to clipboard.
"""

import asyncio
import sys
import time
import argparse
from typing import Optional
from playwright.async_api import async_playwright, Page, Browser, BrowserContext


class GeminiDeepResearchWorkflow:
    """Automate the exact Gemini Deep Research workflow"""
    
    def __init__(self, headless: bool = False):
        self.headless = headless
        self.browser: Optional[Browser] = None
        self.context: Optional[BrowserContext] = None
        self.page: Optional[Page] = None
        
        # DOM selectors from documentation
        self.selectors = {
            'deep_research_toggle': 'div.label:has-text("Deep Research")',
            'text_input': '[contenteditable="true"]',
            'submit_button': 'mat-icon[font-icon="send"]',
            'copy_button': 'span.mat-mdc-list-item-title:has-text("Copy")',
            # Approval prompt - may need to be detected dynamically
            'approval_prompt': None  # Will be detected during execution
        }
    
    async def initialize(self):
        """Initialize browser and context"""
        playwright = await async_playwright().start()
        
        self.browser = await playwright.chromium.launch(
            headless=self.headless,
            args=[
                '--no-sandbox',
                '--disable-dev-shm-usage',
                '--disable-blink-features=AutomationControlled',
                '--disable-extensions',
                '--disable-plugins',
                '--disable-images',  # Faster loading
                '--user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            ]
        )
        
        self.context = await self.browser.new_context(
            viewport={'width': 1920, 'height': 1080},
            extra_http_headers={
                'Accept-Language': 'en-US,en;q=0.9',
            }
        )
        
        self.page = await self.context.new_page()
        self.page.set_default_timeout(30000)
    
    async def cleanup(self):
        """Clean up browser resources"""
        if self.page:
            await self.page.close()
        if self.context:
            await self.context.close()
        if self.browser:
            await self.browser.close()
    
    async def step_1_navigate_to_page(self):
        """Step 1: Navigate to Gemini Deep Research page"""
        print("Step 1: Navigating to Gemini Deep Research page...")
        await self.page.goto('https://gemini.google.com/deep-research', wait_until='domcontentloaded')
        await asyncio.sleep(3)  # Allow page to fully load
        print("✓ Navigated to Gemini Deep Research page")
    
    async def step_2_click_text_input(self):
        """Step 2: Click text input field"""
        print("Step 2: Clicking text input field...")
        await self.page.wait_for_selector(self.selectors['text_input'], timeout=10000)
        await self.page.click(self.selectors['text_input'])
        print("✓ Clicked text input field")
    
    async def step_3_click_deep_research_selector(self):
        """Step 3: Click deep research selector"""
        print("Step 3: Clicking deep research selector...")
        try:
            await self.page.wait_for_selector(self.selectors['deep_research_toggle'], timeout=5000)
            await self.page.click(self.selectors['deep_research_toggle'])
            print("✓ Clicked deep research selector")
        except Exception as e:
            print(f"Warning: Could not find deep research toggle: {e}")
            print("Continuing - may already be in deep research mode")
    
    async def step_4_input_query_text(self, query: str):
        """Step 4: Input query text"""
        print(f"Step 4: Inputting query text: '{query}'")
        await self.page.fill(self.selectors['text_input'], query)
        print("✓ Input query text")
    
    async def step_5_click_submit(self):
        """Step 5: Click submit"""
        print("Step 5: Clicking submit...")
        await self.page.wait_for_selector(self.selectors['submit_button'], timeout=10000)
        await self.page.click(self.selectors['submit_button'])
        print("✓ Clicked submit")
    
    async def step_6_wait_4_5_seconds(self):
        """Step 6: Wait 4-5 seconds"""
        print("Step 6: Waiting 4-5 seconds...")
        await asyncio.sleep(5)
        print("✓ Waited 4-5 seconds")
    
    async def step_7_click_approval_prompt(self):
        """Step 7: Click approval prompt"""
        print("Step 7: Looking for approval prompt...")
        # Try to find common approval/confirmation elements
        approval_selectors = [
            'button:has-text("Continue")',
            'button:has-text("Approve")',
            'button:has-text("Confirm")',
            'button:has-text("Yes")',
            'button:has-text("Start")',
            '[role="button"]:has-text("Continue")',
            '[role="button"]:has-text("Approve")',
            '.mdc-button:has-text("Continue")',
            '.mdc-button:has-text("Start")'
        ]
        
        approval_clicked = False
        for selector in approval_selectors:
            try:
                await self.page.wait_for_selector(selector, timeout=2000)
                await self.page.click(selector)
                print(f"✓ Clicked approval prompt: {selector}")
                approval_clicked = True
                break
            except:
                continue
        
        if not approval_clicked:
            print("⚠ No approval prompt found - continuing...")
        else:
            await asyncio.sleep(2)  # Brief wait after approval
    
    async def step_8_wait_for_results(self):
        """Step 8: Wait ~2 minutes for results"""
        print("Step 8: Waiting ~2 minutes for results...")
        await asyncio.sleep(120)
        print("✓ Waited for results")
    
    async def step_9_click_copy_to_clipboard(self):
        """Step 9: Click 'Copy to Clipboard'"""
        print("Step 9: Clicking 'Copy to Clipboard'...")
        try:
            await self.page.wait_for_selector(self.selectors['copy_button'], timeout=10000)
            await self.page.click(self.selectors['copy_button'])
            print("✓ Clicked 'Copy to Clipboard'")
            
            # Try to get clipboard content
            clipboard_content = await self.page.evaluate("navigator.clipboard.readText()")
            return clipboard_content
        except Exception as e:
            print(f"Error copying to clipboard: {e}")
            return None
    
    async def execute_workflow(self, query: str) -> str:
        """Execute the complete workflow"""
        try:
            await self.initialize()
            
            # Execute each step in sequence
            await self.step_1_navigate_to_page()
            await self.step_2_click_text_input()
            await self.step_3_click_deep_research_selector()
            await self.step_4_input_query_text(query)
            await self.step_5_click_submit()
            await self.step_6_wait_4_5_seconds()
            await self.step_7_click_approval_prompt()
            await self.step_8_wait_for_results()
            result = await self.step_9_click_copy_to_clipboard()
            
            print("Step 10: Complete")
            return result or "Workflow completed but could not retrieve clipboard content"
            
        except Exception as e:
            print(f"Error during workflow execution: {e}")
            return f"Error: {e}"
        finally:
            await self.cleanup()


async def main():
    """Command line interface"""
    parser = argparse.ArgumentParser(description='Execute Gemini Deep Research workflow')
    parser.add_argument('--query', default='clit art', help='Query text (default: "clit art")')
    parser.add_argument('--headless', action='store_true', default=False, help='Run browser in headless mode')
    
    args = parser.parse_args()
    
    workflow = GeminiDeepResearchWorkflow(headless=args.headless)
    
    print(f"Starting Gemini Deep Research workflow with query: '{args.query}'")
    print("=" * 60)
    
    result = await workflow.execute_workflow(args.query)
    
    print("=" * 60)
    print("WORKFLOW RESULTS:")
    print(result)


if __name__ == '__main__':
    asyncio.run(main())
