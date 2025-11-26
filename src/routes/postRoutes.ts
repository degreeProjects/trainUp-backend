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
 *     Post:
 *       type: object
 *       required:
 *         - description
 *         - image
 *         - TrainingType
 *       properties:
 *         TrainingType:
 *           type: string
 *           description: The training type
 *         description:
 *           type: string
 *           description: The post description
 *         image:
 *           type: string
 *           format: binary
 *           description: The post image
 *         city:
 *          type: string
 *          description: The post city
 *       example:
 *         trainingType: 'gym'
 *         description: 'Yesterday I went to this gym and it was crazy'
 *         image: File
 *         city: 'Tel Aviv'
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
 *         body: 'This looks such a good gym. i must go there and try the new bench press! '
 */

/**
 * @swagger
 * /posts:
 *   get:
 *     summary: get list of posts
 *     tags: [Posts]
 *     responses:
 *       200:
 *         description: list of posts
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 allOf:
 *                   - $ref: '#/components/schemas/Post'
 *       500:
 *         description: Unexpected error
 */
router.get("/", postsController.get.bind(postsController));

/**
 * @swagger
 * /posts/{id}:
 *   get:
 *     summary: get post by id
 *     tags: [Posts]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Numeric ID of the post to get
 *     responses:
 *       200:
 *         description: the post with the id
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Post'
 *       500:
 *         description: Unexpected error
 */
router.get("/:id", postsController.getById.bind(postsController));

/**
 * @swagger
 * /posts/{city}?page={page}&pageSize={pageSize}:
 *   get:
 *     summary: get post by city
 *     tags: [Posts]
 *     parameters:
 *       - in: path
 *         name: city
 *         schema:
 *           type: string
 *         required: true
 *         description: city name of the posts to get
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
 *         description: list of posts with the city name
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 allOf:
 *                   - $ref: '#/components/schemas/Post'
 *       500:
 *         description: Unexpected error
 */
router.get("/city/:city", postsController.getByCity.bind(postsController));

/**
 * @swagger
 * /posts/search/cityAndType?city={city}&type={type}&page={page}&pageSize={pageSize}:
 *   get:
 *     summary: get posts by city and type
 *     tags: [Posts]
 *     parameters:
 *       - in: query
 *         name: city
 *         schema:
 *           type: String
 *         description: the city of the training
 *       - in: query
 *         name: type
 *         schema:
 *           type: String
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
 *         description: list of posts with the city and types
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 allOf:
 *                   - $ref: '#/components/schemas/Post'
 *       500:
 *         description: Unexpected error
 */
router.get(
  "/search/cityAndType",
  postsController.getByCityAndType.bind(postsController)
);

/**
 * @swagger
 * /posts/user/me?page={page}&pageSize={pageSize}:
 *   get:
 *     summary: get posts uploaded by me
 *     tags: [Posts]
 *     parameters:
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
 *         description: list of posts with the user id
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 allOf:
 *                   - $ref: '#/components/schemas/Post'
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
 * /posts/trainingTypes:
 *   get:
 *     summary: get all training types
 *     tags: [Posts]
 *     responses:
 *       200:
 *         description: array of the training types
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Post'
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
 *     summary: create post
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             $ref: '#/components/schemas/Post'
 *     responses:
 *        200:
 *          description: the created post
 *          content:
 *            application/json:
 *              schema:
 *                $ref: '#/components/schemas/Post'
 *        409:
 *          description: Error while trying to create new post
 */
router.post("/", authMiddleware, postsController.post.bind(postsController));

/**
 * @swagger
 * /posts/{postId}/comment:
 *   post:
 *     summary: add comment to a post
 *     tags: [Posts]
 *     parameters:
 *       - in: path
 *         name: postId
 *         schema:
 *           type: string
 *         required: true
 *         description: post id to add comment to
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Comment'
 *     responses:
 *        200:
 *          description: New comment was added
 *          content:
 *            application/json:
 *              schema:
 *                type: array
 *                items:
 *                  allOf:
 *                    - $ref: '#/components/schemas/Comment'
 *        409:
 *          description: Error while trying to add comment to a post
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
 *     summary: update post by id
 *     tags: [Posts]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Numeric ID of the post to update
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: the updated post
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Post'
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
 *     summary: delete post by id
 *     tags: [Posts]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Numeric ID of the post to delete
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: the deleted post
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Post'
 *       409:
 *         description: Error while trying to delete post
 */
router.delete(
  "/:id",
  authMiddleware,
  postsController.deleteById.bind(postsController)
);

/**
 * @swagger
 * /posts/addLike/{id}:
 *   put:
 *     summary: add like to post
 *     tags: [Posts]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Numeric ID of the post to add like
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: the post with the new like
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Post'
 *       400:
 *         description: userId is required
 *       404:
 *          post not found
 *       500:
 *          Internal server error
 */
router.put(
  "/addLike/:postId",
  authMiddleware,
  postsController.addLike.bind(postsController)
);

/**
 * @swagger
 * /posts/removeLike/{id}:
 *   put:
 *     summary: remove like from post
 *     tags: [Posts]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Numeric ID of the post to remove like
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: the post without the like
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Post'
 *       400:
 *         description: userId is required
 *       404:
 *          post not found
 *       500:
 *          Internal server error
 */
router.put(
  "/removeLike/:postId",
  authMiddleware,
  postsController.removeLike.bind(postsController)
);

export default router;
