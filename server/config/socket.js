const socketio = require('socket.io');
const { messages } = require('../routes/messages');

const initializeSocket = (server) => {
  const io = socketio(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    // Send existing messages to newly connected user
    socket.emit('message:history', messages);

    // Listen for new messages
    socket.on('message:send', (data) => {
      const message = {
        id: Date.now(),
        sender: data.sender,
        content: data.content,
        timestamp: new Date().toISOString()
      };

      // Save message to memory
      messages.push(message);

      // Broadcast to ALL connected users
      io.emit('message:receive', message);

      console.log(`Message from ${data.sender}: ${data.content}`);
    });

    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.id}`);
    });
  });

  return io;
};

module.exports = initializeSocket;