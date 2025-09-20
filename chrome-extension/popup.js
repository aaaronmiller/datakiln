document.addEventListener('DOMContentLoaded', function() {
  const enableCapture = document.getElementById('enableCapture');
  const chatgpt = document.getElementById('chatgpt');
  const gemini = document.getElementById('gemini');
  const claude = document.getElementById('claude');
  const saveButton = document.getElementById('saveSettings');

  // Load settings
  chrome.storage.sync.get(['enableCapture', 'sites'], function(result) {
    enableCapture.checked = result.enableCapture || false;
    const sites = result.sites || ['chatgpt', 'gemini', 'claude'];
    chatgpt.checked = sites.includes('chatgpt');
    gemini.checked = sites.includes('gemini');
    claude.checked = sites.includes('claude');
  });

  // Save settings
  saveButton.addEventListener('click', function() {
    const sites = [];
    if (chatgpt.checked) sites.push('chatgpt');
    if (gemini.checked) sites.push('gemini');
    if (claude.checked) sites.push('claude');
    chrome.storage.sync.set({
      enableCapture: enableCapture.checked,
      sites: sites
    }, function() {
      alert('Settings saved!');
    });
  });
});