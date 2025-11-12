import { Response } from "express";
import { AuthRequest } from "../middlewares/authMiddleware";
import User, { IUser } from "../models/user";
import { BaseController } from "./baseController";
import { handleSingleUploadFile } from "../utils/uploadFile";
import { logger } from "../config/logger";

class UsersController extends BaseController<IUser> {
  constructor() {
    super(User);
  }

  async getMe(req: AuthRequest, res: Response) {
    req.params.id = req.user?._id || "";
    await super.getById(req, res);
  }

  async putById(req: AuthRequest, res: Response) {
    let uploadResult: { file?: Express.Multer.File; body: unknown };

    try {
      uploadResult = await handleSingleUploadFile(req, res);
    } catch (err: any) {
      logger.error("error while trying to upload file");
      res.status(422).json({ errors: [err.message] });
      return;
    }

    req.params.id = req.user?._id || "";
    req.body.profileImage = uploadResult.file?.filename;
    await super.putById(req, res);
  }
}

export default new UsersController();
