
const mongoose = require("mongoose");
const {User} = require('./models/user');



async function reseedProduction() {
  try {
    // Connect to local database
    const localConnection = await mongoose.createConnection('mongodb://localhost:27017/', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    const users = await localConnection.model('User').find();
    
    // Connect to production database
    const prodConnection = await mongoose.createConnection('mongodb://mongo:XZzxFWnpbsNcVoXUHNeleDgtpeVuaQVG@autorack.proxy.rlwy.net:49856/', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    // Insert data into production database
    await prodConnection.model('User').deleteMany({});
    await prodConnection.model('User').insertMany(users);

    console.info("Production database reseeded from local successfully!");

    // Disconnect both connections
    await localConnection.close();
    await prodConnection.close();
  } catch (err) {
    console.error("Error during reseeding:", err);
  }
}

reseedProduction();
