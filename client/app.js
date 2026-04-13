/*
  WHY: Same socket connection as before.
  Nothing changes here — your server is already running on 5000.
*/
const socket = io('http://localhost:5000');

// ── DOM Elements ──────────────────────────────
const loginScreen    = document.getElementById('loginScreen');
const chatScreen     = document.getElementById('chatScreen');
const usernameInput  = document.getElementById('usernameInput');
const roomInput      = document.getElementById('roomInput');
const joinButton     = document.getElementById('joinButton');
const messagesArea   = document.getElementById('messagesArea');
const messageInput   = document.getElementById('messageInput');
const sendButton     = document.getElementById('sendButton');
const status         = document.getElementById('status');
const currentRoom    = document.getElementById('currentRoom');
const roomTitle      = document.getElementById('roomTitle');
const onlineCount    = document.getElementById('onlineCount');
const usersList      = document.getElementById('usersList');
const typingIndicator = document.getElementById('typingIndicator');

// Mobile sidebar elements (new)
const sidebarToggle   = document.getElementById('sidebarToggle');
const sidebar         = document.getElementById('sidebar');
const sidebarOverlay  = document.getElementById('sidebarOverlay');

// ── State ─────────────────────────────────────
let username     = '';
let roomName     = '';
let typingTimeout = null;

// ── Avatar Color Generator ────────────────────
/*
  WHY: We generate a consistent color from the username string.
  Same username always gets same color — this is called
  deterministic hashing. The bit operations (<<5, -) create
  a simple hash number, then we mod it against the colors array.
  This is exactly how Slack and Linear generate avatar colors.
*/
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


// ── Socket Connection ─────────────────────────

socket.on('connect', () => {
  status.textContent = '🟢 Connected';
  status.classList.add('connected');
});

socket.on('disconnect', () => {
  status.textContent = '🔴 Disconnected';
  status.classList.remove('connected');
});


// ── Join Room ─────────────────────────────────

joinButton.addEventListener('click', joinRoom);
usernameInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') roomInput.focus(); });
roomInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') joinRoom(); });
/*
  WHY: Chained Enter key flow. Press Enter in the name field →
  moves focus to room field. Press Enter in room field → joins.
  This makes the login form feel fast and keyboard-friendly
  without the user needing to click anything.
*/

function joinRoom() {
  username = usernameInput.value.trim();
  roomName = roomInput.value.trim();

  if (!username || !roomName) {
    alert('Please enter your name and a room name!');
    return;
  }

  socket.emit('room:join', { username, roomName });

  loginScreen.style.display = 'none';
  chatScreen.style.display  = 'flex';

  currentRoom.textContent = roomName;
  roomTitle.textContent   = `# ${roomName}`;

  // WHY: Focus the message input after joining so user can
  // immediately start typing without clicking.
  setTimeout(() => messageInput.focus(), 100);
}


// ── Message History ───────────────────────────

socket.on('message:history', (messages) => {
  messagesArea.innerHTML = '';
  messages.forEach((msg) => displayMessage(msg, msg.sender === username));
  /*
    WHY: false = instant scroll (no animation) on initial load.
    You don't want the page to visibly scroll through 50 messages
    on entry — just jump straight to the bottom.
  */
  scrollToBottom(false);
});


// ── New Message ───────────────────────────────

socket.on('message:receive', (message) => {
  displayMessage(message, message.sender === username);
  /*
    WHY: smartScroll instead of always scrolling.
    If the user scrolled up to read old messages, we should NOT
    force them back to the bottom every time someone new sends.
    smartScroll only scrolls if they're already near the bottom.
  */
  smartScroll();
});


// ── Room Events ───────────────────────────────

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
    div.setAttribute('role', 'listitem'); // WHY: pairs with role="list" on the container

    const avatar = document.createElement('div');
    avatar.classList.add('avatar');
    avatar.style.background = getAvatarColor(user);
    /*
      WHY: textContent instead of innerHTML for user data.
      If a username was something like <img src=x onerror=alert(1)>
      using innerHTML would execute that. textContent treats it as
      plain text. This is called XSS (Cross-Site Scripting) prevention.
      Always use textContent for any data that came from a user.
    */
    avatar.textContent = getInitials(user);

    const name = document.createElement('span');
    name.classList.add('user-name');
    name.textContent = user;

    div.append(avatar, name);
    usersList.appendChild(div);
  });
  onlineCount.textContent = users.length;
});


// ── Typing Indicator ──────────────────────────

socket.on('typing:update', (data) => {
  if (data.isTyping) {
    /*
      WHY: We replaced the plain "X is typing..." text with
      a proper typing bubble that contains animated dots.
      The HTML structure matches the .typing-bubble CSS class.
      The 3 dots bounce in sequence (staggered animation-delay in CSS).
      This is the iMessage / WhatsApp style indicator.
    */
    typingIndicator.innerHTML = `
      <div class="typing-bubble">
        <span class="typing-label">${data.username}</span>
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
      </div>
    `;
  } else {
    typingIndicator.innerHTML = '';
  }
});


