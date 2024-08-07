const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const MessageSchema = new Schema({
  user: { type: Schema.Types.ObjectId, required: true, ref: "User" },
  message: { type: String, required: true },
  inbox: { type: Schema.Types.ObjectId, required: true, ref: "Inbox" },
  date: { type: Date, required: true, default: Date.now },
});

module.exports = mongoose.model("Message", MessageSchema);
