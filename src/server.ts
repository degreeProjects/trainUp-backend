import { initApp } from "./app";
import { logger } from "./config/logger";
import http from "http";
import https from "https";
import fs from "fs";
import path from "path";
import config from "./env.config";

const bootstrapServer = async () => {
  const app = await initApp();

  const port = config.port ?? 3000;

  if (config.nodeEnv !== "production") {
    // In dev we keep things simple: plain HTTP server, single port, easier
    // logging/stacktraces.
    logger.info("development mode");
    http.createServer(app).listen(port, () => {
      logger.info(`server listening on port ${port}`);
    });
  } else {
    // Production expects TLS termination here, so bootstrap HTTPS using the
    // bundled cert/key pair.
    logger.info("production mode");
    const options = {
      key: fs.readFileSync(path.join(__dirname, "../cert/client-key.pem")),
      cert: fs.readFileSync(path.join(__dirname, "../cert/client-cert.pem")),
    };
    https.createServer(options, app).listen(config.httpsPort, () => {
      logger.info(`server listening on port ${config.httpsPort}`);
    });
  }
};

bootstrapServer();
