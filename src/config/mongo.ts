import mongoose from "mongoose";
import { logger } from "./logger";

export const configMongo = async (dbUrl: string) => {
  const db = mongoose.connection;

  // Attach connection listeners for visibility (connected / error).
  db.once("open", () => logger.info("Connected to Database"));
  db.on("error", (error) => logger.error(error));

  // Connect to MongoDB using the provided connection string.
  try {
    await mongoose.connect(dbUrl);
  } catch (error) {
    logger.error("error while trying to connect to mongo db");
    throw error;
  }
};
