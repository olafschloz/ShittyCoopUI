document.addEventListener('DOMContentLoaded', function() {
  const chatContainer = document.getElementById('chat-container');
  const userInput = document.getElementById('user-input');
  const sendButton = document.getElementById('send-button');

  // Check for API key on load
  checkApiKey();

  // Add initial greeting
  addMessage('Hello! I\'m your AI Shopping Assistant. I can help you create a personalized shopping cart by asking you just a few short questions.', 'bot');

  // Handle send button click
  sendButton.addEventListener('click', handleUserInput);
  
  // Handle enter key press
  userInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
      handleUserInput();
    }
  });

  function handleUserInput() {
    const message = userInput.value.trim();
    if (message) {
      // Add user message to chat
      addMessage(message, 'user');
      
      // Clear input
      userInput.value = '';

      // Process the message and get AI response
      processUserMessage(message);
    }
  }

  function addMessage(text, sender) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}-message`;
    messageDiv.textContent = text;
    chatContainer.appendChild(messageDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;
  }

  async function processUserMessage(message) {
    try {
      // Get API key from storage
      const { apiKey } = await chrome.storage.sync.get('apiKey');
      
      if (!apiKey) {
        addMessage('Please set your OpenAI API key in the extension settings.', 'bot');
        return;
      }

      // Send message to background script
      const response = await chrome.runtime.sendMessage({
        action: 'processAIRequest',
        data: {
          message: message,
          apiKey: apiKey
        }
      });

      if (response.success) {
        addMessage(response.message, 'bot');
      } else {
        addMessage('Sorry, I encountered an error. Please try again.', 'bot');
        console.error('Error:', response.error);
      }
    } catch (error) {
      console.error('Error processing message:', error);
      addMessage('Sorry, I encountered an error. Please try again.', 'bot');
    }
  }

  async function checkApiKey() {
    const { apiKey } = await chrome.storage.sync.get('apiKey');
    if (!apiKey) {
      addMessage('Please set your OpenAI API key in the extension settings to start using the assistant.', 'bot');
    }
  }
}); 