// startup/db.js
const mongoose = require("mongoose");
const logger = require("./logging");

module.exports = async function connectToDb() {
  const db = process.env.DATABASE_CONNECTION_URL;

  if (!db) {
    throw new Error("DATABASE_CONNECTION_URL is not defined");
  }

  try {
    await mongoose.connect(db);
    logger.info("Connected to MongoDB");
  } catch (err) {
    logger.error("Failed to connect to MongoDB", err);
    process.exit(1); // ❗ Fail fast
  }
};
