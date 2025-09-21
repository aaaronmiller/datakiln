import asyncio
from typing import Dict, Any, Optional, List, Union
from playwright.async_api import Page, BrowserContext, Browser, ElementHandle
from pathlib import Path
import json
import os
from datetime import datetime


class DomActionExecutor:
    """Executor for DOM actions using Playwright"""

    def __init__(self, browser: Optional[Browser] = None):
        self.browser = browser
        self.research_tree = {}

    async def execute_action(
        self,
        page: Page,
        action: str,
        selector_key: str,
        value: Optional[str] = None,
        selectors_registry: Optional[Dict[str, str]] = None,
        timeout: int = 10000,
        **kwargs
    ) -> Dict[str, Any]:
        """Execute a single DOM action"""
        try:
            # Resolve selector
            selector = self._resolve_selector(selector_key, selectors_registry)
            if not selector:
                raise ValueError(f"Selector '{selector_key}' not found")

            # Execute action based on type
            result = {}

            if action == "click":
                result = await self._click_element(page, selector, timeout)
            elif action == "fill":
                if not value:
                    raise ValueError("Value required for fill action")
                result = await self._fill_element(page, selector, value, timeout)
            elif action == "waitForVisible":
                result = await self._wait_for_visible(page, selector, timeout)
            elif action == "extract":
                result = await self._extract_content(page, selector, timeout)
            elif action == "copy":
                result = await self._copy_content(page, selector, timeout)
            elif action == "type":
                if not value:
                    raise ValueError("Value required for type action")
                result = await self._type_text(page, selector, value, timeout)
            elif action == "clear":
                result = await self._clear_element(page, selector, timeout)
            elif action == "scroll_to":
                result = await self._scroll_to_element(page, selector, timeout)
            elif action == "hover":
                result = await self._hover_element(page, selector, timeout)
            elif action == "screenshot":
                result = await self._take_screenshot(page, selector, timeout)
            else:
                raise ValueError(f"Unsupported action: {action}")

            result.update({
                "action": action,
                "selector_key": selector_key,
                "selector": selector,
                "success": True
            })

            return result

        except Exception as e:
            return {
                "action": action,
                "selector_key": selector_key,
                "selector": selector if 'selector' in locals() else None,
                "success": False,
                "error": str(e)
            }

    async def execute_sequence(
        self,
        page: Page,
        actions: List[Dict[str, Any]],
        selectors_registry: Optional[Dict[str, str]] = None,
        context: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """Execute a sequence of DOM actions"""
        results = []

        for i, action_config in enumerate(actions):
            try:
                # Extract action parameters
                action = action_config.get("action")
                selector_key = action_config.get("selector_key")
                value = action_config.get("value")
                timeout = action_config.get("timeout", 10000)

                if not action or not selector_key:
                    results.append({
                        "index": i,
                        "success": False,
                        "error": "Missing action or selector_key"
                    })
                    continue

                # Execute action
                result = await self.execute_action(
                    page=page,
                    action=action,
                    selector_key=selector_key,
                    value=value,
                    selectors_registry=selectors_registry,
                    timeout=timeout
                )

                result["index"] = i
                results.append(result)

                # Wait between actions if specified
                delay = action_config.get("delay", 0)
                if delay > 0:
                    await asyncio.sleep(delay / 1000)

            except Exception as e:
                results.append({
                    "index": i,
                    "success": False,
                    "error": str(e)
                })

        return results

    async def fill_prompt(
        self,
        page: Page,
        prompt: str,
        selectors_registry: Optional[Dict[str, str]] = None,
        timeout: int = 10000
    ) -> Dict[str, Any]:
        """Fill a contenteditable prompt area"""
        try:
            # Try common selectors for prompt inputs
            prompt_selectors = [
                "contenteditable_input",
                "text_input",
                "[contenteditable='true']",
                "textarea",
                "input[type='text']"
            ]

            success = False
            for selector_key in prompt_selectors:
                try:
                    selector = self._resolve_selector(selector_key, selectors_registry)
                    if not selector:
                        continue

                    # Wait for element
                    element = await page.wait_for_selector(selector, timeout=timeout)
                    if not element:
                        continue

                    # Clear and fill
                    await element.click()
                    await element.clear()
                    await element.type(prompt, delay=50)

                    success = True
                    break

                except Exception:
                    continue

            if not success:
                raise ValueError("Could not find suitable prompt input element")

            return {
                "success": True,
                "action": "fill_prompt",
                "prompt": prompt
            }

        except Exception as e:
            return {
                "success": False,
                "action": "fill_prompt",
                "error": str(e)
            }

    async def extract_page_content(
        self,
        page: Page,
        include_metadata: bool = True,
        selectors_registry: Optional[Dict[str, str]] = None
    ) -> Dict[str, Any]:
        """Extract comprehensive page content"""
        try:
            # Extract main content
            content_selectors = [
                "main_content",
                "article_content",
                "main",
                "[role='main']",
                ".main-content",
                ".content",
                "article"
            ]

            content = ""
            for selector_key in content_selectors:
                try:
                    selector = self._resolve_selector(selector_key, selectors_registry)
                    if not selector:
                        continue

                    element = await page.query_selector(selector)
                    if element:
                        content = await element.text_content()
                        if content and len(content.strip()) > 100:  # Minimum content threshold
                            break
                except Exception:
                    continue

            # Fallback to full page text
            if not content or len(content.strip()) < 100:
                content = await page.evaluate("() => document.body.innerText")

            # Extract metadata
            metadata = {}
            if include_metadata:
                metadata = await self._extract_metadata(page)

            return {
                "success": True,
                "content": content,
                "metadata": metadata,
                "url": page.url,
                "title": await page.title(),
                "timestamp": datetime.now().isoformat()
            }

        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }

    async def _click_element(self, page: Page, selector: str, timeout: int) -> Dict[str, Any]:
        """Click an element with actionability checks"""
        element = await page.wait_for_selector(selector, timeout=timeout)

        # Check if element is actionable
        is_visible = await element.is_visible()
        is_enabled = await element.is_enabled()

        if not is_visible:
            raise ValueError("Element is not visible")
        if not is_enabled:
            raise ValueError("Element is not enabled")

        # Click with proper waiting
        await element.click(timeout=timeout, force=True)

        return {
            "clicked": True,
            "element_visible": is_visible,
            "element_enabled": is_enabled
        }

    async def _fill_element(self, page: Page, selector: str, value: str, timeout: int) -> Dict[str, Any]:
        """Fill an input element"""
        element = await page.wait_for_selector(selector, timeout=timeout)

        # Clear first
        await element.clear()

        # Fill with value
        await element.fill(value)

        return {
            "filled": True,
            "value": value
        }

    async def _wait_for_visible(self, page: Page, selector: str, timeout: int) -> Dict[str, Any]:
        """Wait for element to be visible"""
        element = await page.wait_for_selector(selector, state="visible", timeout=timeout)

        return {
            "visible": True,
            "element": selector
        }

    async def _extract_content(self, page: Page, selector: str, timeout: int) -> Dict[str, Any]:
        """Extract content from element"""
        element = await page.query_selector(selector)
        if not element:
            raise ValueError("Element not found")

        # Extract various types of content
        text_content = await element.text_content()
        inner_html = await element.inner_html()
        value = await element.input_value() if await element.is_enabled() else None

        # Get element attributes
        attributes = await page.evaluate("""
            (element) => {
                const attrs = {};
                for (let attr of element.attributes) {
                    attrs[attr.name] = attr.value;
                }
                return attrs;
            }
        """, element)

        return {
            "text": text_content,
            "html": inner_html,
            "value": value,
            "attributes": attributes
        }

    async def _copy_content(self, page: Page, selector: str, timeout: int) -> Dict[str, Any]:
        """Copy element content to clipboard (simulated)"""
        content = await self._extract_content(page, selector, timeout)

        # In a real browser context, this would copy to actual clipboard
        # For now, we'll just return the content
        return {
            "copied": True,
            "content": content
        }

    async def _type_text(self, page: Page, selector: str, text: str, timeout: int) -> Dict[str, Any]:
        """Type text into an element"""
        element = await page.wait_for_selector(selector, timeout=timeout)

        # Click to focus
        await element.click()

        # Type with delay between characters
        await element.type(text, delay=50)

        return {
            "typed": True,
            "text": text
        }

    async def _clear_element(self, page: Page, selector: str, timeout: int) -> Dict[str, Any]:
        """Clear an input element"""
        element = await page.wait_for_selector(selector, timeout=timeout)

        await element.clear()

        return {
            "cleared": True
        }

    async def _scroll_to_element(self, page: Page, selector: str, timeout: int) -> Dict[str, Any]:
        """Scroll to an element"""
        element = await page.query_selector(selector)
        if not element:
            raise ValueError("Element not found")

        await element.scroll_into_view_if_needed()

        return {
            "scrolled": True
        }

    async def _hover_element(self, page: Page, selector: str, timeout: int) -> Dict[str, Any]:
        """Hover over an element"""
        element = await page.wait_for_selector(selector, timeout=timeout)

        await element.hover()

        return {
            "hovered": True
        }

    async def _take_screenshot(self, page: Page, selector: Optional[str] = None, timeout: int = 5000) -> Dict[str, Any]:
        """Take a screenshot of element or full page"""
        screenshot_path = f"screenshot_{datetime.now().strftime('%Y%m%d_%H%M%S')}.png"

        if selector:
            element = await page.query_selector(selector)
            if element:
                await element.screenshot(path=screenshot_path)
            else:
                raise ValueError("Element not found for screenshot")
        else:
            await page.screenshot(path=screenshot_path, full_page=True)

        return {
            "screenshot_taken": True,
            "path": screenshot_path
        }

    async def _extract_metadata(self, page: Page) -> Dict[str, Any]:
        """Extract page metadata"""
        metadata = {}

        try:
            # Extract meta tags
            meta_elements = await page.query_selector_all("meta")
            for meta in meta_elements:
                name = await meta.get_attribute("name") or await meta.get_attribute("property")
                content = await meta.get_attribute("content")
                if name and content:
                    metadata[f"meta_{name}"] = content

            # Extract title
            title = await page.title()
            if title:
                metadata["title"] = title

            # Extract description
            description = metadata.get("meta_description") or metadata.get("meta_og:description")
            if description:
                metadata["description"] = description

            # Extract structured data
            structured_data = await page.evaluate("""
                () => {
                    const scripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
                    return scripts.map(s => {
                        try {
                            return JSON.parse(s.textContent);
                        } catch {
                            return null;
                        }
                    }).filter(Boolean);
                }
            """)
            if structured_data:
                metadata["structured_data"] = structured_data

        except Exception as e:
            metadata["extraction_error"] = str(e)

        return metadata

    def _resolve_selector(self, selector_key: str, selectors_registry: Optional[Dict[str, str]] = None) -> Optional[str]:
        """Resolve selector key to actual selector"""
        if not selectors_registry:
            # Fallback to direct selector if no registry
            return selector_key

        return selectors_registry.get(selector_key)

    async def write_to_filesystem(
        self,
        content: Union[str, Dict, List],
        output_path: str,
        format: str = "json",
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Write content to filesystem with research tree support"""
        try:
            # Ensure output directory exists
            Path(output_path).parent.mkdir(parents=True, exist_ok=True)

            # Prepare content with metadata
            output_data = {
                "content": content,
                "format": format,
                "timestamp": datetime.now().isoformat(),
                "metadata": metadata or {}
            }

            # Write based on format
            if format == "json":
                with open(output_path, 'w', encoding='utf-8') as f:
                    json.dump(output_data, f, indent=2, ensure_ascii=False)
            elif format == "md":
                await self._write_markdown(output_path, output_data)
            elif format == "yaml":
                import yaml
                with open(output_path, 'w', encoding='utf-8') as f:
                    yaml.dump(output_data, f, default_flow_style=False, allow_unicode=True)
            else:
                # Plain text
                with open(output_path, 'w', encoding='utf-8') as f:
                    if isinstance(content, (dict, list)):
                        f.write(json.dumps(content, indent=2, ensure_ascii=False))
                    else:
                        f.write(str(content))

            # Update research tree
            research_key = Path(output_path).stem
            self.research_tree[research_key] = {
                "path": output_path,
                "format": format,
                "size": Path(output_path).stat().st_size,
                "created_at": datetime.now().isoformat()
            }

            # Save research tree
            research_tree_path = Path(output_path).parent / "research_tree.json"
            with open(research_tree_path, 'w', encoding='utf-8') as f:
                json.dump(self.research_tree, f, indent=2, ensure_ascii=False)

            return {
                "success": True,
                "path": output_path,
                "format": format,
                "size": Path(output_path).stat().st_size
            }

        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }

    async def _write_markdown(self, path: str, data: Dict[str, Any]):
        """Write data as markdown"""
        with open(path, 'w', encoding='utf-8') as f:
            # Write YAML frontmatter
            f.write("---\n")
            for key, value in data.get("metadata", {}).items():
                f.write(f"{key}: {value}\n")
            f.write("---\n\n")

            # Write content
            content = data.get("content", "")
            if isinstance(content, (dict, list)):
                f.write("# Extracted Content\n\n")
                f.write(f"```json\n{json.dumps(content, indent=2)}\n```\n")
            else:
                f.write("# Extracted Content\n\n")
                f.write(str(content))