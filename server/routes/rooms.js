const express = require('express');
const router = express.Router();

// Store rooms in memory for now
const rooms = new Map();

// Create or get a room
const getOrCreateRoom = (roomName) => {
  if (!rooms.has(roomName)) {
    rooms.set(roomName, {
      name: roomName,
      users: new Map(),
      messages: []
    });
  }
  return rooms.get(roomName);
};

// Get all rooms
router.get('/rooms', (req, res) => {
  const roomList = Array.from(rooms.values()).map((room) => ({
    name: room.name,
    userCount: room.users.size,
    messageCount: room.messages.length
  }));

  res.status(200).json({
    success: true,
    rooms: roomList
  });
});

module.exports = { router, rooms, getOrCreateRoom };