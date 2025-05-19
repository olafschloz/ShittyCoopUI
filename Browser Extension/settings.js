document.addEventListener('DOMContentLoaded', function() {
  const apiKeyInput = document.getElementById('apiKey');
  const saveButton = document.getElementById('saveButton');
  const statusDiv = document.getElementById('status');

  // Load saved API key
  chrome.storage.sync.get('apiKey', function(data) {
    if (data.apiKey) {
      apiKeyInput.value = data.apiKey;
    }
  });

  // Save API key
  saveButton.addEventListener('click', async function() {
    const apiKey = apiKeyInput.value.trim();
    
    if (!apiKey) {
      showStatus('Please enter an API key', 'error');
      return;
    }

    try {
      // Save API key
      await chrome.storage.sync.set({ apiKey: apiKey });
      showStatus('Settings saved successfully!', 'success');
    } catch (error) {
      showStatus('Error saving settings: ' + error.message, 'error');
    }
  });

  function showStatus(message, type) {
    statusDiv.textContent = message;
    statusDiv.className = `status ${type}`;
    statusDiv.style.display = 'block';
    
    // Hide status after 3 seconds
    setTimeout(() => {
      statusDiv.style.display = 'none';
    }, 3000);
  }
}); 