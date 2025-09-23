"""
Selector validation API endpoints.

Provides endpoints for validating CSS selectors against live DOM.
"""

from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import Dict, Any, Optional, List
from backend.dom_selectors import default_registry


router = APIRouter()


class SelectorValidationRequest(BaseModel):
    """Request model for selector validation"""
    selector: str
    selector_type: str = "css"  # "css" or "xpath"
    url: Optional[str] = None  # URL to test against
    html_content: Optional[str] = None  # HTML content to test against


class SelectorTestRequest(BaseModel):
    """Request model for testing multiple selectors"""
    selectors: List[Dict[str, Any]]
    url: Optional[str] = None
    html_content: Optional[str] = None


@router.post("/validate")
async def validate_selector(request: SelectorValidationRequest):
    """
    Validate a single CSS selector or XPath against live DOM or provided HTML.

    This endpoint tests selector validity and returns match information.
    """
    try:
        # For now, we'll implement basic validation without Playwright
        # In a full implementation, this would use Playwright to test against real pages

        validation_result = await _validate_selector_basic(
            request.selector,
            request.selector_type,
            request.url,
            request.html_content
        )

        return {
            "status": "success",
            "validation": validation_result
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Selector validation failed: {str(e)}")


@router.post("/test-batch")
async def test_selectors_batch(request: SelectorTestRequest):
    """
    Test multiple selectors against a target URL or HTML content.

    Returns validation results for each selector.
    """
    try:
        results = []

        for selector_data in request.selectors:
            selector = selector_data.get("selector", "")
            selector_type = selector_data.get("selector_type", "css")
            key = selector_data.get("key", selector)

            validation_result = await _validate_selector_basic(
                selector,
                selector_type,
                request.url,
                request.html_content
            )

            results.append({
                "key": key,
                "selector": selector,
                "selector_type": selector_type,
                "validation": validation_result
            })

        return {
            "status": "success",
            "results": results,
            "total_tested": len(results),
            "passed": sum(1 for r in results if r["validation"]["valid"]),
            "failed": sum(1 for r in results if not r["validation"]["valid"])
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Batch selector testing failed: {str(e)}")


@router.get("/registry")
async def get_selector_registry():
    """
    Get all registered selectors from the registry.
    """
    try:
        selectors = []
        for key, definition in default_registry.selectors.items():
            selectors.append({
                "key": key,
                "selector": definition.selector,
                "selector_type": definition.selector_type,
                "description": definition.description,
                "provider": definition.provider,
                "context": definition.context,
                "fallback_selectors": definition.fallback_selectors
            })

        return {
            "status": "success",
            "selectors": selectors,
            "total": len(selectors)
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get selector registry: {str(e)}")


@router.post("/registry/test-all")
async def test_all_registered_selectors(url: Optional[str] = None, html_content: Optional[str] = None):
    """
    Test all registered selectors against a target.
    """
    try:
        registry_data = await get_selector_registry()
        selectors = registry_data["selectors"]

        # Convert to test format
        test_selectors = [
            {
                "key": s["key"],
                "selector": s["selector"],
                "selector_type": s["selector_type"]
            }
            for s in selectors
        ]

        test_request = SelectorTestRequest(
            selectors=test_selectors,
            url=url,
            html_content=html_content
        )

        return await test_selectors_batch(test_request)

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to test all selectors: {str(e)}")


async def _validate_selector_basic(
    selector: str,
    selector_type: str,
    url: Optional[str],
    html_content: Optional[str]
) -> Dict[str, Any]:
    """
    Basic selector validation without full DOM rendering.
    In production, this would use Playwright or similar.
    """
    try:
        # Basic syntax validation
        issues = []

        if not selector or not selector.strip():
            return {
                "valid": False,
                "error": "Selector cannot be empty",
                "issues": ["empty_selector"]
            }

        selector = selector.strip()

        if selector_type == "css":
            # Basic CSS selector validation
            issues.extend(_validate_css_selector(selector))
        elif selector_type == "xpath":
            # Basic XPath validation
            issues.extend(_validate_xpath_selector(selector))
        else:
            issues.append(f"Unsupported selector type: {selector_type}")

        # If we have HTML content, try basic matching
        match_info = {}
        if html_content:
            match_info = _test_selector_against_html(selector, selector_type, html_content)
        elif url:
            # In a real implementation, we'd fetch the URL
            match_info = {
                "note": "URL testing not implemented in basic validation",
                "url_provided": url
            }

        return {
            "valid": len(issues) == 0,
            "selector": selector,
            "selector_type": selector_type,
            "issues": issues,
            "match_info": match_info,
            "validation_type": "basic_syntax"
        }

    except Exception as e:
        return {
            "valid": False,
            "error": f"Validation error: {str(e)}",
            "selector": selector,
            "selector_type": selector_type
        }


def _validate_css_selector(selector: str) -> List[str]:
    """Basic CSS selector validation"""
    issues = []

    # Check for obviously invalid patterns
    if ">>" in selector:
        issues.append("Invalid '>>' in CSS selector (use space or >)")

    if selector.count("(") != selector.count(")"):
        issues.append("Unmatched parentheses")

    if selector.count("[") != selector.count("]"):
        issues.append("Unmatched square brackets")

    # Check for common invalid characters
    invalid_chars = ["<", ">", '"', "'"]
    for char in invalid_chars:
        if char in selector:
            issues.append(f"Invalid character '{char}' in CSS selector")

    return issues


def _validate_xpath_selector(selector: str) -> List[str]:
    """Basic XPath selector validation"""
    issues = []

    if not selector.startswith("/"):
        issues.append("XPath should start with '/'")

    if selector.count("(") != selector.count(")"):
        issues.append("Unmatched parentheses in XPath")

    if selector.count("[") != selector.count("]"):
        issues.append("Unmatched square brackets in XPath")

    return issues


def _test_selector_against_html(selector: str, selector_type: str, html_content: str) -> Dict[str, Any]:
    """Test selector against HTML content using basic string matching"""
    try:
        import re

        if selector_type == "css":
            # Very basic CSS matching using regex
            # This is a simplified implementation
            if selector.startswith("#"):
                # ID selector
                element_id = selector[1:]
                pattern = f'id=["\']{re.escape(element_id)}["\']'
                matches = len(re.findall(pattern, html_content, re.IGNORECASE))
                return {
                    "matches_found": matches,
                    "match_type": "id_selector",
                    "confidence": "medium"
                }
            elif selector.startswith("."):
                # Class selector
                class_name = selector[1:]
                pattern = f'class=["\'][^"\']*\\b{re.escape(class_name)}\\b[^"\']*["\']'
                matches = len(re.findall(pattern, html_content, re.IGNORECASE))
                return {
                    "matches_found": matches,
                    "match_type": "class_selector",
                    "confidence": "medium"
                }
            elif selector.startswith("["):
                # Attribute selector
                attr_match = re.search(r'^\[([^\]=]+)(?:([~|^$*]?=)["\']([^"\']*)["\'])?\]$', selector)
                if attr_match:
                    attr_name = attr_match.group(1)
                    pattern = f'{re.escape(attr_name)}='
                    matches = len(re.findall(pattern, html_content, re.IGNORECASE))
                    return {
                        "matches_found": matches,
                        "match_type": "attribute_selector",
                        "attribute": attr_name,
                        "confidence": "low"
                    }
            else:
                # Element selector
                pattern = f'<{re.escape(selector)}\\b'
                matches = len(re.findall(pattern, html_content, re.IGNORECASE))
                return {
                    "matches_found": matches,
                    "match_type": "element_selector",
                    "confidence": "low"
                }

        return {
            "matches_found": 0,
            "match_type": "unknown",
            "confidence": "none",
            "note": "Basic HTML matching - use full DOM testing for accurate results"
        }

    except Exception as e:
        return {
            "error": f"HTML testing failed: {str(e)}",
            "matches_found": 0,
            "confidence": "none"
        }