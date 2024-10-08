const Joi = require("joi");
const JoiObjectId = require("joi-objectid")(Joi);
const mongoose = require("mongoose");
const timestampsAndUserTracking = require("../utils/timestampsAndUserTracking");

const CustomizationOptionSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    minlength: 1,
    maxlength: 100,
  },
  additionalPrice: {
    type: Number,
    required: false,
    min: 0,
  },
});

const CustomizationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    minlength: 1,
    maxlength: 100,
  },
  options: {
    type: [CustomizationOptionSchema], // Array of objects (name and additionalPrice)
    default: [],
  },
});

const StockItemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    minlength: 1,
    maxlength: 100,
  },
  amount: {
    type: Number,
    required: false,
    min: 0,
  },
  price: {
    type: Number,
    required: false,
    min: 0,
  },
  customizations: {
    type: [CustomizationSchema],
    default: [],
  },
  isDeleted: {
    type: Boolean,
    default: false,
  },
  ...timestampsAndUserTracking,
});

const StockItem = mongoose.model("StockItem", StockItemSchema);

function validateStockItem(stockItem) {
  const schema = Joi.object({
    name: Joi.string().min(1).max(100).required(),
    amount: Joi.number().min(0).optional(),
    price: Joi.number().min(0).optional(),
    customizations: Joi.array()
      .items(
        Joi.object({
          name: Joi.string().min(1).max(100).required(),
          options: Joi.array()
            .items(
              Joi.object({
                name: Joi.string().min(1).max(100).required(),
                additionalPrice: Joi.number().min(0).optional(),
              })
            )
            .required(), // Options can be empty
        })
      )
      .optional(), // Customizations are optional

    createdByUserId: Joi.alternatives()
      .try(JoiObjectId(), Joi.allow(null))
      .optional(),
    creationDate: Joi.alternatives()
      .try(Joi.date(), Joi.allow(null))
      .optional(),

    updatedByUserId: Joi.alternatives()
      .try(JoiObjectId(), Joi.allow(null))
      .optional(),
    updatedDate: Joi.alternatives().try(Joi.date(), Joi.allow(null)).optional(),

    deletedByUserId: Joi.alternatives()
      .try(JoiObjectId(), Joi.allow(null))
      .optional(),
    deletionDate: Joi.alternatives()
      .try(Joi.date(), Joi.allow(null))
      .optional(),
  });

  return schema.validate(stockItem);
}

exports.StockItem = StockItem;
exports.validate = validateStockItem;
