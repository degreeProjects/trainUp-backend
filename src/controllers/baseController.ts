import { Request, Response } from "express";
import { Model } from "mongoose";
import { logger } from "../config/logger";

export class BaseController<ModelType> {
  model: Model<ModelType>;
  constructor(model: Model<ModelType>) {
    this.model = model;
  }

  async getById(req: Request, res: Response) {
    try {
      const entity = await this.model.findById(req.params.id);
      res.send(entity);
    } catch (err: any) {
      logger.error("error get by id", err);
      res.status(500).json({ message: err.message });
    }
  }

  async post(req: Request, res: Response) {
    try {
      const entity = await this.model.create(req.body);
      res.status(201).send(entity);
    } catch (err: any) {
      logger.error("error post", err);
      res.status(409).send("fail: " + err.message);
    }
  }

  async putById(req: Request, res: Response) {
    try {
      const entity = await this.model.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true }
      );
      res.send(entity);
    } catch (err: any) {
      logger.error("error put", err);
      res.status(409).send("fail: " + err.message);
    }
  }

  async deleteById(req: Request, res: Response) {
    try {
      const entity = await this.model.findByIdAndDelete(req.params.id);
      res.send(entity);
    } catch (err: any) {
      logger.error("error delete", err);
      res.status(409).send("fail: " + err.message);
    }
  }
}
