import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { logger } from "../config/logger";
import config from "../env.config";

export interface AuthRequest extends Request {
  user?: { _id: string };
}

const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers["authorization"];

  // Expect: Authorization: Bearer <token>. Extract the token for verification.
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    logger.error("missing access token");
    return res.sendStatus(401);
  }

  // Verify token and attach the decoded payload to req.user for downstream handlers.
  jwt.verify(token, config.jwtSecret, (err, user) => {
    if (err) {
      logger.error("invalid or expired access token");
      return res.sendStatus(401);
    }

    req.user = user as { _id: string };
    next();
  });
};

export default authMiddleware;
