from typing import Dict, Any, Optional, Literal, List
from pydantic import Field, BaseModel, model_validator
from .base_node import BaseNode


class TimingOverride(BaseModel):
    """Timing override for selector operations"""
    default_delay_ms: Optional[int] = Field(None, description="Override default delay before action in ms")
    wait_for_selector_timeout_ms: Optional[int] = Field(None, description="Override timeout for waiting for selector in ms")
    action_timeout_ms: Optional[int] = Field(None, description="Override timeout for action execution in ms")


class DomActionConfig(BaseModel):
    """Configuration for a single DOM action"""
    selector: Optional[str] = Field(None, description="Direct selector for DOM element")
    selector_key: Optional[str] = Field(None, description="Selector key for DOM element")
    action: Literal["click", "fill", "waitForVisible", "copy", "extract", "waitForTimeout", "wait", "type"] = Field(
        ..., description="Action to perform on the DOM element"
    )
    value: Optional[str] = Field(None, description="Value to fill or expected value for assertions")
    assert_type: Optional[Literal["visible", "hidden", "text", "value"]] = Field(
        None, description="Type of assertion to perform"
    )
    assert_value: Optional[str] = Field(None, description="Expected value for assertions")
    delay: Optional[int] = Field(None, description="Delay in ms for waitForTimeout action")
    delayAfter: Optional[int] = Field(None, description="Delay after action in ms")
    timing_override: Optional[TimingOverride] = Field(None, description="Timing overrides for this action")


