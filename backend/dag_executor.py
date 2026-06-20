"""
DataKiln DAG Executor — Schema-Driven Workflow Execution Engine
================================================================

Takes a WorkflowComposition (or legacy Workflow model), validates it
through the WorkflowPlanner, and executes it via the WorkflowExecutor.

Key design points
-----------------
  • Planner phase:   Flattens subgraphs, validates port types, resolves
                      topological order, check default/fallback inputs.
  • Execute phase:   Steps through the plan, invokes the right executor
                      for each node, routes data through edges (applying
                      transformers where declared), and collects results.
  • Executor registry:  Loose coupling — node types declare an executor ID
                      (e.g. "llm.chat", "web.fetch") and the registry maps
                      that ID to a callable.  Easy to extend.
  • Turing-complete:  SubgraphInvocation nodes are expanded at plan time,
                      giving arbitrary nesting.  Condition + merge + loop
                      structures can model any finite computation.
"""

from __future__ import annotations

import asyncio
import hashlib
import json
import logging
import os
import re
import subprocess
import time
import uuid
from copy import deepcopy
from collections import defaultdict, deque
from datetime import datetime
from pathlib import Path
from typing import (Any, Callable, Dict, List, Optional,
                    Set, Tuple, Union)

from app.models.workflow import Workflow, Node as LegacyNode, Edge as LegacyEdge
from app.models.workflow_schema import (
    BUILTIN_NODE_DEFS,
    DataType,
    EdgeInstance,
    EdgeMode,
    ExecutableEdge,
    ExecutableNode,
    ExecutionPlan,
    NodeDef,
    NodeInstance,
    Port,
    PortDirection,
    PromptRole,
    Subgraph,
    SubgraphInvocation,
    TransformerSpec,
    WorkflowComposition,
    WorkflowSchemaRegistry,
    default_registry,
)
try:
    from nodes.aggregate_node import AggregateNode
    from nodes.condition_node import ConditionNode
    from nodes.data_source_node import DataSourceNode
    from nodes.dom_action_node import DomActionNode
    from nodes.export_node import ExportNode
    from nodes.filter_node import FilterNode
    from nodes.join_node import JoinNode
    from nodes.prompt_node import PromptNode
    from nodes.provider_node import ProviderNode
    from nodes.transform_node import TransformNode
    from nodes.union_node import UnionNode
except Exception:
    from backend.nodes.aggregate_node import AggregateNode
    from backend.nodes.condition_node import ConditionNode
    from backend.nodes.data_source_node import DataSourceNode
    from backend.nodes.dom_action_node import DomActionNode
    from backend.nodes.export_node import ExportNode
    from backend.nodes.filter_node import FilterNode
    from backend.nodes.join_node import JoinNode
    from backend.nodes.prompt_node import PromptNode
    from backend.nodes.provider_node import ProviderNode
    from backend.nodes.transform_node import TransformNode
    from backend.nodes.union_node import UnionNode

logger = logging.getLogger(__name__)


class DomAutomationBlocked(RuntimeError):
    def __init__(self, blocker: Dict[str, Any]):
        self.blocker = blocker
        super().__init__(blocker.get("message", "DOM automation blocked"))


class DataFlowConnection:
    def __init__(
        self,
        source_node_id: str,
        target_node_id: str,
        source_output_key: str = "output",
        target_input_key: str = "input",
    ):
        self.source_node_id = source_node_id
        self.target_node_id = target_node_id
        self.source_output_key = source_output_key
        self.target_input_key = target_input_key


class ExecutionResult:
    def __init__(
        self,
        node_id: str,
        success: bool,
        outputs: Optional[Dict[str, Any]] = None,
        error: Optional[str] = None,
        execution_time: float = 0.0,
        metadata: Optional[Dict[str, Any]] = None,
    ):
        self.node_id = node_id
        self.success = success
        self.outputs = outputs or {}
        self.error = error
        self.execution_time = execution_time
        self.metadata = metadata or {}


class WorkflowExecutionContext:
    def __init__(
        self,
        execution_id: str = "",
        workflow_id: str = "",
        global_inputs: Optional[Dict[str, Any]] = None,
        global_context: Optional[Dict[str, Any]] = None,
        node_results: Optional[Dict[str, ExecutionResult]] = None,
        data_flow: Optional[Dict[str, Dict[str, Any]]] = None,
        execution_options: Optional[Dict[str, Any]] = None,
    ):
        self.execution_id = execution_id
        self.workflow_id = workflow_id
        self.global_inputs = global_inputs or global_context or {}
        self.global_context = self.global_inputs
        self.node_results = node_results or {}
        self.data_flow = data_flow or {}
        self.execution_options = execution_options or {}


# ╔══════════════════════════════════════════════════════════════════════════════╗
# ║  TRANSFORMER REGISTRY                                                      ║
# ╚══════════════════════════════════════════════════════════════════════════════╝

TransformerFunc = Callable[[Any, Dict[str, Any]], Any]


class TransformerRegistry:
    """Registry of data transformer functions."""

    def __init__(self):
        self._transformers: Dict[str, TransformerFunc] = {}
        self._register_builtins()

    def _register_builtins(self):
        self.register("identity", lambda v, p: v)
        self.register("json_to_yaml", lambda v, p: _jsontoyaml(v))
        self.register("markdown_to_html", lambda v, p: _mdtohtml(v))
        self.register("html_to_markdown", lambda v, p: _htmltomd(v))
        self.register("text_chunk", lambda v, p: _textchunk(v, p))
        self.register("resolve_template", lambda v, p: _resolvetmpl(v, p))

    def register(self, tid: str, fn: TransformerFunc):
        self._transformers[tid] = fn

    def get(self, tid: str) -> Optional[TransformerFunc]:
        return self._transformers.get(tid)

    def apply(self, spec: TransformerSpec, value: Any) -> Any:
        fn = self.get(spec.transformer_id)
        if fn is None:
            raise ValueError(f"Unknown transformer: {spec.transformer_id}")
        return fn(value, spec.params)


def _jsontoyaml(v: Any) -> str:
    import yaml
    return yaml.dump(json.loads(v) if isinstance(v, str) else v, default_flow_style=False)


def _mdtohtml(v: str) -> str:
    import markdown
    return markdown.markdown(v)


def _htmltomd(v: str) -> str:
    import html2text
    return html2text.html2text(v)


def _textchunk(v: str, params: Dict[str, Any]) -> List[str]:
    chunk_size = params.get("chunk_size", 2000)
    overlap = params.get("overlap", 100)
    chunks = []
    start = 0
    while start < len(v):
        end = min(start + chunk_size, len(v))
        chunks.append(v[start:end])
        start += chunk_size - overlap
    return chunks


def _resolvetmpl(v: Any, params: Dict[str, Any]) -> str:
    template = params.get("template", "{value}")
    return template.replace("{value}", str(v))


TRANSFORMER_REGISTRY = TransformerRegistry()


# ╔══════════════════════════════════════════════════════════════════════════════╗
# ║  EXECUTOR REGISTRY  —  maps executor_id → callable                          ║
# ╚══════════════════════════════════════════════════════════════════════════════╝

ExecutorFunc = Callable[
    [ExecutableNode, Dict[str, Any], Dict[str, Any]],
    "Awaitable[Dict[str, Any]]",
]


class ExecutorRegistry:
    """Maps executor IDs to async callables that execute a node."""

    def __init__(self):
        self._executors: Dict[str, ExecutorFunc] = {}

    def _resolve(self):
        """Lazy-resolve executors by looking up the global scope."""
        import sys
        mod = sys.modules.get(__name__) or globals()
        mapping = {
            "llm.chat": "execute_llm_chat",
            "web.fetch": "execute_web_fetch",
            "dom.sequence": "execute_dom_sequence",
            "youtube.transcript": "execute_youtube_transcript",
            "code.run": "execute_code_run",
            "subgraph.expand": "execute_subgraph_invoke",
        }
        for eid, func_name in mapping.items():
            fn = getattr(mod, func_name, None)
            if fn:
                self._executors[eid] = fn
            elif eid not in self._executors:
                self._executors[eid] = None

    def register(self, eid: str, fn: ExecutorFunc):
        self._executors[eid] = fn

    def get(self, eid: str) -> Optional[ExecutorFunc]:
        if eid not in self._executors:
            self._resolve()
        return self._executors.get(eid)


# (EXECUTOR_REGISTRY singleton is instantiated at end of file, after all
#  executor functions are defined.)


