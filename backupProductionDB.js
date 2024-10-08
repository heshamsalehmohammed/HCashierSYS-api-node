const mongoose = require("mongoose");

const {Customer} = require('./models/customer');
const {User} = require('./models/user');
const {StockItem} = require('./models/stockItem');
const {Order} = require('./models/order');


async function backupToLocal() {
  try {
    // Connect to production database
    const prodConnection = await mongoose.createConnection('mongodb://mongo:XZzxFWnpbsNcVoXUHNeleDgtpeVuaQVG@autorack.proxy.rlwy.net:49856/', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    const customers = await prodConnection.model('Customer').find();
    const stockItems = await prodConnection.model('StockItem').find();
    const orders = await prodConnection.model('Order').find();
    const users = await prodConnection.model('User').find();
    
    // Connect to local database
    const localConnection = await mongoose.createConnection('mongodb://localhost:27017/', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    // Insert data into local database
    await localConnection.model('Customer').deleteMany({});
    await localConnection.model('Customer').insertMany(customers);
    
    await localConnection.model('StockItem').deleteMany({});
    await localConnection.model('StockItem').insertMany(stockItems);
    
    await localConnection.model('Order').deleteMany({});
    await localConnection.model('Order').insertMany(orders);

    await localConnection.model('User').deleteMany({});
    await localConnection.model('User').insertMany(users);

    console.info("Backup from production to local completed successfully!");

    // Disconnect both connections
    await prodConnection.close();
    await localConnection.close();
  } catch (err) {
    console.error("Error during backup:", err);
  }
}

backupToLocal();
