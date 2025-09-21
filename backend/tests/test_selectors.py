import pytest
from unittest.mock import MagicMock, AsyncMock
import json
from datetime import datetime

from selectors import SelectorDefinition, SelectorRegistry, default_registry


class TestSelectorDefinition:
    """Test SelectorDefinition functionality"""

    def test_selector_definition_creation(self):
        """Test selector definition creation"""
        definition = SelectorDefinition(
            key="test_button",
            selector="button.test",
            selector_type="css",
            description="Test button selector",
            provider="gemini",
            context="forms"
        )

        assert definition.key == "test_button"
        assert definition.selector == "button.test"
        assert definition.selector_type == "css"
        assert definition.description == "Test button selector"
        assert definition.provider == "gemini"
        assert definition.context == "forms"
        assert isinstance(definition.created_at, datetime)
        assert isinstance(definition.updated_at, datetime)

    def test_selector_definition_defaults(self):
        """Test selector definition defaults"""
        definition = SelectorDefinition(
            key="test",
            selector="div.test"
        )

        assert definition.selector_type == "css"
        assert definition.fallback_selectors == []
        assert definition.attributes == {}


class TestSelectorRegistry:
    """Test SelectorRegistry functionality"""

    def test_registry_creation(self):
        """Test registry creation"""
        registry = SelectorRegistry()
        assert len(registry.selectors) > 0  # Should have default selectors
        assert "google_search_input" in registry.selectors

    def test_register_selector(self):
        """Test selector registration"""
        registry = SelectorRegistry()

        definition = SelectorDefinition(
            key="custom_button",
            selector="button.custom",
            description="Custom button"
        )

        result = registry.register_selector(definition)
        assert result == True
        assert "custom_button" in registry.selectors

    def test_update_selector(self):
        """Test selector update"""
        registry = SelectorRegistry()

        # Update existing selector
        definition = SelectorDefinition(
            key="google_search_input",
            selector="input[name='q']",
            description="Updated description"
        )

        result = registry.update_selector("google_search_input", definition)
        assert result == True

        updated = registry.get_selector("google_search_input")
        assert updated.description == "Updated description"

    def test_get_selector(self):
        """Test selector retrieval"""
        registry = SelectorRegistry()

        selector = registry.get_selector("google_search_input")
        assert selector is not None
        assert selector.key == "google_search_input"

        # Test non-existent selector
        assert registry.get_selector("nonexistent") is None

    def test_resolve_selector(self):
        """Test selector resolution"""
        registry = SelectorRegistry()

        # Test successful resolution
        resolved = registry.resolve_selector("google_search_input")
        assert resolved == "input[name='q']"

        # Test non-existent selector
        assert registry.resolve_selector("nonexistent") is None

    def test_provider_selectors(self):
        """Test provider-specific selector retrieval"""
        registry = SelectorRegistry()

        gemini_selectors = registry.get_selectors_for_provider("gemini")
        assert len(gemini_selectors) > 0

        # Check that returned selectors are for Gemini
        for selector in gemini_selectors:
            assert selector.provider == "gemini"

    def test_context_selectors(self):
        """Test context-specific selector retrieval"""
        registry = SelectorRegistry()

        search_selectors = registry.get_selectors_for_context("search")
        assert len(search_selectors) > 0

        # Check that returned selectors are for search context
        for selector in search_selectors:
            assert selector.context == "search"

    def test_search_selectors(self):
        """Test selector search functionality"""
        registry = SelectorRegistry()

        # Search by key
        results = registry.search_selectors("google")
        assert len(results) > 0
        assert any("google" in selector.key for selector in results)

        # Search by description
        results = registry.search_selectors("search input")
        assert len(results) > 0

    def test_delete_selector(self):
        """Test selector deletion"""
        registry = SelectorRegistry()

        # Delete existing selector
        result = registry.delete_selector("google_search_input")
        assert result == True
        assert "google_search_input" not in registry.selectors

        # Try to delete non-existent selector
        result = registry.delete_selector("nonexistent")
        assert result == False

    def test_bulk_register(self):
        """Test bulk selector registration"""
        registry = SelectorRegistry()

        definitions = [
            SelectorDefinition(key="bulk1", selector="div.bulk1"),
            SelectorDefinition(key="bulk2", selector="div.bulk2")
        ]

        results = registry.bulk_register_selectors(definitions)

        assert results["bulk1"] == True
        assert results["bulk2"] == True
        assert "bulk1" in registry.selectors
        assert "bulk2" in registry.selectors

    @pytest.mark.asyncio
    async def test_validate_selector(self):
        """Test selector validation (mock test)"""
        registry = SelectorRegistry()

        # Mock page
        mock_page = AsyncMock()
        mock_page.query_selector_all.return_value = ["element1", "element2"]

        result = await registry.validate_selector("google_search_input", mock_page)

        assert result["valid"] == True
        assert result["primary_count"] == 2

    def test_export_import_config(self):
        """Test configuration export and import"""
        registry = SelectorRegistry()

        # Add a custom selector
        definition = SelectorDefinition(
            key="export_test",
            selector="div.test",
            description="Export test selector"
        )
        registry.register_selector(definition)

        # Export config
        config_path = registry.export_config("test_export.json")

        # Create new registry and import
        new_registry = SelectorRegistry()
        assert "export_test" not in new_registry.selectors

        result = new_registry.import_config(config_path)
        assert result == True
        assert "export_test" in new_registry.selectors

    def test_provider_context_mappings(self):
        """Test provider and context mappings"""
        registry = SelectorRegistry()

        # Test provider mappings
        assert "gemini" in registry.provider_mappings
        assert "perplexity" in registry.provider_mappings

        # Test context mappings
        assert "search" in registry.context_mappings
        assert "forms" in registry.context_mappings
        assert "content" in registry.context_mappings

    def test_fallback_selectors(self):
        """Test fallback selector functionality"""
        registry = SelectorRegistry()

        # Create a selector with fallbacks
        definition = SelectorDefinition(
            key="test_with_fallbacks",
            selector="button.primary",
            fallback_selectors=["button.secondary", "a.primary"]
        )
        registry.register_selector(definition)

        selector = registry.get_selector("test_with_fallbacks")
        assert len(selector.fallback_selectors) == 2
        assert "button.secondary" in selector.fallback_selectors


class TestDefaultRegistry:
    """Test default registry setup"""

    def test_default_selectors_loaded(self):
        """Test that default selectors are loaded"""
        assert len(default_registry.selectors) > 0

        # Test specific default selectors
        assert "google_search_input" in default_registry.selectors
        assert "perplexity_search_input" in default_registry.selectors
        assert "contenteditable_input" in default_registry.selectors

    def test_default_provider_mappings(self):
        """Test default provider mappings"""
        assert "gemini" in default_registry.provider_mappings
        assert "perplexity" in default_registry.provider_mappings

        gemini_selectors = default_registry.provider_mappings["gemini"]
        assert len(gemini_selectors) > 0
        assert "google_search_input" in gemini_selectors

    def test_default_context_mappings(self):
        """Test default context mappings"""
        assert "search" in default_registry.context_mappings
        assert "forms" in default_registry.context_mappings
        assert "content" in default_registry.context_mappings

        search_selectors = default_registry.context_mappings["search"]
        assert len(search_selectors) > 0
        assert "google_search_input" in search_selectors