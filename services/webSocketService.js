// services/webSocketService.js

const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const url = require('url');
const config = require('config');
const { v4: uuidv4 } = require('uuid');
const WebSocketSession = require('../models/WebSocketSession');
const util = require('util');

const verifyAsync = util.promisify(jwt.verify);

let wss; // WebSocket server instance

const initializeWebSocketServer = (server) => {
  wss = new WebSocket.Server({ noServer: true });

  // Upgrade HTTP connection to WebSocket
  server.on('upgrade', async (req, socket, head) => {
    try {
      const parsedUrl = url.parse(req.url, true);
      const token = parsedUrl.query.token;
      let sessionId = parsedUrl.query.sessionId;

      if (!token) {
        socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
        socket.destroy();
        return;
      }

      let decoded;
      try {
        decoded = await verifyAsync(token, config.get('jwtPrivateKey'));
      } catch (err) {
        socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
        socket.destroy();
        return;
      }

      const userId = decoded._id;

      if (!sessionId) {
        sessionId = uuidv4();
      }

      // Store or update the WebSocketSession in MongoDB
      let wsSession = await WebSocketSession.findOne({ sessionId });

      if (!wsSession) {
        wsSession = await WebSocketSession.create({
          sessionId,
          userId,
          connected: false,
        });
      } else {
        // Update existing session with userId
        wsSession.userId = userId;
        await wsSession.save();
      }

      wss.handleUpgrade(req, socket, head, (ws) => {
        ws.sessionId = sessionId;
        ws.userId = userId;

        if (parsedUrl.query.sessionId !== sessionId) {
          ws.send(JSON.stringify({ type: 'sessionId', sessionId }));
        }

        wss.emit('connection', ws, req);
      });
    } catch (error) {
      console.error('WebSocket upgrade error:', error);
      socket.write('HTTP/1.1 500 Internal Server Error\r\n\r\n');
      socket.destroy();
    }
  });

  // Handle WebSocket connection
  wss.on('connection', async (ws, req) => {
    try {
      const sessionId = ws.sessionId;
      const userId = ws.userId;
      console.log('WebSocket connection established for session:', sessionId);

      // Mark session as connected in MongoDB
      await WebSocketSession.updateOne(
        { sessionId },
        { connected: true, userId }
      );

      // Handle messages from the client
      ws.on('message', async (message) => {
        console.log(`Received message from session ${sessionId}: ${message}`);
        await WebSocketSession.updateOne(
          { sessionId },
          { $push: { messages: message } }
        );
        ws.send(`Message received: ${message}`);
      });

      // Handle WebSocket disconnection
      ws.on('close', async () => {
        try {
          await WebSocketSession.updateOne(
            { sessionId },
            { connected: false }
          );
          console.log(`WebSocket connection closed for session: ${sessionId}`);
        } catch (err) {
          console.error(
            `Failed to update session status for ${sessionId}:`,
            err
          );
        }
      });
    } catch (err) {
      console.error('Error in WebSocket connection:', err);
      ws.close();
    }
  });
};

// Function to send a message to all sessions of a specific user
const sendMessageToUserSessions = async (userId, message) => {
  // Find all sessions associated with the user
  const sessions = await WebSocketSession.find({ userId, connected: true });

  sessions.forEach((session) => {
    // Find the WebSocket client that matches the sessionId
    const ws = Array.from(wss.clients).find(
      (client) => client.sessionId === session.sessionId
    );
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(message); // Send the message to the specific WebSocket connection
    } else {
      console.log(`WebSocket for session ${session.sessionId} is not open`);
    }
  });
};

// Function to broadcast a message to all connected sessions
const broadcastMessage = (message) => {
  return new Promise((resolve, reject) => {
    try {
      wss.clients.forEach((ws) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(message);
        }
      });
      resolve();
    } catch (error) {
      reject(error);
    }
  });
};

// Function to send a message to a specific session
const sendMessageToSession = async (sessionId, message) => {
  const ws = Array.from(wss.clients).find(
    (client) => client.sessionId === sessionId
  );
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(message);
  } else {
    console.log(`WebSocket for session ${sessionId} is not open`);
  }
};

module.exports = {
  initializeWebSocketServer,
  sendMessageToUserSessions,
  broadcastMessage,
  sendMessageToSession,
};
