import { Response } from "express";
import { AuthRequest } from "../middlewares/authMiddleware";
import { logger } from "../config/logger";
import { calculateCaloriesBurn } from "../utils/calculateCalories";

class CaloriesController {
    constructor() { }

    async calculateCalories(req: AuthRequest, res: Response) {
        try {
            const { type, trainingLength, height, weight, age } = req.body;
            const geminiRes = await calculateCaloriesBurn(type, trainingLength, height, weight, age)

            res.send(geminiRes)
        } catch (err) {
            logger.error("error while trying to calculate calories");
            res.status(500).json({ message: err.message });
        }
    }
}

export default new CaloriesController();
