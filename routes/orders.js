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
const { broadcastMessage } = require("../services/webSocketService");
const { roundToNearestHalf } = require("../utils/helpers");
const logger = require("../startup/logging");

const router = express.Router();

const saveStockItem = async (stockItem) => {
  await stockItem.save();
  broadcastMessage(
    JSON.stringify({
      type: "action",
      message: "",
      reduxActionToBeDispatched: "fetchStockItemBackendAction",
      reduxActionPayloadToBeSent: stockItem._id,
    })
  ).catch((error) => logger.error("Broadcast error:", error));
};

router.get("/itemsPreperations", auth, async (req, res) => {
  // Fetch all orders with 'Initialized Status' (assuming orderStatusId === 1)
  const initializedOrders = await Order.find({
    orderStatusId: OrderStatusEnum.INITIALIZED,
  }).select("items");

  // Maps to keep track of required quantities and counts
  const itemQuantityMap = new Map(); // stockItemId => total amount
  const totalCountsMap = new Map(); // stockItemId => total count
  const customizationCountsMap = new Map(); // stockItemId => Map<customizationOptionKey, count>

  initializedOrders.forEach((order) => {
    order.items.forEach((item) => {
      const stockItemIdStr = item.stockItemId.toString();

      // Add the amount for this stockItemId
      itemQuantityMap.set(
        stockItemIdStr,
        (itemQuantityMap.get(stockItemIdStr) || 0) + item.amount
      );

      // Process counts if item.count is set
      if (item.count != null) {
        totalCountsMap.set(
          stockItemIdStr,
          (totalCountsMap.get(stockItemIdStr) || 0) + item.count
        );

        // Process customizations
        item.stockItemCustomizationsSelectedOptions.forEach(
          (customizationOption) => {
            const stockItemCustomizationIdStr =
              customizationOption.stockItemCustomizationId.toString();
            const stockItemCustomizationSelectedOptionIdStr =
              customizationOption.stockItemCustomizationSelectedOptionId.toString();

            const customizationOptionKey = `${stockItemCustomizationIdStr}_${stockItemCustomizationSelectedOptionIdStr}`;

            if (!customizationCountsMap.has(stockItemIdStr)) {
              customizationCountsMap.set(stockItemIdStr, new Map());
            }

            const stockItemCustomizationMap =
              customizationCountsMap.get(stockItemIdStr);

            stockItemCustomizationMap.set(
              customizationOptionKey,
              (stockItemCustomizationMap.get(customizationOptionKey) || 0) +
                item.count
            );
          }
        );
      }
    });
  });

  // Get all stockItemIds involved
  const stockItemIds = Array.from(
    new Set([...itemQuantityMap.keys(), ...totalCountsMap.keys()])
  );

  // Fetch stock items with customizations
  const stockItems = await StockItem.find({
    _id: { $in: stockItemIds },
  }).select("_id name amount customizations");

  // Prepare the final result
  const result = stockItems.map((stockItem) => {
    const stockItemIdStr = stockItem._id.toString();

    const totalOrderQuantity = itemQuantityMap.get(stockItemIdStr) || 0; // Quantity required by orders
    const stockAvailable = stockItem.amount || 0; // Available stock amount
    const requiredQuantity = totalOrderQuantity - stockAvailable; // Difference (can be negative if stock is sufficient)

    const totalCount = totalCountsMap.get(stockItemIdStr) || 0;

    const stockItemCustomizationMap =
      customizationCountsMap.get(stockItemIdStr) || new Map();

    // Prepare customizationsOptionsCount in the order of stockItem.customizations
    const customizationsOptionsCount = [];

    stockItem.customizations.forEach((customization) => {
      const stockItemCustomizationIdStr = customization._id.toString();
      const customizationName = customization.name;

      customization.options.forEach((option) => {
        const stockItemCustomizationSelectedOptionIdStr = option._id.toString();
        const optionName = option.name;

        const customizationOptionKey = `${stockItemCustomizationIdStr}_${stockItemCustomizationSelectedOptionIdStr}`;

        const count =
          stockItemCustomizationMap.get(customizationOptionKey) || 0;

        customizationsOptionsCount.push({
          stockItemCustomizationId: stockItemCustomizationIdStr,
          stockItemCustomizationName: customizationName,
          stockItemCustomizationSelectedOptionId:
            stockItemCustomizationSelectedOptionIdStr,
          stockItemCustomizationSelectedOptionName: optionName,
          count,
        });
      });
    });

    // Sum of counts in customizationsOptionsCount
    const sumOfCustomizationCounts = customizationsOptionsCount.reduce(
      (sum, item) => sum + item.count,
      0
    );

    // Ensure totalCount equals sumOfCustomizationCounts
    if (totalCount !== sumOfCustomizationCounts) {
      logger.warn(
        `Total count mismatch for stockItemId ${stockItemIdStr}: totalCount ${totalCount}, sumOfCustomizationCounts ${sumOfCustomizationCounts}`
      );
    }

    return {
      stockItemId: stockItem._id,
      stockItemName: stockItem.name,
      stockItemQuantity: stockAvailable,
      requiredQuantity: roundToNearestHalf(
        requiredQuantity > 0 ? requiredQuantity : 0
      ), // Only show positive required quantities
      stockItemCountDetails: {
        totalCount,
        customizationsOptionsCount,
      },
    };
  });

  // Send the result as the response
  res.send(result);
});

