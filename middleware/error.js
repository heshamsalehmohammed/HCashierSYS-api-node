// middleware/error.js
const logger = require("../startup/logging");

module.exports = function (err, req, res, next) {
  logger.error(err.message, {
    stack: err.stack,
    path: req.originalUrl,
    method: req.method,
  });

  res.status(500).json({
    message: "Something failed.",
  });
};
