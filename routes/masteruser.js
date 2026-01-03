// routes/masteruser.js

const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth"); // Middleware for authentication
const role = require("../middleware/role"); // Middleware to check user role
const { User } = require("../models/user");
const WebSocketSession = require("../models/WebSocketSession");
const webSocketService = require("../services/webSocketService");

// GET /api/masteruser/users-sessions - Fetch all users with their sessions
router.get("/users-sessions", [auth, role("master")], async (req, res) => {
  const users = await User.find();

  const usersWithSessions = await Promise.all(
    users.map(async (user) => {
      const sessions = await WebSocketSession.find({ userId: user._id });
      return {
        _id: user._id,
        name: user.name,
        sessions: sessions.map((session) => ({
          sessionId: session.sessionId,
          connected: session.connected,
          messages: session.messages,
        })),
      };
    })
  );

  res.json(usersWithSessions);
});

// POST /api/masteruser/session/:sessionId/message - Send message to a session
router.post(
  "/session/:sessionId/message",
  [auth, role("master")],
  async (req, res) => {
    const { sessionId } = req.params;
    const { message } = req.body;

    await webSocketService.sendMessageToSession(sessionId, message);
    res.json({ success: true });
  }
);

// POST /api/masteruser/user/:userId/message - Send message to all user's sessions
router.post(
  "/user/:userId/message",
  [auth, role("master")],
  async (req, res) => {
    const { userId } = req.params;
    const { message } = req.body;

    await webSocketService.sendMessageToUserSessions(userId, message);
    res.json({ success: true });
  }
);

// DELETE /api/masteruser/session/:sessionId - Terminate a session
router.delete(
  "/session/:sessionId",
  [auth, role("master")],
  async (req, res) => {
    const { sessionId } = req.params;

    await webSocketService.closeSession(sessionId);
    res.json({ success: true });
  }
);

// DELETE /api/masteruser/user/:userId/sessions - Terminate all user's sessions
router.delete(
  "/user/:userId/sessions",
  [auth, role("master")],
  async (req, res) => {
    const { userId } = req.params;

    await webSocketService.closeUserSessions(userId);
    res.json({ success: true });
  }
);

router.post("/broadcast", [auth, role("master")], async (req, res) => {
  const { message } = req.body;

  await webSocketService.broadcastMessage(message);
  res.json({ success: true });
});

module.exports = router;