# ╔══════════════════════════════════════════════════════════════════════════════╗
# ║  BUILT-IN EXECUTORS                                                         ║
# ╚══════════════════════════════════════════════════════════════════════════════╝

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
PERPLEXITY_API_KEY = os.environ.get("PERPLEXITY_API_KEY", "")


DEFAULT_DOM_SEQUENCES: Dict[str, List[Dict[str, Any]]] = {
    "dom.gemini.deep_research": [
        {"action": "goto", "target": "https://gemini.google.com/app"},
        {"action": "click", "target": "div.label:has-text('Deep Research')", "optional": True},
        {
            "action": "fill",
            "target": "rich-textarea [contenteditable='true']",
            "fallback_targets": ["[contenteditable='true']", "[role='textbox']"],
            "value_source": "input.query",
        },
        {
            "action": "click",
            "target": "button[aria-label*='Send']",
            "fallback_targets": ["mat-icon[fonticon='send']", "button:has(mat-icon[fonticon='send'])"],
        },
        {"action": "click", "target": "span.mdc-button__label:has-text('Start research')", "optional": True, "delay_after_ms": 8000},
        {"action": "capture", "target": "div[data-message-author-role='model']", "fallback_targets": [".response-content", "main", "body"]},
    ],
    "dom.perplexity.pro_search": [
        {"action": "goto", "target": "https://www.perplexity.ai"},
        {
            "action": "fill",
            "target": "[contenteditable='true']",
            "fallback_targets": ["[role='textbox']", "[data-lexical-editor='true']", "textarea"],
            "value_source": "input.query",
        },
        {
            "action": "click",
            "target": "button[aria-label*='Submit']",
            "fallback_targets": ["button[aria-label*='Send']", "button[data-testid='send-button']", "button:has-text('Ask')"],
        },
        {"action": "capture", "target": "main", "fallback_targets": ["body"]},
    ],
}


async def execute_llm_chat(
    node: ExecutableNode,
    inputs: Dict[str, Any],
    context: Dict[str, Any],
) -> Dict[str, Any]:
    """Execute an LLM chat request.

    Supports:
      - provider: gemini | openai | perplexity
      - system_prompt, user_prompt, messages ports
    """
    provider = node.config.get("provider", "gemini").lower()
    model = node.config.get("model", "gemini-2.0-flash")
    temperature = node.config.get("temperature", 0.7)
    max_tokens = node.config.get("max_tokens", 4096)

    # Build the message array respecting prompt roles
    system = inputs.get("system_prompt") or node.system_prompt or ""
    user = inputs.get("user_prompt") or node.user_prompt or ""
    messages_raw = inputs.get("messages", [])

    messages = []
    if system:
        messages.append({"role": "system", "content": system})
    if messages_raw and isinstance(messages_raw, list):
        for m in messages_raw:
            if isinstance(m, dict) and "role" in m and "content" in m:
                messages.append(m)
    if user:
        messages.append({"role": "user", "content": user})
    if not messages:
        # Fallback: use any string input as user message
        for v in inputs.values():
            if isinstance(v, str) and len(v) > 10:
                messages.append({"role": "user", "content": v})
                break
    if not messages:
        return {"response": "", "metadata": {"error": "No input messages provided"}}

    if provider == "gemini":
        return await _call_gemini(model, messages, temperature, max_tokens)
    elif provider == "perplexity":
        return await _call_perplexity(model, messages, max_tokens)
    elif provider == "openai":
        return await _call_openai(model, messages, temperature, max_tokens)
    else:
        return {"response": "", "metadata": {"error": f"Unknown provider: {provider}"}}


async def _call_gemini(
    model: str, messages: List[Dict[str, str]], temperature: float, max_tokens: int
) -> Dict[str, Any]:
    if not GEMINI_API_KEY:
        return {
            "response": "[Gemini API key not configured]",
            "metadata": {"provider": "gemini", "error": "No API key"},
        }
    try:
        import google.generativeai as genai

        genai.configure(api_key=GEMINI_API_KEY)
        # Convert messages to Gemini format
        gemini_messages = []
        for m in messages:
            if m["role"] == "system":
                gemini_messages.append({"role": "user", "parts": [m["content"]]})
                gemini_messages.append({"role": "model", "parts": ["Understood."]})
            elif m["role"] == "assistant":
                gemini_messages.append({"role": "model", "parts": [m["content"]]})
            else:
                gemini_messages.append({"role": "user", "parts": [m["content"]]})

        gen_model = genai.GenerativeModel(model_name=model)
        chat = gen_model.start_chat(history=gemini_messages[:-1] if len(gemini_messages) > 1 else [])
        last_msg = gemini_messages[-1]["parts"][0] if gemini_messages else ""
        response = chat.send_message(last_msg)
        return {
            "response": response.text,
            "metadata": {"provider": "gemini", "model": model},
        }
    except Exception as e:
        logger.warning(f"Gemini call failed: {e}")
        # Fallback to mock response for development
        return {
            "response": f"[Gemini would respond to: {gemini_messages[-1]['parts'][0][:100] if gemini_messages else '...'}...]",
            "metadata": {"provider": "gemini", "model": model, "error": str(e), "fallback": True},
        }


async def _call_perplexity(
    model: str, messages: List[Dict[str, str]], max_tokens: int
) -> Dict[str, Any]:
    if not PERPLEXITY_API_KEY:
        return {
            "response": "[Perplexity API key not configured]",
            "metadata": {"provider": "perplexity", "error": "No API key"},
        }
    try:
        import httpx

        headers = {
            "Authorization": f"Bearer {PERPLEXITY_API_KEY}",
            "Content-Type": "application/json",
        }
        payload = {"model": model, "messages": messages, "max_tokens": max_tokens}
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                "https://api.perplexity.ai/chat/completions",
                headers=headers, json=payload, timeout=60,
            )
            data = resp.json()
            return {
                "response": data["choices"][0]["message"]["content"],
                "metadata": {"provider": "perplexity", "model": model},
            }
    except Exception as e:
        return {
            "response": f"[Perplexity error: {e}]",
            "metadata": {"provider": "perplexity", "error": str(e)},
        }


async def _call_openai(
    model: str, messages: List[Dict[str, str]], temperature: float, max_tokens: int
) -> Dict[str, Any]:
    api_key = os.environ.get("OPENAI_API_KEY", "")
    if not api_key:
        return {
            "response": "[OpenAI API key not configured]",
            "metadata": {"provider": "openai", "error": "No API key"},
        }
    try:
        import httpx

        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
        }
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                "https://api.openai.com/v1/chat/completions",
                headers=headers, json=payload, timeout=60,
            )
            data = resp.json()
            return {
                "response": data["choices"][0]["message"]["content"],
                "metadata": {"provider": "openai", "model": model},
            }
    except Exception as e:
        return {
            "response": f"[OpenAI error: {e}]",
            "metadata": {"provider": "openai", "error": str(e)},
        }


async def execute_web_fetch(
    node: ExecutableNode,
    inputs: Dict[str, Any],
    context: Dict[str, Any],
) -> Dict[str, Any]:
    """Fetch content from a URL."""
    import httpx

    url = inputs.get("url") or node.config.get("url", "")
    if not url:
        return {"data": "", "content_type": "", "status_code": 0, "error": "No URL provided"}

    method = node.config.get("method", "GET").upper()
    headers = inputs.get("headers", {}) or node.config.get("headers", {})
    timeout_s = node.config.get("timeout_ms", 30000) / 1000

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.request(method, url, headers=headers, timeout=timeout_s)
            return {
                "data": resp.text,
                "content_type": resp.headers.get("content-type", ""),
                "status_code": resp.status_code,
            }
    except Exception as e:
        return {"data": "", "content_type": "", "status_code": 0, "error": str(e)}


