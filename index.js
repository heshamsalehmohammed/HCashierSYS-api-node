// index.js

const dotenv = require('dotenv');
const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env.development';
dotenv.config({ path: envFile });
const express = require('express');
const http = require('http');
const config = require('config');
const logger = require("./startup/logging");
const { initializeWebSocketServer } = require('./services/webSocketService');

const app = express();

// Apply critical initial configurations and middleware
require('./startup/config')();
require('./startup/cors')(app);
require('./startup/db')();

// Load validation and routes
require('./startup/validation')();
require('./startup/routes')(app);

// Initialize WebSocket server
const server = http.createServer(app);
initializeWebSocketServer(server);

// Add error handling for WebSocket or HTTP errors
server.on('error', (err) => {
  logger.error("Server error", err);
});

// Start the server
const port = process.env.PORT || config.get('port');
server.listen(port, () => logger.info(`🚀 Server running on port ${port}`));

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

function shutdown() {
  logger.info("Shutting down server...");
  server.close(() => {
    logger.info("HTTP server closed");
    process.exit(0);
  });
}


module.exports = server;
