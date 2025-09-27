// DataKiln Content Script - Enhanced Chat Capture and Workflow Integration
class DataKilnContentScript {
  constructor() {
    this.hostname = window.location.hostname;
    this.site = this.detectSite();
    this.userId = null;
    this.settings = {};
    this.lastCapturedMessages = [];
    this.captureInterval = null;
    
    if (this.site) {
      this.init();
    }
  }

  detectSite() {
    if (this.hostname.includes('chat.openai.com')) return 'chatgpt';
    if (this.hostname.includes('gemini.google.com')) return 'gemini';
    if (this.hostname.includes('claude.ai')) return 'claude';
    return null;
  }

  async init() {
    try {
      await this.loadSettings();
      
      if (!this.settings.enableCapture) return;
      
      await this.setupUserId();
      this.setupSelectors();
      this.setupChatCapture();
      this.setupWorkflowIntegration();
      this.injectUI();
      
      console.log(`DataKiln content script initialized for ${this.site}`);
      
    } catch (error) {
      console.error('DataKiln content script initialization failed:', error);
    }
  }

  async loadSettings() {
    return new Promise((resolve) => {
      chrome.storage.sync.get([
        'enableCapture', 
        'enableWorkflow',
        'sites', 
        'userId',
        'autoAnalyze'
      ], (result) => {
        this.settings = {
          enableCapture: result.enableCapture || false,
          enableWorkflow: result.enableWorkflow !== false,
          sites: result.sites || ['chatgpt', 'gemini', 'claude'],
          userId: result.userId,
          autoAnalyze: result.autoAnalyze || false
        };
        resolve();
      });
    });
  }

  async setupUserId() {
    if (!this.settings.userId) {
      this.userId = this.generateUUID();
      chrome.storage.sync.set({ userId: this.userId });
    } else {
      this.userId = this.settings.userId;
    }
  }

  setupSelectors() {
    // Enhanced selectors with better accuracy
    this.selectors = {
      chatgpt: {
        container: '[data-testid="conversation-turn"], .group',
        user: '[data-message-author-role="user"], .whitespace-pre-wrap:not(.markdown)',
        assistant: '[data-message-author-role="assistant"], .markdown',
        newMessage: '[data-testid="conversation-turn"]:last-child',
        inputArea: '#prompt-textarea, textarea[placeholder*="message"]'
      },
      gemini: {
        container: '.conversation-container .message, [data-test-id="message"]',
        user: '.user-message, [data-test-id="user-message"]',
        assistant: '.model-message, [data-test-id="model-message"]',
        newMessage: '.message:last-child',
        inputArea: '.ql-editor, textarea[placeholder*="Enter"]'
      },
      claude: {
        container: '.message, [data-testid="message"]',
        user: '.user-message, [data-testid="user-message"]',
        assistant: '.assistant-message, [data-testid="assistant-message"]',
        newMessage: '.message:last-child',
        inputArea: '.ProseMirror, textarea[placeholder*="Talk"]'
      }
    };
  }

