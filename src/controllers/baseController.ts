import { Request, Response } from "express";
import { Model } from "mongoose";
import { logger } from "../config/logger";

export class BaseController<ModelType> {
  model: Model<ModelType>;

  constructor(model: Model<ModelType>) {
    this.model = model;
  }

  async get(req: Request, res: Response) {
    // Get all entities, or filter by `name` when provided as a query param.
    try {
      if (req.query.name) {
        const entities = await this.model.find({ name: req.query.name });
        res.send(entities);
      } else {
        const entities = await this.model.find();
        res.send(entities);
      }
    } catch (err: any) {
      logger.error("error get all", err);
      res.status(500).json({ message: err.message });
    }
  }

  async getById(req: Request, res: Response) {
    // Get a single entity by its id.
    try {
      const entity = await this.model.findById(req.params.id);
      res.send(entity);
    } catch (err: any) {
      logger.error("error get by id", err);
      res.status(500).json({ message: err.message });
    }
  }

  async post(req: Request, res: Response) {
    // Create a new entity from the request body.
    try {
      const entity = await this.model.create(req.body);
      res.status(201).send(entity);
    } catch (err: any) {
      logger.error("error post", err);
      res.status(409).send("fail: " + err.message);
    }
  }

  async putById(req: Request, res: Response) {
    // Update an entity by id and return the updated version.
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
    // Delete an entity by id and return the deleted document.
    try {
      const entity = await this.model.findByIdAndDelete(req.params.id);
      res.send(entity);
    } catch (err: any) {
      logger.error("error delete", err);
      res.status(409).send("fail: " + err.message);
    }
  }
}
