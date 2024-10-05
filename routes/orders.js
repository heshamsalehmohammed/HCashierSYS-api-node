const {
  OrderStatusDetails,
  OrderStatusEnum,
} = require("../utils/orderStatusEnum");
const { Customer } = require("../models/customer");
const { StockItem } = require("../models/stockItem");
const { Order, validate } = require("../models/order");
const auth = require("../middleware/auth");
const express = require("express");
const { applyFilter } = require("../utils/filters");
const router = express.Router();

router.get("/itemsPreperations", auth, async (req, res) => {
  try {
    // Fetch all orders with 'Initialized Status' (assuming orderStatusId === 1 means Initialized)
    const initializedOrders = await Order.find({
      orderStatusId: OrderStatusEnum.INITIALIZED,
    }).select("items");

    // Calculate required quantity for each stock item across all orders
    const itemQuantityMap = new Map(); // To keep track of total quantity required per stock item

    initializedOrders.forEach((order) => {
      order.items.forEach((item) => {
        const { stockItemId, amount } = item;

        // Add the amount for this stockItemId
        if (itemQuantityMap.has(stockItemId)) {
          itemQuantityMap.set(
            stockItemId,
            itemQuantityMap.get(stockItemId) + amount
          );
        } else {
          itemQuantityMap.set(stockItemId, amount);
        }
      });
    });

    // Fetch stock items from the StockItem collection based on the stockItemIds
    const stockItemIds = Array.from(itemQuantityMap.keys());
    const stockItems = await StockItem.find({
      _id: { $in: stockItemIds },
    }).select("name amount");

    // Prepare the final result
    const result = stockItems.map((stockItem) => {
      const totalOrderQuantity = itemQuantityMap.get(stockItem._id) || 0; // Quantity required by orders
      const stockAvailable = stockItem.amount || 0; // Available stock amount
      const requiredQuantity = totalOrderQuantity - stockAvailable; // Difference (can be negative if stock is sufficient)

      return {
        stockItemId: stockItem._id,
        stockItemName: stockItem.name,
        stockItemQuantity: stockAvailable,
        requiredQuantity: requiredQuantity > 0 ? requiredQuantity : 0, // Only show positive required quantities
      };
    });

    // Send the result as the response
    res.send(result);
  } catch (error) {
    res.status(500).send(error.message);
  }
});

// Fetch all orders
router.get("/", auth, async (req, res) => {
  try {
    const {
      customerName,
      customerNameFilterMatchMode,
      customerPhone,
      customerPhoneFilterMatchMode,
      totalPrice,
      totalPriceFilterMatchMode,
      date,
      dateFilterMatchMode,
      statusChangeDate,
      statusChangeDateFilterMatchMode,
      orderStatusId,
      orderStatusIdFilterMatchMode,
      pageNumber = 0,
      pageSize = 5,
    } = req.query;

    // Fetch all orders from the database (without pagination)
    let orders = await Order.find().select("-__v");

    const populatedOrders = await Promise.all(
      orders.map(async (order) => {
        const customer = await Customer.findById(order.customerId).select(
          "-__v"
        );
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

    // Apply filtering using ComparisonOperators
    let filteredOrders = populatedOrders;

    if (customerName) {
      filteredOrders = filteredOrders.filter((order) =>
        applyFilter(
          customerNameFilterMatchMode,
          order.customer.name,
          customerName
        )
      );
    }

    if (customerPhone) {
      filteredOrders = filteredOrders.filter((order) =>
        applyFilter(
          customerPhoneFilterMatchMode,
          order.customer.phone,
          customerPhone
        )
      );
    }

    if (totalPrice) {
      filteredOrders = filteredOrders.filter((order) =>
        applyFilter(
          totalPriceFilterMatchMode,
          order.totalPrice,
          parseFloat(totalPrice)
        )
      );
    }

    if (date) {
      filteredOrders = filteredOrders.filter((order) =>
        applyFilter(dateFilterMatchMode, order.date, date)
      );
    }

    if (statusChangeDate) {
      filteredOrders = filteredOrders.filter((order) =>
        applyFilter(
          statusChangeDateFilterMatchMode,
          order.statusChangeDate,
          statusChangeDate
        )
      );
    }

    if (orderStatusId) {
      filteredOrders = filteredOrders.filter((order) =>
        applyFilter(
          orderStatusIdFilterMatchMode,
          order.orderStatusId,
          parseInt(orderStatusId)
        )
      );
    }

    // Calculate total number of records before pagination
    const totalRecords = filteredOrders.length;

    // Calculate initialized state orders count (assuming orderStatusId 1 means "initialized")
    const initializedStateOrdersCount = filteredOrders.filter(
      (order) => order.orderStatusId === OrderStatusEnum.INITIALIZED // Change this condition as per your "initialized" state logic
    ).length;

    // Apply pagination
    const paginatedOrders = filteredOrders.slice(
      pageNumber * pageSize,
      Math.min((pageNumber + 1) * pageSize, filteredOrders.length)
    );

    // Return totalRecords, initializedStateOrdersCount, and paginated orders
    res.send({
      totalRecords,
      initializedStateOrdersCount,
      orders: paginatedOrders,
    });
  } catch (error) {
    res.status(500).send(error.message);
  }
});

// Fetch an order by ID
router.get("/:id", auth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).select("-__v");
    if (!order) return res.status(404).send("Order not found");

    const customer = await Customer.findById(order.customerId).select("-__v");
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
    createdByUserId: req.user._id,
  });

  try {
    const savedOrder = await order.save();

    const customer = await Customer.findById(savedOrder.customerId).select(
      "-__v"
    );
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
    const oldOrder = await Order.findById(req.params.id).select("-__v");
    if (oldOrder.orderStatusId !== body.orderStatusId) {
      body.statusChangeDate = new Date();

      // If order status changes to DELIVERED
      if (body.orderStatusId == OrderStatusEnum.DELIVERED) {
        // Iterate over each item in the order
        for (const item of oldOrder.items) {
          // Find the stock item in the database
          const stockItem = await StockItem.findById(item.stockItemId);
          if (!stockItem) {
            return res.status(404).send(`StockItem with ID ${item.stockItemId} not found.`);
          }

          // Decrease the stock amount by the ordered amount
          if (stockItem.amount >= item.amount) {
            stockItem.amount -= item.amount; // Reduce the stock
          } else {
            return res.status(400).send(
              `Not enough stock for item ${stockItem.name}. Available: ${stockItem.amount}, Ordered: ${item.amount}`
            );
          }

          // Save the updated stock item
          await stockItem.save();
        }
      } else if (body.orderStatusId == OrderStatusEnum.PROCESSING) {
        // Add your logic for processing status here if needed
      }
    }

    // Update the order
    const updatedOrder = await Order.findByIdAndUpdate(
      req.params.id,
      { ...body, updatedByUserId: req.user._id, updatedDate: new Date() },
      { new: true }
    ).select("-__v");

    if (!updatedOrder) return res.status(404).send("Order not found");

    // Get customer details and populate items with details
    const customer = await Customer.findById(updatedOrder.customerId).select(
      "-__v"
    );
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
    const order = await Order.findByIdAndRemove(req.params.id).select("-__v");
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
        const stockItem = await StockItem.findById(item.stockItemId).select(
          "-__v"
        );
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
