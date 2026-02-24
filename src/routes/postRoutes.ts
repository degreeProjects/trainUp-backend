import express from "express";
const router = express.Router();
import postsController from "../controllers/postController";
import authMiddleware from "../middlewares/authMiddleware";

/**
 * @swagger
 * tags:
 *   name: Posts
 *   description: The Posts API
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Comment:
 *       type: object
 *       required:
 *         - body
 *       properties:
 *         body:
 *           type: string
 *           description: The comment body
 *       example:
 *         body: 'This looks such a good gym. i must go there and try the new bench press!'
 *
 *     Post:
 *       type: object
 *       required:
 *         - TrainingType
 *         - city
 *         - trainingLength
 *       properties:
 *         _id:
 *           type: string
 *           description: Post ID
 *         TrainingType:
 *           type: string
 *           description: The training type
 *         description:
 *           type: string
 *           description: The post description
 *         notes:
 *           type: string
 *           description: Free-text notes shared with the AI personal trainer
 *         caloriesSummary:
 *           type: string
 *           description: AI generated calorie estimate for the workout
 *         aiTips:
 *           type: string
 *           description: AI generated coaching tip for this workout
 *         image:
 *           type: string
 *           format: binary
 *           description: The post image
 *         city:
 *           type: string
 *           description: The post city
 *         trainingLength:
 *           type: number
 *           description: Duration of the workout in minutes
 *         likes:
 *           type: array
 *           items:
 *             type: string
 *           description: Array of user IDs who liked this post
 *         comments:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Comment'
 *       example:
 *         _id: "64f0b9c123abc456def78901"
 *         TrainingType: 'Gym'
 *         description: 'Yesterday I went to this gym and it was crazy'
 *         notes: 'Felt strong but legs were heavy after the sprints.'
 *         caloriesSummary: 'You burn: 320-360 in this training'
 *         aiTips: 'Add a longer cool-down walk to flush the lactic acid.'
 *         image: 'image-file.jpg'
 *         city: 'Tel Aviv'
 *         trainingLength: 45
 *         likes: ["64f0b8a123abc456def12345"]
 *         comments: []
 */

/**
 * @swagger
 * /posts:
 *   get:
 *     summary: Get list of posts
 *     tags: [Posts]
 *     responses:
 *       200:
 *         description: List of posts
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Post'
 *       500:
 *         description: Unexpected error
 */
router.get("/", postsController.get.bind(postsController));

/**
 * @swagger
 * /posts/{id}:
 *   get:
 *     summary: Get a post by ID
 *     tags: [Posts]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           pattern: "^[a-fA-F0-9]{24}$"
 *         description: MongoDB ObjectId of the post
 *     responses:
 *       200:
 *         description: The post with the specified ID
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Post'
 *       404:
 *         description: Post not found
 *       500:
 *         description: Unexpected error
 */
router.get("/:id", postsController.getById.bind(postsController));

/**
 * @swagger
 * /posts/search/cityAndType:
 *   get:
 *     summary: get posts by city and type
 *     tags: [Posts]
 *     parameters:
 *       - in: query
 *         name: city
 *         schema:
 *           type: string
 *         required: true
 *         description: the city of the training
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *         required: true
 *         description: the type of the training
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: page number for paginated results
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *         description: page size for paginated results
 *     responses:
 *       200:
 *         description: list of posts filtered by city and type
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Post'
 *       500:
 *         description: Unexpected error
 */
router.get(
  "/search/cityAndType",
  postsController.getByCityAndType.bind(postsController)
);

/**
 * @swagger
 * /posts/user/me:
 *   get:
 *     summary: Get posts uploaded by the authenticated user
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number for paginated results
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *         description: Page size for paginated results
 *     responses:
 *       200:
 *         description: List of posts created by the logged-in user
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Post'
 *       500:
 *         description: Unexpected error
 */
router.get(
  "/user/me",
  authMiddleware,
  postsController.getByMe.bind(postsController)
);

/**
 * @swagger
 * /posts/training/types:
 *   get:
 *     summary: Get all training types
 *     tags: [Posts]
 *     responses:
 *       200:
 *         description: Array of all training types
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: string
 *       500:
 *         description: Unexpected error
 */
router.get(
  "/training/types",
  postsController.getTrainingTypes.bind(postsController)
);

