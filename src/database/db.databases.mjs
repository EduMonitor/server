
import { connect, set } from "mongoose";
import { logger } from "../app/config/logger.config.mjs";

const connectDB = async () => {
  try {
    await connect(process.env.DB_CONNECTION_STRING);
    logger.info("Database connected"); // Use the logger
    // Set Mongoose options for virtuals
    set("toObject", { virtuals: true });
    set("toJSON", { virtuals: true });
  } catch (error) {
    logger.error(`Failed to connect to MongoDB ${error}`); // Use the logger
    process.exit(1);
  }
};

export default connectDB;
