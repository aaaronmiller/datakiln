from typing import Dict, Any, Optional, List, Union
from pydantic import BaseModel, Field
from datetime import datetime
import json
import os
from pathlib import Path


class SelectorDefinition(BaseModel):
    """Definition for a DOM selector"""

    key: str = Field(..., description="Unique selector key")
    selector: str = Field(..., description="CSS selector or XPath")
    selector_type: Literal["css", "xpath"] = Field("css", description="Selector type")
    description: Optional[str] = Field(None, description="Selector description")
    provider: Optional[str] = Field(None, description="Provider this selector is optimized for")
    context: Optional[str] = Field(None, description="Context where selector should be used")
    fallback_selectors: List[str] = Field(default_factory=list, description="Fallback selectors if primary fails")
    attributes: Dict[str, Any] = Field(default_factory=dict, description="Additional attributes for selection")
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)


class SelectorRegistry:
    """Registry for DOM selectors with provider-specific mappings"""

    def __init__(self, config_path: Optional[str] = None):
        self.selectors: Dict[str, SelectorDefinition] = {}
        self.provider_mappings: Dict[str, List[str]] = {}
        self.context_mappings: Dict[str, List[str]] = {}
        self.config_path = config_path or "selectors.json"

        # Load existing selectors if config exists
        self._load_from_config()

    def register_selector(self, definition: SelectorDefinition) -> bool:
        """Register a new selector"""
        try:
            # Validate selector key uniqueness
            if definition.key in self.selectors:
                print(f"Selector key '{definition.key}' already exists. Updating...")
                return self.update_selector(definition.key, definition)

            # Store selector
            self.selectors[definition.key] = definition
            definition.updated_at = datetime.now()

            # Update mappings
            self._update_mappings(definition)

            # Save to config
            self._save_to_config()

            print(f"Registered selector: {definition.key}")
            return True

        except Exception as e:
            print(f"Failed to register selector {definition.key}: {str(e)}")
            return False

    def update_selector(self, key: str, definition: SelectorDefinition) -> bool:
        """Update an existing selector"""
        try:
            if key not in self.selectors:
                return False

            # Remove from old mappings
            old_definition = self.selectors[key]
            self._remove_from_mappings(old_definition)

            # Update selector
            definition.updated_at = datetime.now()
            self.selectors[key] = definition

            # Add to new mappings
            self._update_mappings(definition)

            # Save to config
            self._save_to_config()

            print(f"Updated selector: {key}")
            return True

        except Exception as e:
            print(f"Failed to update selector {key}: {str(e)}")
            return False

    def get_selector(self, key: str) -> Optional[SelectorDefinition]:
        """Get a selector by key"""
        return self.selectors.get(key)

    def resolve_selector(self, key: str, context: Optional[Dict[str, Any]] = None) -> Optional[str]:
        """Resolve a selector with fallback support"""
        definition = self.get_selector(key)
        if not definition:
            return None

        # Check if selector should be used in current context
        if context and not self._should_use_selector(definition, context):
            return None

        return definition.selector

    def get_selectors_for_provider(self, provider: str) -> List[SelectorDefinition]:
        """Get all selectors optimized for a specific provider"""
        selector_keys = self.provider_mappings.get(provider, [])
        return [self.selectors[key] for key in selector_keys if key in self.selectors]

    def get_selectors_for_context(self, context: str) -> List[SelectorDefinition]:
        """Get all selectors for a specific context"""
        selector_keys = self.context_mappings.get(context, [])
        return [self.selectors[key] for key in selector_keys if key in self.selectors]

    def search_selectors(self, query: str) -> List[SelectorDefinition]:
        """Search selectors by key, description, or context"""
        query_lower = query.lower()
        results = []

        for selector in self.selectors.values():
            if (query_lower in selector.key.lower() or
                (selector.description and query_lower in selector.description.lower()) or
                (selector.context and query_lower in selector.context.lower()) or
                query_lower in selector.selector.lower()):
                results.append(selector)

        return results

    def delete_selector(self, key: str) -> bool:
        """Delete a selector"""
        if key not in self.selectors:
            return False

        # Remove from mappings
        definition = self.selectors[key]
        self._remove_from_mappings(definition)

        # Delete selector
        del self.selectors[key]

        # Save to config
        self._save_to_config()

        print(f"Deleted selector: {key}")
        return True

    def bulk_register_selectors(self, definitions: List[SelectorDefinition]) -> Dict[str, bool]:
        """Register multiple selectors at once"""
        results = {}
        for definition in definitions:
            results[definition.key] = self.register_selector(definition)
        return results

    def validate_selector(self, key: str, page) -> Dict[str, Any]:
        """Validate a selector against a Playwright page"""
        definition = self.get_selector(key)
        if not definition:
            return {"valid": False, "error": "Selector not found"}

        try:
            # Test primary selector
            if definition.selector_type == "css":
                elements = page.query_selector_all(definition.selector)
            else:  # xpath
                elements = page.query_selector_all(f"xpath={definition.selector}")

            primary_count = len(elements)

            # Test fallback selectors
            fallback_results = []
            for fallback in definition.fallback_selectors:
                try:
                    if definition.selector_type == "css":
                        fallback_elements = page.query_selector_all(fallback)
                    else:
                        fallback_elements = page.query_selector_all(f"xpath={fallback}")
                    fallback_results.append({
                        "selector": fallback,
                        "count": len(fallback_elements),
                        "valid": len(fallback_elements) > 0
                    })
                except Exception as e:
                    fallback_results.append({
                        "selector": fallback,
                        "count": 0,
                        "valid": False,
                        "error": str(e)
                    })

            return {
                "valid": primary_count > 0,
                "primary_selector": definition.selector,
                "primary_count": primary_count,
                "fallback_results": fallback_results,
                "definition": definition.dict()
            }

        except Exception as e:
            return {
                "valid": False,
                "error": str(e),
                "definition": definition.dict()
            }

    def export_config(self, path: Optional[str] = None) -> str:
        """Export registry configuration to JSON"""
        export_path = path or self.config_path

        config = {
            "selectors": [selector.dict() for selector in self.selectors.values()],
            "provider_mappings": self.provider_mappings,
            "context_mappings": self.context_mappings,
            "exported_at": datetime.now().isoformat()
        }

        with open(export_path, 'w') as f:
            json.dump(config, f, indent=2, default=str)

        return export_path

    def import_config(self, path: str) -> bool:
        """Import registry configuration from JSON"""
        try:
            with open(path, 'r') as f:
                config = json.load(f)

            # Clear existing data
            self.selectors.clear()
            self.provider_mappings.clear()
            self.context_mappings.clear()

            # Import selectors
            for selector_data in config.get("selectors", []):
                definition = SelectorDefinition(**selector_data)
                self.selectors[definition.key] = definition

            # Import mappings
            self.provider_mappings = config.get("provider_mappings", {})
            self.context_mappings = config.get("context_mappings", {})

            print(f"Imported {len(self.selectors)} selectors from {path}")
            return True

        except Exception as e:
            print(f"Failed to import config from {path}: {str(e)}")
            return False

    def _update_mappings(self, definition: SelectorDefinition):
        """Update provider and context mappings"""
        # Update provider mapping
        if definition.provider:
            if definition.provider not in self.provider_mappings:
                self.provider_mappings[definition.provider] = []
            if definition.key not in self.provider_mappings[definition.provider]:
                self.provider_mappings[definition.provider].append(definition.key)

        # Update context mapping
        if definition.context:
            if definition.context not in self.context_mappings:
                self.context_mappings[definition.context] = []
            if definition.key not in self.context_mappings[definition.context]:
                self.context_mappings[definition.context].append(definition.key)

    def _remove_from_mappings(self, definition: SelectorDefinition):
        """Remove selector from mappings"""
        # Remove from provider mapping
        if definition.provider and definition.provider in self.provider_mappings:
            if definition.key in self.provider_mappings[definition.provider]:
                self.provider_mappings[definition.provider].remove(definition.key)

        # Remove from context mapping
        if definition.context and definition.context in self.context_mappings:
            if definition.key in self.context_mappings[definition.context]:
                self.context_mappings[definition.context].remove(definition.key)

    def _should_use_selector(self, definition: SelectorDefinition, context: Dict[str, Any]) -> bool:
        """Determine if selector should be used in given context"""
        # Check provider compatibility
        if definition.provider and "provider" in context:
            if definition.provider != context["provider"]:
                return False

        # Check context compatibility
        if definition.context and "context" in context:
            if definition.context != context["context"]:
                return False

        return True

    def _load_from_config(self):
        """Load selectors from configuration file"""
        if os.path.exists(self.config_path):
            self.import_config(self.config_path)

    def _save_to_config(self):
        """Save selectors to configuration file"""
        self.export_config(self.config_path)


