const socketio = require('socket.io');
const { rooms, getOrCreateRoom } = require('../routes/rooms');

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

    socket.on('room:join', (data) => {
      const { username, roomName } = data;

      if (socket.currentRoom) {
        socket.leave(socket.currentRoom);
        const prevRoom = rooms.get(socket.currentRoom);
        if (prevRoom) {
          prevRoom.users.delete(socket.id);
          io.to(socket.currentRoom).emit('room:userLeft', {
            username: socket.username,
            userCount: prevRoom.users.size
          });
        }
      }

      const room = getOrCreateRoom(roomName);
      socket.join(roomName);
      socket.currentRoom = roomName;
      socket.username = username;
      room.users.set(socket.id, username);

      socket.emit('message:history', room.messages);
      socket.emit('room:users', Array.from(room.users.values()));

      io.to(roomName).emit('room:userJoined', {
        username,
        userCount: room.users.size
      });

      console.log(`${username} joined room: ${roomName}`);
    });
// Handle typing indicator
socket.on('typing:start', () => {
  if (!socket.currentRoom) return;
  socket.to(socket.currentRoom).emit('typing:update', {
    username: socket.username,
    isTyping: true
  });
});

socket.on('typing:stop', () => {
  if (!socket.currentRoom) return;
  socket.to(socket.currentRoom).emit('typing:update', {
    username: socket.username,
    isTyping: false
  });
});
    socket.on('message:send', (data) => {
      const { content } = data;
      const roomName = socket.currentRoom;
      if (!roomName) return;

      const room = rooms.get(roomName);
      if (!room) return;

      const message = {
        id: Date.now(),
        sender: socket.username,
        content,
        timestamp: new Date().toISOString(),
        room: roomName
      };

      room.messages.push(message);
      io.to(roomName).emit('message:receive', message);
      console.log(`[${roomName}] ${socket.username}: ${content}`);
    });

    socket.on('disconnect', () => {
      if (socket.currentRoom) {
        const room = rooms.get(socket.currentRoom);
        if (room) {
          room.users.delete(socket.id);
          io.to(socket.currentRoom).emit('room:userLeft', {
            username: socket.username,
            userCount: room.users.size
          });
        }
      }
      console.log(`User disconnected: ${socket.id}`);
    });
  });

  return io;
};

module.exports = initializeSocket;