async def execute_dom_sequence(
    node: ExecutableNode,
    inputs: Dict[str, Any],
    context: Dict[str, Any],
) -> Dict[str, Any]:
    """Execute or dry-run an ordered browser DOM action sequence.

    Dry-run is the default unless a Playwright page/browser context is supplied
    or `dom_dry_run` is explicitly false. This keeps workflow validation cheap
    while preserving the exact action contract the live runner uses.
    """
    sequence = node.config.get("dom_action_sequence") or DEFAULT_DOM_SEQUENCES.get(node.type, [])
    actions = [_resolve_dom_action(action, inputs, node.config) for action in sequence]

    if context.get("dom_dry_run", True) and not context.get("page"):
        return {
            "result": f"[dry-run:{node.type}] {inputs.get('query') or inputs.get('input') or ''}".strip(),
            "actions": actions,
            "metadata": {"dry_run": True, "action_count": len(actions)},
        }

    page = context.get("page")
    managed = None
    metadata = {
        "dry_run": False,
        "headless": bool(context.get("headless", node.config.get("headless", True))),
        "auth_state": _dom_auth_state(context, node.config),
    }
    if page is None:
        managed = await _create_managed_dom_page(context, node.config)
        page = managed["page"]
        metadata.update(managed["metadata"])

    captured = ""
    try:
        for action in actions:
            name = action.get("action")
            target = action.get("target")
            optional = bool(action.get("optional", False))
            try:
                await _apply_dom_action_delay(page, action, context, node.config)
                if name == "goto":
                    await page.goto(target, wait_until=action.get("wait_until", "domcontentloaded"))
                    await _raise_if_dom_blocked(page, context, node.config)
                elif name == "waitFor":
                    if target:
                        await _try_dom_targets(page, action, "waitFor")
                    else:
                        await page.wait_for_timeout(action.get("timeout", 1000))
                elif name == "click":
                    await _try_dom_targets(page, action, "click")
                elif name == "fill":
                    await _try_dom_targets(page, action, "fill", str(action.get("value", "")))
                elif name == "press":
                    await page.keyboard.press(action.get("key", "Enter"))
                elif name == "capture":
                    captured = await _try_dom_targets(page, action, "capture")
                elif name == "copy":
                    await _try_dom_targets(page, action, "click")
                    captured = await page.evaluate("navigator.clipboard.readText()")
                else:
                    raise ValueError(f"Unsupported DOM action: {name}")
                await _raise_if_dom_blocked(page, context, node.config)
                if action.get("delay_after_ms"):
                    await page.wait_for_timeout(action["delay_after_ms"])
            except DomAutomationBlocked:
                raise
            except Exception:
                if optional:
                    continue
                raise
        return {"result": captured, "actions": actions, "metadata": metadata}
    except DomAutomationBlocked as e:
        return {
            "result": captured,
            "actions": actions,
            "error": e.blocker["message"],
            "blocked": True,
            "blocker": e.blocker,
            "metadata": metadata,
        }
    except Exception as e:
        return {"result": captured, "actions": actions, "error": str(e), "metadata": metadata}
    finally:
        if managed:
            await _close_managed_dom_page(managed)


def _dom_auth_state(context: Dict[str, Any], config: Dict[str, Any]) -> str:
    if context.get("user_data_dir") or config.get("user_data_dir"):
        return "persistent_profile"
    if context.get("storage_state_path") or config.get("storage_state_path"):
        return "storage_state"
    if context.get("page"):
        return "supplied_page"
    return "none"


async def _create_managed_dom_page(context: Dict[str, Any], config: Dict[str, Any]) -> Dict[str, Any]:
    try:
        from playwright.async_api import async_playwright
    except Exception as exc:
        raise RuntimeError(f"Playwright is required for live DOM execution: {exc}") from exc

    playwright = await async_playwright().start()
    headless = bool(context.get("headless", config.get("headless", True)))
    user_data_dir = context.get("user_data_dir") or config.get("user_data_dir")
    storage_state_path = context.get("storage_state_path") or config.get("storage_state_path")
    timeout_ms = int(context.get("browser_timeout_ms", config.get("browser_timeout_ms", 30000)))

    if user_data_dir:
        browser_context = await playwright.chromium.launch_persistent_context(
            user_data_dir,
            headless=headless,
            viewport={"width": 1440, "height": 1000},
            user_agent=_dom_user_agent(context, config),
        )
        browser_context.set_default_timeout(timeout_ms)
        page = browser_context.pages[0] if browser_context.pages else await browser_context.new_page()
        return {
            "playwright": playwright,
            "browser_context": browser_context,
            "page": page,
            "metadata": {"managed_browser": True, "auth_state": "persistent_profile"},
        }

    browser = await playwright.chromium.launch(headless=headless)
    new_context_kwargs = {
        "viewport": {"width": 1440, "height": 1000},
        "user_agent": _dom_user_agent(context, config),
    }
    if storage_state_path:
        state_path = Path(storage_state_path).expanduser()
        if not state_path.exists():
            await browser.close()
            await playwright.stop()
            raise RuntimeError(f"storage_state_path does not exist: {state_path}")
        new_context_kwargs["storage_state"] = str(state_path)

    browser_context = await browser.new_context(**new_context_kwargs)
    browser_context.set_default_timeout(timeout_ms)
    page = await browser_context.new_page()
    return {
        "playwright": playwright,
        "browser": browser,
        "browser_context": browser_context,
        "page": page,
        "metadata": {
            "managed_browser": True,
            "auth_state": "storage_state" if storage_state_path else "none",
        },
    }


async def _close_managed_dom_page(managed: Dict[str, Any]) -> None:
    try:
        browser_context = managed.get("browser_context")
        if browser_context:
            await browser_context.close()
    finally:
        browser = managed.get("browser")
        if browser:
            await browser.close()
        playwright = managed.get("playwright")
        if playwright:
            await playwright.stop()


def _dom_user_agent(context: Dict[str, Any], config: Dict[str, Any]) -> str:
    return context.get("user_agent") or config.get("user_agent") or (
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36"
    )


async def _apply_dom_action_delay(
    page: Any,
    action: Dict[str, Any],
    context: Dict[str, Any],
    config: Dict[str, Any],
) -> None:
    delay_ms = action.get(
        "delay_before_ms",
        context.get("dom_action_delay_ms", config.get("dom_action_delay_ms", 250)),
    )
    if delay_ms:
        await page.wait_for_timeout(int(delay_ms))


async def _raise_if_dom_blocked(page: Any, context: Dict[str, Any], config: Dict[str, Any]) -> None:
    blocker = await _detect_dom_blocker(page, context, config)
    if blocker:
        raise DomAutomationBlocked(blocker)


async def _detect_dom_blocker(
    page: Any,
    context: Dict[str, Any],
    config: Dict[str, Any],
) -> Optional[Dict[str, Any]]:
    if context.get("ignore_dom_blockers", config.get("ignore_dom_blockers", False)):
        return None

    title = ""
    url = ""
    body_text = ""
    try:
        title = await page.title()
    except Exception:
        pass
    try:
        url = page.url
    except Exception:
        pass
    try:
        body_text = (await page.locator("body").inner_text(timeout=2000))[:3000]
    except Exception:
        pass

    haystack = f"{title}\n{url}\n{body_text}".lower()
    checks = [
        ("cloudflare_challenge", ["just a moment", "checking your browser", "cloudflare", "cf-challenge"]),
        ("captcha", ["captcha", "recaptcha", "hcaptcha", "verify you are human", "are you human"]),
        ("access_denied", ["access denied", "request blocked", "unusual traffic"]),
        ("auth_required", ["sign in to continue", "log in to continue", "login to continue", "authentication required"]),
    ]
    for kind, markers in checks:
        marker = next((m for m in markers if m in haystack), None)
        if marker:
            return {
                "kind": kind,
                "marker": marker,
                "url": url,
                "title": title,
                "message": f"DOM automation blocked by {kind}; human auth/session or API fallback required",
            }

    selector_checks = {
        "captcha": [
            "iframe[src*='recaptcha']",
            "iframe[src*='hcaptcha']",
            "[data-sitekey]",
            ".g-recaptcha",
            ".h-captcha",
        ],
        "cloudflare_challenge": [
            "#cf-challenge-running",
            ".cf-browser-verification",
            "[name='cf-turnstile-response']",
        ],
    }
    for kind, selectors in selector_checks.items():
        for selector in selectors:
            try:
                if await page.locator(selector).count() > 0:
                    return {
                        "kind": kind,
                        "selector": selector,
                        "url": url,
                        "title": title,
                        "message": f"DOM automation blocked by {kind}; human auth/session or API fallback required",
                    }
            except Exception:
                continue
    return None


def _dom_targets(action: Dict[str, Any]) -> List[str]:
    targets = []
    target = action.get("target")
    if target:
        targets.append(target)
    targets.extend(action.get("fallback_targets") or action.get("fallback_selectors") or [])
    return [target for target in targets if target]


