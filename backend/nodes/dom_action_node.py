from typing import Dict, Any, Optional, Literal
from pydantic import Field
from .base_node import BaseNode


class DomActionNode(BaseNode):
    """Node for DOM interactions using Playwright"""

    type: str = "dom_action"

    # DOM interaction properties
    selector_key: str = Field(..., description="Selector key for DOM element")
    action: Literal["click", "fill", "waitForVisible", "copy", "extract"] = Field(
        ..., description="Action to perform on the DOM element"
    )
    value: Optional[str] = Field(None, description="Value to fill or expected value for assertions")
    assert_type: Optional[Literal["visible", "hidden", "text", "value"]] = Field(
        None, description="Type of assertion to perform"
    )
    assert_value: Optional[str] = Field(None, description="Expected value for assertions")

    # Playwright-specific properties
    timeout: int = Field(default=10000, description="Timeout for DOM operations in ms")
    wait_for_load_state: Optional[Literal["load", "domcontentloaded", "networkidle"]] = Field(
        None, description="Wait for page load state"
    )
    wait_for_selector_timeout: int = Field(default=5000, description="Timeout for selector waiting in ms")

    async def execute(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Execute DOM action using Playwright"""
        import asyncio
        from playwright.async_api import Page, BrowserContext

        try:
            # Get required context
            page: Page = context.get("page")
            browser_context: BrowserContext = context.get("browser_context")

            if not page or not browser_context:
                raise ValueError("Page and browser_context are required for DOM actions")

            # Resolve selector using selectors registry
            selectors_registry = context.get("selectors_registry", {})
            selector = selectors_registry.get(self.selector_key)

            if not selector:
                raise ValueError(f"Selector '{self.selector_key}' not found in registry")

            # Wait for selector if needed
            if self.action in ["click", "fill", "extract"]:
                try:
                    await page.wait_for_selector(selector, timeout=self.wait_for_selector_timeout)
                except Exception as e:
                    raise ValueError(f"Selector '{self.selector_key}' not found: {str(e)}")

            # Perform the action
            result = {}

            if self.action == "click":
                await page.click(selector, timeout=self.timeout)
                result["action"] = "clicked"
                result["selector"] = self.selector_key

            elif self.action == "fill":
                if not self.value:
                    raise ValueError("Value is required for fill action")
                await page.fill(selector, self.value, timeout=self.timeout)
                result["action"] = "filled"
                result["selector"] = self.selector_key
                result["value"] = self.value

            elif self.action == "waitForVisible":
                await page.wait_for_selector(selector, state="visible", timeout=self.timeout)
                result["action"] = "waited_for_visible"
                result["selector"] = self.selector_key

            elif self.action == "extract":
                element = await page.query_selector(selector)
                if element:
                    text_content = await element.text_content()
                    result["action"] = "extracted"
                    result["selector"] = self.selector_key
                    result["content"] = text_content
                else:
                    raise ValueError(f"Element not found for selector '{self.selector_key}'")

            elif self.action == "copy":
                element = await page.query_selector(selector)
                if element:
                    text_content = await element.text_content()
                    # Copy to clipboard (this would need to be implemented in the browser context)
                    result["action"] = "copied"
                    result["selector"] = self.selector_key
                    result["content"] = text_content
                else:
                    raise ValueError(f"Element not found for selector '{self.selector_key}'")

            # Handle assertions
            if self.assert_type:
                assertion_result = await self._perform_assertion(page, selector)
                result["assertion"] = assertion_result

            # Wait for load state if specified
            if self.wait_for_load_state:
                await page.wait_for_load_state(self.wait_for_load_state)

            self.mark_completed(result)
            return result

        except Exception as e:
            error_message = f"DOM action failed: {str(e)}"
            self.mark_failed(error_message)
            raise

    async def _perform_assertion(self, page, selector: str) -> Dict[str, Any]:
        """Perform assertion on DOM element"""
        try:
            element = await page.query_selector(selector)
            if not element:
                return {"passed": False, "error": "Element not found"}

            if self.assert_type == "visible":
                is_visible = await element.is_visible()
                passed = is_visible
                result = {"type": "visible", "passed": passed, "actual": is_visible}

            elif self.assert_type == "hidden":
                is_hidden = not await element.is_visible()
                passed = is_hidden
                result = {"type": "hidden", "passed": passed, "actual": is_hidden}

            elif self.assert_type == "text":
                if not self.assert_value:
                    return {"passed": False, "error": "assert_value required for text assertion"}
                text_content = await element.text_content()
                passed = text_content == self.assert_value
                result = {
                    "type": "text",
                    "passed": passed,
                    "expected": self.assert_value,
                    "actual": text_content
                }

            elif self.assert_type == "value":
                if not self.assert_value:
                    return {"passed": False, "error": "assert_value required for value assertion"}
                input_value = await element.input_value()
                passed = input_value == self.assert_value
                result = {
                    "type": "value",
                    "passed": passed,
                    "expected": self.assert_value,
                    "actual": input_value
                }

            else:
                return {"passed": False, "error": f"Unknown assertion type: {self.assert_type}"}

            return result

        except Exception as e:
            return {"passed": False, "error": str(e)}