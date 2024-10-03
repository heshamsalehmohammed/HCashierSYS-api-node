const Joi = require("joi");
const mongoose = require("mongoose");

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
    type: [CustomizationSchema], // Customizations are optional and can be an array of objects
    default: [],
  },
});

const StockItem = mongoose.model("StockItem", StockItemSchema);

function validateStockItem(stockItem) {
  const schema = Joi.object({
    name: Joi.string().min(1).max(100).required(),
    amount: Joi.number().min(0),
    price: Joi.number().min(0),
    customizations: Joi.array()
      .items(
        Joi.object({
          name: Joi.string().min(1).max(100).required(),
          options: Joi.array()
            .items(
              Joi.object({
                name: Joi.string().min(1).max(100).required(),
                additionalPrice: Joi.number().min(0),
              })
            )
            .optional(), // Options can be empty
        })
      )
      .optional(), // Customizations are optional
  });

  return schema.validate(stockItem);
}

exports.StockItem = StockItem;
exports.validate = validateStockItem;
