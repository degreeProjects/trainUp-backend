import Post, { IPost } from "../models/post";
import User from "../models/user";
import { BaseController } from "./baseController";
import { Request, Response } from "express";
import { AuthRequest } from "../middlewares/authMiddleware";
import { logger } from "../config/logger";
import { handleSingleUploadFile } from "../utils/uploadFile";
import { TrainingTypes } from "../models/post";
import {
  calculateCaloriesBurn,
  generateWorkoutTips,
} from "../utils/calculateCalories";

class WorkoutValidationError extends Error {}
interface AiContext {
  userId: string;
  trainingType: string;
  trainingLength: number;
  height: number;
  weight: number;
  age: number;
  notes: string;
}

class PostsController extends BaseController<IPost> {
  constructor() {
    super(Post);
  }

  private hasValue(body: any, key: string) {
    return Object.prototype.hasOwnProperty.call(body, key);
  }

  private sanitizeNotes(value: any) {
    if (typeof value !== "string") return "";
    return value.trim();
  }

  private async buildPostPayload(
    req: AuthRequest,
    uploadedImage?: string,
    existingPost?: IPost | null
  ): Promise<{ payload: any; aiContext: AiContext }> {
    const userId = req.user?._id;
    if (!userId) {
      throw new WorkoutValidationError("Missing authenticated user");
    }

    const userProfile = await User.findById(userId);

    const sanitizedBody: Record<string, any> = { ...req.body };
    delete sanitizedBody.height;
    delete sanitizedBody.weight;
    delete sanitizedBody.age;
    delete sanitizedBody.user;
    delete sanitizedBody.image;
    delete sanitizedBody.picture;

    const rawType = this.hasValue(req.body, "type")
      ? req.body.type
      : existingPost?.type;
    if (!rawType) {
      throw new WorkoutValidationError("type is required");
    }

    const rawTrainingLength = this.hasValue(req.body, "trainingLength")
      ? req.body.trainingLength
      : existingPost?.trainingLength;
    const trainingLength = Number(rawTrainingLength);
    if (!Number.isFinite(trainingLength) || trainingLength <= 0) {
      throw new WorkoutValidationError(
        "trainingLength must be a positive number"
      );
    }

    const height = userProfile?.height ?? 170;
    const weight = userProfile?.weight ?? 70;
    const age = userProfile?.age ?? 25;

    const notes = this.hasValue(req.body, "notes")
      ? this.sanitizeNotes(req.body.notes)
      : this.hasValue(req.body, "description")
      ? this.sanitizeNotes(req.body.description)
      : existingPost?.notes ?? existingPost?.description ?? "";

    const payload: any = {
      ...sanitizedBody,
      user: userId,
      type: rawType,
      trainingLength,
      notes,
      description: notes,
      caloriesSummary: "",
      aiTips: "",
    };

    if (uploadedImage) {
      payload.image = uploadedImage;
    }

    const aiContext: AiContext = {
      userId,
      trainingType: rawType,
      trainingLength,
      height,
      weight,
      age,
      notes,
    };

    return { payload, aiContext };
  }

  private async refreshAiInsights(postId: string, ctx: AiContext) {
    try {
      const caloriesSummary = await calculateCaloriesBurn(
        ctx.userId,
        ctx.trainingType,
        ctx.trainingLength,
        ctx.height,
        ctx.weight,
        ctx.age,
        ctx.notes
      );

      const aiTips = ctx.notes
        ? await generateWorkoutTips({
            trainingType: ctx.trainingType,
            trainingLength: ctx.trainingLength,
            height: ctx.height,
            weight: ctx.weight,
            age: ctx.age,
            notes: ctx.notes,
          })
        : "";

      await this.model.findByIdAndUpdate(postId, {
        caloriesSummary,
        aiTips,
      });
    } catch (err) {
      logger.error("Failed to refresh AI insights for post", err);
    }
  }

