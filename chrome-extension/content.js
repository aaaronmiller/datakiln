// Detect site
const hostname = window.location.hostname;
let site = '';
if (hostname.includes('chat.openai.com')) site = 'chatgpt';
else if (hostname.includes('gemini.google.com')) site = 'gemini';
else if (hostname.includes('claude.ai')) site = 'claude';

if (!site) return; // Not a supported site

// Load settings
chrome.storage.sync.get(['enableCapture', 'sites', 'userId'], function(result) {
  const enableCapture = result.enableCapture || false;
  const sites = result.sites || [];
  let userId = result.userId;

  if (!enableCapture || !sites.includes(site)) return;

  if (!userId) {
    userId = generateUUID();
    chrome.storage.sync.set({userId: userId});
  }

  // Define selectors (placeholders, may need adjustment)
  const selectors = {
    chatgpt: {
      container: '[data-testid="conversation-turn"]',
      user: '[data-message-author-role="user"]',
      assistant: '[data-message-author-role="assistant"]'
    },
    gemini: {
      container: '.message',
      user: '.user-message',
      assistant: '.model-message'
    },
    claude: {
      container: '.message',
      user: '.user-message',
      assistant: '.assistant-message'
    }
  };

  const siteSelectors = selectors[site];

  // Function to capture messages
  function captureMessages() {
    const messages = [];
    const containers = document.querySelectorAll(siteSelectors.container);
    containers.forEach(container => {
      const userMsg = container.querySelector(siteSelectors.user)?.textContent?.trim();
      const aiMsg = container.querySelector(siteSelectors.assistant)?.textContent?.trim();
      if (userMsg) messages.push({role: 'user', content: userMsg});
      if (aiMsg) messages.push({role: 'assistant', content: aiMsg});
    });

    if (messages.length > 0) {
      const chatData = {
        site: site,
        userId: userId,
        timestamp: new Date().toISOString(),
        model: site, // Placeholder
        messages: messages
      };
      chrome.runtime.sendMessage({action: 'captureChat', data: chatData});
    }
  }

  // Observe changes
  const observer = new MutationObserver(captureMessages);
  observer.observe(document.body, {childList: true, subtree: true});

  // Initial capture
  setTimeout(captureMessages, 2000);
});

// Generate UUID
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}