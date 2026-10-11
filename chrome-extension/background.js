// DataKiln Chrome Extension Background Script
// Handles workflow execution, API communication, and extension lifecycle

class DataKilnBackground {
  constructor() {
    this.apiBaseUrl = 'http://localhost:8000';
    this.websocketUrl = 'ws://localhost:8000';
    this.activeExecutions = new Map();
    this.websocketConnections = new Map();
    this.settings = {
      enableWorkflow: true,
      enableCapture: false,
      selectedWorkflow: '',
      activationMode: 'website'
    };

    this.init();
  }

  init() {
    // Load settings
    this.loadSettings();

    // Set up event listeners
    this.setupEventListeners();

    // Initialize context menus
    this.setupContextMenus();

    // Initialize WebSocket connection
    this.initializeWebSocket();

    console.log('DataKiln Background Script initialized');
  }

  async loadSettings() {
    try {
      const result = await chrome.storage.sync.get([
        'enableWorkflow', 
        'enableCapture', 
        'selectedWorkflow',
        'activationMode'
      ]);
      
      this.settings = {
        enableWorkflow: result.enableWorkflow !== false,
        enableCapture: result.enableCapture || false,
        selectedWorkflow: result.selectedWorkflow || '',
        activationMode: result.activationMode || 'website'
      };
      
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  }

  setupEventListeners() {
    // Handle extension installation
    chrome.runtime.onInstalled.addListener((details) => {
      this.handleInstallation(details);
    });

    // Handle messages from popup and content scripts
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
      return true; // Keep message channel open for async responses
    });

