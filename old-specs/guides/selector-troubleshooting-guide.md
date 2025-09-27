# DataKiln Selector Troubleshooting Guide

## Overview

This guide helps troubleshoot issues with DOM selectors used in DataKiln workflows. Selectors are crucial for reliable web automation and can fail due to page changes, dynamic content, or configuration issues.

## Understanding Selectors

### Selector Structure
Selectors in DataKiln are stored in `backend/selectors.json` with this structure:

```json
{
  "provider_name": {
    "page_type": {
      "element_name": {
        "selector": "CSS or XPath selector",
        "selector_type": "css|xpath",
        "description": "What this selector targets",
        "provider": "provider_name",
        "context": "page_context",
        "attributes": {
          "data-testid": "expected_value",
          "class": "expected_class"
        },
        "fallback_selectors": ["alternative.selector", ".backup-selector"]
      }
    }
  }
}
```

### Selector Resolution Process
1. **Key Lookup**: Find selector by `selector_key` (e.g., "openai.chat.input")
2. **Provider Matching**: Match against current page provider
3. **Context Validation**: Ensure page context matches
4. **Selector Testing**: Verify selector exists on page
5. **Fallback Usage**: Try alternative selectors if primary fails

## Common Issues & Solutions

### 1. Selector Not Found

#### Symptoms
- Error: "Could not resolve selector: [selector_key]"
- Workflow fails at DOM action step
- Logs show "Selector resolution failed"

#### Causes & Solutions

**Cause: Missing selector in selectors.json**
```bash
# Check if selector exists
grep "selector_key" backend/selectors.json
```
**Solution**: Add the missing selector to selectors.json

**Cause: Incorrect selector key**
```json
// Wrong
"selector_key": "openai_chat_input"

// Correct
"selector_key": "openai.chat.input"
```
**Solution**: Use dot notation for hierarchical keys

**Cause: Provider mismatch**
- Page: chat.openai.com
- Selector key: "gemini.chat.input"
**Solution**: Use correct provider prefix ("openai.chat.input")

### 2. Selector Exists But Doesn't Work

#### Symptoms
- Selector resolves but action fails
- "Element not found" or "Element not interactable" errors
- Workflow succeeds in resolution but fails in execution

#### Causes & Solutions

**Cause: Dynamic content loading**
```javascript
// Page loads content asynchronously
// Selector works immediately but content appears later
```
**Solution**: Add delay before action or wait for element
```json
{
  "selector_key": "dynamic.content",
  "wait_strategy": "visible",
  "timeout": 10000
}
```

**Cause: Selector too specific**
```css
/* Too specific - breaks with minor DOM changes */
button[data-testid="send-button"][class="btn-primary"]

/* Better - more resilient */
button[data-testid="send-button"]
```
**Solution**: Use more robust selectors

**Cause: Shadow DOM**
```javascript
// Element inside Shadow DOM
document.querySelector('custom-element').shadowRoot.querySelector('.inner-element')
```
**Solution**: Use shadow DOM piercing selectors
```css
custom-element::shadow .inner-element
```

### 3. Selector Works In Browser But Not In Automation

#### Symptoms
- Manual testing works, automation fails
- Inconsistent behavior between runs

#### Causes & Solutions

**Cause: Timing issues**
```javascript
// Page not fully loaded when selector runs
```
**Solution**: Increase page load wait time
```json
{
  "selector_key": "page.element",
  "wait_for_load": true,
  "load_timeout": 15000
}
```

**Cause: User interaction required**
```javascript
// Element only appears after user interaction
```
**Solution**: Add prerequisite actions or wait conditions

**Cause: Browser differences**
- Chrome extension vs. Playwright/Selenium
- Different rendering engines
**Solution**: Test selectors in target browser environment

### 4. Fallback Selectors Not Working

#### Symptoms
- Primary selector fails
- Fallback selectors also fail
- "All selectors exhausted" error

#### Causes & Solutions

**Cause: Poor fallback choices**
```json
{
  "selector": ".primary-class",
  "fallback_selectors": [".primary-class", ".same-selector"]
}
```
**Solution**: Use genuinely different selectors
```json
{
  "selector": ".primary-class",
  "fallback_selectors": [
    "[data-testid='primary']",
    "button[type='submit']",
    ".alternative-class"
  ]
}
```

## Debugging Tools

### 1. Selector Testing

