const express = require('express');
const http = require('http');
const cors = require('cors');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const connectDB = require('./config/db');
const initializeSocket = require('./config/socket');
const healthRoute = require('./routes/health');
const { router: roomsRoute } = require('./routes/rooms');
const authRoute = require('./routes/auth');
const logger = require('./middleware/logger');

// Connect to MongoDB
connectDB();

// Initialize express app
const app = express();
const server = http.createServer(app);

// Initialize socket
const io = initializeSocket(server);

// Middleware
app.use(cors({
  origin: 'http://127.0.0.1:5500',
  credentials: true
}));
app.use(logger);
app.use(express.json());
app.use(cookieParser());

// Routes
app.use('/', healthRoute);
app.use('/', roomsRoute);
app.use('/', authRoute);

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});