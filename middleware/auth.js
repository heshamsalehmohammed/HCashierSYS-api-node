const jwt = require("jsonwebtoken");
const config = require("config");

module.exports = function (req, res, next) {
  // Check if authentication is required from the config
  if (!config.get("requiresAuth")) return next();

  // Retrieve the token from the Authorization header
  const authHeader = req.header("Authorization");
  if (!authHeader) return res.status(401).send("Access denied. No token provided.");

  // Ensure the token uses the 'Bearer' scheme
  const token = authHeader.split(" ")[1]; // Extract token after 'Bearer'
  if (!token) return res.status(401).send("Access denied. Invalid token format.");

  try {
    // Verify the token with the secret key
    const decoded = jwt.verify(token, config.get("jwtPrivateKey"));
    req.user = decoded; // Store the decoded user in the request object
    next(); // Proceed to the next middleware
  } catch (ex) {
    // Handle token verification failure
    res.status(401).send("Invalid token.");
  }
};
