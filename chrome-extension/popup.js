// DataKiln Chrome Extension - Popup Script

const API_BASE = 'http://localhost:8000';
let pickerActive = false;
let capturedActions = [];

// Initialize popup
document.addEventListener('DOMContentLoaded', async () => {
  await loadPickerState();
  setupEventListeners();
  loadWorkflows();
});

// Load picker state from storage
async function loadPickerState() {
  const result = await chrome.storage.local.get(['pickerActive', 'capturedActions']);
  pickerActive = result.pickerActive || false;
  capturedActions = result.capturedActions || [];
  
  updatePickerUI();
}

// Setup event listeners
function setupEventListeners() {
  document.getElementById('toggle-picker').addEventListener('click', togglePicker);
  document.getElementById('save-workflow').addEventListener('click', saveWorkflow);
  document.getElementById('clear-actions').addEventListener('click', clearActions);
  document.getElementById('open-dashboard').addEventListener('click', () => {
    chrome.tabs.create({ url: API_BASE + '/' });
  });
  document.getElementById('open-editor').addEventListener('click', () => {
    chrome.tabs.create({ url: API_BASE + '/workflows/new' });
  });
  
  // Workflow run buttons
  document.querySelectorAll('.workflow-run').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const workflowType = e.target.dataset.workflow;
      runWorkflow(workflowType);
    });
  });
}

// Toggle DOM picker mode
async function togglePicker() {
  pickerActive = !pickerActive;
  
  // Save state
  await chrome.storage.local.set({ pickerActive });
  
  // Send message to content script
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  chrome.tabs.sendMessage(tab.id, {
    type: 'TOGGLE_PICKER',
    active: pickerActive
  });
  
  updatePickerUI();
}

// Update picker UI state
function updatePickerUI() {
  const toggleBtn = document.getElementById('toggle-picker');
  const pickerStatus = document.getElementById('picker-status');
  const saveBtn = document.getElementById('save-workflow');
  const clearBtn = document.getElementById('clear-actions');
  const actionCount = document.getElementById('action-count');
  
  if (pickerActive) {
    toggleBtn.textContent = 'Stop Element Picker';
    toggleBtn.classList.remove('btn-primary');
    toggleBtn.classList.add('btn-danger');
    pickerStatus.style.display = 'block';
    saveBtn.style.display = 'block';
    clearBtn.style.display = 'block';
  } else {
    toggleBtn.textContent = 'Start Element Picker';
    toggleBtn.classList.remove('btn-danger');
    toggleBtn.classList.add('btn-primary');
    pickerStatus.style.display = 'none';
    saveBtn.style.display = capturedActions.length > 0 ? 'block' : 'none';
    clearBtn.style.display = capturedActions.length > 0 ? 'block' : 'none';
  }
  
  const count = capturedActions.length;
  actionCount.textContent = count + ' action' + (count !== 1 ? 's' : '');
}

// Show status message
function showMessage(message, type) {
  const statusEl = document.getElementById('status-message');
  statusEl.textContent = message;
  statusEl.className = type === 'success' ? 'success-msg' : 'error-msg';
  statusEl.style.display = 'block';
  
  setTimeout(() => {
    statusEl.style.display = 'none';
  }, 3000);
}

// Load available workflows
async function loadWorkflows() {
  // This could be enhanced to fetch from API
  // For now, using hardcoded workflows from popup.html
}

// Listen for messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'ACTION_CAPTURED') {
    capturedActions.push(message.action);
    chrome.storage.local.set({ capturedActions });
    updatePickerUI();
  } else if (message.type === 'PICKER_STOPPED') {
    pickerActive = false;
    chrome.storage.local.set({ pickerActive });
    updatePickerUI();
  }
});
