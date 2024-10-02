const winston = require('winston');
const mongoose = require('mongoose');
const config = require('config');

module.exports = function() {
  const db = config.get('db');
  mongoose.connect(db, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  })
    .then(() => winston.info(`Connected to ${db}...`));
}




/* const mysql = require('mysql2');

// Create a connection to the database
const connection = mysql.createConnection({
  host: 'localhost',       // The host of your MySQL server
  user: 'root',            // Your MySQL username
  password: 'yourpassword', // Your MySQL password
  database: 'yourdatabase'  // The database you want to connect to
});

// Connect to the database
connection.connect((err) => {
  if (err) {
    console.error('Error connecting to the database: ', err.stack);
    return;
  }
  console.log('Connected to the database as id ' + connection.threadId);
}); */