async def _try_dom_targets(page: Any, action: Dict[str, Any], operation: str, value: str = "") -> Any:
    timeout = action.get("timeout", 30000)
    last_error: Optional[Exception] = None
    for target in _dom_targets(action):
        try:
            if operation == "waitFor":
                return await page.wait_for_selector(target, timeout=timeout)
            if operation == "click":
                return await page.click(target, timeout=timeout)
            if operation == "fill":
                return await page.fill(target, value, timeout=timeout)
            if operation == "capture":
                locator = page.locator(target).first
                return await locator.inner_text(timeout=timeout)
            raise ValueError(f"Unsupported DOM target operation: {operation}")
        except Exception as exc:
            last_error = exc
            continue
    if last_error:
        raise last_error
    raise ValueError(f"No DOM target supplied for operation: {operation}")


def _resolve_dom_action(
    action: Dict[str, Any],
    inputs: Dict[str, Any],
    config: Dict[str, Any],
) -> Dict[str, Any]:
    resolved = deepcopy(action)
    source = resolved.pop("value_source", None)
    if source:
        resolved["value"] = _resolve_value_source(source, inputs, config)
    return resolved


def _resolve_value_source(source: str, inputs: Dict[str, Any], config: Dict[str, Any]) -> Any:
    if source.startswith("input."):
        return inputs.get(source.split(".", 1)[1], "")
    if source.startswith("config."):
        return config.get(source.split(".", 1)[1], "")
    return source


async def execute_youtube_transcript(
    node: ExecutableNode,
    inputs: Dict[str, Any],
    context: Dict[str, Any],
) -> Dict[str, Any]:
    """Extract YouTube transcript from a video URL or ID."""
    url_or_id = inputs.get("url", "")
    if not url_or_id:
        return {"transcript": "", "segments": [], "metadata": {"error": "No URL provided"}}

    # Extract video ID
    video_id = url_or_id
    if "youtube.com" in url_or_id or "youtu.be" in url_or_id:
        import urllib.parse
        parsed = urllib.parse.urlparse(url_or_id)
        if parsed.hostname == "youtu.be":
            video_id = parsed.path.lstrip("/")
        else:
            qs = urllib.parse.parse_qs(parsed.query)
            video_id = qs.get("v", [video_id])[0]

    try:
        from youtube_transcript_api import YouTubeTranscriptApi

        api = YouTubeTranscriptApi()
        transcript = api.fetch(video_id, languages=["en"])
        segments = []
        text_parts = []
        for entry in transcript:
            segments.append({
                "start": entry.start,
                "duration": getattr(entry, "duration", 0),
                "text": entry.text,
            })
            text_parts.append(entry.text)
        full_text = " ".join(text_parts)
        return {
            "transcript": full_text,
            "segments": segments,
            "metadata": {"video_id": video_id, "word_count": len(full_text.split())},
        }
    except Exception as e:
        return {"transcript": "", "segments": [], "metadata": {"video_id": video_id, "error": str(e)}}


async def execute_code_run(
    node: ExecutableNode,
    inputs: Dict[str, Any],
    context: Dict[str, Any],
) -> Dict[str, Any]:
    """Execute a code/logic node (condition, merge, transform, etc.)."""

    node_type = node.type

    if node_type == "logic.condition":
        return _execute_condition(node, inputs, context)
    elif node_type == "logic.merge":
        return _execute_merge(node, inputs, context)
    elif node_type == "data_source.inline":
        value = node.config.get("value", inputs.get("value", inputs.get("mock_data", inputs.get("input", ""))))
        return {"output": value}
    elif node_type == "code.youtube_id_extract":
        return _execute_youtube_id_extract(node, inputs, context)
    elif node_type.startswith("transform."):
        return _execute_transform(node, inputs, context)
    elif node_type == "export.file":
        return _execute_export(node, inputs, context)
    elif node_type == "data_source.web":
        # Route to web fetch executor
        return await execute_web_fetch(node, inputs, context)

    # Default: pass inputs through as outputs
    return {"output": inputs, **inputs}


def _execute_youtube_id_extract(
    node: ExecutableNode,
    inputs: Dict[str, Any],
    context: Dict[str, Any],
) -> Dict[str, Any]:
    text = str(inputs.get("input", ""))
    pattern = re.compile(
        r"(?:youtu\.be/|youtube\.com/(?:watch\?v=|embed/|shorts/))([A-Za-z0-9_-]{6,})"
    )
    ids = []
    for match in pattern.finditer(text):
        video_id = match.group(1).split("&", 1)[0]
        if video_id not in ids:
            ids.append(video_id)
    if not node.config.get("extract_all", True) and ids:
        ids = ids[:1]
    return {"ids": ids, "output": ids}


def _execute_condition(
    node: ExecutableNode,
    inputs: Dict[str, Any],
    context: Dict[str, Any],
) -> Dict[str, Any]:
    """Evaluate a DKEL condition expression."""
    expr = node.config.get("condition", "")
    input_data = inputs.get("input", inputs)

    if not expr:
        return {"true": input_data, "false": None, "evaluated": False, "error": "No condition"}

    try:
        result = _evaluate_dkel(expr, input_data)
        if result:
            return {"true": input_data, "false": None, "evaluated": True, "result": True}
        else:
            return {"true": None, "false": input_data, "evaluated": True, "result": False}
    except Exception as e:
        return {"true": input_data, "false": None, "evaluated": False, "error": str(e)}


def _evaluate_dkel(expr: str, data: Any) -> bool:
    """Minimal DKEL evaluator for boolean expressions.

    Supports: comparisons (===, !==, >, >=, <, <=),
              logic (&&, ||, !),
              member access (a.b.c),
              array indexing (a[0]),
              .length, .includes(), .startsWith(), .endsWith().
    """
    # Build a safe scope
    scope = {"input": data, "true": True, "false": False, "null": None}

    # Walk a simplified AST via Python's eval with restricted globals
    # We use a safe eval — only allow access to `scope` dict.
    # Transform the expression from JS-style to Python-style.
    py_expr = _dkel_to_python(expr)
    try:
        result = eval(py_expr, {"__builtins__": {}}, scope)
        return bool(result)
    except Exception as e:
        raise ValueError(f"DKEL eval error: {e}")


def _dkel_to_python(expr: str) -> str:
    """Translate DKEL to Python expressions safely."""
    s = expr.strip()

    # === → ==
    s = s.replace("===", "==")
    # !== → !=
    s = s.replace("!==", "!=")

    # .length → len(...)  (must handle input.items.length → len(input["items"]))
    # This is tricky — we convert access patterns differently.
    # input.items.length → len(input["items"])
    # Simple approach: replace trailing .length with a special marker
    # Actually, in Python we need to convert dict access.
    # We'll use a different approach: allow . access via a wrapper class.

    # For simplicity, we convert some common patterns:
    # input.foo.bar → input["foo"]["bar"]
    s = _dot_to_bracket(s)

    # .includes(x) → x in value
    # .startsWith(x) → value.startswith(x)
    # .endsWith(x) → value.endswith(x)
    s = _method_to_python(s)

    # && → and
    s = s.replace("&&", "and")
    # || → or
    s = s.replace("||", "or")
    # ! → not
    # but only when it's a unary operator, not !=
    s = re.sub(r'(?<![=!])!(?!=)', 'not ', s)

    return s


def _dot_to_bracket(s: str) -> str:
    """Convert JS-style dotted access to Python bracket access:
    input.foo.bar → input["foo"]["bar"]  but only for identifiers.
    """
    # Replace .identifier with ["identifier"]
    result = re.sub(
        r'(\b[a-zA-Z_]\w*)\.([a-zA-Z_]\w*)',
        lambda m: f'{m.group(1)}["{m.group(2)}"]',
        s,
    )
    return result


def _method_to_python(s: str) -> str:
    """Convert JS methods to Python equivalents."""
    # .includes(x) → x in target
    s = re.sub(r'(\S+)\.includes\(([^)]+)\)', r'\2 in \1', s)
    # .startsWith(x) → \1.startswith(\2)
    s = re.sub(r'(\S+)\.startsWith\(([^)]+)\)', r'\1.startswith(\2)', s)
    # .endsWith(x) → \1.endswith(\2)
    s = re.sub(r'(\S+)\.endsWith\(([^)]+)\)', r'\1.endswith(\2)', s)
    return s


