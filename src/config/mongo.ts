import mongoose from "mongoose";
import { logger } from "./logger";

export const configMongo = async (dbUrl: string) => {
  const db = mongoose.connection;
  db.once("open", () => logger.info("Connected to Database"));
  db.on("error", (error) => logger.error(error));

  try {
    await mongoose.connect(dbUrl);
  } catch (error) {
    logger.error("error while trying to connect to mongo db");
    throw error;
  }
};
