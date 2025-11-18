import express from "express";
import authController from "../controllers/authController";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: The Authentication API
 */

/**
 * @swagger
 * components:
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 */

/*
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       required:
 *         - email
 *         - password
 *         - fullName
 *         - homeCity
 *       properties:
 *         email:
 *           type: string
 *           description: The user email
 *         password:
 *           type: string
 *           description: The user password
 *         fullName:
 *           type: string
 *           description: The user fullName
 *       example:
 *         email: 'maccabi@gmail.com'
 *         password: '24680'
 *         fullName: 'Ben Idan'
 *         homeCity: 'Tel Aviv'
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     UserLogin:
 *       type: object
 *       required:
 *         - email
 *         - password
 *       properties:
 *         email:
 *           type: string
 *           description: The user email
 *         password:
 *           type: string
 *           description: The user password
 *       example:
 *         email: 'maccabi@gmail.com'
 *         password: '123456'
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Tokens:
 *       type: object
 *       required:
 *         - accessToken
 *         - refreshToken
 *       properties:
 *         accessToken:
 *           type: string
 *           description: The JWT access token
 *         refreshToken:
 *           type: string
 *           description: The JWT refresh token
 *       example:
 *         accessToken: '123cd123x1xx1'
 *         refreshToken: '134r2134cr1x3c'
 */

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: registers a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             $ref: '#/components/schemas/User'
 *     responses:
 *       201:
 *         description: The new user
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       400:
 *         description: missing email or password
 *       409:
 *         description: email already exists
 *       500:
 *         description: unexpected error
 */
router.post("/register", authController.register);

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: login a user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *            schema:
 *               $ref: '#/components/schemas/UserLogin'
 *     responses:
 *       200:
 *         description: The access & refresh tokens
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Tokens'
 *       401:
 *         description: email or password is incorrect
 *       500:
 *         description: unexpected error
 */
router.post("/login", authController.login);

/**
 * @swagger
 * /auth/logout:
 *   get:
 *     summary: logout a user
 *     tags: [Auth]
 *     description: need to provide the refresh token in the auth header
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: logout completed successfully
 *       401:
 *         description: Authorization information is missing or invalid
 *       500:
 *         description: unexpected error
 */
router.get("/logout", authController.logout);

/**
 * @swagger
 * /auth/refresh:
 *   get:
 *     summary: get a new access token using the refresh token
 *     tags: [Auth]
 *     description: need to provide the refresh token in the auth header
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: logout completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Tokens'
 *       401:
 *         description: Authorization information is missing or invalid
 *       500:
 *         description: unexpected error
 */
router.get("/refresh", authController.refresh);

/**
 * @swagger
 * /auth/google-login:
 *   post:
 *     summary: login a user by google
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *     responses:
 *       200:
 *         description: The access & refresh tokens
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Tokens'
 *       401:
 *         description: email or password is incorrect
 */
router.post("/google-login", authController.loginByGoogle);

export default router;
