const config = require("config");

module.exports = function(roles = []) {
    // roles param can be a single role or an array of roles

    if (!config.get("requiresAuth")) return next();

    
    if (typeof roles === "string") {
      roles = [roles];
    }
  
    return (req, res, next) => {
      if (!roles.includes(req.user.role)) {
        return res.status(403).send("Access denied. Insufficient privileges.");
      }
      next();
    };
  };