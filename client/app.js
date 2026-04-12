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
const typingIndicator = document.getElementById('typingIndicator');

// Current user info
let username = '';
let roomName = '';
let typingTimeout = null;

// Avatar colors
const avatarColors = [
  '#667eea', '#764ba2', '#f093fb',
  '#4facfe', '#43e97b', '#fa709a',
  '#fee140', '#a18cd1', '#fda085'
];

function getAvatarColor(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return avatarColors[Math.abs(hash) % avatarColors.length];
}

function getInitials(name) {
  return name.slice(0, 2).toUpperCase();
}

// Socket connected
socket.on('connect', () => {
  status.textContent = '🟢 Connected';
  status.classList.add('connected');
});

// Socket disconnected
socket.on('disconnect', () => {
  status.textContent = '🔴 Disconnected';
  status.classList.remove('connected');
});

// Join room
joinButton.addEventListener('click', joinRoom);
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

  socket.emit('room:join', { username, roomName });

  loginScreen.style.display = 'none';
  chatScreen.style.display = 'flex';

  currentRoom.textContent = roomName;
  roomTitle.textContent = `# ${roomName}`;
}

// Message history
socket.on('message:history', (messages) => {
  messagesArea.innerHTML = '';
  messages.forEach((message) => {
    displayMessage(message, message.sender === username);
  });
  scrollToBottom();
});

// New message
socket.on('message:receive', (message) => {
  displayMessage(message, message.sender === username);
  scrollToBottom();
});

// User joined
socket.on('room:userJoined', (data) => {
  onlineCount.textContent = data.userCount;
  displayNotification(`${data.username} joined the room`);
});

// User left
socket.on('room:userLeft', (data) => {
  onlineCount.textContent = data.userCount;
  displayNotification(`${data.username} left the room`);
});

// Users list
socket.on('room:users', (users) => {
  usersList.innerHTML = '';
  users.forEach((user) => {
    const div = document.createElement('div');
    div.classList.add('user-item');
    div.innerHTML = `
      <div class="avatar" style="background:${getAvatarColor(user)}">
        ${getInitials(user)}
      </div>
      <span class="user-name">${user}</span>
    `;
    usersList.appendChild(div);
  });
  onlineCount.textContent = users.length;
});

// Typing indicator
socket.on('typing:update', (data) => {
  if (data.isTyping) {
    typingIndicator.textContent = `${data.username} is typing...`;
  } else {
    typingIndicator.textContent = '';
  }
});

// Send message
sendButton.addEventListener('click', sendMessage);
messageInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') sendMessage();
});

// Typing detection
messageInput.addEventListener('input', () => {
  socket.emit('typing:start');
  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => {
    socket.emit('typing:stop');
  }, 2000);
});

function sendMessage() {
  const content = messageInput.value.trim();
  if (!content) return;

  socket.emit('message:send', { content });
  socket.emit('typing:stop');
  clearTimeout(typingTimeout);
  messageInput.value = '';
}

function displayMessage(message, isSent) {
  const div = document.createElement('div');
  div.classList.add('message', isSent ? 'sent' : 'received');

  const time = new Date(message.timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  });

  const color = getAvatarColor(message.sender);
  const initials = getInitials(message.sender);

  div.innerHTML = `
    <div class="message-avatar" style="background:${color}">
      ${initials}
    </div>
    <div class="message-body">
      <div class="message-sender">${message.sender}</div>
      <div class="message-bubble">${message.content}</div>
      <div class="message-time">${time}</div>
    </div>
  `;

  messagesArea.appendChild(div);
}

function displayNotification(text) {
  const div = document.createElement('div');
  div.classList.add('message', 'notification');
  div.innerHTML = `<span class="notification-text">${text}</span>`;
  messagesArea.appendChild(div);
  scrollToBottom();
}

function scrollToBottom() {
  messagesArea.scrollTop = messagesArea.scrollHeight;
}