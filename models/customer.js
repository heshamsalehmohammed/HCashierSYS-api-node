const Joi = require("joi");
const JoiObjectId = require("joi-objectid")(Joi);
const mongoose = require("mongoose");
const timestampsAndUserTracking = require("../utils/timestampsAndUserTracking");

const CustomerSchema = new mongoose.Schema({
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
  notes: {
    type: String,
    required: false,
    minlength: 0,
    maxlength: 5000,
  },
  tombstone: {
    type: String,
    required: false,
    minlength: 0,
    maxlength: 5000,
  },
  isDeleted: {
    type: Boolean,
    default: false,
  },
  ...timestampsAndUserTracking,
});

const Customer = mongoose.model("Customer", CustomerSchema);

function validateCustomer(customer) {
  const schema = Joi.object({
    name: Joi.string().min(5).max(100).required(),
    phone: Joi.string().min(5).max(50).required(),
    address: Joi.string().min(5).max(5000).required(),
    notes: Joi.string().min(0).max(5000).optional(),
    tombstone: Joi.string().min(0).max(5000).optional(),
    
    createdByUserId: Joi.alternatives().try(JoiObjectId(),Joi.allow(null)).optional(),
    creationDate: Joi.alternatives().try(Joi.date(),Joi.allow(null)).optional(),
  
    updatedByUserId: Joi.alternatives().try(JoiObjectId(),Joi.allow(null)).optional(),
    updatedDate: Joi.alternatives().try(Joi.date(),Joi.allow(null)).optional(),
  
    deletedByUserId: Joi.alternatives().try(JoiObjectId(),Joi.allow(null)).optional(),
    deletionDate: Joi.alternatives().try(Joi.date(),Joi.allow(null)).optional(),
  });

  return schema.validate(customer);
}

exports.Customer = Customer;
exports.validate = validateCustomer;