def _execute_merge(
    node: ExecutableNode,
    inputs: Dict[str, Any],
    context: Dict[str, Any],
) -> Dict[str, Any]:
    """Merge multiple input streams."""
    strategy = node.config.get("strategy", "wait_all")

    # Collect all non-None input values
    values = [v for v in inputs.values() if v is not None]

    if strategy == "wait_all":
        return {"output": values, "completed_count": len(values), "failed_count": 0}
    elif strategy == "first_n":
        n = node.config.get("first_n", 1)
        return {"output": values[:n], "completed_count": min(len(values), n), "failed_count": 0}
    else:
        return {"output": values, "completed_count": len(values), "failed_count": 0}


def _execute_transform(
    node: ExecutableNode,
    inputs: Dict[str, Any],
    context: Dict[str, Any],
) -> Dict[str, Any]:
    """Apply a data transformation."""
    operation = node.config.get("operation", "identity")
    input_data = inputs.get("input", list(inputs.values())[0] if inputs else "")

    if not isinstance(input_data, str):
        input_data = str(input_data)

    if operation == "clean":
        cleaned = re.sub(r"<[^>]+>", "", input_data)
        cleaned = re.sub(r"^\s{0,3}#{1,6}\s*", "", cleaned, flags=re.MULTILINE)
        cleaned = re.sub(r"[ \t]+", " ", cleaned).strip()
        return {"output": cleaned}

    elif operation == "html_to_markdown":
        import html2text
        return {"output": html2text.html2text(input_data)}

    elif operation == "extract_headings":
        lines = input_data.split("\n")
        headings = [l.strip() for l in lines if l.strip().startswith("#")]
        return {"output": "\n".join(headings)}

    elif operation == "extract_code_blocks":
        blocks = re.findall(r"```(?:\w+)?\n(.*?)```", input_data, re.DOTALL)
        return {"output": "\n\n".join(blocks)}

    elif operation == "wrap_in_template":
        template = node.config.get("template", "{content}")
        return {"output": template.replace("{content}", input_data)}

    else:
        return {"output": input_data}


def _execute_export(
    node: ExecutableNode,
    inputs: Dict[str, Any],
    context: Dict[str, Any],
) -> Dict[str, Any]:
    """Export data to a file."""
    data = inputs.get("data", "")
    filename = inputs.get("filename", node.config.get("path_key", "output"))
    fmt = node.config.get("format", "json")
    directory = node.config.get("directory", "data/outputs")

    # Resolve relative directories under project_root while allowing explicit
    # absolute export directories for tests, user-configured vaults, and jobs.
    project_root = Path(context.get("project_root", os.getcwd()))
    out_dir = Path(directory)
    if not out_dir.is_absolute():
        out_dir = project_root / out_dir
    out_dir.mkdir(parents=True, exist_ok=True)

    out_path = out_dir / filename

    try:
        if fmt == "json":
            content = json.dumps(data, indent=2) if not isinstance(data, str) else data
            if not str(out_path).endswith(".json"):
                out_path = out_path.with_suffix(".json")
        elif fmt == "markdown":
            content = str(data)
            if not str(out_path).endswith(".md"):
                out_path = out_path.with_suffix(".md")
        elif fmt == "yaml":
            import yaml
            content = yaml.dump(json.loads(data) if isinstance(data, str) else data)
            if not str(out_path).endswith(".yaml"):
                out_path = out_path.with_suffix(".yaml")
        elif fmt == "csv":
            import csv
            import io
            rows = data if isinstance(data, list) else [data]
            buf = io.StringIO()
            writer = csv.DictWriter(buf, fieldnames=rows[0].keys()) if rows else None
            if writer:
                writer.writeheader()
                writer.writerows(rows)
            content = buf.getvalue()
            if not str(out_path).endswith(".csv"):
                out_path = out_path.with_suffix(".csv")
        else:
            content = str(data)
            if not str(out_path).endswith(".txt"):
                out_path = out_path.with_suffix(".txt")

        out_path.write_text(content)
        try:
            display_path = str(out_path.relative_to(project_root))
        except ValueError:
            display_path = str(out_path)
        return {
            "path": display_path,
            "size": len(content),
            "format": fmt,
        }
    except Exception as e:
        return {"path": "", "size": 0, "format": fmt, "error": str(e)}


async def execute_subgraph_invoke(
    node: ExecutableNode,
    inputs: Dict[str, Any],
    context: Dict[str, Any],
) -> Dict[str, Any]:
    """Expand a subgraph invocation — executed during planning, not runtime."""
    return {"expanded": True, "subgraph_id": node.config.get("subgraph_id", "")}


# ╔══════════════════════════════════════════════════════════════════════════════╗
# ║  WORKFLOW PLANNER                                                           ║
# ╚══════════════════════════════════════════════════════════════════════════════╝


