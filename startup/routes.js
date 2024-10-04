const express = require('express');
const customers = require('../routes/customers');
const stockItems = require('../routes/stockItems');
const orders = require('../routes/orders');
const orderStatuses = require('../routes/orderStatuses');
const users = require('../routes/users');
const auth = require('../routes/auth');
const error = require('../middleware/error');

module.exports = function(app) {
  app.use(express.json());
  app.use('/api/customers', customers);
  app.use('/api/stockItems', stockItems);
  app.use('/api/orders', orders);
  app.use('/api/orderStatuses', orderStatuses);
  app.use('/api/users', users);
  app.use('/api/auth', auth);
  app.use(error);
}