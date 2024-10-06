const mongoose = require('mongoose');

// WebSocket session schema
const WebSocketSessionSchema = new mongoose.Schema({
  sessionId: { type: String, required: true, unique: true }, // Corresponding session ID
  socketId: { type: String }, // Optional socket identifier
  connected: { type: Boolean, default: false }, // Whether WebSocket connection is open
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Add userId field
  messages: [{ type: String }] // Optional: Store received/sent messages
});

module.exports = mongoose.model('WebSocketSession', WebSocketSessionSchema);