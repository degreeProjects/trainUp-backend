import * as env from "env-var";
import "dotenv/config";

const config = {
  port: env.get("PORT").default("3000").asPortNumber(),
  httpsPort: env.get("HTTPS_PORT").default("443").asPortNumber(),
  dbUrl: env.get("DB_URL").required().asString(),
  jwtSecret: env.get("JWT_SECRET").required().asString(),
  jwtExpiration: env.get("JWT_EXPIRATION").required().asString(),
  jwtRefreshSecret: env.get("JWT_REFRESH_SECRET").required().asString(),
  nodeEnv: env.get("NODE_ENV").required().asString(),
};

export default config;