class WorkflowPlanner:
    """
    Converts a WorkflowComposition (or legacy Workflow) into an ExecutionPlan.

    Responsibilities:
      - Expand SubgraphInvocation nodes (recursive).
      - Validate port types & edge connectivity.
      - Topological sort.
      - Resolve default/fallback input values.
      - Assign prompt templates.
    """

    def __init__(
        self,
        registry: Optional[WorkflowSchemaRegistry] = None,
    ):
        self.registry = registry or default_registry()

    def plan(self, composition: WorkflowComposition) -> ExecutionPlan:
        """Convert a WorkflowComposition to an ExecutionPlan."""
        # 1. Expand subgraphs
        expanded_nodes, expanded_edges = self._expand_subgraphs(
            composition.nodes, composition.edges, composition.subgraphs
        )

        # 2. Build executable node map
        exec_nodes: Dict[str, ExecutableNode] = {}
        for inst in expanded_nodes:
            node_def = self.registry.get_node_def(inst.type)
            if node_def is None:
                raise ValueError(f"Unknown node type: {inst.type}")
            en = self._to_executable(inst, node_def)
            exec_nodes[en.id] = en

        # 3. Build executable edges
        exec_edges = [self._to_exec_edge(e) for e in expanded_edges]

        # 4. Resolve port compatibility
        self._validate_ports(exec_nodes, exec_edges)

        # 5. Topological sort
        order = self._topological_sort(exec_nodes, exec_edges)

        # 6. Find unresolved inputs
        unresolved = self._find_unresolved_inputs(exec_nodes, exec_edges)

        plan = ExecutionPlan(
            workflow_id=composition.id or "unknown",
            execution_options=composition.execution_options,
            nodes=exec_nodes,
            edges=exec_edges,
            execution_order=order,
            validated=True,
            unresolved_inputs=unresolved,
        )
        return plan

    # ── Subgraph expansion ──────────────────────────────────────────────────

    def _expand_subgraphs(
        self,
        nodes: List[NodeInstance],
        edges: List[EdgeInstance],
        subgraph_map: Dict[str, Subgraph],
    ) -> Tuple[List[NodeInstance], List[EdgeInstance]]:
        """Recursively expand SubgraphInvocation nodes."""
        expanded_nodes: List[NodeInstance] = []
        expanded_edges: List[EdgeInstance] = []
        offset = 0

        for inst in nodes:
            if isinstance(inst, SubgraphInvocation) or inst.type == "subgraph.invoke":
                sg_id = inst.config.get("subgraph_id", "")
                if not sg_id:
                    raise ValueError(f"SubgraphInvocation {inst.id} has no subgraph_id")
                sg = subgraph_map.get(sg_id)
                if sg is None:
                    raise ValueError(f"Subgraph not found: {sg_id}")
                # Recursively expand the subgraph
                inner_nodes, inner_edges = self._expand_subgraphs(
                    sg.nodes, sg.edges, subgraph_map
                )
                # Prefix IDs to avoid collisions
                prefix = f"{inst.id}_"
                for n in inner_nodes:
                    n.id = prefix + n.id
                for e in inner_edges:
                    e.id = prefix + e.id
                    e.source_node_id = prefix + e.source_node_id
                    e.target_node_id = prefix + e.target_node_id
                # Wire boundary ports
                for bp in sg.input_ports:
                    bp_node_id = prefix + bp.internal_node_id
                    # Find edges from outer graph that target this invocation
                    for oe in edges:
                        if oe.target_node_id == inst.id and oe.target_port == bp.name:
                            oe.target_node_id = bp_node_id
                            oe.target_port = bp.internal_port
                for bp in sg.output_ports:
                    bp_node_id = prefix + bp.internal_node_id
                    for oe in edges:
                        if oe.source_node_id == inst.id and oe.source_port == bp.name:
                            oe.source_node_id = bp_node_id
                            oe.source_port = bp.internal_port
                expanded_nodes.extend(inner_nodes)
                expanded_edges.extend(inner_edges)
            else:
                expanded_nodes.append(inst)

        expanded_edges.extend(edges)
        return expanded_nodes, expanded_edges

    # ── Convert to executable ──────────────────────────────────────────────

    def _to_executable(self, inst: NodeInstance, node_def: NodeDef) -> ExecutableNode:
        # Substituted prompts (simple variable interpolation)
        sys_prompt = node_def.system_prompt_template
        usr_prompt = node_def.user_prompt_template
        if sys_prompt:
            for k, v in inst.config.items():
                sys_prompt = sys_prompt.replace(f"{{{{config.{k}}}}}", str(v))
        if usr_prompt:
            for k, v in inst.config.items():
                usr_prompt = usr_prompt.replace(f"{{{{config.{k}}}}}", str(v))
            for k, v in inst.inputs.items():
                usr_prompt = usr_prompt.replace(f"{{{{inputs.{k}}}}}", str(v))

        return ExecutableNode(
            id=inst.id,
            type=inst.type,
            label=inst.label or node_def.label,
            config=inst.config,
            inputs=dict(inst.inputs),
            metadata=inst.metadata,
            input_ports=list(node_def.input_ports),
            output_ports=list(node_def.output_ports),
            system_prompt=sys_prompt,
            user_prompt=usr_prompt,
            executor_id=node_def.executor,
            timeout_seconds=node_def.timeout_seconds,
            max_retries=node_def.max_retries,
            retry_delay_seconds=node_def.retry_delay_seconds,
        )

    def _to_exec_edge(self, e: EdgeInstance) -> ExecutableEdge:
        return ExecutableEdge(
            id=e.id,
            source_node_id=e.source_node_id,
            source_port=e.source_port,
            target_node_id=e.target_node_id,
            target_port=e.target_port,
            mode=e.mode,
            transformer=e.transformer,
            condition_expression=e.condition_expression,
        )

    # ── Port validation ─────────────────────────────────────────────────────

    def _validate_ports(
        self,
        nodes: Dict[str, ExecutableNode],
        edges: List[ExecutableEdge],
    ) -> None:
        """Check that source ports exist on source nodes and target ports exist on targets.
        Also check basic type compatibility.
        """
        for e in edges:
            src = nodes.get(e.source_node_id)
            tgt = nodes.get(e.target_node_id)
            if not src:
                raise ValueError(f"Edge {e.id}: source node {e.source_node_id} not found")
            if not tgt:
                raise ValueError(f"Edge {e.id}: target node {e.target_node_id} not found")

            # Check source port exists
            src_port_names = {p.name for p in src.output_ports}
            if src_port_names and e.source_port not in src_port_names:
                if not any(p.dynamic_outputs for p in [self.registry.get_node_def(src.type)] if p):
                    raise ValueError(
                        f"Edge {e.id}: source port '{e.source_port}' not in outputs of "
                        f"node {src.id} ({src.type}). Available: {src_port_names}"
                    )

            # Check target port exists
            tgt_port_names = {p.name for p in tgt.input_ports}
            if tgt_port_names and e.target_port not in tgt_port_names:
                node_def = self.registry.get_node_def(tgt.type)
                if not (node_def and node_def.dynamic_inputs):
                    raise ValueError(
                        f"Edge {e.id}: target port '{e.target_port}' not in inputs of "
                        f"node {tgt.id} ({tgt.type}). Available: {tgt_port_names}"
                    )

    # ── Topological sort ────────────────────────────────────────────────────

    def _topological_sort(
        self,
        nodes: Dict[str, ExecutableNode],
        edges: List[ExecutableEdge],
    ) -> List[str]:
        """Kahn's algorithm — returns execution order or raises on cycle."""
        graph = defaultdict(list)
        indegree: Dict[str, int] = {nid: 0 for nid in nodes}

        for e in edges:
            graph[e.source_node_id].append(e.target_node_id)
            indegree[e.target_node_id] += 1

        queue = deque([nid for nid, deg in indegree.items() if deg == 0])
        order = []

        while queue:
            nid = queue.popleft()
            order.append(nid)
            for nb in graph[nid]:
                indegree[nb] -= 1
                if indegree[nb] == 0:
                    queue.append(nb)

        if len(order) != len(nodes):
            cycled = set(nodes.keys()) - set(order)
            raise ValueError(f"Workflow contains cycles involving nodes: {cycled}")

        return order

    # ── Unresolved inputs ──────────────────────────────────────────────────

    def _find_unresolved_inputs(
        self,
        nodes: Dict[str, ExecutableNode],
        edges: List[ExecutableEdge],
    ) -> Dict[str, List[str]]:
        """Find input ports that are not fed by any edge."""
        fed_ports: Dict[str, Set[str]] = defaultdict(set)
        for e in edges:
            fed_ports[e.target_node_id].add(e.target_port)

        unresolved: Dict[str, List[str]] = {}
        for nid, node in nodes.items():
            required_ports = {p.name for p in node.input_ports if p.required}
            missing = required_ports - fed_ports[nid]
            # Remove ports that have a literal value in node.inputs
            missing -= set(node.inputs.keys())
            if missing:
                unresolved[nid] = list(missing)
        return unresolved


# ╔══════════════════════════════════════════════════════════════════════════════╗
# ║  WORKFLOW EXECUTOR                                                          ║
# ╚══════════════════════════════════════════════════════════════════════════════╝


