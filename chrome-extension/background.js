// DataKiln Chrome Extension - Background Service Worker

// Listen for extension installation
chrome.runtime.onInstalled.addListener(() => {
  console.log("DataKiln extension installed");
  
  // Initialize storage
  chrome.storage.local.set({
    pickerActive: false,
    capturedActions: [],
    workflows: []
  });
});

// Listen for messages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "RUN_WORKFLOW") {
    runWorkflow(message.workflowId, message.data).then(result => {
      sendResponse({ success: true, result });
    }).catch(error => {
      sendResponse({ success: false, error: error.message });
    });
    return true;
  }
});

// Run workflow via API
async function runWorkflow(workflowId, data) {
  const API_BASE = "http://localhost:8000";
  const endpoint = data
    ? API_BASE + "/api/v1/workflows/execute"
    : API_BASE + "/api/v1/workflows/" + workflowId + "/execute";
  
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data || {})
  });
  
  if (\!response.ok) {
    const text = await response.text();
    throw new Error("HTTP " + response.status + ": " + text);
  }
  
  return await response.json();
}

// Badge for active picker mode
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (changes.pickerActive) {
    if (changes.pickerActive.newValue) {
      chrome.action.setBadgeText({ text: "◉" });
      chrome.action.setBadgeBackgroundColor({ color: "#f56565" });
    } else {
      chrome.action.setBadgeText({ text: "" });
    }
  }
  
  if (changes.capturedActions) {
    const count = changes.capturedActions.newValue.length;
    if (count > 0) {
      chrome.action.setBadgeText({ text: count.toString() });
      chrome.action.setBadgeBackgroundColor({ color: "#48bb78" });
    }
  }
});
