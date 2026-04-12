const socket = io('http://localhost:5000');

// DOM Elements
const loginScreen = document.getElementById('loginScreen');
const chatScreen = document.getElementById('chatScreen');
const usernameInput = document.getElementById('usernameInput');
const roomInput = document.getElementById('roomInput');
const joinButton = document.getElementById('joinButton');
const messagesArea = document.getElementById('messagesArea');
const messageInput = document.getElementById('messageInput');
const sendButton = document.getElementById('sendButton');
const status = document.getElementById('status');
const currentRoom = document.getElementById('currentRoom');
const roomTitle = document.getElementById('roomTitle');
const onlineCount = document.getElementById('onlineCount');
const usersList = document.getElementById('usersList');

// Current user info
let username = '';
let roomName = '';

// Socket connected
socket.on('connect', () => {
  status.textContent = '🟢 Connected';
});

// Socket disconnected
socket.on('disconnect', () => {
  status.textContent = '🔴 Disconnected';
});

// Join room on button click
joinButton.addEventListener('click', joinRoom);

// Join room on Enter key
roomInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') joinRoom();
});

function joinRoom() {
  username = usernameInput.value.trim();
  roomName = roomInput.value.trim();

  if (!username || !roomName) {
    alert('Please enter your name and a room name!');
    return;
  }

  // Emit join event to server
  socket.emit('room:join', { username, roomName });

  // Switch screens
  loginScreen.style.display = 'none';
  chatScreen.style.display = 'flex';

  // Update UI
  currentRoom.textContent = roomName;
  roomTitle.textContent = `# ${roomName}`;
}

// Receive message history
socket.on('message:history', (messages) => {
  messagesArea.innerHTML = '';
  messages.forEach((message) => {
    displayMessage(message, message.sender === username);
  });
  scrollToBottom();
});

// Receive new message
socket.on('message:receive', (message) => {
  displayMessage(message, message.sender === username);
  scrollToBottom();
});

// User joined notification
socket.on('room:userJoined', (data) => {
  onlineCount.textContent = data.userCount;
  displayNotification(`${data.username} joined the room`);
});

// User left notification
socket.on('room:userLeft', (data) => {
  onlineCount.textContent = data.userCount;
  displayNotification(`${data.username} left the room`);
});

// Update users list
socket.on('room:users', (users) => {
  usersList.innerHTML = '';
  users.forEach((user) => {
    const div = document.createElement('div');
    div.classList.add('user-item');
    div.textContent = `🟢 ${user}`;
    usersList.appendChild(div);
  });
  onlineCount.textContent = users.length;
});

// Send message on button click
sendButton.addEventListener('click', sendMessage);

// Send message on Enter key
messageInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') sendMessage();
});

function sendMessage() {
  const content = messageInput.value.trim();
  if (!content) return;

  socket.emit('message:send', { content });
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

function displayNotification(text) {
  const div = document.createElement('div');
  div.classList.add('message', 'notification');
  div.textContent = text;
  messagesArea.appendChild(div);
  scrollToBottom();
}

function scrollToBottom() {
  messagesArea.scrollTop = messagesArea.scrollHeight;
}