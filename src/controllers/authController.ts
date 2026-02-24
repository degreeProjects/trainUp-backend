import { Request, Response } from "express";
import User from "../models/user";
import config from "../env.config";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { logger } from "../config/logger";
import { handleSingleUploadFile } from "../utils/uploadFile";
import { OAuth2Client } from "google-auth-library";

const client = new OAuth2Client();

const register = async (req: Request, res: Response) => {
  let uploadResult:
    | { file: Express.Multer.File | undefined; body: unknown }
    | undefined;

  try {
    // Parse multipart form (and optional profile image) using the shared upload helper.
    uploadResult = await handleSingleUploadFile(req, res);
  } catch (error: any) {
    logger.error("error while trying to upload file");
    return res.status(422).json({ errors: [error.message] });
  }

  const { email, password, fullName, homeCity, height, weight, age } = req.body;

  // Validate required fields before hitting the database.
  if (!email || !password || !fullName) {
    logger.error("missing one of the following: email, password, fullName");

    return res
      .status(400)
      .send(
        "missing one of the following: email, password, fullName, homeCity"
      );
  }

  try {
    const sameUser = await User.findOne({ email: email });
    if (sameUser) {
      logger.error("email already exists");
      return res.status(409).send("email already exists");
    }

    // Hash password before saving the user.
    const salt = await bcrypt.genSalt(10);
    const encryptedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      email: email,
      password: encryptedPassword,
      fullName: fullName,
      homeCity: homeCity,
      profileImage: uploadResult.file?.filename,
      height: Number(height),
      weight: Number(weight),
      age: Number(age),
    });

    // Auto sign-in: issue tokens so the client can skip a separate login call.
    const options = {
      expiresIn: config.jwtExpiration,
    } as jwt.SignOptions;

    const accessToken = jwt.sign({ _id: user._id }, config.jwtSecret, options);
    const refreshToken = jwt.sign({ _id: user._id }, config.jwtRefreshSecret);

    user.refreshTokens = [refreshToken];
    await user.save();

    logger.info("new user added to db");
    return res.status(201).send({
      user: user,
      accessToken: accessToken,
      refreshToken: refreshToken,
    });
  } catch (err) {
    logger.error("error while trying to register");
    return res.status(500).send("error while trying to register");
  }
};

const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  // Basic input check.
  if (!email || !password) {
    logger.error("missing email or password");
    return res.status(400).send("missing email or password");
  }

  try {
    const user = await User.findOne({ email: email });
    if (!user) {
      logger.error("email is incorrect");
      return res.status(401).send("email is incorrect");
    }

    // Verify password hash.
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      logger.error("password is incorrect");
      return res.status(401).send("password is incorrect");
    }

    const options = {
      expiresIn: config.jwtExpiration,
    } as jwt.SignOptions;

    // Issue a short-lived access token + a long-lived refresh token.
    const accessToken = jwt.sign({ _id: user._id }, config.jwtSecret, options);
    const refreshToken = jwt.sign({ _id: user._id }, config.jwtRefreshSecret);

    // Store refresh tokens so individual sessions can be revoked later.
    if (!user.refreshTokens) {
      user.refreshTokens = [refreshToken];
    } else {
      user.refreshTokens.push(refreshToken);
    }

    await user.save();
    return res.status(200).send({
      accessToken: accessToken,
      refreshToken: refreshToken,
    });
  } catch (err) {
    logger.error("error while trying to login");
    return res.status(500).send("error while trying to login");
  }
};

const loginByGoogle = async (req: Request, res: Response) => {
  const { token } = req.body;

  try {
    // Validate Google ID token and extract the user's profile info.
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: config.googleClientId,
    });

    const payload = ticket.getPayload();

    // Find existing user (by email) or create a new one from Google profile.
    let user = await User.findOne({ email: payload?.email });
    if (!user) {
      user = await User.create({
        email: payload?.email,
        fullName: payload?.name,
      });
    }

    const options = {
      expiresIn: config.jwtExpiration,
    } as jwt.SignOptions;

    // Issue tokens for the app session.
    const accessToken = jwt.sign({ _id: user._id }, config.jwtSecret, options);
    const refreshToken = jwt.sign({ _id: user._id }, config.jwtRefreshSecret);

    // Store refresh tokens so multiple devices/sessions are supported.
    if (!user.refreshTokens) {
      user.refreshTokens = [refreshToken];
    } else {
      user.refreshTokens.push(refreshToken);
    }

    await user.save();
    return res.status(200).send({
      accessToken: accessToken,
      refreshToken: refreshToken,
    });
  } catch (err) {
    logger.error("error while trying to login by google", err);
    res.status(500).send("error while trying to login by google");
  }
};

