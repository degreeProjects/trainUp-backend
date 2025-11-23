import Post, { IPost } from "../models/post";
import { BaseController } from "./baseController";
import { Request, Response } from "express";
import { AuthRequest } from "../middlewares/authMiddleware";
import { logger } from "../config/logger";
import { handleSingleUploadFile } from "../utils/uploadFile";
import { TrainingTypes } from "../models/post";

class PostsController extends BaseController<IPost> {
  constructor() {
    super(Post);
  }

  async post(req: AuthRequest, res: Response) {
    let uploadResult: { file?: Express.Multer.File; body: unknown };

    try {
      uploadResult = await handleSingleUploadFile(req, res);
    } catch (e: any) {
      logger.error("error while trying to upload file");
      res.status(422).json({ errors: [e.message] });
      return;
    }

    req.body.user = req.user?._id;
    req.body.image = uploadResult.file?.filename;
    await super.post(req, res);
  }

  async putById(req: AuthRequest, res: Response) {
    let uploadResult: { file?: Express.Multer.File; body: unknown };

    try {
      uploadResult = await handleSingleUploadFile(req, res);
    } catch (e: any) {
      logger.error("error while trying to upload file");
      res.status(422).json({ errors: [e.message] });
      return;
    }

    req.body.user = req.user?._id;
    req.body.image = uploadResult.file?.filename;
    await super.putById(req, res);
  }

  async getById(req: Request, res: Response) {
    try {
      const populatedByUser = await this.model
        .findById(req.params?.id)
        .populate("user");

      if (!populatedByUser) {
        res.status(404).json({ message: "Post not found" });
        return;
      }

      const post = await populatedByUser!.populate("comments.user");
      res.send(post);
    } catch (err: any) {
      logger.error("error while trying to get post by id");
      res.status(500).json({ message: err.message });
    }
  }

  async getByCity(req: Request, res: Response) {
    const city = req.params.city;
    const page = Number(req.query?.page) || 1;
    const limit = Number(req.query?.pageSize) || 10;

    const findFilter = city === "all" ? {} : { city };

    try {
      const posts = await this.model
        .find(findFilter)
        .limit(limit)
        .skip((page - 1) * limit)
        .sort({ createdAt: -1 })
        .populate("user");
      res.send(posts);
    } catch (err: any) {
      logger.error("error while trying to get posts by city");
      res.status(500).json({ message: err.message });
    }
  }

  async getByCityAndType(req: Request, res: Response) {
    const city = req.query.city as string | undefined;
    const type = req.query.type as string | undefined;
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.pageSize) || 10;

    const filter: any = {};
    if (city && city !== "all") filter.city = city;
    if (type && type !== "all") filter.type = type;

    try {
      const posts = await this.model
        .find(filter)
        .limit(limit)
        .skip((page - 1) * limit)
        .sort({ createdAt: -1 })
        .populate("user");
      res.send(posts);
    } catch (err: any) {
      logger.error("error while trying to get posts by city and type");
      res.status(500).json({ message: err.message });
    }
  }

  async getByMe(req: AuthRequest, res: Response) {
    const page = Number(req.query?.page) || 1;
    const limit = Number(req.query?.pageSize) || 10;

    try {
      const posts = await this.model
        .find({ user: req.user?._id })
        .limit(limit)
        .skip((page - 1) * limit)
        .sort({ createdAt: -1 })
        .populate("user");
      res.send(posts);
    } catch (err: any) {
      logger.error("error while trying to get posts by user id");
      res.status(500).json({ message: err.message });
    }
  }

  async getTrainingTypes(_req: Request, res: Response) {
    try {
      res.send(TrainingTypes);
    } catch (err: any) {
      logger.error("error while trying to get training types");
      res.status(500).json({ message: err.message });
    }
  }

  async addCommentToPost(req: AuthRequest, res: Response) {
    const user = req.user?._id;
    const postId = req.params.postId;

    try {
      const post = await this.model.findById(postId);
      if (!post) return res.status(404).send("post not found");

      post.comments = [...post.comments, { ...req.body, user }];

      await post.save();

      const populatedPost = await post.populate("comments.user");
      res.send(populatedPost.comments);
    } catch (err: any) {
      logger.error("error while adding comment to a post");
      res.status(409).send("fail: " + err.message);
    }
  }
}

export default new PostsController();
