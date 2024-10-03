const { StockItem, validate } = require("../models/stockItem");
const auth = require("../middleware/auth");
const express = require("express");
const router = express.Router();

// Get all stock items (with optional search by name)
router.get("/", auth, async (req, res) => {
  const { searchTerm } = req.query;

  const query = searchTerm
    ? { name: { $regex: searchTerm, $options: "i" } }
    : {};

  const stockItems = await StockItem.find(query)
    .select("-__v")
    .sort("name");

  res.send(stockItems);
});

// Get stock item by ID
router.get("/:id", auth, async (req, res) => {
  const stockItem = await StockItem.findById(req.params.id).select("-__v");

  if (!stockItem)
    return res.status(404).send("The stock item with the given ID was not found.");

  res.send(stockItem);
});

// Add a new stock item
router.post("/", auth, async (req, res) => {
  const { error } = validate(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  let stockItem = new StockItem({
    name: req.body.name,
    amount: req.body.amount,
    price: req.body.price,
    customizations: req.body.customizations || []  // Customizations are optional
  });

  stockItem = await stockItem.save();
  res.send(stockItem);
});

// Update stock item
router.put("/:id", auth, async (req, res) => {
  const { error } = validate(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  const stockItem = await StockItem.findByIdAndUpdate(
    req.params.id,
    {
      name: req.body.name,
      amount: req.body.amount,
      price: req.body.price,
      customizations: req.body.customizations || []  // Customizations are optional
    },
    { new: true }
  );

  if (!stockItem)
    return res.status(404).send("The stock item with the given ID was not found.");

  res.send(stockItem);
});

// Delete stock item
router.delete("/:id", auth, async (req, res) => {
  const stockItem = await StockItem.findByIdAndRemove(req.params.id);

  if (!stockItem)
    return res.status(404).send("The stock item with the given ID was not found.");

  res.send(stockItem);
});

module.exports = router;