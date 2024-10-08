const mongoose = require("mongoose");
const timestampsAndUserTracking = require("../utils/timestampsAndUserTracking");


const timestampsAndUserTrackingSchema = {
  creationDate: {
    type: Date,
    default: Date.now,
  },
  createdByUserId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null,
  },
  updatedDate: {
    type: Date,
    default: null,
  },
  updatedByUserId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null,
  },
  deletionDate: {
    type: Date,
    default: null,
  },
  deletedByUserId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null,
  },
};

module.exports = timestampsAndUserTrackingSchema;
