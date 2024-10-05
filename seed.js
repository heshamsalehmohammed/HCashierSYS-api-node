const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const config = require("config");
const { User } = require("./models/user");

const usersData = [
  {
    name: "admin",
    email: "admin@gmail.com",
    password: "123456"
  },
  {
    name: "hesham",
    email: "hesham.saleh.mohammed@gmail.com",
    password: "hcashiersys-182937Cranshy*"
  }
];

async function seed() {
  await mongoose.connect(config.get("db"),{
    useNewUrlParser: true, // Using new URL string parser
    useUnifiedTopology: true // Using new Server Discovery and Monitoring engine
  });

  await User.deleteMany({});

  for (let userData of usersData) {
    const user = new User(userData);
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(user.password, salt);
    await user.save();
  }

  mongoose.disconnect();

  console.info("Users seeded successfully!");
}

seed();
