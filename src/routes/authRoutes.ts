import express from "express";
import authController from "../controllers/authController";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Authentication API
 */

/**
 * @swagger
 * components:
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 *
 *   schemas:
 *     UserRegister:
 *       type: object
 *       required:
 *         - email
 *         - password
 *         - fullName
 *       properties:
 *         email:
 *           type: string
 *           example: "user@gmail.com"
 *         password:
 *           type: string
 *           example: "12345678"
 *         fullName:
 *           type: string
 *           example: "Lionel Messi"
 *         homeCity:
 *           type: string
 *           example: "Tel Aviv"
 *         profileImage:
 *           type: string
 *           format: binary
 *           description: Optional profile image
 *
 *     UserLogin:
 *       type: object
 *       required:
 *         - email
 *         - password
 *       properties:
 *         email:
 *           type: string
 *           example: "user@gmail.com"
 *         password:
 *           type: string
 *           example: "12345678"
 *
 *     GoogleLogin:
 *       type: object
 *       required:
 *         - token
 *       properties:
 *         token:
 *           type: string
 *           description: Google OAuth Token
 *           example: "eyJhbGc...123"
 *
 *     Tokens:
 *       type: object
 *       required:
 *         - accessToken
 *         - refreshToken
 *       properties:
 *         accessToken:
 *           type: string
 *           example: "eyJhbGc...abc"
 *         refreshToken:
 *           type: string
 *           example: "eyJhbGc...xyz"
 */

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             $ref: '#/components/schemas/UserRegister'
 *     responses:
 *       201:
 *         description: Newly created user
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserRegister'
 *       400:
 *         description: Missing required fields
 *       409:
 *         description: Email already exists
 *       422:
 *         description: Error while trying to upload file
 *       500:
 *         description: Unexpected error
 */
router.post("/register", authController.register);

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login with email & password
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserLogin'
 *     responses:
 *       200:
 *         description: Access & refresh tokens
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Tokens'
 *       400:
 *         description: Missing email or password
 *       401:
 *         description: Incorrect email or password
 *       500:
 *         description: Unexpected error
 */
router.post("/login", authController.login);

/**
 * @swagger
 * /auth/logout:
 *   get:
 *     summary: Logout (invalidate refresh token)
 *     tags: [Auth]
 *     description: "Provide refresh token in Authorization header: Bearer <refreshToken>"
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logout successful
 *       401:
 *         description: Missing or invalid refresh token
 *       500:
 *         description: Unexpected error
 */
router.get("/logout", authController.logout);

/**
 * @swagger
 * /auth/refresh:
 *   get:
 *     summary: Refresh access token using refresh token
 *     tags: [Auth]
 *     description: "Provide refresh token in Authorization header: Bearer <refreshToken>"
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: New access & refresh tokens
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Tokens'
 *       401:
 *         description: Missing or invalid refresh token
 *       500:
 *         description: Unexpected error
 */
router.get("/refresh", authController.refresh);

/**
 * @swagger
 * /auth/google-login:
 *   post:
 *     summary: Login using Google OAuth
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/GoogleLogin'
 *     responses:
 *       200:
 *         description: Access & refresh tokens
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Tokens'
 *       500:
 *         description: Failed to login via Google
 */
router.post("/google-login", authController.loginByGoogle);

export default router;