class DomActionNode(BaseNode):
    """Node for DOM interactions using Playwright"""

    type: str = "dom_action"

    # Configuration from frontend - can be either legacy single action or new multi-action format
    config: Optional[Dict[str, Any]] = Field(None, description="Configuration JSON from frontend")
    actions: Optional[List[DomActionConfig]] = Field(None, description="List of actions to perform")

    # AI DOM specific fields
    provider: Optional[str] = Field(None, description="AI provider (gemini, perplexity, youtube_transcript)")
    output: Optional[str] = Field(None, description="Output destination (file, screen, clipboard, next)")

    @model_validator(mode='after')
    def extract_config_fields(self):
        """Extract provider, output, and actions from config during validation"""
        if self.config and isinstance(self.config, dict):
            if "provider" in self.config and not self.provider:
                self.provider = self.config["provider"]
            if "output" in self.config and not self.output:
                self.output = self.config["output"]
            if "actions" in self.config and not self.actions:
                self.actions = [DomActionConfig(**action) for action in self.config["actions"]]
        return self

    # Legacy properties for backward compatibility
    selector_key: Optional[str] = Field(None, description="Selector key for DOM element (legacy)")
    action: Optional[Literal["click", "fill", "waitForVisible", "copy", "extract"]] = Field(
        None, description="Action to perform on the DOM element (legacy)"
    )
    value: Optional[str] = Field(None, description="Value to fill or expected value for assertions (legacy)")
    assert_type: Optional[Literal["visible", "hidden", "text", "value"]] = Field(
        None, description="Type of assertion to perform (legacy)"
    )
    assert_value: Optional[str] = Field(None, description="Expected value for assertions (legacy)")

    # Playwright-specific properties
    timeout: int = Field(default=10000, description="Timeout for DOM operations in ms")
    wait_for_load_state: Optional[Literal["load", "domcontentloaded", "networkidle"]] = Field(
        None, description="Wait for page load state"
    )
    wait_for_selector_timeout: int = Field(default=5000, description="Timeout for selector waiting in ms")

    async def execute(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Execute DOM action(s) using Playwright"""
        import asyncio
        from playwright.async_api import Page, BrowserContext

        try:
            # Get required context
            page: Page = context.get("page")
            browser_context: BrowserContext = context.get("browser_context")

            if not page or not browser_context:
                raise ValueError("Page and browser_context are required for DOM actions")

            # Determine actions to execute
            actions_to_execute = self._get_actions_to_execute()

            results = []
            selectors_registry = context.get("selectors_registry", {})

            # Execute each action in sequence
            for action_config in actions_to_execute:
                action_result = await self._execute_single_action(
                    page, action_config, selectors_registry
                )
                results.append(action_result)

            # Wait for load state if specified
            if self.wait_for_load_state:
                await page.wait_for_load_state(self.wait_for_load_state)

            # Capture output based on configuration
            output_data = await self._capture_output(page)

            final_result = {
                "actions_executed": len(results),
                "results": results,
                "success": all(r.get("success", False) for r in results),
                "output": output_data,
                "provider": self.provider
            }

            # Generate test comments
            test_comments = self._generate_test_comments(results)
            final_result["test_comments"] = test_comments

            self.mark_completed(final_result)
            return final_result

        except Exception as e:
            error_message = f"DOM action failed: {str(e)}"
            self.mark_failed(error_message)
            raise

    def _get_actions_to_execute(self) -> List[DomActionConfig]:
        """Get the list of actions to execute based on configuration"""
        # Check if new config format is provided
        if self.config and isinstance(self.config, dict):
            actions_data = self.config.get("actions", [])
            if actions_data:
                return [DomActionConfig(**action) for action in actions_data]

        # Check if actions list is provided directly
        if self.actions:
            return self.actions

        # Fall back to legacy single action format
        if self.selector_key and self.action:
            return [DomActionConfig(
                selector_key=self.selector_key,
                action=self.action,
                value=self.value,
                assert_type=self.assert_type,
                assert_value=self.assert_value
            )]

        raise ValueError("No valid action configuration provided")

    async def _execute_single_action(
        self,
        page,
        action_config: DomActionConfig,
        selectors_registry: Dict[str, str]
    ) -> Dict[str, Any]:
        """Execute a single DOM action"""
        try:
            # Determine selector to use
            if action_config.selector:
                # Direct selector provided
                selector = action_config.selector
                selector_used = "direct"
            elif action_config.selector_key:
                # Import selector registry for fallback support
                from ..dom_selectors import default_registry

                # Get selector definition for fallback support
                selector_definition = default_registry.get_selector(action_config.selector_key)
                if not selector_definition:
                    raise ValueError(f"Selector '{action_config.selector_key}' not found in registry")

                # Try primary selector first, then fallbacks
                selector_used = None
                selector = None

                # Try primary selector
                try:
                    selector = selector_definition.selector
                    if action_config.action in ["click", "fill", "type", "extract", "copy"]:
                        await page.wait_for_selector(selector, timeout=self.wait_for_selector_timeout)
                    selector_used = "primary"
                except Exception as e:
                    # Try fallback selectors
                    for fallback in selector_definition.fallback_selectors:
                        try:
                            selector = fallback
                            if action_config.action in ["click", "fill", "type", "extract", "copy"]:
                                await page.wait_for_selector(selector, timeout=self.wait_for_selector_timeout)
                            selector_used = f"fallback_{selector_definition.fallback_selectors.index(fallback) + 1}"
                            break
                        except Exception:
                            continue

                    if not selector_used:
                        raise ValueError(f"Selector '{action_config.selector_key}' and all fallbacks failed: {str(e)}")
            else:
                raise ValueError("Either selector or selector_key must be provided")

            # Get timing policy from selector definition or use defaults
            timing_policy = selector_definition.timing_policy
            action_timeout = timing_policy.action_timeout_ms if timing_policy else self.timeout
            default_delay = timing_policy.default_delay_ms if timing_policy else 1000

            # Apply timing overrides from action config
            if action_config.timing_override:
                if action_config.timing_override.action_timeout_ms is not None:
                    action_timeout = action_config.timing_override.action_timeout_ms
                if action_config.timing_override.default_delay_ms is not None:
                    default_delay = action_config.timing_override.default_delay_ms

            # Perform the action with timing policy
            result = {
                "action": action_config.action,
                "selector": action_config.selector_key or action_config.selector,
                "selector_used": selector_used,
                "timing_policy": {
                    "source": "override" if action_config.timing_override else "default",
                    "default_delay_ms": default_delay,
                    "action_timeout_ms": action_timeout
                },
                "success": True
            }

            if action_config.action == "click":
                await page.click(selector, timeout=action_timeout)
                result["message"] = "Element clicked"

            elif action_config.action in ["fill", "type"]:
                if not action_config.value:
                    raise ValueError("Value is required for fill/type action")
                await page.fill(selector, action_config.value, timeout=action_timeout)
                result["message"] = f"Element filled with: {action_config.value}"
                result["value"] = action_config.value

            elif action_config.action == "waitForVisible":
                await page.wait_for_selector(selector, state="visible", timeout=action_timeout)
                result["message"] = "Waited for element to be visible"

            elif action_config.action == "extract":
                element = await page.query_selector(selector)
                if element:
                    text_content = await element.text_content()
                    result["message"] = "Content extracted"
                    result["content"] = text_content
                else:
                    raise ValueError(f"Element not found for selector '{action_config.selector_key}'")

            elif action_config.action == "copy":
                element = await page.query_selector(selector)
                if element:
                    text_content = await element.text_content()
                    # Copy to clipboard (this would need to be implemented in the browser context)
                    result["message"] = "Content copied"
                    result["content"] = text_content
                else:
                    raise ValueError(f"Element not found for selector '{action_config.selector_key}'")

            elif action_config.action in ["waitForTimeout", "wait"]:
                delay = action_config.delayAfter or action_config.delay or default_delay
                await page.wait_for_timeout(delay)
                result["message"] = f"Waited for {delay}ms"
                result["timing_policy"]["override_delay_ms"] = delay

            # Handle assertions
            if action_config.assert_type:
                assertion_result = await self._perform_assertion(page, selector, action_config)
                result["assertion"] = assertion_result

            return result

        except Exception as e:
            return {
                "action": action_config.action,
                "selector": action_config.selector_key or action_config.selector,
                "success": False,
                "error": str(e)
            }

    async def _perform_assertion(self, page, selector: str, action_config: DomActionConfig) -> Dict[str, Any]:
        """Perform assertion on DOM element"""
        try:
            element = await page.query_selector(selector)
            if not element:
                return {"passed": False, "error": "Element not found"}

            assert_type = action_config.assert_type
            assert_value = action_config.assert_value

            if assert_type == "visible":
                is_visible = await element.is_visible()
                passed = is_visible
                result = {"type": "visible", "passed": passed, "actual": is_visible}

            elif assert_type == "hidden":
                is_hidden = not await element.is_visible()
                passed = is_hidden
                result = {"type": "hidden", "passed": passed, "actual": is_hidden}

            elif assert_type == "text":
                if not assert_value:
                    return {"passed": False, "error": "assert_value required for text assertion"}
                text_content = await element.text_content()
                passed = text_content == assert_value
                result = {
                    "type": "text",
                    "passed": passed,
                    "expected": assert_value,
                    "actual": text_content
                }

            elif assert_type == "value":
                if not assert_value:
                    return {"passed": False, "error": "assert_value required for value assertion"}
                input_value = await element.input_value()
                passed = input_value == assert_value
                result = {
                    "type": "value",
                    "passed": passed,
                    "expected": assert_value,
                    "actual": input_value
                }

            else:
                return {"passed": False, "error": f"Unknown assertion type: {assert_type}"}

            return result

        except Exception as e:
            return {"passed": False, "error": str(e)}

    async def _capture_output(self, page) -> Dict[str, Any]:
        """Capture output based on the configured output destination"""
        try:
            if not self.output:
                return {"type": "none", "message": "No output destination configured"}

            if self.output == "file":
                # Save to temp file
                import tempfile
                import os
                content = await page.inner_text("#response") or await page.inner_text("body")
                temp_file = tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False)
                temp_file.write(content)
                temp_file.close()
                return {
                    "type": "file",
                    "file_path": temp_file.name,
                    "content": content[:500] + "..." if len(content) > 500 else content
                }

            elif self.output == "screen":
                # Display on screen (return content)
                content = await page.inner_text("#response") or await page.inner_text("body")
                return {
                    "type": "screen",
                    "content": content
                }

            elif self.output == "clipboard":
                # Copy to clipboard
                content = await page.inner_text("#response") or await page.inner_text("body")
                # Use page.evaluate to copy to clipboard
                await page.evaluate(f"""
                    navigator.clipboard.writeText({repr(content)});
                """)
                return {
                    "type": "clipboard",
                    "content": content[:500] + "..." if len(content) > 500 else content,
                    "message": "Content copied to clipboard"
                }

            elif self.output == "next":
                # Pass to next node in workflow
                content = await page.inner_text("#response") or await page.inner_text("body")
                return {
                    "type": "next",
                    "content": content
                }

            else:
                return {"type": "unknown", "error": f"Unknown output type: {self.output}"}

        except Exception as e:
            return {"type": "error", "error": str(e)}

    def _generate_test_comments(self, results: List[Dict[str, Any]]) -> str:
        """Generate test comments based on execution results"""
        comments = []
        for i, result in enumerate(results, 1):
            if result.get("success"):
                action = result.get("action", "unknown")
                selector = result.get("selector", "unknown")
                if action == "click":
                    comments.append(f"Test: Clicked {selector} successfully")
                elif action == "fill":
                    value = result.get("value", "")
                    comments.append(f"Test: Filled {selector} with '{value}'")
                elif action == "waitForTimeout":
                    delay = result.get("timing_policy", {}).get("override_delay_ms", "unknown")
                    comments.append(f"Test: Waited {delay}ms after {selector}")
                else:
                    comments.append(f"Test: Performed {action} on {selector}")
            else:
                error = result.get("error", "unknown error")
                comments.append(f"Test: Failed - {error}")

        return " | ".join(comments)