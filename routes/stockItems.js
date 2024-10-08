const { StockItem, validate } = require("../models/stockItem");
const auth = require("../middleware/auth");
const express = require("express");
const { broadcastMessage } = require("../services/webSocketService");
const router = express.Router();

// Get all stock items (with optional search by name)
router.get("/", [auth /* , role("master") */], async (req, res) => {
  try {
    const { searchTerm } = req.query;

    const query = {
      isDeleted: false, // Only fetch non-deleted items
      ...(searchTerm && { name: { $regex: searchTerm, $options: "i" } }),
    };

    const stockItems = await StockItem.find(query).select("-__v").sort("name");

    res.send(stockItems);
  } catch (error) {
    res.status(500).send(error.message);
  }
});

// Get stock item by ID
router.get("/:id", auth, async (req, res) => {
  try {
    const stockItem = await StockItem.findById(req.params.id).select("-__v");

    if (!stockItem)
      return res
        .status(404)
        .send("The stock item with the given ID was not found.");

    res.send(stockItem);
  } catch (error) {
    res.status(500).send(error.message);
  }
});

// Add a new stock item
router.post("/", auth, async (req, res) => {
  const { error } = validate(req.body);
  if (error) return res.status(400).send(error.details[0].message);
  try {
    let stockItem = new StockItem({
      name: req.body.name,
      amount: req.body.amount,
      price: req.body.price,
      customizations: req.body.customizations || [], // Customizations are optional
      createdByUserId: req.user._id,
    });

    stockItem = await stockItem.save();
    res.send(stockItem);
  } catch (error) {
    res.status(500).send(error.message);
  }
});

// Update stock item
router.put("/:id", auth, async (req, res) => {
  const { error } = validate(req.body);

  if (error) return res.status(400).send(error.details[0].message);

  try {
    const stockItem = await StockItem.findByIdAndUpdate(
      req.params.id,
      {
        name: req.body.name,
        amount: req.body.amount,
        price: req.body.price,
        customizations: req.body.customizations || [], // Customizations are optional
        updatedByUserId: req.user._id,
        updatedDate: new Date(),
      },
      { new: true }
    );

    if (!stockItem)
      return res
        .status(404)
        .send("The stock item with the given ID was not found.");

    broadcastMessage(
      JSON.stringify({
        type: "action",
        message: "",
        reduxActionToBeDispatched: "fetchStockItemBackendAction",
        reduxActionPayloadToBeSent: stockItem._id,
      })
    ).catch((error) => console.error("Broadcast error:", error));
    res.send(stockItem);
  } catch (error) {
    res.status(500).send(error.message);
  }
});

// Delete stock item
router.delete("/:id", auth, async (req, res) => {
  try {
    const stockItem = await StockItem.findByIdAndUpdate(
      req.params.id,
      {
        isDeleted: true,
        deletedByUserId: req.user._id,
        deletionDate: new Date(),
      }, // Mark the item as deleted
      { new: true }
    );

    if (!stockItem)
      return res
        .status(404)
        .send("The stock item with the given ID was not found.");

    res.send(stockItem);
  } catch (error) {
    res.status(500).send(error.message);
  }
});

module.exports = router;
