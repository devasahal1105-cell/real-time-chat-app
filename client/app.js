// Connect to the server
const socket = io('http://localhost:5000');

// Get DOM elements
const messagesArea = document.getElementById('messagesArea');
const messageInput = document.getElementById('messageInput');
const sendButton = document.getElementById('sendButton');
const status = document.getElementById('status');

// Ask for username when page loads
const sender = prompt('Enter your name:') || 'Anonymous';

// When connected to server
socket.on('connect', () => {
  status.textContent = '🟢 Connected';
  console.log('Connected to server!');
});

// When disconnected from server
socket.on('disconnect', () => {
  status.textContent = '🔴 Disconnected';
});

// Receive message history on join
socket.on('message:history', (messages) => {
  messages.forEach((message) => {
    displayMessage(message, message.sender === sender);
  });
});

// Receive new messages in real time
socket.on('message:receive', (message) => {
  displayMessage(message, message.sender === sender);
  scrollToBottom();
});

// Send message on button click
sendButton.addEventListener('click', sendMessage);

// Send message on Enter key
messageInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    sendMessage();
  }
});

function sendMessage() {
  const content = messageInput.value.trim();

  // Don't send empty messages
  if (!content) return;

  // Emit message to server
  socket.emit('message:send', {
    sender: sender,
    content: content
  });

  // Clear input
  messageInput.value = '';
}

function displayMessage(message, isSent) {
  const div = document.createElement('div');
  div.classList.add('message', isSent ? 'sent' : 'received');

  const time = new Date(message.timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  });

  div.innerHTML = `
    <div class="sender">${message.sender}</div>
    <div class="content">${message.content}</div>
    <div class="timestamp">${time}</div>
  `;

  messagesArea.appendChild(div);
}

function scrollToBottom() {
  messagesArea.scrollTop = messagesArea.scrollHeight;
}