  setupChatCapture() {
    if (!this.settings.sites.includes(this.site)) return;

    // Set up mutation observer for real-time capture
    this.observer = new MutationObserver((mutations) => {
      this.handleMutations(mutations);
    });

    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true
    });

    // Initial capture after page load
    setTimeout(() => this.captureMessages(), 3000);

    // Periodic capture as backup
    this.captureInterval = setInterval(() => {
      this.captureMessages();
    }, 30000); // Every 30 seconds
  }

  handleMutations(mutations) {
    let shouldCapture = false;
    
    mutations.forEach(mutation => {
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const siteSelectors = this.selectors[this.site];
            if (node.matches && (
              node.matches(siteSelectors.container) ||
              node.querySelector(siteSelectors.container)
            )) {
              shouldCapture = true;
            }
          }
        });
      }
    });

    if (shouldCapture) {
      // Debounce capture to avoid excessive calls
      clearTimeout(this.captureTimeout);
      this.captureTimeout = setTimeout(() => {
        this.captureMessages();
      }, 1000);
    }
  }

  captureMessages() {
    try {
      const siteSelectors = this.selectors[this.site];
      const messages = [];
      
      // Get all message containers
      const containers = document.querySelectorAll(siteSelectors.container);
      
      containers.forEach((container, index) => {
        const userElement = container.querySelector(siteSelectors.user);
        const assistantElement = container.querySelector(siteSelectors.assistant);
        
        if (userElement) {
          const content = this.extractTextContent(userElement);
          if (content && content.length > 0) {
            messages.push({
              role: 'user',
              content: content,
              timestamp: new Date().toISOString(),
              index: index
            });
          }
        }
        
        if (assistantElement) {
          const content = this.extractTextContent(assistantElement);
          if (content && content.length > 0) {
            messages.push({
              role: 'assistant',
              content: content,
              timestamp: new Date().toISOString(),
              index: index
            });
          }
        }
      });

      // Only send if messages have changed
      if (this.hasMessagesChanged(messages)) {
        this.lastCapturedMessages = messages;
        
        const chatData = {
          site: this.site,
          userId: this.userId,
          timestamp: new Date().toISOString(),
          url: window.location.href,
          title: document.title,
          model: this.detectModel(),
          messages: messages,
          messageCount: messages.length
        };

        // Send to background script
        chrome.runtime.sendMessage({
          type: 'captureChat',
          data: chatData
        });

        // Auto-analyze if enabled
        if (this.settings.autoAnalyze && messages.length > 0) {
          this.triggerAutoAnalysis(chatData);
        }
      }
      
    } catch (error) {
      console.error('Message capture failed:', error);
    }
  }

  extractTextContent(element) {
    if (!element) return '';
    
    // Handle different content structures
    let content = '';
    
    // Try to get clean text content
    if (element.textContent) {
      content = element.textContent.trim();
    }
    
    // Handle code blocks and formatted content
    const codeBlocks = element.querySelectorAll('code, pre');
    codeBlocks.forEach(block => {
      if (block.textContent) {
        content += '\n```\n' + block.textContent + '\n```\n';
      }
    });
    
    return content;
  }

  hasMessagesChanged(newMessages) {
    if (newMessages.length !== this.lastCapturedMessages.length) {
      return true;
    }
    
    for (let i = 0; i < newMessages.length; i++) {
      if (newMessages[i].content !== this.lastCapturedMessages[i]?.content) {
        return true;
      }
    }
    
    return false;
  }

  detectModel() {
    // Try to detect the specific model being used
    switch (this.site) {
      case 'chatgpt':
        // Look for model indicators in the UI
        const modelElement = document.querySelector('[data-testid="model-switcher"], .model-name');
        if (modelElement) {
          return modelElement.textContent.trim();
        }
        return 'ChatGPT';
        
      case 'gemini':
        return 'Gemini';
        
      case 'claude':
        // Look for Claude model version
        const claudeModel = document.querySelector('.model-name, [data-testid="model"]');
        if (claudeModel) {
          return claudeModel.textContent.trim();
        }
        return 'Claude';
        
      default:
        return this.site;
    }
  }

  setupWorkflowIntegration() {
    if (!this.settings.enableWorkflow) return;
    
    // Add keyboard shortcuts for quick workflow execution
    document.addEventListener('keydown', (event) => {
      // Ctrl+Shift+D for deep research
      if (event.ctrlKey && event.shiftKey && event.key === 'D') {
        event.preventDefault();
        this.executeQuickWorkflow('deep-research');
      }
      
      // Ctrl+Shift+A for text analysis
      if (event.ctrlKey && event.shiftKey && event.key === 'A') {
        event.preventDefault();
        this.executeQuickWorkflow('text-analysis');
      }
    });
  }

  async executeQuickWorkflow(workflowId) {
    try {
      // Get selected text or last AI response
      let content = window.getSelection().toString();
      
      if (!content && this.lastCapturedMessages.length > 0) {
        const lastAssistantMessage = this.lastCapturedMessages
          .filter(m => m.role === 'assistant')
          .pop();
        content = lastAssistantMessage?.content || '';
      }
      
      if (!content) {
        this.showNotification('No content selected for workflow execution', 'warning');
        return;
      }
      
      // Execute workflow via background script
      const response = await chrome.runtime.sendMessage({
        type: 'executeWorkflow',
        data: {
          workflow_id: workflowId,
          input_data: {
            type: 'text',
            content: content,
            source: this.site
          },
          activation_source: 'keyboard_shortcut'
        }
      });
      
      if (response.success) {
        this.showNotification(`${workflowId} workflow started!`, 'success');
      } else {
        this.showNotification(`Failed to start workflow: ${response.error}`, 'error');
      }
      
    } catch (error) {
      console.error('Quick workflow execution failed:', error);
      this.showNotification('Workflow execution failed', 'error');
    }
  }

  async triggerAutoAnalysis(chatData) {
    try {
      // Only analyze if there are recent assistant messages
      const recentAssistantMessages = chatData.messages
        .filter(m => m.role === 'assistant')
        .slice(-2); // Last 2 assistant messages
      
      if (recentAssistantMessages.length === 0) return;
      
      // Execute chat capture analysis workflow
      await chrome.runtime.sendMessage({
        type: 'executeWorkflow',
        data: {
          workflow_id: 'chat-capture-analysis',
          input_data: {
            type: 'chat',
            messages: recentAssistantMessages,
            site: this.site,
            context: chatData
          },
          activation_source: 'auto_analysis'
        }
      });
      
    } catch (error) {
      console.error('Auto-analysis failed:', error);
    }
  }

  injectUI() {
    // Inject a small floating button for quick access
    const floatingButton = document.createElement('div');
    floatingButton.id = 'datakiln-floating-button';
    floatingButton.innerHTML = '⚡';
    floatingButton.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      width: 40px;
      height: 40px;
      background: #3b82f6;
      color: white;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      z-index: 10000;
      font-size: 18px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.2);
      transition: all 0.3s ease;
    `;
    
    floatingButton.addEventListener('click', () => {
      this.showQuickMenu();
    });
    
    floatingButton.addEventListener('mouseenter', () => {
      floatingButton.style.transform = 'scale(1.1)';
    });
    
    floatingButton.addEventListener('mouseleave', () => {
      floatingButton.style.transform = 'scale(1)';
    });
    
    document.body.appendChild(floatingButton);
  }

  showQuickMenu() {
    // Create a quick menu for workflow selection
    const menu = document.createElement('div');
    menu.id = 'datakiln-quick-menu';
    menu.style.cssText = `
      position: fixed;
      top: 70px;
      right: 20px;
      background: white;
      border-radius: 8px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.15);
      z-index: 10001;
      min-width: 200px;
      padding: 8px;
    `;
    
    const workflows = [
      { id: 'deep-research', name: '🔍 Deep Research', key: 'Ctrl+Shift+D' },
      { id: 'text-analysis', name: '📝 Text Analysis', key: 'Ctrl+Shift+A' },
      { id: 'chat-capture-analysis', name: '💬 Analyze Chat', key: '' }
    ];
    
    workflows.forEach(workflow => {
      const item = document.createElement('div');
      item.style.cssText = `
        padding: 8px 12px;
        cursor: pointer;
        border-radius: 4px;
        font-size: 14px;
        display: flex;
        justify-content: space-between;
        align-items: center;
      `;
      
      item.innerHTML = `
        <span>${workflow.name}</span>
        <small style="color: #666;">${workflow.key}</small>
      `;
      
      item.addEventListener('mouseenter', () => {
        item.style.background = '#f3f4f6';
      });
      
      item.addEventListener('mouseleave', () => {
        item.style.background = 'transparent';
      });
      
      item.addEventListener('click', () => {
        this.executeQuickWorkflow(workflow.id);
        document.body.removeChild(menu);
      });
      
      menu.appendChild(item);
    });
    
    // Close menu when clicking outside
    const closeMenu = (event) => {
      if (!menu.contains(event.target)) {
        document.body.removeChild(menu);
        document.removeEventListener('click', closeMenu);
      }
    };
    
    setTimeout(() => {
      document.addEventListener('click', closeMenu);
    }, 100);
    
    document.body.appendChild(menu);
  }

  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
      color: white;
      padding: 12px 20px;
      border-radius: 6px;
      z-index: 10002;
      font-size: 14px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    `;
    
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      if (document.body.contains(notification)) {
        document.body.removeChild(notification);
      }
    }, 3000);
  }

  generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  // Cleanup on page unload
  cleanup() {
    if (this.observer) {
      this.observer.disconnect();
    }
    if (this.captureInterval) {
      clearInterval(this.captureInterval);
    }
    if (this.captureTimeout) {
      clearTimeout(this.captureTimeout);
    }
  }
}

// Initialize content script
const dataKilnContent = new DataKilnContentScript();

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  dataKilnContent.cleanup();
});