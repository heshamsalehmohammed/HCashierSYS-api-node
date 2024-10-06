const dotenv = require('dotenv');
const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env.development';
dotenv.config({ path: envFile });
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const config = require("config");
const { User } = require("./models/user");

console.log('DATABASE_CONNECTION_URL:', process.env.DATABASE_CONNECTION_URL);

const usersData = [
  {
    name: "user",
    email: "user@gmail.com",
    password: "123456",
    role: "user"
  },
  {
    name: "admin",
    email: "admin@gmail.com",
    password: "123456",
    role: "admin"
  },
  {
    name: "master",
    email: "master@gmail.com",
    password: "123456",
    role: "master"
  },
  {
    name: "hesham",
    email: "hesham.saleh.mohammed@gmail.com",
    password: "hcashiersys-182937Cranshy*",
    role: "master"
  }
];

async function seed() {
  await mongoose.connect(process.env.DATABASE_CONNECTION_URL,{
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