const logout = async (req: Request, res: Response) => {
  const authHeader = req.headers["authorization"];
  const refreshToken = authHeader && authHeader.split(" ")[1]; // Bearer <token>

  // Logout requires a refresh token to revoke that specific session.
  if (!refreshToken) {
    logger.error("user didn't add refresh token to the request");
    return res.sendStatus(401);
  }

  // Verify refresh token, then remove it from the user's stored token list.
  jwt.verify(refreshToken, config.jwtRefreshSecret, async (err, decoded) => {
    if (err) {
      logger.error("something is wrong with the provided refresh token");
      return res.sendStatus(401);
    }

    const userId = (decoded as { _id: string })?._id;
    if (!userId) return res.sendStatus(401);

    try {
      const userDb = await User.findOne({ _id: userId });
      if (!userDb) return res.sendStatus(401);

      // If the token isn't found, clear tokens as a safety measure and deny.
      if (
        !userDb?.refreshTokens ||
        !userDb.refreshTokens.includes(refreshToken)
      ) {
        userDb.refreshTokens = [];
        await userDb.save();
        return res.sendStatus(401);
      }

      // Remove just this refresh token (logout from this device/session).
      userDb.refreshTokens = userDb.refreshTokens.filter(
        (token) => token !== refreshToken
      );

      await userDb.save();
      return res.sendStatus(200);
    } catch (err) {
      logger.error("error while trying to logout");
      return res.status(500).send("error while trying to logout");
    }
  });
};

const refresh = async (req: Request, res: Response) => {
  const authHeader = req.headers["authorization"];
  const refreshToken = authHeader && authHeader.split(" ")[1]; // Bearer <token>

  // Refresh requires the current refresh token.
  if (!refreshToken) {
    logger.error("user didn't add refresh token to the request");
    return res.sendStatus(401);
  }

  // Rotate refresh tokens: exchange the current token for a new one and invalidate the old.
  jwt.verify(refreshToken, config.jwtRefreshSecret, async (err, decoded) => {
    if (err) {
      logger.error("something is wrong with the provided refresh token");
      return res.sendStatus(401);
    }

    const userId = (decoded as { _id: string })?._id;
    if (!userId) return res.sendStatus(401);

    try {
      const userDb = await User.findOne({ _id: userId });
      if (!userDb) return res.sendStatus(401);

      // Deny refresh if the token isn't one of the stored active sessions.
      if (
        !userDb.refreshTokens ||
        !userDb.refreshTokens.includes(refreshToken)
      ) {
        userDb.refreshTokens = [];
        await userDb.save();
        return res.sendStatus(401);
      }

      const options = {
        expiresIn: config.jwtExpiration,
      } as jwt.SignOptions;

      // Issue new tokens.
      const accessToken = jwt.sign({ _id: userId }, config.jwtSecret, options);
      const newRefreshToken = jwt.sign(
        { _id: userId },
        config.jwtRefreshSecret
      );

      // Replace the used refresh token with the new one.
      userDb.refreshTokens = userDb.refreshTokens.filter(
        (token) => token !== refreshToken
      );
      userDb.refreshTokens.push(newRefreshToken);

      await userDb.save();
      return res.status(200).send({
        accessToken: accessToken,
        refreshToken: newRefreshToken,
      });
    } catch (err) {
      logger.error("error while trying to refresh");
      return res.status(500).send("error while trying to refresh");
    }
  });
};

export default {
  register,
  login,
  logout,
  refresh,
  loginByGoogle,
};
