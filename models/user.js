const config = require("config");
const jwt = require("jsonwebtoken");
const Joi = require("joi");
const JoiObjectId = require("joi-objectid")(Joi);
const mongoose = require("mongoose");
const timestampsAndUserTracking = require("../utils/timestampsAndUserTracking");


const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    minlength: 2,
    maxlength: 50,
    unique: true,
  },
  email: {
    type: String,
    required: true,
    minlength: 5,
    maxlength: 255,
    unique: true,
  },
  password: {
    type: String,
    required: true,
    minlength: 5,
    maxlength: 1024,
  },
  role: {
    type: String,
    enum: ['master', 'admin', 'user'], // Define the valid roles
    default: 'user', // Default to 'user' if not specified
  },
  isDeleted: {
    type: Boolean,
    default: false,
  },
  ...timestampsAndUserTracking,
});



userSchema.methods.generateAuthToken = function() {
  const token = jwt.sign(
    {
      _id: this._id,
      name: this.name,
      email: this.email,
      role: this.role // Include the role (master, admin, user) in the token
    },
    config.get("jwtPrivateKey")
  );
  return token;
};

const User = mongoose.model("User", userSchema);

function validateUser(user) {
  const schema = Joi.object({
    name: Joi.string().min(2).max(50).required(),
    email: Joi.string().min(5).max(255).required().email(),
    password: Joi.string().min(5).max(255).required(),
    role: Joi.string().valid('user', 'admin', 'master').required(),

    createdByUserId: Joi.alternatives().try(JoiObjectId(),Joi.allow(null)).optional(),
    creationDate: Joi.alternatives().try(Joi.date(),Joi.allow(null)).optional(),
  
    updatedByUserId: Joi.alternatives().try(JoiObjectId(),Joi.allow(null)).optional(),
    updatedDate: Joi.alternatives().try(Joi.date(),Joi.allow(null)).optional(),
  
    deletedByUserId: Joi.alternatives().try(JoiObjectId(),Joi.allow(null)).optional(),
    deletionDate: Joi.alternatives().try(Joi.date(),Joi.allow(null)).optional(),
  });

  return schema.validate(user);
}

exports.User = User;
exports.validate = validateUser;
