import express from "express";
const router = express.Router();
import usersController from "../controllers/userController";
import authMiddleware from "../middlewares/authMiddleware";

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: The Users API
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: MongoDB ObjectId of the user
 *           example: "6734c9df0ae23c1ad4c65f91"
 *         email:
 *           type: string
 *           description: The user email
 *           example: "user@gmail.com"
 *         fullName:
 *           type: string
 *           description: The user's full name
 *           example: "Lionel Messi"
 *         homeCity:
 *           type: string
 *           description: The user's home city
 *           example: "Tel Aviv"
 *         profileImage:
 *           type: string
 *           description: URL or filename of the profile image
 *           example: "profile123.jpg"
 *         refreshTokens:
 *           type: array
 *           items:
 *             type: string
 *           description: List of valid refresh tokens
 *       required:
 *         - email
 *         - fullName
 *       example:
 *         _id: "6734c9df0ae23c1ad4c65f91"
 *         email: "user@gmail.com"
 *         fullName: "Lionel Messi"
 *         homeCity: "Tel Aviv"
 *         profileImage: "profile123.jpg"
 */

/**
 * @swagger
 * /users/me:
 *   get:
 *     summary: Get the authenticated user's details
 *     description: Returns the user associated with the access token.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: The authenticated user's information
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthorized - Missing or invalid token
 *       422:
 *         description: Error while trying to upload file
 */
router.get("/me", authMiddleware, usersController.getMe.bind(usersController));

/**
 * @swagger
 * /users:
 *   put:
 *     summary: Update the authenticated user's information
 *     description: Updates the user associated with the access token. Supports multipart/form-data for profile image upload.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               fullName:
 *                 type: string
 *                 example: "Lionel Messi"
 *               homeCity:
 *                 type: string
 *                 example: "Tel Aviv"
 *               profileImage:
 *                 type: string
 *                 format: binary
 *                 description: Upload a profile image (optional)
 *     responses:
 *       200:
 *         description: User successfully updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthorized - Missing or invalid token
 *       422:
 *         description: Error while trying to upload file
 */
router.put("/", authMiddleware, usersController.putById.bind(usersController));

export default router;
