#!/usr/bin/env python3
"""
Debug script to inspect Gemini Deep Research page structure and find actual selectors
"""

import asyncio
import sys
from playwright.async_api import async_playwright, Page, Browser, BrowserContext


class GeminiSelectorDebugger:
    """Debug Gemini page to find actual selectors"""
    
    def __init__(self):
        self.browser = None
        self.context = None
        self.page = None
    
    async def initialize(self):
        playwright = await async_playwright().start()
        
        self.browser = await playwright.chromium.launch(
            headless=False,  # Run visible for debugging
            args=[
                '--no-sandbox',
                '--disable-dev-shm-usage',
                '--disable-blink-features=AutomationControlled',
                '--disable-extensions',
                '--disable-plugins',
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
        if self.page:
            await self.page.close()
        if self.context:
            await self.context.close()
        if self.browser:
            await self.browser.close()
    
    async def inspect_page(self):
        """Navigate to Gemini and inspect the page structure"""
        print("Navigating to Gemini Deep Research...")
        await self.page.goto('https://gemini.google.com/deep-research', wait_until='domcontentloaded')
        await asyncio.sleep(5)  # Allow page to load
        
        # Take screenshot
        await self.page.screenshot(path='gemini_debug.png')
        print("Screenshot saved as gemini_debug.png")
        
        # Get page title
        title = await self.page.title()
        print(f"Page title: {title}")
        
        # Look for input elements
        print("\n=== INPUT ELEMENTS ===")
        inputs = await self.page.query_selector_all('input, textarea, [contenteditable]')
        for i, inp in enumerate(inputs):
            tag = await inp.evaluate('el => el.tagName.toLowerCase()')
            classes = await inp.evaluate('el => el.className')
            id_attr = await inp.evaluate('el => el.id')
            contenteditable = await inp.evaluate('el => el.getAttribute("contenteditable")')
            placeholder = await inp.evaluate('el => el.placeholder || el.getAttribute("aria-label") || ""')
            print(f"{i+1}. {tag} - id: '{id_attr}' - classes: '{classes}' - contenteditable: '{contenteditable}' - placeholder: '{placeholder}'")
        
        # Look for buttons
        print("\n=== BUTTON ELEMENTS ===")
        buttons = await self.page.query_selector_all('button, [role="button"], mat-icon, .mdc-button')
        for i, btn in enumerate(buttons[:20]):  # Limit to first 20
            tag = await btn.evaluate('el => el.tagName.toLowerCase()')
            text = await btn.evaluate('el => el.textContent.trim()')
            classes = await btn.evaluate('el => el.className')
            aria_label = await btn.evaluate('el => el.getAttribute("aria-label")')
            print(f"{i+1}. {tag} - text: '{text}' - classes: '{classes}' - aria-label: '{aria_label}'")
        
        # Look for specific text patterns
        print("\n=== ELEMENTS WITH 'Deep Research' TEXT ===")
        deep_research_elements = await self.page.query_selector_all('*')
        deep_research_found = []
        for elem in deep_research_elements:
            try:
                text = await elem.evaluate('el => el.textContent')
                if 'Deep Research' in text:
                    tag = await elem.evaluate('el => el.tagName.toLowerCase()')
                    classes = await elem.evaluate('el => el.className')
                    deep_research_found.append(f"{tag} - classes: '{classes}' - text: '{text.strip()}'")
            except:
                continue
        
        for item in deep_research_found[:10]:  # Limit output
            print(item)
        
        # Look for form elements
        print("\n=== FORM ELEMENTS ===")
        forms = await self.page.query_selector_all('form')
        print(f"Found {len(forms)} form elements")
        
        # Get all elements with click handlers or buttons
        print("\n=== CLICKABLE ELEMENTS (first 10) ===")
        clickable = await self.page.evaluate("""
            () => {
                const elements = [];
                const all = document.querySelectorAll('*');
                for (let el of all) {
                    const style = window.getComputedStyle(el);
                    if (style.cursor === 'pointer' || el.onclick || el.getAttribute('role') === 'button') {
                        elements.push({
                            tag: el.tagName.toLowerCase(),
                            classes: el.className,
                            text: el.textContent.trim().substring(0, 50),
                            id: el.id
                        });
                    }
                    if (elements.length >= 10) break;
                }
                return elements;
            }
        """)
        
        for item in clickable:
            print(f"{item['tag']} - id: '{item['id']}' - classes: '{item['classes']}' - text: '{item['text']}'")
        
        print("\n=== PAGE HTML STRUCTURE (first 1000 chars) ===")
        html = await self.page.evaluate("() => document.body.innerHTML.substring(0, 1000)")
        print(html + "...")
        
        # Wait for user input before closing
        input("Press Enter to close browser and exit...")


async def main():
    debugger = GeminiSelectorDebugger()
    try:
        await debugger.initialize()
        await debugger.inspect_page()
    finally:
        await debugger.cleanup()


if __name__ == '__main__':
    asyncio.run(main())
