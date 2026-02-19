import express, { Express } from "express";
import { configExpress } from "./config/express";
import { configMongo } from "./config/mongo";
import dotenv from "dotenv";
import { initLogger, logger } from "./config/logger";
import config from "./env.config";

export const initApp = async (): Promise<Express> => {
  try {
    if (config.nodeEnv === "test") {
      dotenv.config({ path: "./.envtest" });
    } else {
      dotenv.config();
    }

    initLogger();

    await configMongo(config.dbUrl);
    const app = express();
    configExpress(app);

    return app;
  } catch (error) {
    logger.error(error);
    throw error;
  }
};
