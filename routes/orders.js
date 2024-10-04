const {
  OrderStatusDetails,
  OrderStatusEnum,
} = require("../utils/orderStatusEnum");
const {Customer} = require("../models/customer");
const {StockItem} = require("../models/stockItem");
const { Order, validate } = require("../models/order");
const auth = require("../middleware/auth");
const express = require("express");
const router = express.Router();

// Fetch all orders
router.get("/", auth, async (req, res) => {
  try {
    const orders = await Order.find();
    const populatedOrders = await Promise.all(
      orders.map(async (order) => {
        const customer = await Customer.findById(order.customerId);
        const orderStatus = OrderStatusDetails[order.orderStatusId];
        const itemsWithDetails = await populateOrderItems(order.items);
        return {
          ...order._doc,
          customer,
          orderStatus,
          items: itemsWithDetails,
        };
      })
    );
    res.send(populatedOrders);
  } catch (error) {
    res.status(500).send(error.message);
  }
});

// Fetch an order by ID
router.get("/:id", auth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).send("Order not found");

    const customer = await Customer.findById(order.customerId);
    const orderStatus = OrderStatusDetails[order.orderStatusId];
    const itemsWithDetails = await populateOrderItems(order.items);

    const orderViewModel = {
      ...order._doc,
      customer,
      orderStatus,
      items: itemsWithDetails,
    };

    res.send(orderViewModel);
  } catch (error) {
    res.status(500).send(error.message);
  }
});

// Create a new order
router.post("/", auth, async (req, res) => {
  const { error } = validate(req.body);
  if (error) {
    console.log("Validation error:", error);
    return res.status(400).send(error.details[0].message);
  }

  console.log("Validation successful, body:", req.body);
  const { customerId, items, totalPrice, orderStatusId } = req.body;

  const order = new Order({
    customerId,
    items,
    totalPrice,
    orderStatusId:
      orderStatusId === 0 ? OrderStatusEnum.INITIALIZED : orderStatusId,
  });

  try {
    const savedOrder = await order.save();


    const customer = await Customer.findById(savedOrder.customerId);
    const orderStatus = OrderStatusDetails[savedOrder.orderStatusId];
    const itemsWithDetails = await populateOrderItems(savedOrder.items);

    const orderViewModel = {
      ...savedOrder._doc,
      customer,
      orderStatus,
      items: itemsWithDetails,
    };

    res.status(201).send(orderViewModel);
  } catch (error) {
    console.log("Error saving order:", error);
    res.status(400).send(error.message);
  }
});
// Update an order
router.put("/:id", auth, async (req, res) => {
  let body = req.body;
  const { error } = validate(body);
  if (error) return res.status(400).send(error.details[0].message);

  try {
    const oldOrder = await Order.findById(req.params.id);
    if (oldOrder.statusChangeDate != body.statusChangeDate) {
      body.statusChangeDate = new Date();
    }
    body.updatedDate = new Date();
    const updatedOrder = await Order.findByIdAndUpdate(req.params.id, body, {
      new: true,
    });
    if (!updatedOrder) return res.status(404).send("Order not found");

    const customer = await Customer.findById(updatedOrder.customerId);
    const orderStatus = OrderStatusDetails[updatedOrder.orderStatusId];
    const itemsWithDetails = await populateOrderItems(updatedOrder.items);

    const orderViewModel = {
      ...updatedOrder._doc,
      customer,
      orderStatus,
      items: itemsWithDetails,
    };


    res.send(orderViewModel);
  } catch (error) {
    res.status(500).send(error.message);
  }
});

// Delete an order
router.delete("/:id", auth, async (req, res) => {
  try {
    const order = await Order.findByIdAndRemove(req.params.id);
    if (!order) return res.status(404).send("Order not found");
    res.send(order);
  } catch (error) {
    res.status(500).send(error.message);
  }
});

// Helper function to populate order items
const populateOrderItems = async (items) => {
  return Promise.all(
    items.map(async (item) => {
      try {
        const stockItem = await StockItem.findById(item.stockItemId);
        if (!stockItem) throw new Error("Stock item not found");

        const stockItemCustomizations =
          item.stockItemCustomizationsSelectedOptions.map((customization) => {
            const customizationName = stockItem.customizations.find((c) =>
              c._id.equals(customization.stockItemCustomizationId)
            );
            const optionName = customizationName.options.find((o) =>
              o._id.equals(customization.stockItemCustomizationSelectedOptionId)
            );

            return {
              stockItemCustomizationId: customization.stockItemCustomizationId,
              stockItemCustomizationName: customizationName.name,
              stockItemCustomizationSelectedOptionId:
                customization.stockItemCustomizationSelectedOptionId,
              stockItemCustomizationSelectedOptionName: optionName.name,
              stockItemCustomizationSelectedOptionAdditionalPrice:
                customization.stockItemCustomizationSelectedOptionAdditionalPrice,
            };
          });

        return {
          stockItemId: item.stockItemId,
          stockItemName: stockItem.name,
          stockItemPrice: item.stockItemPrice,
          stockItemCustomizationsSelectedOptions: stockItemCustomizations,
          amount: item.amount,
          price: item.price,
        };
      } catch (error) {
        throw new Error(
          `Error populating order item details: ${error.message}`
        );
      }
    })
  );
};

module.exports = router;
