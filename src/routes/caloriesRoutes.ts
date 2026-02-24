import express from "express";
import caloriesController from "../controllers/caloriesController";

const router = express.Router();


router.post("/calculate", caloriesController.calculateCalories);

export default router;