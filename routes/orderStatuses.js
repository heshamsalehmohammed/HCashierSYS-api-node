const express = require('express');
const router = express.Router();
const { OrderStatusDetails } = require('../utils/orderStatusEnum');

// Fetch all order statuses
router.get('/', (req, res) => {
  try {
    // Convert OrderStatusDetails to an array of values
    const orderStatuses = Object.values(OrderStatusDetails);
    res.send(orderStatuses);
  } catch (error) {
    res.status(500).send("An error occurred while fetching order statuses.");
  }
});

// Fetch an order status by ID
router.get('/:id', (req, res) => {
  const orderStatusId = parseInt(req.params.id, 10);

  const orderStatus = OrderStatusDetails[orderStatusId];

  if (!orderStatus) {
    return res.status(404).send('Order status not found');
  }

  res.send(orderStatus);
});

module.exports = router;