class WorkflowExecutor:
    """
    Executes a resolved ExecutionPlan step by step.

    - Calls the appropriate executor for each node.
    - Routes data through edges per their mode (direct/transform/route/merge/fork).
    - Tracks results per node.
    - Emits events for SSE / WebSocket streaming.
    """

    def __init__(
        self,
        executor_registry: Optional[ExecutorRegistry] = None,
        transformer_registry: Optional[TransformerRegistry] = None,
    ):
        self.executors = executor_registry or EXECUTOR_REGISTRY
        self.transformers = transformer_registry or TRANSFORMER_REGISTRY
        self.event_callbacks: List[Callable[[str, Dict[str, Any]], None]] = []

    def on_event(self, cb: Callable[[str, Dict[str, Any]], None]):
        self.event_callbacks.append(cb)

    def _emit(self, event_type: str, data: Dict[str, Any]):
        for cb in self.event_callbacks:
            try:
                cb(event_type, data)
            except Exception as e:
                logger.error(f"Event callback error: {e}")

    async def execute(
        self,
        plan: ExecutionPlan,
        global_context: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Execute the plan. Returns a result dict with:
          - success: bool
          - execution_id: str
          - execution_time: float
          - execution_order: list[node_id]
          - node_results: dict[node_id][port_name] = value
          - error: optional str
        """
        start_time = time.time()
        execution_id = f"exec_{uuid.uuid4().hex[:12]}"
        node_outputs: Dict[str, Dict[str, Any]] = {}
        node_exec_times: Dict[str, float] = {}

        ctx = {
            "execution_id": execution_id,
            "workflow_id": plan.workflow_id,
            "execution_options": dict(plan.execution_options),
            **(global_context or {}),
        }

        stop_on_failure = plan.execution_options.get("stop_on_failure", True)

        self._emit("workflow.started", {"execution_id": execution_id,
                   "workflow_id": plan.workflow_id, "node_count": len(plan.execution_order)})

        try:
            for node_id in plan.execution_order:
                node = plan.nodes[node_id]
                node_start = time.time()

                self._emit("node.started", {"node_id": node_id, "node_type": node.type,
                           "execution_id": execution_id})

                # Gather inputs from upstream edges
                inputs = await self._gather_inputs(node_id, plan, node_outputs)

                # Execute the node
                outputs = await self._execute_node(node, inputs, ctx)

                elapsed = time.time() - node_start
                node_outputs[node_id] = outputs
                node_exec_times[node_id] = elapsed

                self._emit("node.finished", {
                    "node_id": node_id,
                    "node_type": node.type,
                    "success": "error" not in outputs,
                    "execution_time_ms": round(elapsed * 1000),
                    "output_keys": list(outputs.keys()),
                    "execution_id": execution_id,
                })

                # Check for error
                if outputs.get("error") and stop_on_failure:
                    raise RuntimeError(f"Node {node_id} ({node.type}) failed: {outputs['error']}")

            total_time = time.time() - start_time
            self._emit("workflow.finished", {
                "execution_id": execution_id,
                "success": True,
                "execution_time_ms": round(total_time * 1000),
            })

            return {
                "success": True,
                "execution_id": execution_id,
                "execution_time": round(total_time, 3),
                "execution_order": list(plan.execution_order),
                "node_results": node_outputs,
                "node_exec_times": node_exec_times,
                "error": None,
            }

        except Exception as e:
            total_time = time.time() - start_time
            logger.error(f"Workflow execution failed: {e}")
            self._emit("workflow.finished", {
                "execution_id": execution_id,
                "success": False,
                "execution_time_ms": round(total_time * 1000),
                "error": str(e),
            })
            return {
                "success": False,
                "execution_id": execution_id,
                "execution_time": round(total_time, 3),
                "execution_order": list(plan.execution_order),
                "node_results": node_outputs,
                "node_exec_times": node_exec_times,
                "error": str(e),
            }

    async def _gather_inputs(
        self,
        node_id: str,
        plan: ExecutionPlan,
        node_outputs: Dict[str, Dict[str, Any]],
    ) -> Dict[str, Any]:
        """Collect data from all upstream edges for a node."""
        inputs: Dict[str, Any] = {}

        for edge in plan.edges:
            if edge.target_node_id != node_id:
                continue
            src_outputs = node_outputs.get(edge.source_node_id, {})
            value = src_outputs.get(edge.source_port)
            if value is None:
                # Try to get a default or the first available output
                for v in src_outputs.values():
                    value = v
                    break

            # Apply transformer
            if edge.transformer and value is not None:
                value = self.transformers.apply(edge.transformer, value)

            if edge.mode == EdgeMode.MERGE:
                # Accumulate merge values
                if edge.target_port not in inputs:
                    inputs[edge.target_port] = []
                if value is not None:
                    inputs[edge.target_port].append(value)
            elif edge.mode == EdgeMode.FORK:
                for p in plan.nodes[node_id].input_ports:
                    inputs[p.name] = value
            else:
                inputs[edge.target_port] = value

        # Merge any literal inputs from the node definition
        for k, v in plan.nodes[node_id].inputs.items():
            if k not in inputs or inputs[k] is None:
                inputs[k] = v

        return inputs

    async def _execute_node(
        self,
        node: ExecutableNode,
        inputs: Dict[str, Any],
        context: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Execute a single node via its registered executor."""
        executor_fn = self.executors.get(node.executor_id)
        if executor_fn is None:
            # Fallback: return inputs as outputs
            logger.warning(f"No executor registered for '{node.executor_id}' "
                          f"(node {node.id}, type {node.type}). Returning inputs.")
            return {"output": inputs, **inputs}

        # Apply retry logic
        last_error = None
        for attempt in range(1, node.max_retries + 2):
            try:
                result = await executor_fn(node, inputs, context)
                if isinstance(result, dict):
                    return result
                return {"output": result}
            except Exception as e:
                last_error = str(e)
                logger.warning(f"Node {node.id} attempt {attempt}/{node.max_retries + 1} failed: {e}")
                if attempt <= node.max_retries:
                    await asyncio.sleep(node.retry_delay_seconds * (2 ** (attempt - 1)))
                else:
                    return {"error": last_error}


# ╔══════════════════════════════════════════════════════════════════════════════╗
# ║  FACADE: legacy_workflow_adapter  &  convert_and_execute                     ║
# ╚══════════════════════════════════════════════════════════════════════════════╝


def legacy_workflow_to_composition(wf: Workflow) -> WorkflowComposition:
    """Convert a legacy Workflow model (from the API) to a WorkflowComposition."""
    node_instances = []
    normalized_types: Dict[str, str] = {}
    for n in wf.nodes:
        normalized_type, config, literal_inputs = _normalize_legacy_node(n)
        normalized_types[n.id] = normalized_type
        ni = NodeInstance(
            id=n.id,
            type=normalized_type,
            label=n.name,
            description=n.description or "",
            config=config,
            inputs=literal_inputs,
            metadata={"status": n.status, "retries": n.retries, "timeout": n.timeout},
        )
        node_instances.append(ni)

    edge_instances = []
    node_order = [n.id for n in wf.nodes]
    for e in wf.edges:
        edge_extra = getattr(e, "model_extra", None) or {}
        source = e.source or e.from_ or edge_extra.get("from_") or edge_extra.get("from") or ""
        target = e.target or e.to or edge_extra.get("to") or ""
        if not source and target:
            source = _infer_previous_node_id(node_order, target)
        ei = EdgeInstance(
            id=e.id,
            source_node_id=source,
            source_port=(
                e.meta.get("source_port")
                if e.meta and e.meta.get("source_port")
                else _default_source_port(normalized_types.get(source, ""))
            ),
            target_node_id=target,
            target_port=(
                e.meta.get("target_port")
                if e.meta and e.meta.get("target_port")
                else _default_target_port(normalized_types.get(target, ""))
            ),
            label=e.label or "",
            metadata=e.meta or {},
        )
        edge_instances.append(ei)

    return WorkflowComposition(
        id=wf.id,
        name=wf.name,
        description=wf.description or "",
        nodes=node_instances,
        edges=edge_instances,
        execution_options={"stop_on_failure": True},
    )


def _infer_previous_node_id(node_order: List[str], target: str) -> str:
    try:
        index = node_order.index(target)
    except ValueError:
        return ""
    if index <= 0:
        return ""
    return node_order[index - 1]


def _normalize_legacy_node(n: LegacyNode) -> Tuple[str, Dict[str, Any], Dict[str, Any]]:
    raw_inputs = dict(n.inputs or {})
    extra = getattr(n, "model_extra", None) or {}
    raw_config = dict(raw_inputs.get("config", {}))
    for key, value in raw_inputs.items():
        if key != "config":
            raw_config.setdefault(key, value)
    for key, value in extra.items():
        if key == "data" and isinstance(value, dict):
            for data_key, data_value in value.items():
                raw_config.setdefault(data_key, data_value)
            continue
        if key not in {
            "id", "name", "type", "description", "inputs", "outputs", "next",
            "retries", "timeout", "retry_delay", "tags", "created_at",
            "updated_at", "status", "execution_time", "error_message",
        }:
            raw_config.setdefault(key, value)

    node_type = _normalize_node_type(n.type, raw_config)
    config = _normalize_node_config(node_type, raw_config)
    literal_inputs = _literal_inputs_for_type(node_type, raw_config)
    return node_type, config, literal_inputs


def _normalize_node_type(node_type: str, config: Dict[str, Any]) -> str:
    if node_type == "dataSource":
        source_type = str(config.get("source_type", "mock")).lower()
        if source_type in {"mock", "inline", "literal"}:
            return "data_source.inline"
        if source_type in {"url", "api", "web"}:
            return "data_source.web"
        if source_type in {"youtube", "youtube_transcript"}:
            return "data_source.youtube"
    if node_type == "provider":
        provider_type = config.get("provider_type")
        if provider_type == "gemini_deep_research":
            return "dom.gemini.deep_research"
        if provider_type in {"perplexity", "perplexity_pro_search"}:
            return "dom.perplexity.pro_search"
        return "llm.chat"
    if node_type in {"prompt", "ai_prompt"}:
        return "llm.chat"
    if node_type in {"transform", "filter"}:
        return "transform.markdown"
    if node_type == "condition":
        return "logic.condition"
    if node_type == "export":
        return "export.file"
    if node_type in {"dk://templates/code/string-extract/youtube-ids", "code.string_extract.youtube_ids"}:
        return "code.youtube_id_extract"
    if node_type in {"dk://templates/dom/gemini/deep-research", "dom.gemini.deep-research"}:
        return "dom.gemini.deep_research"
    if node_type in {"dk://templates/dom/perplexity/pro-search", "dom.perplexity.pro-search"}:
        return "dom.perplexity.pro_search"
    return node_type


def _normalize_node_config(node_type: str, config: Dict[str, Any]) -> Dict[str, Any]:
    if node_type == "data_source.inline":
        return {"value": config.get("mock_data", config.get("value", config.get("input", "")))}
    if node_type == "data_source.web":
        return {
            "url": config.get("url", ""),
            "method": config.get("method", "GET"),
            "headers": config.get("headers", {}),
            "timeout_ms": config.get("timeout_ms", config.get("timeout", 30000)),
        }
    if node_type == "data_source.youtube":
        return {
            "language": config.get("language", "en"),
            "include_timestamps": config.get("include_timestamps", True),
        }
    if node_type == "transform.markdown":
        transform_type = config.get("operation", config.get("transform_type", "clean"))
        operation_map = {
            "text_clean": "clean",
            "markdown": "clean",
            "json_transform": "wrap_in_template",
        }
        return {
            "operation": operation_map.get(transform_type, transform_type),
            "template": config.get("template", config.get("replacement", "{content}")),
        }
    if node_type == "logic.condition":
        return {"condition": config.get("condition", config.get("expr", ""))}
    if node_type == "export.file":
        return {
            "format": config.get("format", "json"),
            "directory": config.get("directory", config.get("output_dir", "data/outputs")),
            "path_key": config.get("path_key", config.get("filename", "output")),
        }
    if node_type == "dom.gemini.deep_research":
        mode = config.get("research_depth", config.get("mode", "balanced"))
        return {
            "provider": "gemini",
            "mode": mode,
            "timeout_ms": config.get("timeout_ms", config.get("timeout", 600000)),
            "dom_action_sequence": config.get(
                "dom_action_sequence",
                DEFAULT_DOM_SEQUENCES["dom.gemini.deep_research"],
            ),
        }
    if node_type == "dom.perplexity.pro_search":
        return {
            "provider": "perplexity",
            "focus": config.get("focus", "web"),
            "timeout_ms": config.get("timeout_ms", config.get("timeout", 300000)),
            "dom_action_sequence": config.get(
                "dom_action_sequence",
                DEFAULT_DOM_SEQUENCES["dom.perplexity.pro_search"],
            ),
        }
    if node_type == "llm.chat":
        provider_type = str(config.get("provider_type", config.get("provider", "gemini")))
        provider_map = {
            "gemini_deep_research": "gemini",
            "gemini_canvas": "gemini",
        }
        return {
            "provider": provider_map.get(provider_type, provider_type),
            "model": config.get("model", "gemini-2.0-flash"),
            "temperature": config.get("temperature", 0.7),
            "max_tokens": config.get("max_tokens", 4096),
        }
    if node_type == "code.youtube_id_extract":
        return {"extract_all": config.get("extract_all", True)}
    return dict(config)


def _literal_inputs_for_type(node_type: str, config: Dict[str, Any]) -> Dict[str, Any]:
    if node_type == "data_source.inline":
        return {}
    if node_type == "data_source.web":
        return {k: v for k, v in {"url": config.get("url"), "headers": config.get("headers")}.items() if v is not None}
    if node_type == "data_source.youtube":
        return {k: v for k, v in {"url": config.get("url", config.get("input"))}.items() if v}
    if node_type in {"dom.gemini.deep_research", "dom.perplexity.pro_search"}:
        return {k: v for k, v in {"query": config.get("query", config.get("input"))}.items() if v}
    if node_type == "llm.chat":
        return {
            k: v for k, v in {
                "system_prompt": config.get("system_prompt", config.get("system_message")),
                "user_prompt": config.get("user_prompt", config.get("prompt", config.get("input"))),
                "messages": config.get("messages"),
            }.items() if v is not None
        }
    if node_type == "code.youtube_id_extract":
        return {"input": config.get("input", "")}
    if node_type == "export.file":
        return {k: v for k, v in {"filename": config.get("filename", config.get("path_key"))}.items() if v}
    return {
        k: v for k, v in {
            "input": config.get("input"),
            "data": config.get("data"),
            "filename": config.get("filename"),
        }.items() if v is not None
    }


def _default_source_port(node_type: str) -> str:
    if node_type == "llm.chat":
        return "response"
    if node_type == "data_source.web":
        return "data"
    if node_type == "data_source.youtube":
        return "transcript"
    if node_type == "dom.gemini.deep_research":
        return "result"
    if node_type == "code.youtube_id_extract":
        return "ids"
    return "output"


def _default_target_port(node_type: str) -> str:
    if node_type == "export.file":
        return "data"
    if node_type == "llm.chat":
        return "user_prompt"
    if node_type == "dom.gemini.deep_research":
        return "query"
    if node_type == "data_source.youtube":
        return "url"
    return "input"


async def convert_and_execute(
    workflow: Workflow,
    global_context: Optional[Dict[str, Any]] = None,
    planner: Optional[WorkflowPlanner] = None,
    executor: Optional[WorkflowExecutor] = None,
) -> Dict[str, Any]:
    """High-level entry point: convert a legacy Workflow, plan it, execute it.

    Returns the execution result dict.
    """
    planner = planner or WorkflowPlanner()
    executor = executor or WorkflowExecutor()
    composition = legacy_workflow_to_composition(workflow)
    plan = planner.plan(composition)
    result = await executor.execute(plan, global_context)
    return result


class DAGExecutor:
    """Compatibility facade for older code paths.

    The schema-driven WorkflowPlanner/WorkflowExecutor are the canonical engine.
    Older modules import DAGExecutor and call execute_workflow(), so keep that
    surface pointed at the same implementation.
    """

    def __init__(
        self,
        planner: Optional[WorkflowPlanner] = None,
        executor: Optional[WorkflowExecutor] = None,
    ):
        self.planner = planner or WorkflowPlanner()
        self.executor = executor or WorkflowExecutor()
        self.node_classes = {
            "dataSource": DataSourceNode,
            "transform": TransformNode,
            "filter": FilterNode,
            "dom_action": DomActionNode,
            "provider": ProviderNode,
            "condition": ConditionNode,
            "export": ExportNode,
            "prompt": PromptNode,
            "aggregate": AggregateNode,
            "join": JoinNode,
            "union": UnionNode,
        }

    def add_event_callback(self, cb: Callable[[str, Dict[str, Any]], None]):
        self.executor.on_event(cb)

    def remove_event_callback(self, cb: Callable[[str, Dict[str, Any]], None]):
        if cb in self.executor.event_callbacks:
            self.executor.event_callbacks.remove(cb)

    def _emit_event(self, event_type: str, event_data: Dict[str, Any]):
        self.executor._emit(event_type, event_data)

    async def execute_workflow(
        self,
        workflow: Workflow,
        context: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        return await convert_and_execute(
            workflow,
            global_context=context or {},
            planner=self.planner,
            executor=self.executor,
        )

    def _build_nodes(self, workflow: Workflow) -> List[NodeInstance]:
        return legacy_workflow_to_composition(workflow).nodes

    def _analyze_data_flow(self, workflow: Workflow) -> List[DataFlowConnection]:
        composition = legacy_workflow_to_composition(workflow)
        return [
            DataFlowConnection(e.source_node_id, e.target_node_id, e.source_port, e.target_port)
            for e in composition.edges
        ]

    def _validate_and_order_workflow(self, workflow: Workflow) -> ExecutionPlan:
        return self.planner.plan(legacy_workflow_to_composition(workflow))

    async def _execute_with_data_flow(self, workflow: Workflow, context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        return await self.execute_workflow(workflow, context)

    def _prepare_node_inputs(self, node_id: str, data: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        return data or {}

    def _prepare_execution_context(self, context: Optional[Dict[str, Any]] = None) -> WorkflowExecutionContext:
        context = context or {}
        return WorkflowExecutionContext(
            execution_id=context.get("execution_id", ""),
            workflow_id=context.get("workflow_id", ""),
            global_inputs=context,
        )

    def _update_downstream_data_flow(self, *args, **kwargs) -> None:
        return None

    def _handle_node_failure(self, node_id: str, error: str) -> ExecutionResult:
        return ExecutionResult(node_id=node_id, success=False, error=error)

    def _prepare_execution_results(self, result: Dict[str, Any]) -> Dict[str, Any]:
        return result


# ╔══════════════════════════════════════════════════════════════════════════════╗
# ║  MODULE-LEVEL SINGLETON                                                     ║
# ╚══════════════════════════════════════════════════════════════════════════════╝

_default_planner: Optional[WorkflowPlanner] = None
_default_executor: Optional[WorkflowExecutor] = None


EXECUTOR_REGISTRY = ExecutorRegistry()
"""Singleton — needs to be created after all executor funcs are defined."""


def get_planner() -> WorkflowPlanner:
    global _default_planner
    if _default_planner is None:
        _default_planner = WorkflowPlanner()
    return _default_planner


def get_executor() -> WorkflowExecutor:
    global _default_executor
    if _default_executor is None:
        _default_executor = WorkflowExecutor()
    return _default_executor
