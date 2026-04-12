const express = require('express');
const http = require('http');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const initializeSocket = require('./config/socket');
const healthRoute = require('./routes/health');
const logger = require('./middleware/logger');

// Initialize express app
const app = express();
const server = http.createServer(app);

// Initialize socket
const io = initializeSocket(server);

// Middleware
app.use(cors());
app.use(logger);
app.use(express.json());

// Routes
app.use('/', healthRoute);

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});