/**
 * @swagger
 * /posts:
 *   post:
 *     summary: Create a new post
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - type
 *               - city
 *               - trainingLength
 *             properties:
 *               type:
 *                 type: string
 *                 description: Training type
 *                 enum:
 *                   - Gym
 *                   - CrossFit
 *                   - Cardio
 *                   - Yoga
 *                   - Pilates
 *                   - Stretching
 *                   - Martial Arts
 *                   - Team Sports
 *                   - Tennis
 *                   - Padel
 *                   - Climbing
 *                   - Running
 *                   - Walking
 *                   - Cycling
 *                   - Swimming
 *                   - Stair Climbing
 *                   - Jumping Rope
 *                   - Hiking
 *                   - Tabata
 *               notes:
 *                 type: string
 *                 description: Notes for the AI personal trainer
 *               city:
 *                 type: string
 *                 description: City where the workout was done
 *               trainingLength:
 *                 type: number
 *                 description: Workout duration in minutes
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: Image file upload
 *     responses:
 *       200:
 *         description: The created post
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Post'
 *       422:
 *         description: Error while trying to upload file
 *       500:
 *         description: Internal server error
 */
router.post("/", authMiddleware, postsController.post.bind(postsController));

/**
 * @swagger
 * /posts/{postId}/comment:
 *   post:
 *     summary: Add a comment to a post
 *     tags: [Posts]
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: "^[0-9a-fA-F]{24}$"
 *         description: MongoDB ObjectId of the post to comment on
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Comment'
 *     responses:
 *       200:
 *         description: The updated list of comments after adding the new one
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Comment'
 *       409:
 *         description: Error while trying to add comment to a post
 */
router.post(
  "/:postId/comment",
  authMiddleware,
  postsController.addCommentToPost.bind(postsController)
);

/**
 * @swagger
 * /posts/{id}:
 *   put:
 *     summary: Update a post by ID
 *     tags: [Posts]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           pattern: "^[0-9a-fA-F]{24}$"
 *         description: MongoDB ObjectId of the post to update
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: The updated post
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Post'
 *       422:
 *         description: Error while trying to upload file
 *       409:
 *         description: Error while trying to update post
 */
router.put(
  "/:id",
  authMiddleware,
  postsController.putById.bind(postsController)
);

/**
 * @swagger
 * /posts/{id}:
 *   delete:
 *     summary: Delete a post by ID
 *     tags: [Posts]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           pattern: "^[0-9a-fA-F]{24}$"
 *         description: MongoDB ObjectId of the post to delete
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: The deleted post
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Post'
 *       409:
 *         description: Error while trying to delete the post
 */
router.delete(
  "/:id",
  authMiddleware,
  postsController.deleteById.bind(postsController)
);

/**
 * @swagger
 * /posts/addLike/{postId}:
 *   put:
 *     summary: Add a like to a post
 *     tags: [Posts]
 *     parameters:
 *       - in: path
 *         name: postId
 *         schema:
 *           type: string
 *           pattern: "^[0-9a-fA-F]{24}$"
 *         required: true
 *         description: MongoDB ObjectId of the post to like
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: The post after the like was added
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Post'
 *       400:
 *         description: Missing or invalid userId
 *       404:
 *         description: Post not found
 *       500:
 *         description: Internal server error
 */
router.put(
  "/addLike/:postId",
  authMiddleware,
  postsController.addLike.bind(postsController)
);

/**
 * @swagger
 * /posts/removeLike/{postId}:
 *   put:
 *     summary: Remove a like from a post
 *     tags: [Posts]
 *     parameters:
 *       - in: path
 *         name: postId
 *         schema:
 *           type: string
 *           pattern: "^[0-9a-fA-F]{24}$"
 *         required: true
 *         description: MongoDB ObjectId of the post
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: The updated post (after removing like)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Post'
 *       400:
 *         description: postId or userId is missing or invalid
 *       404:
 *         description: Post not found
 *       500:
 *         description: Internal server error
 */
router.put(
  "/removeLike/:postId",
  authMiddleware,
  postsController.removeLike.bind(postsController)
);

/**
 * @swagger
 * /posts/likedPosts/{userId}:
 *   get:
 *     summary: Get all posts that a user liked
 *     tags: [Posts]
 *     parameters:
 *       - in: path
 *         name: userId
 *         schema:
 *           type: string
 *           pattern: "^[0-9a-fA-F]{24}$"
 *         required: true
 *         description: MongoDB ObjectId of the user
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All posts liked by the user
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Post'
 *       400:
 *         description: userId is required or invalid
 *       500:
 *         description: Internal server error
 */
router.get(
  "/likedPosts/:userId",
  authMiddleware,
  postsController.getLikedPostsByUser.bind(postsController)
);

export default router;
