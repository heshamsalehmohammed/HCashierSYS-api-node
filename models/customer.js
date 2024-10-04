const Joi = require("joi");
const mongoose = require("mongoose");

const Customer = mongoose.model(
  "Customer",
  new mongoose.Schema({
    name: {
      type: String,
      required: true,
      minlength: 5,
      maxlength: 100,
    },
    phone: {
      type: String,
      required: true,
      minlength: 5,
      maxlength: 50,
    },
    address: {
      type: String,
      required: true,
      minlength: 5,
      maxlength: 5000,
    },
    creationDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
  })
);

function validateCustomer(customer) {
  const schema = {
    name: Joi.string().min(5).max(100).required(),
    phone: Joi.string().min(5).max(50).required(),
    address: Joi.string().min(5).max(5000).required(),
  };

  return Joi.validate(customer, schema);
}

exports.Customer = Customer;
exports.validate = validateCustomer;
