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
});