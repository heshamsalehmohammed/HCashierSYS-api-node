const Joi = require("joi");
const bcrypt = require("bcryptjs");
const _ = require("lodash");
const { User } = require("../models/user");
const express = require("express");
const router = express.Router();

// Login route
router.post("/login", async (req, res) => {
  const { error } = validateLogin(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  try {
    let user = await User.findOne({
      $or: [{ email: req.body.emailOrName }, { name: req.body.emailOrName }],
    });
    if (!user) return res.status(400).send("Invalid email, name, or password.");

    const validPassword = await bcrypt.compare(
      req.body.password,
      user.password
    );
    if (!validPassword)
      return res.status(400).send("Invalid email, name, or password.");

    // Generate auth token
    const token = user.generateAuthToken();

    // Send response back to client, including the user's role
    res.send({
      token, // Return the generated token
      user: _.pick(user, ["_id", "name", "email", "role"]), // Return the user object including the role
    });
  } catch (error) {
    res.status(500).send(error.message);
  }
});

// Logout route
router.post("/logout", (req, res) => {
  try {
    // Clear token on client side (optional for server-side processing)
    res.send({ message: "Logged out successfully." });
  } catch (error) {
    res.status(500).send(error.message);
  }
});

// Register route
router.post("/register", async (req, res) => {
  const { error } = validateRegister(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  try {
    let user = await User.findOne({
      $or: [{ email: req.body.email }, { name: req.body.name }],
    });
    if (user)
      return res
        .status(400)
        .send("User with this email or name already registered.");

    // Create new user, include role in the registration if provided
    user = new User(_.pick(req.body, ["name", "email", "password", "role"]));
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(user.password, salt);
    await user.save();

    // Generate auth token
    const token = user.generateAuthToken();
    res.header("x-auth-token", token).send({
      token, // Return the generated token
      user: _.pick(user, ["_id", "name", "email", "role"]), // Return the user object including the role
    });
  } catch (error) {
    res.status(500).send(error.message);
  }
});

// Validate login input
function validateLogin(req) {
  const schema = Joi.object({
    emailOrName: Joi.string().min(2).max(255).required(),
    password: Joi.string().min(5).max(255).required(),
  });
  return schema.validate(req);
}

// Validate register input
function validateRegister(req) {
  const schema = Joi.object({
    name: Joi.string().min(2).max(50).required(),
    email: Joi.string().min(5).max(255).required().email(),
    password: Joi.string().min(5).max(255).required(),
    role: Joi.string().valid("user", "admin", "master").default("user"), // Role validation and default
  });
  return schema.validate(req);
}

module.exports = router;
