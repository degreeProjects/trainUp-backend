import express from "express";
import caloriesController from "../controllers/caloriesController";
import authMiddleware from "../middlewares/authMiddleware";

const router = express.Router();

router.post("/calculate", authMiddleware, caloriesController.calculateCalories);

export default router;