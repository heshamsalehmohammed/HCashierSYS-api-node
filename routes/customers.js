const { Customer, validate } = require("../models/customer");
const auth = require("../middleware/auth");
const express = require("express");
const router = express.Router();

router.get("/", auth, async (req, res) => {
  try {
    const { searchTerm } = req.query;

    if (!searchTerm || typeof searchTerm !== "string") {
      return res.status(400).send("Invalid search term");
    }
    const customers = await Customer.find({
      isDeleted: false, // Only fetch non-deleted items
      $or: [
        { name: { $regex: searchTerm, $options: "i" } }, // Case-insensitive search on name
        { phone: { $regex: searchTerm, $options: "i" } }, // Case-insensitive search on phone
      ],
    })
      .select("-__v")
      .sort("name");
    res.send(customers);
  } catch (error) {
    res.status(500).send(error.message);
  }
});

router.post("/", auth, async (req, res) => {
  const { error } = validate(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  try {
    let customer = new Customer({
      name: req.body.name,
      address: req.body.address,
      phone: req.body.phone,
      notes: req.body.notes,
      tombstone: req.body.tombstone,
      createdByUserId: req.user._id,
    });
    customer = await customer.save();

    res.send(customer);
  } catch (error) {
    res.status(500).send(error.message);
  }
});

router.put("/:id", auth, async (req, res) => {
  const { error } = validate(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  try {
    const customer = await Customer.findByIdAndUpdate(
      req.params.id,
      {
        name: req.body.name,
        address: req.body.address,
        phone: req.body.phone,
        notes: req.body.notes,
        tombstone: req.body.tombstone,
        updatedByUserId: req.user._id,
        updatedDate: new Date(),
      },
      { new: true }
    );

    if (!customer)
      return res
        .status(404)
        .send("The customer with the given ID was not found.");

    res.send(customer);
  } catch (error) {
    res.status(500).send(error.message);
  }
});

router.delete("/:id", auth, async (req, res) => {
  try {
    const customer = await Customer.findByIdAndUpdate(
      req.params.id,
      {
        isDeleted: true,
        deletedByUserId: req.user._id,
        deletionDate: new Date(),
      }, // Mark the item as deleted
      { new: true }
    );

    if (!customer)
      return res
        .status(404)
        .send("The customer with the given ID was not found.");

    res.send(customer);
  } catch (error) {
    res.status(500).send(error.message);
  }
});

router.get("/:id", auth, async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id).select("-__v");

    if (!customer)
      return res
        .status(404)
        .send("The customer with the given ID was not found.");

    res.send(customer);
  } catch (error) {
    res.status(500).send(error.message);
  }
});

module.exports = router;
