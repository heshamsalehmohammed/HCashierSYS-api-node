const auth = require("../middleware/auth");
const role = require("../middleware/role");
const bcrypt = require("bcryptjs");
const _ = require("lodash");
const { User, validate } = require("../models/user");
const express = require("express");
const router = express.Router();

router.get("/me", auth, async (req, res) => {
  const user = await User.findById(req.user._id).select("-password");
  res.send(user);
});

router.post("/", [auth, role(["admin", "master"])], async (req, res) => {
  // Validate request
  const { error } = validate(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  // Check for existing user
  let user = await User.findOne({
    $or: [{ email: req.body.email }, { name: req.body.name }],
  });
  if (user)
    return res.status(400).send("User with this email or name already registered.");

  // Role-based restrictions
  if (req.body.role === "master") {
    return res.status(403).send("Cannot create master user.");
  }

  // 'admin' cannot create 'master' users
  if (req.user.role === "admin" && req.body.role === "master") {
    return res.status(403).send("Access denied. Cannot create master user.");
  }

  // Create new user
  user = new User(_.pick(req.body, ["name", "email", "password", "role"]));
  const salt = await bcrypt.genSalt(10);
  user.password = await bcrypt.hash(user.password, salt);
  await user.save();

  res.send(_.pick(user, ["_id", "name", "email", "role"]));
});

router.put("/:id", [auth, role(["admin", "master"])], async (req, res) => {
  // Validate request
  const { error } = validate(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  // Find user to update
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).send("User not found.");

  // Role-based restrictions
  if (req.user.role === "admin") {
    if (user.role === "master") {
      return res.status(403).send("Access denied. Cannot edit master user.");
    }
    if (req.body.role === "master") {
      return res.status(403).send("Access denied. Cannot set role to master.");
    }
  }

  if (req.user.role === "master") {
    if (user.role === "master" && req.body.role !== "master") {
      return res.status(403).send("Cannot downgrade master user.");
    }
    if (user.role === "admin" && req.body.role === "master") {
      return res.status(403).send("Cannot upgrade admin to master.");
    }
  }

  // Update user fields
  user.name = req.body.name || user.name;
  user.email = req.body.email || user.email;
  user.role = req.body.role || user.role;

  if (req.body.password) {
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(req.body.password, salt);
  }

  await user.save();

  res.send(_.pick(user, ["_id", "name", "email", "role"]));
});

router.get("/", [auth, role(["admin", "master"])], async (req, res) => {
  let query = {};

  if (req.user.role === "admin") {
    // Admins can only see users and other admins
    query.role = { $in: ["user", "admin"] };
  }

  // If the role is 'master', no need to modify the query since they can see all users

  const users = await User.find(query).select("-password");
  res.send(users);
});


router.get("/:id", [auth, role(["admin", "master"])], async (req, res) => {
  const user = await User.findById(req.params.id).select("-password");
  if (!user) return res.status(404).send("User not found.");

  // Admins cannot access master users
  if (req.user.role === "admin" && user.role === "master") {
    return res.status(403).send("Access denied.");
  }

  res.send(user);
});


router.delete("/:id", [auth, role(["admin", "master"])], async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).send("User not found.");

  // Role-based restrictions
  if (user.role === "master") {
    return res.status(403).send("Cannot delete master user.");
  }

  if (req.user.role === "admin" && user.role === "admin") {
    return res.status(403).send("Access denied. Cannot delete another admin.");
  }

  await User.deleteOne({ _id: req.params.id });
  res.send(_.pick(user, ["_id", "name", "email", "role"]));
});

module.exports = router;