  async post(req: AuthRequest, res: Response) {
    let uploadResult: { file?: Express.Multer.File; body: unknown };
    let payloadAndContext!: { payload: any; aiContext: AiContext };

    try {
      uploadResult = await handleSingleUploadFile(req, res);
    } catch (e: any) {
      logger.error("error while trying to upload file");
      res.status(422).json({ errors: [e.message] });
      return;
    }

    try {
      payloadAndContext = await this.buildPostPayload(
        req,
        uploadResult.file?.filename,
        null
      );
    } catch (err: any) {
      if (err instanceof WorkoutValidationError) {
        res.status(400).json({ message: err.message });
        return;
      }

      logger.error("error while preparing post payload", err);
      res.status(500).json({ message: "Failed to create post" });
      return;
    }

    try {
      const createdPost = await this.model.create(payloadAndContext.payload);
      res.status(201).send(createdPost);
      if (createdPost?._id) {
        this.refreshAiInsights(createdPost._id, payloadAndContext.aiContext);
      }
    } catch (err: any) {
      logger.error("error post", err);
      res.status(409).send("fail: " + err.message);
    }
  }

  async putById(req: AuthRequest, res: Response) {
    let uploadResult: { file?: Express.Multer.File; body: unknown };
    let payloadAndContext!: { payload: any; aiContext: AiContext };

    try {
      uploadResult = await handleSingleUploadFile(req, res);
    } catch (e: any) {
      logger.error("error while trying to upload file");
      res.status(422).json({ errors: [e.message] });
      return;
    }

    let existingPost: IPost | null = null;
    try {
      existingPost = await this.model.findById(req.params.id);
      if (!existingPost) {
        res.status(404).json({ message: "Post not found" });
        return;
      }
    } catch (err) {
      logger.error("error while trying to load post for update", err);
      res.status(500).json({ message: "Failed to load post" });
      return;
    }

    try {
      payloadAndContext = await this.buildPostPayload(
        req,
        uploadResult.file?.filename,
        existingPost
      );
    } catch (err: any) {
      if (err instanceof WorkoutValidationError) {
        res.status(400).json({ message: err.message });
        return;
      }

      logger.error("error while preparing post payload", err);
      res.status(500).json({ message: "Failed to update post" });
      return;
    }

    try {
      const updatedPost = await this.model.findByIdAndUpdate(
        req.params.id,
        payloadAndContext.payload,
        { new: true }
      );
      res.send(updatedPost);
      if (updatedPost?._id) {
        this.refreshAiInsights(updatedPost._id, payloadAndContext.aiContext);
      }
    } catch (err: any) {
      logger.error("error put", err);
      res.status(409).send("fail: " + err.message);
    }
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

  async getByCityAndType(req: Request, res: Response) {
    const city = req.query.city as string | undefined;
    const type = req.query.type as string | undefined;
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.pageSize) || 10;

    // Build a dynamic Mongo filter; omit query params set to "all" so the same
    // endpoint can serve both filtered and unfiltered feeds.
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
      res.status(200).send(TrainingTypes);
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

      // Append the new comment while preserving existing entries so Mongoose
      // change tracking picks up the array mutation.
      post.comments = [...post.comments, { ...req.body, user }];

      await post.save();

      const populatedPost = await post.populate("comments.user");
      res.send(populatedPost.comments);
    } catch (err: any) {
      logger.error("error while adding comment to a post");
      res.status(409).send("fail: " + err.message);
    }
  }

  async addLike(req: AuthRequest, res: Response) {
    try {
      const postId = req.params.postId;
      const userId = req.query.userId;

      if (!userId || userId.length === 0)
        return res.status(400).json({ error: "userId is required" });

      const updatedPost = await this.model
        .findByIdAndUpdate(
          postId,
          { $addToSet: { likes: userId } },
          { new: true }
        )
        .populate("user");

      if (!updatedPost)
        return res.status(404).json({ error: "Post not found" });

      return res.status(200).json(updatedPost);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  async removeLike(req: AuthRequest, res: Response) {
    try {
      const postId = req.params.postId;
      const userId = req.query.userId;

      if (!userId) return res.status(400).json({ error: "userId is required" });

      const updatedPost = await this.model
        .findByIdAndUpdate(postId, { $pull: { likes: userId } }, { new: true })
        .populate("user");

      if (!updatedPost)
        return res.status(404).json({ error: "Post not found" });

      return res.status(200).json(updatedPost);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  async getLikedPostsByUser(req: AuthRequest, res: Response) {
    try {
      const userId = req.params.userId;
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.pageSize) || 10;
      const filter = { likes: userId };

      // Reuse the pagination pattern from other endpoints so the client can
      // scroll through liked posts without overfetching.
      const likedPosts = await this.model
        .find(filter)
        .limit(limit)
        .skip((page - 1) * limit)
        .sort({ createdAt: -1 })
        .populate("user");

      return res.status(200).json(likedPosts);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
}

export default new PostsController();
