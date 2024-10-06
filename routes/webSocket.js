const express = require('express');
const { sendMessageToSession, broadcastMessage } = require('../services/webSocketService');
const router = express.Router();

// Route to send a message to a specific session
router.get('/send-to-session/:sessionId', async (req, res) => {
  const { sessionId } = req.params;
  const message = `Hello session ${sessionId}`;
  await sendMessageToSession(sessionId, message);
  res.send(`Message sent to session ${sessionId}`);
});

// Route to broadcast a message to all connected sessions
router.get('/broadcast', async (req, res) => {
  const message = 'Hello to all connected users!';
  await broadcastMessage(message);
  res.send('Broadcast message sent to all sessions');
});

module.exports = router;