#### Browser DevTools
```javascript
// Test selector in browser console
document.querySelector('your-selector')

// Check if element exists
!!document.querySelector('your-selector')

// Get element details
const el = document.querySelector('your-selector');
console.log(el.outerHTML);
```

#### DataKiln Selector Validation
```bash
# Test selector via API
curl -X POST http://localhost:8000/api/v1/selectors/validate \
  -H "Content-Type: application/json" \
  -d '{"selector_key": "your.selector", "url": "https://example.com"}'
```

### 2. Logging & Monitoring

#### Enable Debug Logging
```python
# In backend, enable selector debug logging
import logging
logging.getLogger('dom_selectors').setLevel(logging.DEBUG)
```

#### WebSocket Event Monitoring
```javascript
// Monitor selector resolution events
const ws = new WebSocket('ws://localhost:8000/ws/executions/your-execution-id');
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.type === 'step_failed' && data.error.includes('selector')) {
    console.log('Selector error:', data);
  }
};
```

### 3. Selector Analysis Tools

#### Automated Selector Generation
```javascript
// Use browser extensions to generate robust selectors
// - SelectorGadget
// - CSS Selector Tester
// - Chrome DevTools "Copy selector"
```

#### Selector Validation Script
```python
# backend/scripts/validate_selectors.py
import json
from dom_selectors import default_registry

def validate_selectors():
    with open('backend/selectors.json') as f:
        selectors_data = json.load(f)

    for provider, pages in selectors_data.items():
        for page, elements in pages.items():
            for element_key, config in elements.items():
                selector = config['selector']
                # Test selector compilation
                try:
                    # Validate CSS/XPath syntax
                    pass
                except Exception as e:
                    print(f"Invalid selector {provider}.{page}.{element_key}: {e}")
```

## Best Practices

### 1. Selector Design

#### Prefer Attribute-Based Selectors
```css
/* Good - uses stable attributes */
[data-testid="send-button"]
[id="message-input"]
[aria-label="Send message"]

/* Avoid - layout dependent */
.nth-child(2)
.class-based:nth-of-type(3)
```

#### Use Multiple Selector Types
```json
{
  "selector": "[data-testid='input']",
  "fallback_selectors": [
    ".chat-input",
    "#message-input",
    "textarea[placeholder*='message']"
  ]
}
```

### 2. Maintenance

#### Regular Validation
```bash
# Add to CI/CD pipeline
python backend/scripts/validate_selectors.py
```

#### Monitor Selector Health
```python
# Track selector success/failure rates
selector_metrics = {
    'total_uses': 0,
    'success_count': 0,
    'failure_count': 0,
    'last_failure': None
}
```

#### Update Strategies
- **Proactive**: Monitor for page changes
- **Reactive**: Update when selectors break
- **Automated**: Use AI to suggest selector updates

### 3. Documentation

#### Selector Metadata
```json
{
  "selector": ".chat-input",
  "description": "Main chat input field for user messages",
  "last_tested": "2024-01-15",
  "page_version": "v2.1",
  "notes": "Updated for new UI layout"
}
```

## Provider-Specific Issues

### OpenAI ChatGPT
```json
{
  "openai": {
    "chat": {
      "input": {
        "selector": "[data-testid='prompt-textarea']",
        "fallback_selectors": [
          "textarea[placeholder*='Message']",
          ".chat-input"
        ]
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
      }
    }
  }
}
```

### Common Patterns
- **Loading states**: Wait for elements to become interactive
- **Dynamic IDs**: Use partial attribute matching
- **Shadow DOM**: Use CSS shadow piercing selectors
- **SPA updates**: Handle client-side routing changes

## Emergency Fixes

### Quick Selector Updates
```bash
# Direct edit for urgent fixes
vim backend/selectors.json

# Restart backend to reload selectors
docker-compose restart backend
```

### Temporary Workarounds
```json
{
  "selector": ".old-selector",
  "temporary_override": ".new-working-selector",
  "expires": "2024-02-01"
}
```

### Rollback Procedures
```bash
# Keep backup of working selectors
cp selectors.json selectors.json.backup

# Restore on failure
cp selectors.json.backup selectors.json
```

## Monitoring & Alerts

### Selector Health Dashboard
- Success/failure rates per selector
- Average resolution time
- Failure patterns and trends

### Automated Alerts
- Selector failure rate > 10%
- New selector additions require review
- Page changes detected

### Performance Metrics
- Selector resolution time
- Cache hit rates
- Fallback usage frequency