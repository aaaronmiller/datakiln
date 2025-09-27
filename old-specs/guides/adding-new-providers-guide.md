# Adding New Providers to selectors.json

## Overview

This guide explains how to add new AI chat providers and web services to DataKiln's selector system. The `selectors.json` file contains DOM selectors for automating interactions with various web platforms.

## Understanding the Structure

### File Location
```
backend/selectors.json
```

### JSON Structure
```json
{
  "provider_name": {
    "page_context": {
      "element_name": {
        "selector": "CSS or XPath selector",
        "selector_type": "css",
        "description": "What this element does",
        "provider": "provider_name",
        "context": "page_context",
        "attributes": {
          "data-testid": "expected_value"
        },
        "fallback_selectors": ["alternative.selector"],
        "wait_strategy": "visible",
        "timeout": 5000
      }
    }
  }
}
```

## Step-by-Step Process

### 1. Identify the Provider

#### Choose Provider Name
Use lowercase, no spaces, descriptive names:
```json
// Good
"openai", "gemini", "claude", "perplexity"

// Avoid
"OpenAI", "Google Gemini", "open_ai"
```

#### Determine Page Contexts
Common contexts for AI chat providers:
- `chat`: Main chat interface
- `login`: Authentication pages
- `settings`: Configuration pages
- `history`: Chat history/conversations

### 2. Analyze the Target Website

#### Use Browser DevTools
```javascript
// Open browser DevTools (F12)
// Navigate to the target page
// Inspect elements you want to automate

// Test selectors in console
document.querySelector('your-selector')
document.querySelectorAll('your-selector')
```

#### Identify Key Elements
For AI chat providers, you'll typically need:
- **Input field**: Where users type messages
- **Send button**: To submit messages
- **Message containers**: Where responses appear
- **Stop button**: To interrupt generation
- **Regenerate button**: To retry responses
- **Model selector**: To choose AI models
- **Settings toggles**: Various configuration options

### 3. Create Robust Selectors

#### Best Practices for Selector Creation

**1. Prefer Attribute-Based Selectors**
```javascript
// Good - uses stable data attributes
document.querySelector('[data-testid="send-button"]')
document.querySelector('[aria-label="Send message"]')

// Avoid - layout dependent
document.querySelector('.btn-primary:nth-child(2)')
```

**2. Use Multiple Fallbacks**
```json
{
  "send_button": {
    "selector": "[data-testid='send-button']",
    "fallback_selectors": [
      "button[type='submit']",
      ".send-button",
      "[aria-label='Send']"
    ]
  }
}
```

**3. Handle Dynamic Content**
```json
{
  "message_input": {
    "selector": "[data-testid='message-input']",
    "wait_strategy": "visible",
    "timeout": 10000,
    "attributes": {
      "contenteditable": "true"
    }
  }
}
```

### 4. Test Selectors

#### Manual Testing Script
Create a test script to validate selectors:

```javascript
// test_selectors.js - Run in browser console
const selectors = {
  input: "[data-testid='message-input']",
  send: "[data-testid='send-button']",
  response: ".message-content"
};

console.log("Testing selectors:");
Object.entries(selectors).forEach(([name, selector]) => {
  const element = document.querySelector(selector);
  console.log(`${name}: ${element ? '✓ Found' : '✗ Not found'} - ${selector}`);
});
```

#### Automated Testing
```python
# backend/scripts/test_selectors.py
import asyncio
from playwright.async_api import async_playwright

async def test_selectors(provider_url, selectors):
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()
        await page.goto(provider_url)

        results = {}
        for name, config in selectors.items():
            selector = config['selector']
            try:
                element = await page.wait_for_selector(selector, timeout=5000)
                results[name] = {'found': True, 'selector': selector}
            except:
                results[name] = {'found': False, 'selector': selector}

        await browser.close()
        return results
```

### 5. Add to selectors.json

#### Example: Adding Claude.ai

```json
{
  "claude": {
    "chat": {
      "input": {
        "selector": "[data-testid='message-input']",
        "selector_type": "css",
        "description": "Main chat input field",
        "provider": "claude",
        "context": "chat",
        "attributes": {
          "placeholder": "Type your message here..."
        },
        "fallback_selectors": [
          ".chat-input",
          "textarea[placeholder*='message']"
        ],
        "wait_strategy": "visible",
        "timeout": 10000
      },
      "send_button": {
        "selector": "[data-testid='send-button']",
        "selector_type": "css",
        "description": "Send message button",
        "provider": "claude",
        "context": "chat",
        "fallback_selectors": [
          "button[type='submit']",
          ".send-button"
        ]
      },
      "message_container": {
        "selector": ".message-content",
        "selector_type": "css",
        "description": "Container for AI responses",
        "provider": "claude",
        "context": "chat"
      }
    }
  }
}
```

### 6. Update Provider Registry

#### Add to Provider Manager
```python
# backend/providers.py
class ProviderManager:
    def __init__(self):
        self.providers = {
            'openai': OpenAIProvider(),
            'gemini': GeminiProvider(),
            'claude': ClaudeProvider(),  # Add new provider
        }
```

