const validateObjectId = require("../middleware/validateObjectId");
const auth = require("../middleware/auth");
const admin = require("../middleware/admin");
const { Genre, validate } = require("../models/genre");
const mongoose = require("mongoose");
const express = require("express");
const {
  getGenres,
  updateGenre,
  postGenre,
  getGenre,
  deleteGenre,
} = require("../controllers/genresController");
const router = express.Router();

router.get("/", getGenres);

router.post("/", auth, postGenre);

router.put("/:id", [auth, validateObjectId], updateGenre);

router.delete("/:id", [auth, admin, validateObjectId], deleteGenre);

router.get("/:id", validateObjectId, getGenre);

module.exports = router;




/* 
const { Sequelize, DataTypes } = require('sequelize');

// Create a Sequelize instance, which connects to the MySQL database
const sequelize = new Sequelize('yourdatabase', 'username', 'password', {
  host: 'localhost',
  dialect: 'mysql'
});

// Define the Genre model with a schema
const Genre = sequelize.define('Genre', {
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      len: [5, 50],  // Equivalent to minlength and maxlength in Mongoose
    },
  },
});

// Function to get genres, similar to your Mongoose example
const getGenres = async () => {
  const genres = await Genre.findAll({
    attributes: { exclude: ['createdAt', 'updatedAt'] },  // Exclude specific fields like __v in Mongoose
    order: [['name', 'ASC']]  // Sort by name
  });
  return genres;
};
*/
