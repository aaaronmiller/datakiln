chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'captureChat') {
    fetch('http://localhost:8000/chat-logs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(message.data)
    })
    .then(response => response.json())
    .then(data => {
      console.log('Data sent to backend:', data);
    })
    .catch(error => {
      console.error('Error sending data to backend:', error);
    });
  }

  // Handle workflow execution requests
  if (message.action === 'executeWorkflow') {
    fetch('http://localhost:8000/workflow/execute', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        workflow: message.workflow,
        execution_options: message.options || {}
      })
    })
    .then(response => response.json())
    .then(result => {
      console.log('Workflow execution result:', result);

      // Send notification to user
      if (result.status === 'completed') {
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'icon.png',
          title: 'Workflow Completed',
          message: `Workflow executed successfully in ${result.execution_time}s`
        });
      } else if (result.status === 'error') {
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'icon.png',
          title: 'Workflow Failed',
          message: result.error || 'Unknown error occurred'
        });
      }

      sendResponse(result);
    })
    .catch(error => {
      console.error('Workflow execution failed:', error);
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icon.png',
        title: 'Workflow Error',
        message: 'Failed to execute workflow'
      });
      sendResponse({ success: false, error: error.message });
    });

    return true; // Keep message channel open for async response
  }

  // Handle workflow validation requests
  if (message.action === 'validateWorkflow') {
    fetch('http://localhost:8000/workflow/validate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ workflow: message.workflow })
    })
    .then(response => response.json())
    .then(result => {
      sendResponse(result);
    })
    .catch(error => {
      console.error('Workflow validation failed:', error);
      sendResponse({ valid: false, error: error.message });
    });

    return true;
  }

  // Handle provider status requests
  if (message.action === 'getProviderStatus') {
    fetch('http://localhost:8000/providers/status')
    .then(response => response.json())
    .then(result => {
      sendResponse(result);
    })
    .catch(error => {
      console.error('Failed to get provider status:', error);
      sendResponse({ error: error.message });
    });

    return true;
  }

  // Handle YouTube transcription requests
  if (message.action === 'transcribeYouTube') {
    // This would integrate with the YouTube transcription service
    // For now, just log the request
    console.log('YouTube transcription requested for:', message.videoId);
    sendResponse({ status: 'received', videoId: message.videoId });
  }
});

// Handle tab updates to detect AI chat interfaces
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    const url = tab.url;

    // Check if we're on a supported AI chat site
    if (url.includes('chat.openai.com') ||
        url.includes('gemini.google.com') ||
        url.includes('claude.ai')) {

      // Inject workflow trigger button
      chrome.scripting.executeScript({
        target: { tabId: tabId },
        func: injectWorkflowButton,
        args: [tab.url]
      });
    }

    // Check if we're on YouTube
    if (url.includes('youtube.com/watch')) {
      chrome.scripting.executeScript({
        target: { tabId: tabId },
        files: ['youtube-content.js']
      });
    }
  }
});

// Function to inject workflow trigger button
function injectWorkflowButton(url) {
  // This function runs in the context of the AI chat page
  const hostname = window.location.hostname;
  let site = '';
  if (hostname.includes('chat.openai.com')) site = 'chatgpt';
  else if (hostname.includes('gemini.google.com')) site = 'gemini';
  else if (hostname.includes('claude.ai')) site = 'claude';

  if (!site) return;

  // Create floating workflow button
  const workflowButton = document.createElement('div');
  workflowButton.id = 'datakiln-workflow-button';
  workflowButton.innerHTML = `
    <div style="
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 10000;
      background: #3b82f6;
      color: white;
      padding: 12px 16px;
      border-radius: 8px;
      cursor: pointer;
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
      font-size: 14px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      transition: all 0.2s ease;
    " onmouseover="this.style.background='#2563eb'" onmouseout="this.style.background='#3b82f6'">
      ⚡ Workflow
    </div>
  `;

  workflowButton.onclick = () => {
    // Send message to background script to open workflow popup
    chrome.runtime.sendMessage({
      action: 'showWorkflowPopup',
      site: site,
      url: url
    });
  };

  // Add to page
  document.body.appendChild(workflowButton);
}