#### Create Provider Class
```python
# backend/providers/claude_provider.py
class ClaudeProvider(BaseProvider):
    name = "claude"
    base_url = "https://claude.ai"

    async def validate_connection(self):
        # Implement connection validation
        pass

    def get_usage_stats(self):
        # Return usage statistics
        return {
            'requests_today': 0,
            'tokens_used': 0,
            'rate_limit_remaining': 100
        }
```

### 7. Test Integration

#### Create Test Workflow
```json
{
  "name": "Claude Chat Test",
  "nodes": {
    "input": {
      "type": "dom_action",
      "selector_key": "claude.chat.input",
      "action": "type",
      "value": "Hello, Claude!"
    },
    "send": {
      "type": "dom_action",
      "selector_key": "claude.chat.send_button",
      "action": "click"
    },
    "wait": {
      "type": "delay",
      "delay_seconds": 5
    },
    "extract": {
      "type": "dom_action",
      "selector_key": "claude.chat.message_container",
      "action": "extract"
    }
  },
  "edges": [
    {"from": "input", "to": "send"},
    {"from": "send", "to": "wait"},
    {"from": "wait", "to": "extract"}
  ]
}
```

#### Run Integration Tests
```bash
# Test the new provider
python -m pytest backend/tests/test_providers.py::test_claude_provider -v

# Test selector resolution
python -c "
from dom_selectors import default_registry
selector = default_registry.get_selector('claude.chat.input')
print('Selector resolved:', selector is not None)
"
```

## Provider-Specific Examples

### OpenAI ChatGPT
```json
{
  "openai": {
    "chat": {
      "input": {
        "selector": "[data-testid='prompt-textarea']",
        "fallback_selectors": ["textarea[data-testid]", ".chat-input"]
      },
      "send_button": {
        "selector": "[data-testid='send-button']",
        "fallback_selectors": ["button[data-testid]", ".send-button"]
      }
    }
  }
}
```

### Google Gemini
```json
{
  "gemini": {
    "chat": {
      "input": {
        "selector": "[data-testid='input-area']",
        "wait_strategy": "visible",
        "timeout": 10000
      },
      "send_button": {
        "selector": "[data-testid='send-button']",
        "fallback_selectors": [".send-button", "button[type='submit']"]
      }
    }
  }
}
```

### Perplexity AI
```json
{
  "perplexity": {
    "search": {
      "input": {
        "selector": "[placeholder*='Ask']",
        "fallback_selectors": [".search-input", "#search-input"]
      },
      "submit_button": {
        "selector": "[aria-label='Search']",
        "fallback_selectors": [".search-button", "button[type='submit']"]
      }
    }
  }
}
```

## Advanced Configuration

### Dynamic Selectors
```json
{
  "dynamic_input": {
    "selector": "[data-message-id='{{message_id}}']",
    "selector_type": "css",
    "template_vars": ["message_id"]
  }
}
```

### Conditional Selectors
```json
{
  "adaptive_input": {
    "selector": "[data-testid='input']",
    "fallback_selectors": ["[contenteditable='true']"],
    "conditions": {
      "page_loaded": "document.readyState === 'complete'",
      "input_visible": "element.offsetWidth > 0"
    }
  }
}
```

### Shadow DOM Support
```json
{
  "shadow_element": {
    "selector": "custom-element::shadow .inner-input",
    "selector_type": "css",
    "shadow_dom": true
  }
}
```

## Maintenance & Updates

### Monitoring Selector Health
```python
# backend/scripts/monitor_selectors.py
def monitor_selector_health():
    # Check success/failure rates
    # Alert on high failure rates
    # Suggest selector updates
    pass
```

### Automated Updates
```python
# Use AI to suggest selector improvements
def suggest_selector_updates(provider, page_url):
    # Analyze page changes
    # Generate updated selectors
    # Validate against current page
    pass
```

### Version Control
```json
{
  "selector_metadata": {
    "version": "1.2.0",
    "last_updated": "2024-01-15",
    "tested_browsers": ["chrome", "firefox"],
    "page_version": "claude-v2.1"
  }
}
```

## Troubleshooting

### Common Issues

**Selectors work manually but fail in automation:**
- Check for timing issues
- Verify page load completion
- Test in the same browser/environment

**Dynamic content causes failures:**
- Add wait strategies
- Use more resilient selectors
- Implement retry logic

**Provider updates break selectors:**
- Monitor for page changes
- Set up automated testing
- Maintain fallback selectors

### Validation Checklist

- [ ] Selectors tested in target browser
- [ ] Fallback selectors provided
- [ ] Wait strategies configured
- [ ] Timeout values appropriate
- [ ] Provider class implemented
- [ ] Integration tests pass
- [ ] Documentation updated

## Contributing

When adding new providers:

1. Follow the established naming conventions
2. Include comprehensive fallback selectors
3. Add appropriate wait strategies and timeouts
4. Test thoroughly across different scenarios
5. Update documentation and examples
6. Submit changes with test coverage

## Support

For help with selector creation:
- Check existing providers for patterns
- Use browser DevTools for inspection
- Test selectors in multiple scenarios
- Review the troubleshooting guide for common issues