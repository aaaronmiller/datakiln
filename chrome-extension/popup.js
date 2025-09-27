document.addEventListener('DOMContentLoaded', function() {
  // Initialize popup state
  let currentMode = 'website';
  let currentTab = null;
  let availableWorkflows = [];
  let clipboardContent = '';

  // Get DOM elements
  const websiteMode = document.getElementById('websiteMode');
  const clipboardMode = document.getElementById('clipboardMode');
  const modeDescription = document.getElementById('modeDescription');
  const workflowSelect = document.getElementById('workflowSelect');
  const inputPreview = document.getElementById('inputPreview');
  const previewContent = document.getElementById('previewContent');
  const executeWorkflow = document.getElementById('executeWorkflow');
  const enableWorkflow = document.getElementById('enableWorkflow');
  const enableCapture = document.getElementById('enableCapture');
  const saveSettings = document.getElementById('saveSettings');
  const resetSettings = document.getElementById('resetSettings');
  const createWorkflow = document.getElementById('createWorkflow');
  const loadTemplate = document.getElementById('loadTemplate');
  const stopExecution = document.getElementById('stopExecution');
  const providerList = document.getElementById('providerList');
  const executionStatus = document.getElementById('executionStatus');
  const statusText = document.getElementById('statusText');
  const progressText = document.getElementById('progressText');
  const progressBar = document.getElementById('progressBar');

  // Initialize popup
  init();

  async function init() {
    try {
      // Get current tab
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      currentTab = tabs[0];

      // Load settings
      await loadSettings();

      // Load available workflows
      await loadWorkflows();

      // Update input preview
      await updateInputPreview();

      // Load provider status
      await loadProviderStatus();

      // Set up event listeners
      setupEventListeners();

    } catch (error) {
      console.error('Popup initialization failed:', error);
      showError('Failed to initialize popup');
    }
  }

  function setupEventListeners() {
    // Mode selection
    websiteMode.addEventListener('click', () => switchMode('website'));
    clipboardMode.addEventListener('click', () => switchMode('clipboard'));

    // Workflow selection
    workflowSelect.addEventListener('change', updateInputPreview);

    // Action buttons
    executeWorkflow.addEventListener('click', handleExecuteWorkflow);
    createWorkflow.addEventListener('click', handleCreateWorkflow);
    loadTemplate.addEventListener('click', handleLoadTemplate);
    stopExecution.addEventListener('click', handleStopExecution);

    // Settings
    saveSettings.addEventListener('click', handleSaveSettings);
    resetSettings.addEventListener('click', handleResetSettings);

    // Toggle switches
    enableWorkflow.addEventListener('change', handleToggleWorkflow);
    enableCapture.addEventListener('change', handleToggleCapture);
  }

  async function loadSettings() {
    try {
      const result = await chrome.storage.sync.get([
        'enableWorkflow', 
        'enableCapture', 
        'selectedWorkflow',
        'activationMode'
      ]);

      enableWorkflow.checked = result.enableWorkflow !== false; // Default to true
      enableCapture.checked = result.enableCapture || false;
      currentMode = result.activationMode || 'website';

      // Update mode UI
      updateModeUI();

    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  }

  async function loadWorkflows() {
    try {
      // Load workflows from backend API
      const response = await fetch('http://localhost:8000/api/v1/workflows/list');
      if (response.ok) {
        const data = await response.json();
        availableWorkflows = data.workflows || [];
      } else {
        // Fallback to default workflows
        availableWorkflows = getDefaultWorkflows();
      }

      // Populate workflow dropdown
      populateWorkflowDropdown();

    } catch (error) {
      console.error('Failed to load workflows:', error);
      availableWorkflows = getDefaultWorkflows();
      populateWorkflowDropdown();
    }
  }

  function getDefaultWorkflows() {
    return [
      {
        id: 'youtube-analysis',
        name: '🎥 YouTube Video Analysis',
        description: 'Extract transcript and analyze YouTube videos',
        inputType: 'url',
        outputDestination: 'obsidian'
      },
      {
        id: 'deep-research',
        name: '🔍 Deep Research',
        description: 'Comprehensive research on any topic',
        inputType: 'text',
        outputDestination: 'obsidian'
      },
      {
        id: 'website-summary',
        name: '📄 Website Summary',
        description: 'Summarize and analyze website content',
        inputType: 'url',
        outputDestination: 'obsidian'
      },
      {
        id: 'text-analysis',
        name: '📝 Text Analysis',
        description: 'Analyze and process text content',
        inputType: 'text',
        outputDestination: 'obsidian'
      }
    ];
  }

  function populateWorkflowDropdown() {
    workflowSelect.innerHTML = '<option value="">Select a workflow...</option>';
    
    availableWorkflows.forEach(workflow => {
      const option = document.createElement('option');
      option.value = workflow.id;
      option.textContent = workflow.name;
      option.title = workflow.description;
      workflowSelect.appendChild(option);
    });

    // Restore selected workflow
    chrome.storage.sync.get(['selectedWorkflow'], (result) => {
      if (result.selectedWorkflow) {
        workflowSelect.value = result.selectedWorkflow;
        updateInputPreview();
      }
    });
  }

  function switchMode(mode) {
    currentMode = mode;
    updateModeUI();
    updateInputPreview();
    
    // Save mode preference
    chrome.storage.sync.set({ activationMode: mode });
  }

  function updateModeUI() {
    // Update button states
    websiteMode.classList.toggle('active', currentMode === 'website');
    clipboardMode.classList.toggle('active', currentMode === 'clipboard');

    // Update description
    if (currentMode === 'website') {
      modeDescription.textContent = 'Current URL will be used as input to selected workflow';
    } else {
      modeDescription.textContent = 'Clipboard content will be used as input to selected workflow';
    }
  }

  async function updateInputPreview() {
    try {
      let inputContent = '';
      
      if (currentMode === 'website') {
        if (currentTab) {
          inputContent = `URL: ${currentTab.url}\nTitle: ${currentTab.title}`;
        } else {
          inputContent = 'No active tab found';
        }
      } else {
        // Get clipboard content
        try {
          clipboardContent = await navigator.clipboard.readText();
          inputContent = clipboardContent || 'Clipboard is empty';
        } catch (error) {
          inputContent = 'Unable to read clipboard (permission required)';
        }
      }

      // Truncate long content
      if (inputContent.length > 200) {
        inputContent = inputContent.substring(0, 200) + '...';
      }

      previewContent.textContent = inputContent;

      // Show/hide preview based on workflow selection
      const selectedWorkflow = workflowSelect.value;
      inputPreview.style.display = selectedWorkflow ? 'block' : 'none';

    } catch (error) {
      console.error('Failed to update input preview:', error);
      previewContent.textContent = 'Error loading preview';
    }
  }

  async function handleExecuteWorkflow() {
    try {
      const selectedWorkflowId = workflowSelect.value;
      if (!selectedWorkflowId) {
        showError('Please select a workflow');
        return;
      }

      const selectedWorkflow = availableWorkflows.find(w => w.id === selectedWorkflowId);
      if (!selectedWorkflow) {
        showError('Selected workflow not found');
        return;
      }

      // Prepare input data
      let inputData = {};
      
      if (currentMode === 'website') {
        inputData = {
          type: 'url',
          url: currentTab.url,
          title: currentTab.title,
          domain: new URL(currentTab.url).hostname
        };
      } else {
        // Get fresh clipboard content
        try {
          clipboardContent = await navigator.clipboard.readText();
          inputData = {
            type: 'text',
            content: clipboardContent
          };
        } catch (error) {
          showError('Unable to read clipboard content');
          return;
        }
      }

      // Show execution status
      showExecutionStatus('Starting workflow execution...', 0);

      // Execute workflow via API
      const response = await fetch('http://localhost:8000/api/v1/workflows/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          workflow_id: selectedWorkflowId,
          input_data: inputData,
          activation_source: 'extension',
          output_destination: selectedWorkflow.outputDestination || 'obsidian'
        })
      });

      if (response.ok) {
        const result = await response.json();
        showExecutionStatus('Workflow executed successfully!', 100);
        
        // Show success notification
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'icon48.png',
          title: 'DataKiln Workflow',
          message: `${selectedWorkflow.name} completed successfully!`
        });

        // Close popup after success
        setTimeout(() => window.close(), 2000);
      } else {
        const error = await response.json();
        showError(`Workflow execution failed: ${error.detail || 'Unknown error'}`);
      }

    } catch (error) {
      console.error('Workflow execution failed:', error);
      showError('Failed to execute workflow');
    }
  }

  function showExecutionStatus(message, progress) {
    executionStatus.style.display = 'block';
    statusText.textContent = message;
    progressText.textContent = `${progress}%`;
    progressBar.style.width = `${progress}%`;

    if (progress === 100) {
      executionStatus.className = 'execution-status status-completed';
    } else if (progress === 0) {
      executionStatus.className = 'execution-status status-error';
    } else {
      executionStatus.className = 'execution-status status-running';
    }
  }

  function showError(message) {
    showExecutionStatus(`Error: ${message}`, 0);
    setTimeout(() => {
      executionStatus.style.display = 'none';
    }, 5000);
  }

  async function loadProviderStatus() {
    try {
      const response = await fetch('http://localhost:8000/providers/status');
      if (response.ok) {
        const data = await response.json();
        updateProviderList(data.providers || {});
      } else {
        updateProviderList({});
      }
    } catch (error) {
      console.error('Failed to load provider status:', error);
      updateProviderList({});
    }
  }

  function updateProviderList(providers) {
    providerList.innerHTML = '';
    
    const providerNames = Object.keys(providers);
    if (providerNames.length === 0) {
      providerList.innerHTML = '<div class="provider-item"><span class="provider-name">No providers available</span></div>';
      return;
    }

    providerNames.forEach(name => {
      const provider = providers[name];
      const item = document.createElement('div');
      item.className = 'provider-item';
      
      const statusClass = provider.status === 'active' ? 'active' : '';
      item.innerHTML = `
        <span class="provider-name">${name}</span>
        <span class="provider-status ${statusClass}">${provider.status || 'unknown'}</span>
      `;
      
      providerList.appendChild(item);
    });
  }

  // Additional event handlers
  function handleCreateWorkflow() {
    chrome.tabs.create({ url: 'http://localhost:3000/workflows/create' });
  }

  function handleLoadTemplate() {
    chrome.tabs.create({ url: 'http://localhost:3000/workflows/templates' });
  }

  function handleStopExecution() {
    // Implementation for stopping workflow execution
    showExecutionStatus('Execution stopped', 0);
  }

  async function handleSaveSettings() {
    try {
      await chrome.storage.sync.set({
        enableWorkflow: enableWorkflow.checked,
        enableCapture: enableCapture.checked,
        selectedWorkflow: workflowSelect.value,
        activationMode: currentMode
      });
      
      // Show temporary success message
      const originalText = saveSettings.textContent;
      saveSettings.textContent = 'Saved!';
      saveSettings.style.background = '#10b981';
      
      setTimeout(() => {
        saveSettings.textContent = originalText;
        saveSettings.style.background = '';
      }, 1500);
      
    } catch (error) {
      console.error('Failed to save settings:', error);
      showError('Failed to save settings');
    }
  }

  async function handleResetSettings() {
    try {
      await chrome.storage.sync.clear();
      
      // Reset UI to defaults
      enableWorkflow.checked = true;
      enableCapture.checked = false;
      workflowSelect.value = '';
      currentMode = 'website';
      updateModeUI();
      updateInputPreview();
      
      // Show temporary success message
      const originalText = resetSettings.textContent;
      resetSettings.textContent = 'Reset!';
      resetSettings.style.background = '#10b981';
      
      setTimeout(() => {
        resetSettings.textContent = originalText;
        resetSettings.style.background = '';
      }, 1500);
      
    } catch (error) {
      console.error('Failed to reset settings:', error);
      showError('Failed to reset settings');
    }
  }

  function handleToggleWorkflow() {
    chrome.storage.sync.set({ enableWorkflow: enableWorkflow.checked });
  }

  function handleToggleCapture() {
    chrome.storage.sync.set({ enableCapture: enableCapture.checked });
  }
});