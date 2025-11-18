// DataKiln Chrome Extension - Content Script
// Handles DOM element selection and interaction

let pickerActive = false;
let highlightedElement = null;
let overlay = null;
let tooltip = null;

// Initialize
(function init() {
  createOverlay();
  createTooltip();
  setupMessageListener();
  loadPickerState();
})();

// Load picker state from storage
async function loadPickerState() {
  const result = await chrome.storage.local.get(['pickerActive']);
  if (result.pickerActive) {
    activatePicker();
  }
}

// Setup message listener
function setupMessageListener() {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'TOGGLE_PICKER') {
      if (message.active) {
        activatePicker();
      } else {
        deactivatePicker();
      }
    }
    sendResponse({ success: true });
  });
}

// Create overlay for highlighting elements
function createOverlay() {
  overlay = document.createElement('div');
  overlay.id = 'datakiln-overlay';
  overlay.style.cssText = `
    position: absolute;
    pointer-events: none;
    z-index: 999998;
    border: 3px solid #667eea;
    background: rgba(102, 126, 234, 0.1);
    transition: all 0.1s ease;
    display: none;
  `;
  document.body.appendChild(overlay);
}

// Create tooltip
function createTooltip() {
  tooltip = document.createElement('div');
  tooltip.id = 'datakiln-tooltip';
  tooltip.style.cssText = `
    position: absolute;
    z-index: 999999;
    background: #667eea;
    color: white;
    padding: 8px 12px;
    border-radius: 6px;
    font-family: sans-serif;
    font-size: 12px;
    font-weight: 500;
    pointer-events: none;
    display: none;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  `;
  document.body.appendChild(tooltip);
}

// Activate picker mode
function activatePicker() {
  pickerActive = true;
  document.body.style.cursor = 'crosshair';
  document.addEventListener('mouseover', handleMouseOver);
  document.addEventListener('mouseout', handleMouseOut);
  document.addEventListener('click', handleClick, true);
  document.addEventListener('keydown', handleKeyDown);
  
  showNotification('Element Picker Active - Click elements to capture | ESC to stop');
}

// Deactivate picker mode
function deactivatePicker() {
  pickerActive = false;
  document.body.style.cursor = 'default';
  document.removeEventListener('mouseover', handleMouseOver);
  document.removeEventListener('mouseout', handleMouseOut);
  document.removeEventListener('click', handleClick, true);
  document.removeEventListener('keydown', handleKeyDown);
  
  hideOverlay();
  hideTooltip();
  hideNotification();
}

// Handle mouse over element
function handleMouseOver(e) {
  if (!pickerActive) return;
  if (e.target === overlay || e.target === tooltip) return;
  
  highlightedElement = e.target;
  highlightElement(e.target);
  showElementInfo(e.target, e);
}

// Handle mouse out
function handleMouseOut(e) {
  if (!pickerActive) return;
  if (e.target === highlightedElement) {
    hideOverlay();
    hideTooltip();
  }
}

// Handle element click
function handleClick(e) {
  if (!pickerActive) return;
  
  e.preventDefault();
  e.stopPropagation();
  
  const element = e.target;
  if (element === overlay || element === tooltip) return;
  
  // Show action selection dialog
  showActionDialog(element, e);
}

// Handle keyboard events
function handleKeyDown(e) {
  if (!pickerActive) return;
  
  // ESC to stop picker
  if (e.key === 'Escape') {
    deactivatePicker();
    chrome.runtime.sendMessage({ type: 'PICKER_STOPPED' });
  }
}

// Highlight element
function highlightElement(element) {
  const rect = element.getBoundingClientRect();
  const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
  const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
  
  overlay.style.display = 'block';
  overlay.style.top = rect.top + scrollTop + 'px';
  overlay.style.left = rect.left + scrollLeft + 'px';
  overlay.style.width = rect.width + 'px';
  overlay.style.height = rect.height + 'px';
}

// Show element info tooltip
function showElementInfo(element, e) {
  const selector = getOptimalSelector(element);
  const tagName = element.tagName.toLowerCase();
  const text = element.textContent.trim().substring(0, 30);
  
  tooltip.innerHTML = `
    <div style="margin-bottom: 4px;"><strong>${tagName}</strong></div>
    <div style="font-size: 10px; opacity: 0.9;">${selector}</div>
    ${text ? '<div style="margin-top: 4px; font-size: 10px; opacity: 0.8;">"' + text + '..."</div>' : ''}
  `;
  
  tooltip.style.display = 'block';
  tooltip.style.top = (e.pageY + 15) + 'px';
  tooltip.style.left = (e.pageX + 15) + 'px';
}

// Hide overlay
function hideOverlay() {
  overlay.style.display = 'none';
}

// Hide tooltip
function hideTooltip() {
  tooltip.style.display = 'none';
}

