import mongoose from "mongoose";
// Define a unified notification schema
const notificationSchema = new mongoose.Schema(
  {
    uuid: {
      type: String,
      required: true,
    },
    relatedId: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "relatedModel",
    },
    relatedModel: {
      type: String,
      enum: ["Users"],
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ["account"],
      required: true,
    },
    unreadCount: {
      type: Number,
      default: 1,
    },
    read: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Create the Notification model
const Notification = mongoose.model("Notification", notificationSchema);

export { Notification };
