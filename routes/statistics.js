const express = require("express");
const router = express.Router();
const {Order} = require("../models/order");
const {User} = require("../models/user");
const {StockItem} = require("../models/stockItem");

// Helper function to calculate date range based on days
const getDateRange = (days) => {
  const currentDate = new Date();
  const pastDate = new Date();
  pastDate.setDate(currentDate.getDate() - days);
  return { start: pastDate, end: currentDate };
};

// New route for fetching statistics
router.get("/", async (req, res) => {
    try {
      const {
        selectedInitializedOrdersCountOption,
        selectedMostSoldStockItemOption,
        selectedNewlyAddedUsersCountOption,
      } = req.query;
  
      // Date ranges based on the provided criteria
      const { start: initializedStart, end: initializedEnd } = getDateRange(selectedInitializedOrdersCountOption);
      const { start: mostSoldStart, end: mostSoldEnd } = getDateRange(selectedMostSoldStockItemOption);
      const { start: newlyAddedStart, end: newlyAddedEnd } = getDateRange(selectedNewlyAddedUsersCountOption);
  
      // 1. Fetch initialized orders count within the selected date range
      const initializedOrders = await Order.find({
        orderStatusId: 1, // Assuming orderStatusId === 1 means "Initialized"
        date: { $gte: initializedStart, $lte: initializedEnd },
      });
  
      const initializedOrdersCount = initializedOrders.length;
  
      // Total orders for the percentage calculation
      const totalOrders = await Order.countDocuments();
  
      const initializedOrdersCountPercent =
        totalOrders > 0 ? ((initializedOrdersCount / totalOrders) * 100).toFixed(2) : 0;
  
      // 2. Fetch newly added users count within the selected date range
      const newlyAddedUsers = await User.find({
        creationDate: { $gte: newlyAddedStart, $lte: newlyAddedEnd },
      });
  
      const newlyAddedUsersCount = newlyAddedUsers.length;
  
      // Total users for the percentage calculation
      const totalUsers = await User.countDocuments();
  
      const newlyAddedUsersCountPercent =
        totalUsers > 0 ? ((newlyAddedUsersCount / totalUsers) * 100).toFixed(2) : 0;
  
      // 3. Find the most sold stock item in all orders (not just initialized)
      const ordersWithinPeriod = await Order.find({
        date: { $gte: mostSoldStart, $lte: mostSoldEnd },
        orderStatusId: { $in: [1, 2, 3] }, // Assuming 1 = initialized, 2 = processing, 3 = delivered
      });
  
      // Count stock item quantities
      const stockItemCountMap = new Map();
      ordersWithinPeriod.forEach((order) => {
        order.items.forEach((item) => {
          const { stockItemId, amount } = item;
          if (stockItemCountMap.has(stockItemId)) {
            stockItemCountMap.set(stockItemId, stockItemCountMap.get(stockItemId) + amount);
          } else {
            stockItemCountMap.set(stockItemId, amount);
          }
        });
      });
  
      // Find the stock item with the highest count
      let mostSoldStockItemId = null;
      let maxCount = 0;
      stockItemCountMap.forEach((count, stockItemId) => {
        if (count > maxCount) {
          maxCount = count;
          mostSoldStockItemId = stockItemId;
        }
      });
  
      // Fetch the name of the most sold stock item
      let mostSoldStockItem = "";
      if (mostSoldStockItemId) {
        const stockItem = await StockItem.findById(mostSoldStockItemId).select("name");
        mostSoldStockItem = stockItem ? stockItem.name : "";
      }
  
      // 4. Return the final viewModel
      const viewModel = {
        initializedOrdersCount,
        initializedOrdersCountPercent: parseFloat(initializedOrdersCountPercent), // Convert back to number
        mostSoldStockItem,
        newlyAddedUsersCount,
        newlyAddedUsersCountPercent: parseFloat(newlyAddedUsersCountPercent), // Convert back to number
      };
  
      res.send(viewModel);
    } catch (error) {
      res.status(500).send(error.message);
    }
  });
  

module.exports = router;