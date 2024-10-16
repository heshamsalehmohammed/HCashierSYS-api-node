const Joi = require("joi");
const JoiObjectId = require("joi-objectid")(Joi); // Pass Joi explicitly to initialize joi-objectid
const mongoose = require("mongoose");
const timestampsAndUserTracking = require("../utils/timestampsAndUserTracking");

// Order Item Customizations Schema
const OrderItemCustomizationSchema = new mongoose.Schema({
  stockItemCustomizationId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  stockItemCustomizationSelectedOptionId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  stockItemCustomizationSelectedOptionAdditionalPrice: {
    type: Number,
    required: true,
  },
});

// Order Item Schema
const OrderItemSchema = new mongoose.Schema({
  stockItemId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  stockItemPrice: {
    type: Number,
    required: true,
  },
  stockItemCustomizationsSelectedOptions: [OrderItemCustomizationSchema],
  amount: {
    type: Number,
    required: true,
  }, 
  count: {
    type: Number,
    required: false,
  }, 
  price: {
    type: Number,
    required: true,
  },
});

// Order Schema

const OrderSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true,
    default: Date.now,
  },
  statusChangeDate: {
    type: Date,
    default: null,
  },
  updatedDate: {
    type: Date,
    default: null,
  },
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  items: [OrderItemSchema],
  totalPrice: {
    type: Number,
    required: true,
  },
  orderStatusId: {
    type: Number,
    required: true,
  },
  ...timestampsAndUserTracking,
});

const Order = mongoose.model("Order", OrderSchema);

function validateOrder(order) {
  const schema = Joi.object({
    customerId: JoiObjectId().required(), // Use JoiObjectId() for ObjectId validation
    items: Joi.array()
      .items(
        Joi.object({
          stockItemId: JoiObjectId().required(),
          stockItemPrice: Joi.number().required(),
          stockItemCustomizationsSelectedOptions: Joi.array().items(
            Joi.object({
              stockItemCustomizationId: JoiObjectId().required(),
              stockItemCustomizationSelectedOptionId: JoiObjectId().required(),
              stockItemCustomizationSelectedOptionAdditionalPrice:
                Joi.number().required(),
            })
          ),
          amount: Joi.number().required(),
          count: Joi.number().optional(),
          price: Joi.number().required(),
        })
      )
      .required(),
    totalPrice: Joi.number().required(),
    orderStatusId: Joi.number().valid(0, 1, 2, 3, 4).required(), // Order status validation

    
    createdByUserId: Joi.alternatives().try(JoiObjectId(),Joi.allow(null)).optional(),
    creationDate: Joi.alternatives().try(Joi.date(),Joi.allow(null)).optional(),
  
    updatedByUserId: Joi.alternatives().try(JoiObjectId(),Joi.allow(null)).optional(),
    updatedDate: Joi.alternatives().try(Joi.date(),Joi.allow(null)).optional(),
  
    deletedByUserId: Joi.alternatives().try(JoiObjectId(),Joi.allow(null)).optional(),
    deletionDate: Joi.alternatives().try(Joi.date(),Joi.allow(null)).optional(),
  });

  return schema.validate(order);
}

exports.Order = Order;
exports.validate = validateOrder;
