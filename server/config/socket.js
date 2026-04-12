const socketio = require('socket.io');
const Message = require('../models/Message');
const { getOrCreateRoom } = require('../routes/rooms');

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

    socket.on('room:join', async (data) => {
      const { username, roomName } = data;

      if (socket.currentRoom) {
        socket.leave(socket.currentRoom);
        const { rooms } = require('../routes/rooms');
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

      // Fetch last 50 messages from MongoDB
      try {
        const messages = await Message.find({ room: roomName })
          .sort({ timestamp: -1 })
          .limit(50)
          .lean();

        socket.emit('message:history', messages.reverse());
      } catch (error) {
        console.error('Error fetching messages:', error);
        socket.emit('message:history', []);
      }

      socket.emit('room:users', Array.from(room.users.values()));

      io.to(roomName).emit('room:userJoined', {
        username,
        userCount: room.users.size
      });

      console.log(`${username} joined room: ${roomName}`);
    });

    // Typing indicators
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

    // Handle new messages
    socket.on('message:send', async (data) => {
      const { content } = data;
      const roomName = socket.currentRoom;
      if (!roomName) return;

      try {
        // Save to MongoDB
        const message = await Message.create({
          sender: socket.username,
          content,
          room: roomName,
          timestamp: new Date()
        });

        // Broadcast to room
        io.to(roomName).emit('message:receive', {
          id: message._id,
          sender: message.sender,
          content: message.content,
          room: message.room,
          timestamp: message.timestamp
        });

        console.log(`[${roomName}] ${socket.username}: ${content}`);
      } catch (error) {
        console.error('Error saving message:', error);
      }
    });

    socket.on('disconnect', () => {
      if (socket.currentRoom) {
        const { rooms } = require('../routes/rooms');
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