// Centralized Order Status Enum definition
const OrderStatusEnum = Object.freeze({
    INITIALIZED: 1,
    PROCESSING: 2,
    DELIVERED: 3,
    CANCELED: 4
  });
  
  const OrderStatusDetails = {
    1: { _id: 1, name: "INITIALIZED", label: "Initialized", severity: "info" },
    2: { _id: 2, name: "PROCESSING", label: "Processing", severity: "warning" },
    3: { _id: 3, name: "DELIVERED", label: "Delivered", severity: "success" },
    4: { _id: 4, name: "CANCELED", label: "Canceled", severity: "danger" }
  };
  
  module.exports = { OrderStatusEnum, OrderStatusDetails };
  