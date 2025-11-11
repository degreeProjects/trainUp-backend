import express, { Express } from "express";
import { configExpress } from "./config/express";
import { configMongo } from "./config/mongo";
import dotenv from "dotenv";
import { initLogger, logger } from "./config/logger";

export const initApp = async (): Promise<Express> => {
  try {
    if (process.env.NODE_ENV === "test") {
      dotenv.config({ path: "./.envtest" });
    } else {
      dotenv.config();
    }

    initLogger();

    await configMongo(process.env.DB_URL || "mongodb://localhost/trainUp-dev");
    const app = express();
    configExpress(app);

    return app;
  } catch (error) {
    logger.error(error);
    throw error;
  }
};