    // Handle tab updates for workflow triggers
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      this.handleTabUpdate(tabId, changeInfo, tab);
    });

    // Handle storage changes
    chrome.storage.onChanged.addListener((changes, namespace) => {
      this.handleStorageChange(changes, namespace);
    });

    // Handle context menu clicks
    chrome.contextMenus.onClicked.addListener((info, tab) => {
      this.handleContextMenuClick(info, tab);
    });
  }

  setupContextMenus() {
    // Remove existing context menus
    chrome.contextMenus.removeAll(() => {
      // Add workflow execution context menu
      chrome.contextMenus.create({
        id: 'datakiln-execute-workflow',
        title: 'Execute DataKiln Workflow',
        contexts: ['page', 'selection', 'link']
      });

      // Add submenu for different workflow types
      chrome.contextMenus.create({
        id: 'datakiln-youtube-analysis',
        parentId: 'datakiln-execute-workflow',
        title: '🎥 YouTube Analysis',
        contexts: ['page', 'link']
      });

      chrome.contextMenus.create({
        id: 'datakiln-deep-research',
        parentId: 'datakiln-execute-workflow',
        title: '🔍 Deep Research',
        contexts: ['page', 'selection']
      });

      chrome.contextMenus.create({
        id: 'datakiln-website-summary',
        parentId: 'datakiln-execute-workflow',
        title: '📄 Website Summary',
        contexts: ['page', 'link']
      });

      chrome.contextMenus.create({
        id: 'datakiln-text-analysis',
        parentId: 'datakiln-execute-workflow',
        title: '📝 Text Analysis',
        contexts: ['selection']
      });
    });
  }

  handleInstallation(details) {
    if (details.reason === 'install') {
      // Show welcome notification
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icon48.png',
        title: 'DataKiln Assistant Installed',
        message: 'Click the extension icon to start using workflow automation!'
      });

      // Open welcome page
      chrome.tabs.create({
        url: 'http://localhost:3000/welcome'
      });
    }
  }

  async handleMessage(message, sender, sendResponse) {
    try {
      switch (message.type) {
        case 'executeWorkflow':
          const result = await this.executeWorkflow(message.data);
          sendResponse({ success: true, result });
          break;

        case 'getWorkflows':
          const workflows = await this.getAvailableWorkflows();
          sendResponse({ success: true, workflows });
          break;

        case 'getExecutionStatus':
          const status = await this.getExecutionStatus(message.taskId);
          sendResponse({ success: true, status });
          break;

        case 'stopExecution':
          const stopped = await this.stopExecution(message.taskId);
          sendResponse({ success: true, stopped });
          break;

        case 'captureChat':
          await this.captureChat(message.data);
          sendResponse({ success: true });
          break;

        default:
          sendResponse({ success: false, error: 'Unknown message type' });
      }
    } catch (error) {
      console.error('Message handling error:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  handleTabUpdate(tabId, changeInfo, tab) {
    // Auto-trigger workflows based on URL patterns if enabled
    if (this.settings.enableWorkflow && changeInfo.status === 'complete') {
      this.checkAutoTriggers(tab);
    }
  }

  handleStorageChange(changes, namespace) {
    if (namespace === 'sync') {
      // Update local settings
      for (const key in changes) {
        if (key in this.settings) {
          this.settings[key] = changes[key].newValue;
        }
      }
    }
  }

  async handleContextMenuClick(info, tab) {
    try {
      let workflowId = '';
      let inputData = {};

      // Determine workflow and input based on context menu selection
      switch (info.menuItemId) {
        case 'datakiln-youtube-analysis':
          workflowId = 'youtube-analysis';
          inputData = {
            type: 'url',
            url: info.linkUrl || tab.url,
            title: tab.title
          };
          break;

        case 'datakiln-deep-research':
          workflowId = 'deep-research';
          inputData = {
            type: info.selectionText ? 'text' : 'url',
            content: info.selectionText,
            url: info.linkUrl || tab.url,
            title: tab.title
          };
          break;

        case 'datakiln-website-summary':
          workflowId = 'website-summary';
          inputData = {
            type: 'url',
            url: info.linkUrl || tab.url,
            title: tab.title
          };
          break;

        case 'datakiln-text-analysis':
          workflowId = 'text-analysis';
          inputData = {
            type: 'text',
            content: info.selectionText
          };
          break;

        default:
          return;
      }

      // Execute workflow
      const result = await this.executeWorkflow({
        workflow_id: workflowId,
        input_data: inputData,
        activation_source: 'context_menu'
      });

      // Show notification
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icon48.png',
        title: 'DataKiln Workflow Started',
        message: `${this.getWorkflowName(workflowId)} is now running...`
      });

    } catch (error) {
      console.error('Context menu execution error:', error);
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icon48.png',
        title: 'DataKiln Error',
        message: `Failed to execute workflow: ${error.message}`
      });
    }
  }

  async executeWorkflow(data) {
    try {
      // Use WebSocket-based execution for real-time updates
      const executionId = `ext_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Send execution request via WebSocket
      this.sendWebSocketMessage({
        type: 'start_workflow_execution',
        data: {
          execution_id: executionId,
          workflow_data: data,
          source: 'extension'
        }
      });

      // Track active execution
      this.activeExecutions.set(executionId, {
        workflowId: data.workflow_id,
        startTime: Date.now(),
        status: 'starting'
      });

      // Connect to execution-specific WebSocket for detailed updates
      this.connectToExecutionWebSocket(executionId);

      return {
        task_id: executionId,
        status: 'started',
        message: 'Workflow execution started via WebSocket'
      };

    } catch (error) {
      console.error('Workflow execution error:', error);
      throw error;
    }
  }

  connectToExecutionWebSocket(executionId) {
    try {
      const ws = new WebSocket(`${this.websocketUrl}/ws/executions/${executionId}`);

      ws.onopen = () => {
        console.log(`Connected to execution WebSocket: ${executionId}`);
        this.websocketConnections.set(executionId, ws);
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          this.handleExecutionWebSocketMessage(executionId, message);
        } catch (error) {
          console.error('Failed to parse execution WebSocket message:', error);
        }
      };

      ws.onclose = () => {
        console.log(`Execution WebSocket closed: ${executionId}`);
        this.websocketConnections.delete(executionId);
      };

      ws.onerror = (error) => {
        console.error(`Execution WebSocket error for ${executionId}:`, error);
      };

    } catch (error) {
      console.error(`Failed to connect to execution WebSocket for ${executionId}:`, error);
    }
  }

  handleExecutionWebSocketMessage(executionId, message) {
    const { type, data } = message;

    // Update execution status
    const execution = this.activeExecutions.get(executionId);
    if (execution) {
      switch (type) {
        case 'execution_started':
          execution.status = 'running';
          break;
        case 'execution_completed':
          execution.status = 'completed';
          execution.endTime = Date.now();
          break;
        case 'execution_failed':
          execution.status = 'failed';
          execution.endTime = Date.now();
          execution.error = data.error;
          break;
      }
    }

    // Forward to general WebSocket handler
    this.handleWebSocketMessage(message);
  }

  async getAvailableWorkflows() {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/v1/workflows/list`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch workflows');
      }

      const data = await response.json();
      return data.workflows || [];

    } catch (error) {
      console.error('Failed to get workflows:', error);
      // Return default workflows as fallback
      return this.getDefaultWorkflows();
    }
  }

  async getExecutionStatus(taskId) {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/v1/workflows/status/${taskId}`);
      
      if (!response.ok) {
        throw new Error('Failed to get execution status');
      }

      return await response.json();

    } catch (error) {
      console.error('Failed to get execution status:', error);
      return { status: 'unknown', error: error.message };
    }
  }

  async stopExecution(taskId) {
    try {
      // Remove from active executions
      this.activeExecutions.delete(taskId);
      
      // In a real implementation, this would call an API to stop the execution
      return { stopped: true, taskId };

    } catch (error) {
      console.error('Failed to stop execution:', error);
      return { stopped: false, error: error.message };
    }
  }

  async captureChat(data) {
    try {
      if (!this.settings.enableCapture) {
        return;
      }

      // Store chat capture data
      const captures = await this.getChatCaptures();
      captures.push({
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        site: data.site,
        content: data.content,
        processed: false
      });

      await chrome.storage.local.set({ chatCaptures: captures });

      console.log('Chat captured:', data.site);

    } catch (error) {
      console.error('Chat capture error:', error);
    }
  }

  async getChatCaptures() {
    try {
      const result = await chrome.storage.local.get(['chatCaptures']);
      return result.chatCaptures || [];
    } catch (error) {
      console.error('Failed to get chat captures:', error);
      return [];
    }
  }

  checkAutoTriggers(tab) {
    // Check for YouTube URLs
    if (tab.url.includes('youtube.com/watch') && this.settings.selectedWorkflow === 'youtube-analysis') {
      // Auto-trigger YouTube analysis if enabled
      this.executeWorkflow({
        workflow_id: 'youtube-analysis',
        input_data: {
          type: 'url',
          url: tab.url,
          title: tab.title
        },
        activation_source: 'auto_trigger'
      });
    }
  }

  getDefaultWorkflows() {
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

  getWorkflowName(workflowId) {
    const workflows = this.getDefaultWorkflows();
    const workflow = workflows.find(w => w.id === workflowId);
    return workflow ? workflow.name : workflowId;
  }

  initializeWebSocket() {
    try {
      this.connectWebSocket();
    } catch (error) {
      console.error('Failed to initialize WebSocket:', error);
      // Retry connection after delay
      setTimeout(() => this.initializeWebSocket(), 5000);
    }
  }

  connectWebSocket() {
    try {
      this.websocket = new WebSocket(`${this.websocketUrl}/ws/dashboard`);

      this.websocket.onopen = (event) => {
        console.log('WebSocket connected to DataKiln backend');
        this.onWebSocketConnected();
      };

      this.websocket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          this.handleWebSocketMessage(message);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      this.websocket.onclose = (event) => {
        console.log('WebSocket disconnected, attempting reconnection...');
        this.onWebSocketDisconnected();
        // Attempt reconnection after delay
        setTimeout(() => this.connectWebSocket(), 3000);
      };

      this.websocket.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      throw error;
    }
  }

  onWebSocketConnected() {
    // Send extension identification
    this.sendWebSocketMessage({
      type: 'extension_connected',
      data: {
        extension_version: '2.0',
        user_agent: navigator.userAgent,
        connected_at: new Date().toISOString()
      }
    });
  }

  onWebSocketDisconnected() {
    // Clean up any execution-specific connections
    this.websocketConnections.clear();
  }

  sendWebSocketMessage(message) {
    if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
      this.websocket.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket not connected, message not sent:', message);
    }
  }

  handleWebSocketMessage(message) {
    const { type, data } = message;

    switch (type) {
      case 'execution_started':
        this.handleExecutionStarted(data);
        break;
      case 'step_started':
        this.handleStepStarted(data);
        break;
      case 'step_succeeded':
        this.handleStepSucceeded(data);
        break;
      case 'step_failed':
        this.handleStepFailed(data);
        break;
      case 'execution_completed':
        this.handleExecutionCompleted(data);
        break;
      case 'data_handoff':
        this.handleDataHandoff(data);
        break;
      case 'node_waiting':
        this.handleNodeWaiting(data);
        break;
      case 'extension_workflow_completed':
        this.handleExtensionWorkflowCompleted(data);
        break;
      default:
        console.log('Unhandled WebSocket message type:', type, data);
    }
  }

  handleExecutionStarted(data) {
    // Update active execution tracking
    this.activeExecutions.set(data.execution_id, {
      workflowId: data.workflow_id,
      startTime: Date.now(),
      status: 'running'
    });

    // Notify user
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icon48.png',
      title: 'DataKiln Workflow Started',
      message: `Execution ${data.execution_id} has started`
    });
  }

  handleStepStarted(data) {
    // Update execution progress
    const execution = this.activeExecutions.get(data.execution_id);
    if (execution) {
      execution.currentStep = data.node_id;
    }
  }

  handleStepSucceeded(data) {
    console.log(`Step succeeded: ${data.node_id} (${data.node_type})`);
  }

  handleStepFailed(data) {
    console.error(`Step failed: ${data.node_id}`, data.error);

    // Show error notification
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icon48.png',
      title: 'DataKiln Step Failed',
      message: `Step ${data.node_id} failed: ${data.error.substring(0, 100)}...`
    });
  }

  handleExecutionCompleted(data) {
    // Update execution status
    const execution = this.activeExecutions.get(data.execution_id);
    if (execution) {
      execution.status = 'completed';
      execution.endTime = Date.now();
    }

    // Show completion notification
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icon48.png',
      title: 'DataKiln Workflow Completed',
      message: `Execution ${data.execution_id} completed successfully`
    });
  }

  handleDataHandoff(data) {
    console.log(`Data handoff: ${data.from_node} -> ${data.to_node}`);
  }

  handleNodeWaiting(data) {
    // Handle nodes that are waiting (e.g., for manual approval)
    if (data.wait_type === 'manual_approval') {
      // Show notification for manual approval
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icon48.png',
        title: 'DataKiln Manual Approval Required',
        message: data.message,
        buttons: [
          { title: 'Approve' },
          { title: 'Reject' }
        ],
        requireInteraction: true
      }, (notificationId) => {
        // Store notification ID for approval handling
        this.pendingApprovals = this.pendingApprovals || new Map();
        this.pendingApprovals.set(notificationId, {
          approvalId: data.approval_id,
          executionId: data.execution_id
        });
      });
    }
  }

  handleExtensionWorkflowCompleted(data) {
    const execution = this.activeExecutions.get(data.task_id);
    if (execution) {
      execution.status = data.status;
      execution.result = data;
    }

    // Show completion notification
    const statusEmoji = data.status === 'completed' ? '✅' : data.status === 'failed' ? '❌' : '⚠️';
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icon48.png',
      title: `${statusEmoji} DataKiln Workflow ${data.status}`,
      message: `Workflow ${data.workflow_id} ${data.status}`
    });
  }
}

// Initialize background script
const dataKilnBackground = new DataKilnBackground();
// ════════════════════════════════════════════════════════════════════
// Element Recorder (2026-08-25): pick DOM elements → workflow nodes.
// Self-contained module; coexists with the legacy DataKilnBackground.
// ════════════════════════════════════════════════════════════════════

const RECORDER_API = 'http://localhost:8000';

// Content scripts cannot touch storage.session by default — open it so the
// in-page recorder can persist captured actions (fallback: storage.local).
try {
  chrome.storage.session.setAccessLevel({ accessLevel: 'TRUSTED_AND_UNTRUSTED_CONTEXTS' });
} catch (e) { /* older Chromium */ }

// Shared save path — callable from message handlers AND tests (service-worker
// evaluate exposes top-level function declarations).
async function datakilnSaveCaptured(opts) {
  opts = opts || {};
  let captured = [];
  try {
    const s = await chrome.storage.session.get('datakilnCaptured');
    captured = s.datakilnCaptured || [];
  } catch (e) {}
  if (!captured.length) {
    const l = await chrome.storage.local.get('datakilnCaptured');
    captured = l.datakilnCaptured || [];
  }
  if (!captured.length) return { ok: false, error: 'No captured actions. Click elements with the recorder first.' };

  const host = (() => { try { return new URL(captured[0].url).hostname; } catch (e) { return 'site'; } })();
  const stamp = new Date().toISOString().slice(0, 16).replace(/[T:]/g, '-');

  async function api(method, path, body) {
    const res = await fetch(RECORDER_API + path, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) throw new Error(`${method} ${path} → ${res.status}: ${(await res.text()).slice(0, 200)}`);
    return res.json();
  }

  let workflowId = opts.workflowId || null;
  let nodes = [];
  let edges = [];
  const prefix = workflowId ? 'cap-' + Date.now() + '-' : '';

  if (workflowId) {
    const wf = await api('GET', `/api/v1/workflows/${workflowId}`);
    nodes = wf.nodes || [];
    edges = wf.edges || [];
  }

  const firstUrl = captured[0].url;
  const hasSource = nodes.some(n => n.type === 'dataSource');
  if (!workflowId || !hasSource) {
    nodes.push({
      id: `${prefix}src-url`, name: 'Captured Site', type: 'dataSource',
      inputs: { source_type: 'mock', mock_data: firstUrl },
    });
  }
  const lastExisting = nodes.length ? nodes[nodes.length - 1].id : `${prefix}src-url`;
  let prev = (!workflowId || !hasSource) ? `${prefix}src-url` : lastExisting;

  captured.forEach((cap, i) => {
    const id = `${prefix}dom-${i}`;
    nodes.push({
      id, name: `${cap.action} ${cap.tag}${cap.text ? ': ' + cap.text.slice(0, 20) : ''}`,
      type: 'dom_action',
      inputs: { action: cap.action, selector: cap.selector, value: cap.value || '', url: cap.url },
    });
    edges.push({ id: `${prefix}e-${i}`, source: prev, target: id });
    prev = id;
  });
  const expId = `${prefix}exp`;
  nodes.push({ id: expId, name: 'Save Captured Output', type: 'export', inputs: { format: 'json', path_key: `captured-${host}-${stamp}` } });
  edges.push({ id: `${prefix}e-exp`, source: prev, target: expId });

  let result;
  if (workflowId) {
    // Append: rebuild graph with new nodes wired after previous tail
    result = await api('PUT', `/api/v1/workflows/${workflowId}`, {
      id: workflowId, name: opts.name || 'Workflow + captured nodes',
      nodes, edges,
    });
  } else {
    const name = opts.name || `Captured: ${host} (${captured.length} actions)`;
    result = await api('POST', '/api/v1/workflows', {
      id: `captured-${Date.now()}`, name,
      description: `Recorded from ${host} via DataKiln element recorder`,
      nodes, edges,
      metadata: { createdAt: new Date().toISOString(), version: 1, tags: ['captured', 'recorder'] },
    });
    workflowId = result.id || result.workflow_id;
  }
  try { await chrome.storage.session.remove('datakilnCaptured'); } catch (e) {}
  try { await chrome.storage.local.remove('datakilnCaptured'); } catch (e) {}
  try { chrome.contextMenus.update('datakiln-recorder-save', { title: `Save ${captured.length ? '' : '0 '}actions` }); } catch (e) {}
  return { ok: true, workflow_id: workflowId, nodes_added: captured.length + 2 };
}

function datakilnInjectPicker(tabId, on) {
  chrome.scripting.executeScript(
    { target: { tabId }, files: ['lib/selector-builder.js', 'picker.js'] },
    () => {
      if (chrome.runtime.lastError) {
        console.warn('DataKiln picker injection failed:', chrome.runtime.lastError.message);
        return;
      }
      chrome.tabs.sendMessage(tabId, { type: 'DATAKILN_TOGGLE_PICKER', on: !!on }).catch?.(() => {});
      chrome.tabs.sendMessage(tabId, { type: 'DATAKILN_TOGGLE_PICKER', on: !!on }, () => void chrome.runtime.lastError);
    }
  );
}

function datakilnEnsureBaseMenus() {
  // The legacy DataKilnBackground.setupContextMenus() calls removeAll()
  // asynchronously and can wipe recorder menus created at SW startup —
  // so (re)create the base items here, ignoring duplicate-id errors.
  const items = [
    ['datakiln-recorder-root', 'DataKiln Recorder', null],
    ['datakiln-recorder-start', '🎯 Start/stop element recorder', 'datakiln-recorder-root'],
    ['datakiln-recorder-save', '💾 Save captured actions as new workflow', 'datakiln-recorder-root'],
    ['datakiln-recorder-refresh', '🔄 Refresh workflow list', 'datakiln-recorder-root'],
  ];
  items.forEach(([id, title, parentId]) => {
    chrome.contextMenus.create({ id, title, parentId: parentId || undefined, contexts: ['action'] },
      () => void chrome.runtime.lastError);
  });
}

async function datakilnRefreshMenus() {
  datakilnEnsureBaseMenus();
  await new Promise(r => setTimeout(r, 300));
  try {
    const items = await chrome.contextMenus.getAll();
    items.filter(i => i.id && i.id.startsWith('datakiln-rec-wf:')).forEach(i => chrome.contextMenus.remove(i.id));
    const res = await fetch(RECORDER_API + '/api/v1/workflows');
    if (!res.ok) return;
    const workflows = await res.json();
    workflows.slice(0, 9).forEach(wf => {
      chrome.contextMenus.create({
        id: `datakiln-rec-wf:${wf.id}`,
        parentId: 'datakiln-recorder-root',
        title: `➕ Add captured nodes to: ${wf.name.slice(0, 40)}`,
        contexts: ['action'],
      });
    });
  } catch (e) { /* backend down — menus stay minimal */ }
}

chrome.contextMenus.create({
  id: 'datakiln-recorder-root',
  title: 'DataKiln Recorder',
  contexts: ['action'],
}, () => void chrome.runtime.lastError);
chrome.contextMenus.create({
  id: 'datakiln-recorder-start',
  parentId: 'datakiln-recorder-root',
  title: '🎯 Start/stop element recorder',
  contexts: ['action'],
}, () => void chrome.runtime.lastError);
chrome.contextMenus.create({
  id: 'datakiln-recorder-save',
  parentId: 'datakiln-recorder-root',
  title: '💾 Save captured actions as new workflow',
  contexts: ['action'],
}, () => void chrome.runtime.lastError);
chrome.contextMenus.create({
  id: 'datakiln-recorder-refresh',
  parentId: 'datakiln-recorder-root',
  title: '🔄 Refresh workflow list',
  contexts: ['action'],
}, () => void chrome.runtime.lastError);
setTimeout(datakilnRefreshMenus, 1500);

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (!info.menuItemId.startsWith('datakiln-rec')) return;
  if (info.menuItemId === 'datakiln-recorder-start' && tab?.id) {
    datakilnInjectPicker(tab.id, true);
  } else if (info.menuItemId === 'datakiln-recorder-save') {
    datakilnSaveCaptured({ workflowId: null })
      .then(r => chrome.notifications.create({ type: 'basic', iconUrl: 'icon128.png', title: 'DataKiln', message: r.ok ? `Saved workflow ${r.workflow_id} (+${r.nodes_added} nodes)` : r.error }));
  } else if (info.menuItemId === 'datakiln-recorder-refresh') {
    datakilnRefreshMenus();
  } else if (info.menuItemId.startsWith('datakiln-rec-wf:')) {
    const wfId = info.menuItemId.split(':')[1];
    if (tab?.id) datakilnInjectPicker(tab.id, true);
    datakilnSaveCaptured({ workflowId: wfId })
      .then(r => chrome.notifications.create({ type: 'basic', iconUrl: 'icon128.png', title: 'DataKiln', message: r.ok ? `Added ${r.nodes_added} nodes to workflow ${r.workflow_id}` : r.error }));
  }
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg || typeof msg.type !== 'string' || !msg.type.startsWith('DATAKILN_REC')) return undefined;
  if (msg.type === 'DATAKILN_REC_TOGGLE') {
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      if (!tabs[0]?.id) return sendResponse({ ok: false, error: 'No active tab' });
      datakilnInjectPicker(tabs[0].id, msg.on);
      sendResponse({ ok: true });
    });
    return true;
  }
  if (msg.type === 'DATAKILN_REC_SAVE') {
    datakilnSaveCaptured({ workflowId: msg.workflowId || null, name: msg.name })
      .then(r => {
        sendResponse(r);
        if (r.ok && msg.openEditor) {
          chrome.tabs.create({ url: `http://localhost:3001/#/workflows/${r.workflow_id}/edit` });
        }
      })
      .catch(e => sendResponse({ ok: false, error: String(e) }));
    return true;
  }
  if (msg.type === 'DATAKILN_REC_OPEN_SAVE') {
    chrome.tabs.create({ url: chrome.runtime.getURL('popup.html?save=1') });
    sendResponse({ ok: true });
    return undefined;
  }
  if (msg.type === 'DATAKILN_REC_REFRESH_MENUS') {
    datakilnRefreshMenus().then(() => sendResponse({ ok: true }));
    return true;
  }
  return undefined;
});
