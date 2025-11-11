import { initApp } from "./app";
import { logger } from "./config/logger";
import http from "http";
import https from "https";
import fs from "fs";
import path from "path";

const bootstrapServer = async () => {
  const app = await initApp();

  const port = process.env.PORT ?? 3000;

  if (process.env.NODE_ENV !== "production") {
    logger.info("development mode");
    http.createServer(app).listen(port, () => {
      logger.info(`server listening on port ${port}`);
    });
  } else {
    logger.info("production mode");
    const options = {
      key: fs.readFileSync(path.join(__dirname, "../cert/client-key.pem")),
      cert: fs.readFileSync(path.join(__dirname, "../cert/client-cert.pem")),
    };
    https.createServer(options, app).listen(process.env.HTTPS_PORT, () => {
      logger.info(`server listening on port ${process.env.HTTPS_PORT}`);
    });
  }
};

bootstrapServer();
