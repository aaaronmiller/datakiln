#!/usr/bin/env python3
"""
Test Phase 1: AI DOM Node MVP Implementation
"""

import asyncio
import tempfile
import os
import json
from nodes.dom_action_node import DomActionNode


def test_ai_dom_node_creation():
    """Test that AiDomNode can be created with Gemini config"""
    print("Testing AiDomNode creation...")

    # Gemini flow configuration
    config = {
        "name": "Gemini Deep Research",
        "provider": "gemini",
        "actions": [
            {
                "selector": "textarea[placeholder*='Ask']",  # Gemini input field
                "action": "type",
                "value": "Research quantum computing applications",
                "delayAfter": 1000
            },
            {
                "selector": "button[data-testid*='send']",  # Send button
                "action": "click",
                "delayAfter": 2000
            },
            {
                "selector": "button:contains('Deep Research')",  # Deep Research option
                "action": "click",
                "delayAfter": 1000
            },
            {
                "selector": "button:contains('Start')",  # Start research button
                "action": "click",
                "delayAfter": 8000  # Wait 8 seconds as specified
            },
            {
                "selector": "#response",  # Response area
                "action": "wait",
                "delayAfter": 5000  # Wait for response
            }
        ],
        "output": "clipboard"
    }

    # Create node
    node = DomActionNode(
        id="test_ai_dom_node",
        name="Test AI DOM Node",
        type="ai_dom",
        config=config
    )

    # Verify configuration was parsed correctly
    assert node.provider == "gemini", f"Expected provider 'gemini', got '{node.provider}'"
    assert node.output == "clipboard", f"Expected output 'clipboard', got '{node.output}'"
    assert len(node.actions) == 5, f"Expected 5 actions, got {len(node.actions)}"

    print("✅ AiDomNode creation successful")
    print(f"   Provider: {node.provider}")
    print(f"   Output: {node.output}")
    print(f"   Actions: {len(node.actions)}")

    return True


def test_config_parsing():
    """Test that config JSON is parsed correctly"""
    print("Testing config parsing...")

    config = {
        "provider": "gemini",
        "actions": [
            {"selector": "input", "action": "type", "value": "test", "delayAfter": 1000},
            {"selector": "button", "action": "click", "delayAfter": 2000}
        ],
        "output": "file"
    }

    node = DomActionNode(
        id="test_config_parsing",
        name="Test Config Parsing",
        type="ai_dom",
        config=config
    )

    # Test _get_actions_to_execute method
    actions = node._get_actions_to_execute()

    assert len(actions) == 2, f"Expected 2 actions, got {len(actions)}"
    assert actions[0].selector == "input", f"Expected selector 'input', got '{actions[0].selector}'"
    assert actions[0].action == "type", f"Expected action 'type', got '{actions[0].action}'"
    assert actions[0].value == "test", f"Expected value 'test', got '{actions[0].value}'"
    assert actions[0].delayAfter == 1000, f"Expected delayAfter 1000, got {actions[0].delayAfter}"

    print("✅ Config parsing successful")
    return True


def test_output_capture_methods():
    """Test that output capture methods exist and work"""
    print("Testing output capture methods...")

    node = DomActionNode(id="test_output", name="Test Output", type="ai_dom")

    # Check that methods exist
    has_capture_output = hasattr(node, '_capture_output')
    has_generate_comments = hasattr(node, '_generate_test_comments')

    assert has_capture_output, "Missing _capture_output method"
    assert has_generate_comments, "Missing _generate_test_comments method"

    # Test _generate_test_comments with mock results
    mock_results = [
        {"success": True, "action": "type", "selector": "input"},
        {"success": True, "action": "click", "selector": "button"},
        {"success": False, "action": "wait", "error": "timeout"}
    ]

    comments = node._generate_test_comments(mock_results)
    assert "Test: Performed type on input" in comments
    assert "Test: Clicked button successfully" in comments
    assert "Test: Failed - timeout" in comments

    print("✅ Output capture methods exist and work")
    return True


async def test_temp_file_storage():
    """Test that temp files are created correctly"""
    print("Testing temp file storage...")

    # Create a mock page object
    class MockPage:
        async def inner_text(self, selector):
            return "Mock response content from AI"

    node = DomActionNode(id="test_file", name="Test File", type="ai_dom", output="file")
    page = MockPage()

    # Test file output
    result = await node._capture_output(page)

    assert result["type"] == "file", f"Expected type 'file', got '{result['type']}'"
    assert "file_path" in result, "Missing file_path in result"
    assert os.path.exists(result["file_path"]), f"File does not exist: {result['file_path']}"

    # Read file content
    with open(result["file_path"], 'r') as f:
        content = f.read()
        assert content == "Mock response content from AI", f"Unexpected file content: {content}"

    # Clean up
    os.unlink(result["file_path"])

    print("✅ Temp file storage works correctly")
    return True


def test_action_config_validation():
    """Test that action configurations are validated"""
    print("Testing action config validation...")

    # Test valid config
    valid_config = {
        "selector": "input",
        "action": "type",
        "value": "test",
        "delayAfter": 1000
    }

    from nodes.dom_action_node import DomActionConfig
    action = DomActionConfig(**valid_config)
    assert action.selector == "input"
    assert action.action == "type"
    assert action.value == "test"
    assert action.delayAfter == 1000

    print("✅ Action config validation works")
    return True


def main():
    """Run all tests"""
    print("🧪 Phase 1: AI DOM Node MVP Tests")
    print("=" * 50)

    # Test 1: Node creation
    print("\n1. Testing AiDomNode creation...")
    test1_pass = test_ai_dom_node_creation()

    # Test 2: Config parsing
    print("\n2. Testing config parsing...")
    test2_pass = test_config_parsing()

    # Test 3: Output capture methods
    print("\n3. Testing output capture methods...")
    test3_pass = test_output_capture_methods()

    # Test 4: Temp file storage
    print("\n4. Testing temp file storage...")
    test4_pass = asyncio.run(test_temp_file_storage())

    # Test 5: Action config validation
    print("\n5. Testing action config validation...")
    test5_pass = test_action_config_validation()

    # Summary
    print("\n" + "=" * 50)
    all_passed = all([test1_pass, test2_pass, test3_pass, test4_pass, test5_pass])
    print(f"Overall result: {'✅ ALL TESTS PASSED' if all_passed else '❌ SOME TESTS FAILED'}")

    return all_passed


if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)