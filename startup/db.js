const winston = require('winston');
const mongoose = require('mongoose');
const config = require('config');

module.exports = function() {
  const db = process.env.DATABASE_CONNECTION_URL;
  mongoose.connect(db, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  })
    .then(() => winston.info(`Connected to ${db}...`));
}