# Default selectors registry instance
default_registry = SelectorRegistry()

# Common selector definitions for popular sites
DEFAULT_SELECTORS = [
    SelectorDefinition(
        key="google_search_input",
        selector="input[name='q']",
        description="Google search input field",
        provider="gemini_deep_research",
        context="search"
    ),
    SelectorDefinition(
        key="google_search_button",
        selector="input[value='Google Search']",
        description="Google search button",
        provider="gemini_deep_research",
        context="search"
    ),
    SelectorDefinition(
        key="perplexity_search_input",
        selector="textarea[data-testid='search-input']",
        description="Perplexity search input",
        provider="perplexity",
        context="search"
    ),
    SelectorDefinition(
        key="perplexity_send_button",
        selector="button[data-testid='send-button']",
        description="Perplexity send button",
        provider="perplexity",
        context="search"
    ),
    SelectorDefinition(
        key="contenteditable_input",
        selector="[contenteditable='true']",
        description="Generic contenteditable element for prompt input",
        context="prompt_input"
    ),
    SelectorDefinition(
        key="submit_button",
        selector="button[type='submit']",
        description="Generic submit button",
        context="forms"
    ),
    SelectorDefinition(
        key="text_input",
        selector="input[type='text']",
        description="Generic text input field",
        context="forms"
    ),
    SelectorDefinition(
        key="main_content",
        selector="main, [role='main'], .main-content, #main",
        description="Main content area",
        context="content"
    ),
    SelectorDefinition(
        key="article_content",
        selector="article, .article, .post-content",
        description="Article content",
        context="content"
    )
]

# Register default selectors
for selector in DEFAULT_SELECTORS:
    default_registry.register_selector(selector)