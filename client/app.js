// ── State ──
let accessToken = localStorage.getItem('accessToken') || null;
let currentUsername = localStorage.getItem('username') || null;
let socket = null;
let roomName = '';
let typingTimeout = null;

// ── DOM Elements ──
const authScreen = document.getElementById('authScreen');
const roomScreen = document.getElementById('roomScreen');
const chatScreen = document.getElementById('chatScreen');
const authError = document.getElementById('authError');

// Auth elements
const loginTab = document.getElementById('loginTab');
const registerTab = document.getElementById('registerTab');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const loginBtn = document.getElementById('loginBtn');
const registerBtn = document.getElementById('registerBtn');
const loginUsername = document.getElementById('loginUsername');
const loginPassword = document.getElementById('loginPassword');
const registerUsername = document.getElementById('registerUsername');
const registerPassword = document.getElementById('registerPassword');

// Room elements
const welcomeName = document.getElementById('welcomeName');
const roomInput = document.getElementById('roomInput');
const joinRoomBtn = document.getElementById('joinRoomBtn');
const logoutBtn = document.getElementById('logoutBtn');

// Chat elements
const messagesArea = document.getElementById('messagesArea');
const messageInput = document.getElementById('messageInput');
const sendButton = document.getElementById('sendButton');
const status = document.getElementById('status');
const currentRoom = document.getElementById('currentRoom');
const roomTitle = document.getElementById('roomTitle');
const onlineCount = document.getElementById('onlineCount');
const usersList = document.getElementById('usersList');
const typingIndicator = document.getElementById('typingIndicator');
const currentUser = document.getElementById('currentUser');
const chatLogoutBtn = document.getElementById('chatLogoutBtn');

// ── Avatar helpers ──
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

// ── Show error ──
function showError(message) {
  authError.textContent = message;
  authError.classList.add('show');
  setTimeout(() => authError.classList.remove('show'), 4000);
}

// ── Tab switching ──
loginTab.addEventListener('click', () => {
  loginTab.classList.add('active');
  registerTab.classList.remove('active');
  loginForm.style.display = 'flex';
  registerForm.style.display = 'none';
  authError.classList.remove('show');
});

registerTab.addEventListener('click', () => {
  registerTab.classList.add('active');
  loginTab.classList.remove('active');
  registerForm.style.display = 'flex';
  loginForm.style.display = 'none';
  authError.classList.remove('show');
});

// ── Check if already logged in ──
if (accessToken && currentUsername) {
  showRoomScreen();
}

// ── Register ──
registerBtn.addEventListener('click', async () => {
  const username = registerUsername.value.trim();
  const password = registerPassword.value.trim();

  if (!username || !password) {
    showError('Please fill in all fields');
    return;
  }

  registerBtn.disabled = true;
  registerBtn.textContent = 'Creating account...';

  try {
    const response = await fetch('http://localhost:5000/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ username, password })
    });

    const data = await response.json();

    if (data.success) {
      accessToken = data.accessToken;
      currentUsername = data.user.username;
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('username', currentUsername);
      showRoomScreen();
    } else {
      showError(data.message);
    }
  } catch (error) {
    showError('Server error. Please try again.');
  }

  registerBtn.disabled = false;
  registerBtn.textContent = 'Create Account →';
});

// ── Login ──
loginBtn.addEventListener('click', async () => {
  const username = loginUsername.value.trim();
  const password = loginPassword.value.trim();

  if (!username || !password) {
    showError('Please fill in all fields');
    return;
  }

  loginBtn.disabled = true;
  loginBtn.textContent = 'Logging in...';

  try {
    const response = await fetch('http://localhost:5000/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ username, password })
    });

    const data = await response.json();

    if (data.success) {
      accessToken = data.accessToken;
      currentUsername = data.user.username;
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('username', currentUsername);
      showRoomScreen();
    } else {
      showError(data.message);
    }
  } catch (error) {
    showError('Server error. Please try again.');
  }

  loginBtn.disabled = false;
  loginBtn.textContent = 'Login →';
});

// Enter key on login
loginPassword.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') loginBtn.click();
});

registerPassword.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') registerBtn.click();
});

// ── Show Room Screen ──
function showRoomScreen() {
  authScreen.style.display = 'none';
  roomScreen.style.display = 'flex';
  chatScreen.style.display = 'none';
  welcomeName.textContent = currentUsername;
}

// ── Join Room ──
joinRoomBtn.addEventListener('click', joinRoom);
roomInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') joinRoom();
});

function joinRoom() {
  roomName = roomInput.value.trim();
  if (!roomName) {
    alert('Please enter a room name!');
    return;
  }
  connectSocket();
}

// ── Logout ──
function logout() {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('username');
  accessToken = null;
  currentUsername = null;
  if (socket) socket.disconnect();
  authScreen.style.display = 'flex';
  roomScreen.style.display = 'none';
  chatScreen.style.display = 'none';
}

logoutBtn.addEventListener('click', logout);
chatLogoutBtn.addEventListener('click', logout);

// ── Connect Socket with JWT ──
function connectSocket() {
  socket = io('http://localhost:5000', {
    auth: { token: accessToken }
  });

  socket.on('connect', () => {
    status.textContent = '🟢 Connected';
    status.classList.add('connected');

    // Show chat screen
    roomScreen.style.display = 'none';
    chatScreen.style.display = 'flex';
    currentRoom.textContent = roomName;
    roomTitle.textContent = `# ${roomName}`;
    currentUser.textContent = `👤 ${currentUsername}`;

    // Join room
    socket.emit('room:join', { roomName });
  });

  socket.on('connect_error', (error) => {
    alert('Connection failed: ' + error.message);
    showRoomScreen();
  });

  socket.on('disconnect', () => {
    status.textContent = '🔴 Disconnected';
    status.classList.remove('connected');
  });

  socket.on('message:history', (messages) => {
    messagesArea.innerHTML = '';
    messages.forEach((message) => {
      displayMessage(message, message.sender === currentUsername);
    });
    scrollToBottom();
  });

  socket.on('message:receive', (message) => {
    displayMessage(message, message.sender === currentUsername);
    scrollToBottom();
  });

  socket.on('room:userJoined', (data) => {
    onlineCount.textContent = data.userCount;
    displayNotification(`${data.username} joined the room`);
  });

  socket.on('room:userLeft', (data) => {
    onlineCount.textContent = data.userCount;
    displayNotification(`${data.username} left the room`);
  });

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

  socket.on('typing:update', (data) => {
    typingIndicator.textContent = data.isTyping
      ? `${data.username} is typing...`
      : '';
  });
}

// ── Send Message ──
sendButton.addEventListener('click', sendMessage);
messageInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') sendMessage();
});

messageInput.addEventListener('input', () => {
  if (!socket) return;
  socket.emit('typing:start');
  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => {
    socket.emit('typing:stop');
  }, 2000);
});

function sendMessage() {
  if (!socket) return;
  const content = messageInput.value.trim();
  if (!content) return;
  socket.emit('message:send', { content });
  socket.emit('typing:stop');
  clearTimeout(typingTimeout);
  messageInput.value = '';
}

// ── Display Message ──
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

// ── Display Notification ──
function displayNotification(text) {
  const div = document.createElement('div');
  div.classList.add('message', 'notification');
  div.innerHTML = `<span class="notification-text">${text}</span>`;
  messagesArea.appendChild(div);
  scrollToBottom();
}

// ── Scroll ──
function scrollToBottom() {
  messagesArea.scrollTop = messagesArea.scrollHeight;
}