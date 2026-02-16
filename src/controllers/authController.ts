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
    // Run the shared upload pipeline so the controller always receives the parsed
    // multipart body and (optional) profile image metadata in one place.
    uploadResult = await handleSingleUploadFile(req, res);
  } catch (error: any) {
    logger.error("error while trying to upload file");
    return res.status(422).json({ errors: [error.message] });
  }

  const { email, password, fullName, homeCity } = req.body;
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

    const salt = await bcrypt.genSalt(10);
    const encryptedPassword = await bcrypt.hash(password, salt);
    const user = await User.create({
      email: email,
      password: encryptedPassword,
      fullName: fullName,
      homeCity: homeCity,
      profileImage: uploadResult.file?.filename,
    });

    logger.info("new user added to db");
    return res.status(201).send(user);
  } catch (err) {
    logger.error("error while trying to register");
    return res.status(500).send("error while trying to register");
  }
};

const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;

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

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      logger.error("password is incorrect");
      return res.status(401).send("password is incorrect");
    }

    const options = {
      expiresIn: config.jwtExpiration,
    } as jwt.SignOptions;

    const accessToken = jwt.sign({ _id: user._id }, config.jwtSecret, options);
    const refreshToken = jwt.sign({ _id: user._id }, config.jwtRefreshSecret);
    // Persist each refresh token so we can later revoke individual sessions
    // (e.g. logout from a single device) instead of wiping all tokens at once.
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
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: config.googleClientId,
    });

    const payload = ticket.getPayload();

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

    const accessToken = jwt.sign({ _id: user._id }, config.jwtSecret, options);

    const refreshToken = jwt.sign({ _id: user._id }, config.jwtRefreshSecret);

    // Same refresh-token fan-out as email login to support multiple devices.
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
  if (!refreshToken) {
    logger.error("user didn't add refresh token to the request");
    return res.sendStatus(401);
  }

  // The refresh token lives in the Authorization header so mobile/SPA clients
  // can treat it like any other Bearer credential.
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

      if (
        !userDb?.refreshTokens ||
        !userDb.refreshTokens.includes(refreshToken)
      ) {
        userDb.refreshTokens = [];
        await userDb.save();
        return res.sendStatus(401);
      } else {
        userDb.refreshTokens = userDb.refreshTokens.filter(
          (token) => token !== refreshToken
        );
        await userDb.save();
        return res.sendStatus(200);
      }
    } catch (err) {
      logger.error("error while trying to logout");
      res.sendStatus(500).send("error while trying to logout");
    }
  });
};

const refresh = async (req: Request, res: Response) => {
  const authHeader = req.headers["authorization"];
  const refreshToken = authHeader && authHeader.split(" ")[1]; // Bearer <token>
  if (!refreshToken) {
    logger.error("user didn't add refresh token to the request");
    return res.sendStatus(401);
  }

  // Refresh tokens are rotated: once a token is exchanged it gets replaced to
  // reduce the blast radius of a leaked long-lived credential.
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

      const accessToken = jwt.sign({ _id: userId }, config.jwtSecret, options);
      const newRefreshToken = jwt.sign(
        { _id: userId },
        config.jwtRefreshSecret
      );
      // Remove the token being used so it cannot be replayed, then add the
      // brand new refresh token for this session.
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
      res.sendStatus(500).send("error while trying to refresh");
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
