"""
Base provider class for AI platforms
"""
from typing import Any, Dict, List, Optional
from abc import ABC, abstractmethod


class BaseProvider(ABC):
    """Abstract base class for AI providers"""

    def __init__(self, name: str, url: str):
        self.name = name
        self.url = url

    @abstractmethod
    def get_selectors(self) -> Dict[str, Any]:
        """Get provider-specific CSS selectors"""
        pass

    @abstractmethod
    def get_action_sequence(self, action_type: str) -> List[Dict[str, Any]]:
        """Get standard action sequence for common operations"""
        pass


class GeminiProvider(BaseProvider):
    """Gemini AI provider configuration"""

    def __init__(self):
        super().__init__('gemini', 'https://gemini.google.com')

    def get_selectors(self) -> Dict[str, Any]:
        """Get Gemini-specific selectors"""
        return {
            'text_input': '[contenteditable="true"]',
            'deep_research_mode': 'div.label:has-text("Deep Research")',
            'canvas_mode': 'div.label:has-text("Canvas")',
            'submit_button': 'mat-icon[fonticon="send"]',
            'start_research': 'span.mdc-button__label:has-text("Start research")',
            'copy_result': 'span.mat-mdc-list-item-title:has-text("Copy")',
            'model_selector': '#model-selector-dropdown',
            'attach_files': 'mat-icon[fonticon="add_2"]',
            'share_button': 'mat-icon[data-test-id="share-icon"]'
        }

    def get_action_sequence(self, action_type: str) -> List[Dict[str, Any]]:
        """Get Gemini action sequences"""
        sequences = {
            'deep_research': [
                {
                    'selector': '[contenteditable="true"]',
                    'action': 'type',
                    'value': 'ok',
                    'delayAfter': 1000
                },
                {
                    'selector': 'div.label:has-text("Deep Research")',
                    'action': 'click',
                    'delayAfter': 2000
                },
                {
                    'selector': 'mat-icon[fonticon="send"]',
                    'action': 'click',
                    'delayAfter': 8000
                },
                {
                    'selector': 'span.mdc-button__label:has-text("Start research")',
                    'action': 'click',
                    'delayAfter': 120000  # 2 minutes for AI response
                },
                {
                    'selector': 'span.mat-mdc-list-item-title:has-text("Copy")',
                    'action': 'click'
                }
            ],
            'simple_query': [
                {
                    'selector': '[contenteditable="true"]',
                    'action': 'type',
                    'value': 'ok',
                    'delayAfter': 1000
                },
                {
                    'selector': 'mat-icon[fonticon="send"]',
                    'action': 'click',
                    'delayAfter': 3000
                }
            ]
        }
        return sequences.get(action_type, [])


class PerplexityProvider(BaseProvider):
    """Perplexity AI provider configuration"""

    def __init__(self):
        super().__init__('perplexity', 'https://www.perplexity.ai')

    def get_selectors(self) -> Dict[str, Any]:
        """Get Perplexity-specific selectors"""
        return {
            'text_input': '.el-input__inner',
            'submit_button': '.el-button.el-button--primary',
            'attach_files': '.el-upload',
            'model_selector': '.model-selector',
            'copy_result': 'button[aria-label="Copy"]'
        }

    def get_action_sequence(self, action_type: str) -> List[Dict[str, Any]]:
        """Get Perplexity action sequences"""
        sequences = {
            'deep_research': [
                {
                    'selector': '.el-input__inner',
                    'action': 'type',
                    'value': 'ok',
                    'delayAfter': 1000
                },
                {
                    'selector': '.el-button.el-button--primary',
                    'action': 'click',
                    'delayAfter': 120000  # 2 minutes for deep research response
                },
                {
                    'selector': 'button[aria-label="Copy"]',
                    'action': 'click'
                }
            ],
            'simple_query': [
                {
                    'selector': '.el-input__inner',
                    'action': 'type',
                    'value': 'ok',
                    'delayAfter': 1000
                },
                {
                    'selector': '.el-button.el-button--primary',
                    'action': 'click',
                    'delayAfter': 2000
                }
            ]
        }
        return sequences.get(action_type, [])


class YTTProvider(BaseProvider):
    """YouTube Transcript provider configuration (URL-based, no browser)"""

    def __init__(self):
        super().__init__('ytt', 'https://youtubetotranscript.com')

    def get_selectors(self) -> Dict[str, Any]:
        """Get YTT-specific selectors"""
        return {
            'copy_transcript': 'span#copy-span'
        }

    def get_action_sequence(self, action_type: str) -> List[Dict[str, Any]]:
        """Get YTT action sequences (minimal)"""
        return [
            {
                'selector': 'span#copy-span',
                'action': 'click',
                'delayAfter': 1000
            }
        ]


# Provider registry
PROVIDERS = {
    'gemini': GeminiProvider(),
    'perplexity': PerplexityProvider(),
    'ytt': YTTProvider()
}


def get_provider(name: str) -> Optional[BaseProvider]:
    """Get provider by name"""
    return PROVIDERS.get(name)


def get_provider_selectors(provider_name: str) -> Dict[str, Any]:
    """Get selectors for a provider"""
    provider = get_provider(provider_name)
    if provider:
        return provider.get_selectors()
    return {}