// ── Send Message ──────────────────────────────

sendButton.addEventListener('click', sendMessage);
messageInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') sendMessage();
});

// WHY: Typing indicator — debounced.
// 'debounce' means we wait until the user stops typing for 2 seconds
// before emitting typing:stop. Without this, every single keystroke
// would fire an event — that's potentially hundreds of events per minute
// flooding your server. Debouncing batches them efficiently.
messageInput.addEventListener('input', () => {
  socket.emit('typing:start');
  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => {
    socket.emit('typing:stop');
  }, 2000);
});

function sendMessage() {
  const content = messageInput.value.trim();

  // WHY: Double guard — empty check AND length limit.
  // The maxlength="500" on the input prevents long messages in the browser,
  // but a user could bypass that via the browser console. This JS check
  // is the second line of defense before it hits your server.
  if (!content || content.length > 500) return;

  socket.emit('message:send', { content });
  socket.emit('typing:stop');
  clearTimeout(typingTimeout);
  messageInput.value = '';

  // WHY: After sending, refocus the input immediately.
  // Without this, keyboard on mobile might dismiss, and on desktop
  // the cursor leaves the input — both are annoying UX.
  messageInput.focus();
}


// ── Display Message ───────────────────────────

function displayMessage(message, isSent) {
  const wrapper = document.createElement('div');
  wrapper.classList.add('message', isSent ? 'sent' : 'received');

  const time = new Date(message.timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  });

  /*
    WHY: We build the DOM manually using createElement + textContent
    instead of setting innerHTML with template literals.

    BAD (your old code):
      div.innerHTML = `<div>${message.content}</div>`
      → If message.content = "<script>alert('hacked')</script>"
        that script would actually execute in the browser.

    GOOD (new code):
      bubbleEl.textContent = message.content
      → The text is displayed as-is, never interpreted as HTML.

    This is XSS prevention. It's a standard security practice and
    a great thing to mention to any interviewer or recruiter.
  */

  const avatarEl = document.createElement('div');
  avatarEl.classList.add('message-avatar');
  avatarEl.style.background = getAvatarColor(message.sender);
  avatarEl.textContent = getInitials(message.sender);

  const senderEl = document.createElement('div');
  senderEl.classList.add('message-sender');
  senderEl.textContent = message.sender;

  const bubbleEl = document.createElement('div');
  bubbleEl.classList.add('message-bubble');
  bubbleEl.textContent = message.content; // ← safe, no XSS risk

  const timeEl = document.createElement('div');
  timeEl.classList.add('message-time');
  timeEl.textContent = time;

  const bodyEl = document.createElement('div');
  bodyEl.classList.add('message-body');
  bodyEl.append(senderEl, bubbleEl, timeEl);

  wrapper.append(avatarEl, bodyEl);
  messagesArea.appendChild(wrapper);
}


// ── Display Notification ──────────────────────

function displayNotification(text) {
  const div = document.createElement('div');
  div.classList.add('message', 'notification');

  const span = document.createElement('span');
  span.classList.add('notification-text');
  span.textContent = text; // WHY: textContent here too, not innerHTML

  div.appendChild(span);
  messagesArea.appendChild(div);
  smartScroll();
}


// ── Scroll Helpers ────────────────────────────

function scrollToBottom(smooth = true) {
  messagesArea.scrollTo({
    top: messagesArea.scrollHeight,
    behavior: smooth ? 'smooth' : 'instant'
  });
}

function smartScroll() {
  /*
    WHY: Calculate how far the user is from the bottom.
    If they're within 120px of the bottom, they're "at the bottom"
    and we auto-scroll. If they've scrolled up more than that, we
    don't interrupt them — they're reading history.
    This is exactly how Slack and Discord handle it.
  */
  const distFromBottom =
    messagesArea.scrollHeight -
    messagesArea.scrollTop -
    messagesArea.clientHeight;

  if (distFromBottom < 120) scrollToBottom();
}


// ── Mobile Sidebar Toggle ─────────────────────

sidebarToggle.addEventListener('click', () => {
  sidebar.classList.toggle('open');
  sidebarOverlay.classList.toggle('active');
});

/*
  WHY: Tap the dark overlay to close the sidebar.
  This is the expected UX pattern on mobile — every drawer-style
  sidebar (Gmail, Discord, Slack mobile) closes when you tap outside.
  Without this, users would be confused about how to close it.
*/
sidebarOverlay.addEventListener('click', () => {
  sidebar.classList.remove('open');
  sidebarOverlay.classList.remove('active');
});