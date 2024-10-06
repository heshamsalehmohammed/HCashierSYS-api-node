const session = require("express-session");
const config = require("config");

module.exports = function (app) {
  app.use(
    session({
      secret: config.get("sessionSecret"),
      resave: false, // Do not save session if unmodified
      saveUninitialized: true, // Save uninitialized sessions
      cookie: { secure: false }, // Set to true in production (with HTTPS)
    })
  );
};