// Show action selection dialog
function showActionDialog(element, clickEvent) {
  const selector = getOptimalSelector(element);
  const rect = element.getBoundingClientRect();
  
  // Create dialog
  const dialog = document.createElement('div');
  dialog.id = 'datakiln-action-dialog';
  dialog.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 1000000;
    background: white;
    padding: 20px;
    border-radius: 12px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
    min-width: 320px;
    font-family: sans-serif;
  `;
  
  dialog.innerHTML = `
    <div style="font-size: 16px; font-weight: 600; margin-bottom: 12px; color: #1a202c;">
      Select Action
    </div>
    <div style="font-size: 12px; color: #718096; margin-bottom: 16px; word-break: break-all;">
      <strong>Element:</strong> ${selector}
    </div>
    <div style="display: flex; flex-direction: column; gap: 8px;">
      <button class="action-btn" data-action="click" style="padding: 10px; border: 2px solid #667eea; background: #667eea; color: white; border-radius: 6px; cursor: pointer; font-weight: 500;">
        🖱️ Click
      </button>
      <button class="action-btn" data-action="type" style="padding: 10px; border: 2px solid #48bb78; background: #48bb78; color: white; border-radius: 6px; cursor: pointer; font-weight: 500;">
        ⌨️ Type Text
      </button>
      <button class="action-btn" data-action="paste" style="padding: 10px; border: 2px solid #ed8936; background: #ed8936; color: white; border-radius: 6px; cursor: pointer; font-weight: 500;">
        📋 Paste from Clipboard
      </button>
      <button class="action-btn" data-action="extract" style="padding: 10px; border: 2px solid #9f7aea; background: #9f7aea; color: white; border-radius: 6px; cursor: pointer; font-weight: 500;">
        📤 Extract Text
      </button>
      <button class="action-btn" data-action="wait" style="padding: 10px; border: 2px solid #cbd5e0; background: #cbd5e0; color: #2d3748; border-radius: 6px; cursor: pointer; font-weight: 500;">
        ⏱️ Wait
      </button>
    </div>
    <button id="cancel-action" style="margin-top: 12px; width: 100%; padding: 8px; border: none; background: #edf2f7; color: #2d3748; border-radius: 6px; cursor: pointer; font-weight: 500;">
      Cancel
    </button>
  `;
  
  document.body.appendChild(dialog);
  
  // Handle action selection
  dialog.querySelectorAll('.action-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const actionType = btn.dataset.action;
      await captureAction(element, actionType, selector);
      document.body.removeChild(dialog);
    });
  });
  
  // Handle cancel
  document.getElementById('cancel-action').addEventListener('click', () => {
    document.body.removeChild(dialog);
  });
}

// Capture action
async function captureAction(element, actionType, selector) {
  let value = '';
  
  if (actionType === 'type') {
    value = prompt('Enter text to type:');
    if (!value) return;
  } else if (actionType === 'paste') {
    try {
      value = await navigator.clipboard.readText();
    } catch (err) {
      value = prompt('Clipboard access denied. Enter text manually:');
      if (!value) return;
    }
  } else if (actionType === 'wait') {
    const delay = prompt('Enter wait time in milliseconds:', '1000');
    if (!delay) return;
    value = delay;
  }
  
  const action = {
    selector: selector,
    actionType: actionType,
    value: value,
    delay: 1000,
    elementTag: element.tagName.toLowerCase(),
    elementText: element.textContent.trim().substring(0, 50),
    timestamp: new Date().toISOString()
  };
  
  // Send to background/popup
  chrome.runtime.sendMessage({
    type: 'ACTION_CAPTURED',
    action: action
  });
  
  // Show success feedback
  showNotification(`Action captured: ${actionType} on ${selector}`, 2000);
}

// Get optimal CSS selector for element
function getOptimalSelector(element) {
  // Try ID first
  if (element.id) {
    return '#' + element.id;
  }
  
  // Try unique class
  if (element.className && typeof element.className === 'string') {
    const classes = element.className.trim().split(/\s+/);
    for (let cls of classes) {
      if (cls && document.querySelectorAll('.' + cls).length === 1) {
        return '.' + cls;
      }
    }
  }
  
  // Try data attributes
  for (let attr of element.attributes) {
    if (attr.name.startsWith('data-') || attr.name === 'name') {
      const selector = element.tagName.toLowerCase() + '[' + attr.name + '="' + attr.value + '"]';
      if (document.querySelectorAll(selector).length === 1) {
        return selector;
      }
    }
  }
  
  // Try aria-label
  if (element.getAttribute('aria-label')) {
    const selector = element.tagName.toLowerCase() + '[aria-label="' + element.getAttribute('aria-label') + '"]';
    return selector;
  }
  
  // Build path
  let path = [];
  let current = element;
  
  while (current && current.tagName) {
    let selector = current.tagName.toLowerCase();
    
    if (current.id) {
      selector += '#' + current.id;
      path.unshift(selector);
      break;
    }
    
    if (current.className && typeof current.className === 'string') {
      const classes = current.className.trim().split(/\s+/).filter(c => c);
      if (classes.length > 0) {
        selector += '.' + classes.join('.');
      }
    }
    
    // Add nth-child if needed
    let sibling = current;
    let nth = 1;
    while (sibling.previousElementSibling) {
      sibling = sibling.previousElementSibling;
      if (sibling.tagName === current.tagName) nth++;
    }
    if (nth > 1 || current.nextElementSibling) {
      selector += ':nth-child(' + nth + ')';
    }
    
    path.unshift(selector);
    current = current.parentElement;
    
    if (path.length > 5) break; // Limit depth
  }
  
  return path.join(' > ');
}

// Show notification banner
function showNotification(message, duration) {
  duration = duration || 3000;
  
  let notification = document.getElementById('datakiln-notification');
  if (!notification) {
    notification = document.createElement('div');
    notification.id = 'datakiln-notification';
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 1000001;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      font-family: sans-serif;
      font-size: 14px;
      font-weight: 500;
      animation: slideIn 0.3s ease;
    `;
    document.body.appendChild(notification);
  }
  
  notification.textContent = message;
  notification.style.display = 'block';
  
  if (duration > 0) {
    setTimeout(() => {
      hideNotification();
    }, duration);
  }
}

// Hide notification
function hideNotification() {
  const notification = document.getElementById('datakiln-notification');
  if (notification) {
    notification.style.display = 'none';
  }
}