// Fetch all orders
router.get("/", auth, async (req, res) => {
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

  let orders = await Order.find().select("-__v");

  const populatedOrders = await Promise.all(
    orders.map(async (order) => {
      const customer = await Customer.findById(order.customerId).select("-__v");
      const orderStatus = OrderStatusDetails[order.orderStatusId];
      const itemsWithDetails = /*  await populateOrderItems(order.items); */ [];
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

  // Apply pagination
  const paginatedOrders = filteredOrders
    .sort(function (a, b) {
      return new Date(b.date) - new Date(a.date);
    })
    .slice(
      pageNumber * pageSize,
      Math.min((pageNumber + 1) * pageSize, filteredOrders.length)
    );

  // Return totalRecords, and paginated orders
  res.send({
    totalRecords,
    orders: paginatedOrders,
  });
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
    return res.status(400).send(error.details[0].message);
  }

  const { customerId, items, totalPrice, orderStatusId } = req.body;

  const order = new Order({
    customerId,
    items,
    totalPrice,
    orderStatusId:
      orderStatusId === 0 ? OrderStatusEnum.INITIALIZED : orderStatusId,
    createdByUserId: req.user._id,
  });

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

  // Send the HTTP response immediately after processing
  res.status(201).send(orderViewModel);

  // Broadcast the message without awaiting
  broadcastMessage(
    JSON.stringify({
      type: "action",
      message: "",
      reduxActionToBeDispatched: "statistics/increaseInitializedOrdersCountBy",
      reduxActionPayloadToBeSent: 1,
    })
  ).catch((error) => logger.error("Broadcast error:", error));

  broadcastMessage(
    JSON.stringify({
      type: "action",
      message: "",
      reduxActionToBeDispatched: "updateHomePage",
      reduxActionPayloadToBeSent: undefined,
    })
  ).catch((error) => logger.error("Broadcast error:", error));
});

// Update an order
router.put("/:id", auth, async (req, res) => {
  let body = req.body;
  const { error } = validate(body);
  if (error) return res.status(400).send(error.details[0].message);

  const oldOrder = await Order.findById(req.params.id).select("-__v");

  // handle logic if status changed
  if (oldOrder.orderStatusId !== body.orderStatusId) {
    body.statusChangeDate = new Date();

    if (body.orderStatusId == OrderStatusEnum.PROCESSING) {
      // Add your logic for processing status
      const sufficientItems = [];
      for (const item of oldOrder.items) {
        const stockItem = await StockItem.findById(item.stockItemId);
        if (!stockItem) {
          return res
            .status(404)
            .send(`StockItem with ID ${item.stockItemId} not found.`);
        }
        if (stockItem.amount >= item.amount) {
          sufficientItems.push(stockItem);
        } else {
          return res.status(200).send({
            error: true,
            message: `Not enough stock for item ${stockItem.name}.Available: ${stockItem.amount}, Ordered: ${item.amount}`,
          });
        }
      }

      // Iterate over each item in the order
      for (const item of oldOrder.items) {
        // Find the stock item in the database
        const stockItem = sufficientItems.find((stItem) =>
          stItem._id.equals(item.stockItemId)
        );
        stockItem.amount -= item.amount; // Reduce the stock

        // Save the updated stock item
        await saveStockItem(stockItem);
        if (stockItem.amount <= 5) {
          broadcastMessage(
            JSON.stringify({
              type: "action",
              message: "",
              reduxActionToBeDispatched: "utilities/showToast",
              reduxActionPayloadToBeSent: {
                message: `Stock Item ${stockItem.name} is about to be UNAVAILABLE, refill the stock as soon as possible`,
                severity: "warn",
                summary: "Low Stock Warning",
              },
            })
          ).catch((error) => logger.error("Broadcast error:", error));
        }
      }
      broadcastMessage(
        JSON.stringify({
          type: "action",
          message: "",
          reduxActionToBeDispatched:
            "statistics/increaseInitializedOrdersCountBy",
          reduxActionPayloadToBeSent: -1,
        })
      ).catch((error) => logger.error("Broadcast error:", error));
    } else if (body.orderStatusId == OrderStatusEnum.DELIVERED) {
      // No logic to be added for now
    } else if (body.orderStatusId == OrderStatusEnum.CANCELED) {
      // code here
      if (oldOrder.orderStatusId === OrderStatusEnum.INITIALIZED) {
        broadcastMessage(
          JSON.stringify({
            type: "action",
            message: "",
            reduxActionToBeDispatched:
              "statistics/increaseInitializedOrdersCountBy",
            reduxActionPayloadToBeSent: -1,
          })
        ).catch((error) => logger.error("Broadcast error:", error));
      } else if (oldOrder.orderStatusId === OrderStatusEnum.PROCESSING) {
        for (const item of oldOrder.items) {
          // Find the stock item in the database
          const stockItem = await StockItem.findById(item.stockItemId);
          if (!stockItem) {
            return res
              .status(404)
              .send(`StockItem with ID ${item.stockItemId} not found.`);
          }

          // Increase the stock amount by the ordered amount
          stockItem.amount += item.amount;
          // Save the updated stock item
          await saveStockItem(stockItem);
        }
      }
    }
  } else {
    // handle logic if status not changed

    // if the order is initialized
    if (body.orderStatusId == OrderStatusEnum.INITIALIZED) {
      // No logic to be added for now
    } else if (body.orderStatusId == OrderStatusEnum.PROCESSING) {
      // return items to stock
      for (const item of oldOrder.items) {
        // Find the stock item in the database
        const stockItem = await StockItem.findById(item.stockItemId);
        if (!stockItem) {
          return res
            .status(404)
            .send(`StockItem with ID ${item.stockItemId} not found.`);
        }

        // Increase the stock amount by the ordered amount
        stockItem.amount += item.amount;
        // Save the updated stock item
        await saveStockItem(stockItem);
      }
      // change the order status to INITIALIZED
      body.orderStatusId = OrderStatusEnum.INITIALIZED;
      broadcastMessage(
        JSON.stringify({
          type: "action",
          message: "",
          reduxActionToBeDispatched:
            "statistics/increaseInitializedOrdersCountBy",
          reduxActionPayloadToBeSent: 1,
        })
      ).catch((error) => logger.error("Broadcast error:", error));
    } else if (body.orderStatusId == OrderStatusEnum.DELIVERED) {
      return res.status(400).send("Cannot Edit DELIVERED Orders.");
    } else if (body.orderStatusId == OrderStatusEnum.CANCELED) {
      return res.status(400).send("Cannot Edit CANCELED Orders.");
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
  broadcastMessage(
    JSON.stringify({
      type: "action",
      message: "",
      reduxActionToBeDispatched: "updateHomePage",
      reduxActionPayloadToBeSent: undefined,
    })
  ).catch((error) => logger.error("Broadcast error:", error));
  res.send(orderViewModel);
});

// Delete an order
router.delete("/:id", auth, async (req, res) => {
  const order = await Order.findByIdAndRemove(req.params.id).select("-__v");
  if (!order) return res.status(404).send("Order not found");
  res.send(order);
});

// Helper function to populate order items
const populateOrderItems = async (items) => {
  return Promise.all(
    items.map(async (item) => {
      try {
        const stockItem = await StockItem.findById(item.stockItemId).select(
          "-__v"
        );
        if (!stockItem) return null; // Skip this item if the stock item is not found

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
          count: item.count,
          price: item.price,
        };
      } catch (error) {
        // Log error and skip item without throwing
        logger.error(`Error populating order item: ${error.message}`);
        return null; // Skip this item if an error occurs
      }
    })
  ).then((populatedItems) => populatedItems.filter((item) => item !== null)); // Filter out null items
};

module.exports = router;
