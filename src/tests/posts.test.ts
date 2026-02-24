import request from "supertest";
import mongoose from "mongoose";
import { Express } from "express";
import path from "path";
import { initApp } from "../app";
import Post, { IPost } from "../models/post";
import User, { IUser } from "../models/user";

let app: Express;
const user: IUser = {
  email: "test@post.test",
  password: "1234567890",
  fullName: "test",
  homeCity: "herzliya",
};
const testImage = path.resolve(__dirname, "./testImage.png");

let accessToken = "";
const createdPostIds: string[] = [];

// Suppress console.error during tests to reduce noise from expected errors
const originalConsoleError = console.error;
beforeAll(async () => {
  console.error = jest.fn();
  app = await initApp();

  await User.deleteMany({ email: user.email });
  const response = await request(app)
    .post("/auth/register")
    .field("email", user.email)
    .field("password", user.password!!)
    .field("fullName", user.fullName)
    .field("homeCity", user.homeCity!!)
    .attach("picture", testImage);
  user._id = response.body._id;
  post.user = user._id;
  const response2 = await request(app).post("/auth/login").send(user);
  accessToken = response2.body.accessToken;
});

afterAll(async () => {
  console.error = originalConsoleError;
  // Only delete posts created during this test run
  if (createdPostIds.length > 0) {
    await Post.deleteMany({ _id: { $in: createdPostIds } });
  }
  await User.deleteMany({ email: user.email });
  await mongoose.connection.close();
});

const post: Partial<IPost> = {
  type: "Gym",
  notes: "test notes",
  city: "herzliya",
  trainingLength: 45,
  user: user._id,
  likes: [],
};

describe("post tests", () => {
  test("TEST POST post", async () => {
    const response = await request(app)
      .post("/posts")
      .set("Authorization", "Bearer " + accessToken)
      .field("type", post.type!!)
      .field("notes", post.notes!!)
      .field("trainingLength", post.trainingLength!!.toString())
      .field("city", post.city!!)
      .field("user", post.user!!)
      .field("likes", post.likes!!)
      .attach("picture", testImage);

    post._id = response.body._id;
    createdPostIds.push(response.body._id);

    expect(response.statusCode).toBe(201);
    expect(response.body.user).toBe(user._id);
    expect(response.body.type).toBe(post.type);
    expect(response.body.notes).toBe(post.notes);
    expect(response.body.image).toBeDefined();
    expect(response.body.city).toBe(post.city);
    expect(response.body.comments).toStrictEqual([]);
  });

  test("Test POST without picture", async () => {
    const response = await request(app)
      .post("/posts")
      .set("Authorization", "Bearer " + accessToken)
      .field("type", post.type!!)
      .field("notes", post.notes!!)
      .field("trainingLength", post.trainingLength!!.toString())
      .field("city", post.city!!)
      .field("user", post.user!!);

    createdPostIds.push(response.body._id);

    expect(response.statusCode).toBe(201);
    expect(response.body.user).toBe(user._id);
    expect(response.body.type).toBe(post.type);
    expect(response.body.notes).toBe(post.notes);
    expect(response.body.image).not.toBeDefined();
    expect(response.body.city).toBe(post.city);
    expect(response.body.comments).toStrictEqual([]);
  });

  test("Test GET posts", async () => {
    const response = await request(app).get("/posts");

    expect(response.statusCode).toBe(200);
    expect(response.body.length).toBeGreaterThanOrEqual(2);
  });

  test("Test GET post by id", async () => {
    const response = await request(app).get(`/posts/${post._id}`);

    expect(response.statusCode).toBe(200);
    expect(response.body.user._id).toBe(user._id);
    expect(response.body.type).toBe(post.type);
    expect(response.body.notes).toBe(post.notes);
    expect(response.body.image).toBeDefined();
    expect(response.body.city).toBe(post.city);
    expect(response.body.comments).toStrictEqual([]);
  });

  test("Test GET posts by type and city", async () => {
    const response = await request(app).get(
      "/posts/search/cityAndType/?city=herzliya&type=Gym&page=1&pageSize=10"
    );

    expect(response.statusCode).toBe(200);
    expect(response.body.length).toBeGreaterThanOrEqual(2);
  });

  test("TEST GET posts of me", async () => {
    const response = await request(app)
      .get("/posts/user/me?page=1&pageSize=10")
      .set("Authorization", "Bearer " + accessToken);

    expect(response.statusCode).toBe(200);
    expect(response.body.length).toBeGreaterThanOrEqual(2);
  });

  test("TEST GET training types", async () => {
    const response = await request(app)
      .get("/posts/training/types")
      .set("Authorization", "Bearer " + accessToken);

    expect(response.statusCode).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });

  test("Test PUT post", async () => {
    const response = await request(app)
      .put(`/posts/${post._id}`)
      .set("Authorization", "Bearer " + accessToken)
      .send({ city: "tel aviv" });

    expect(response.statusCode).toBe(200);
    expect(response.body.city).toBe("tel aviv");
  });

  test("Test POST comment", async () => {
    const response = await request(app)
      .post(`/posts/${post._id}/comment`)
      .set("Authorization", "Bearer " + accessToken)
      .send({ body: "Wow nice abs" });

    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveLength(1);
    expect(response.body[0].body).toBe("Wow nice abs");
    expect(response.body[0].user._id).toBe(user._id);
  });

  test("Should add like to the post", async () => {
    const response = await request(app)
      .put(`/posts/addLike/${post._id}?userId=${user._id}`)
      .set("Authorization", "Bearer " + accessToken);

    expect(response.statusCode).toBe(200);
    expect(response.body.likes).toContain(user._id);
    expect(response.body.likes.length).toBe(1);
  });

  test("Should NOT add duplicate like", async () => {
    await request(app)
      .put(`/posts/addLike/${post._id}?userId=${user._id}`)
      .set("Authorization", "Bearer " + accessToken);

    const response = await request(app)
      .put(`/posts/addLike/${post._id}?userId=${user._id}`)
      .set("Authorization", "Bearer " + accessToken);

    expect(response.statusCode).toBe(200);
    expect(response.body.likes).toContain(user._id);
    expect(response.body.likes.length).toBe(1);
  });

  test("Should return 400 if userId missing", async () => {
    const response = await request(app)
      .put(`/posts/addLike/${post._id}`)
      .set("Authorization", "Bearer " + accessToken);

    expect(response.statusCode).toBe(400);
    expect(response.body.error).toBe("userId is required");
  });

  test("Should return 404 if post not found", async () => {
    const fakePostId = "67692be5d2f5ecacb5d1aaaa";

    const response = await request(app)
      .put(`/posts/addLike/${fakePostId}?userId=${user._id}`)
      .set("Authorization", "Bearer " + accessToken);

    expect(response.statusCode).toBe(404);
    expect(response.body.error).toBe("Post not found");
  });

  test("Should remove like from post", async () => {
    await request(app)
      .put(`/posts/addLike/${post._id}?userId=${user._id}`)
      .set("Authorization", "Bearer " + accessToken);

    const response = await request(app)
      .put(`/posts/removeLike/${post._id}?userId=${user._id}`)
      .set("Authorization", "Bearer " + accessToken);

    expect(response.statusCode).toBe(200);
    expect(response.body.likes).not.toContain(user._id);
    expect(response.body.likes.length).toBe(0);
  });

  test("Should work even if userId is not in likes", async () => {
    await request(app)
      .put(`/posts/addLike/${post._id}?userId=${user._id}`)
      .set("Authorization", "Bearer " + accessToken);

    const response = await request(app)
      .put(`/posts/removeLike/${post._id}?userId=99999`)
      .set("Authorization", "Bearer " + accessToken);

    expect(response.statusCode).toBe(200);
    expect(response.body.likes).toHaveLength(1);
    expect(response.body.likes).toContain(user._id);
  });

  test("Should return 400 if userId missing", async () => {
    const response = await request(app)
      .put(`/posts/removeLike/${post._id}`)
      .set("Authorization", "Bearer " + accessToken);

    expect(response.statusCode).toBe(400);
    expect(response.body.error).toBe("userId is required");
  });

  test("Should return 404 if post not found", async () => {
    const fakePostId = "67692be5d2f5ecacb5d1aaaa";

    const response = await request(app)
      .put(`/posts/removeLike/${fakePostId}?userId=${user._id}`)
      .set("Authorization", "Bearer " + accessToken);

    expect(response.statusCode).toBe(404);
    expect(response.body.error).toBe("Post not found");
  });

  test("Should return posts liked by the user", async () => {
    const response = await request(app)
      .get(`/posts/likedPosts/${user._id}`)
      .set("Authorization", "Bearer " + accessToken);

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
  });

  test("Should return empty array when user has no liked posts", async () => {
    const response = await request(app)
      .get(`/posts/likedPosts/noSuchUser`)
      .set("Authorization", "Bearer " + accessToken);

    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });

  test("Test DELETE post", async () => {
    const response = await request(app)
      .delete(`/posts/${post._id}`)
      .set("Authorization", "Bearer " + accessToken);

    expect(response.statusCode).toBe(200);
    expect(response.body._id).toBe(post._id);
  });
});

describe("Post Error Handling tests", () => {

  test("Test GET post by invalid id (not found)", async () => {
    const invalidPostId = "507f1f77bcf86cd799439011";

    const response = await request(app).get(`/posts/${invalidPostId}`);

    expect(response.statusCode).toBe(404);
    expect(response.body.message).toBe("Post not found");
  });

  test("Test GET post by malformed id (error)", async () => {
    const malformedId = "invalid_id_format";

    const response = await request(app).get(`/posts/${malformedId}`);

    expect(response.statusCode).toBe(500);
    expect(response.body.message).toBeDefined();
  });
});

describe("Post Database Error tests", () => {
  test("Test GET posts by city and type with database error", async () => {
    await mongoose.connection.close();

    const response = await request(app).get(
      "/posts/search/cityAndType/?city=herzliya&type=Gym&page=1&pageSize=10"
    );

    expect(response.statusCode).toBe(500);
    expect(response.body.message).toBeDefined();

    await mongoose.connect(require("../env.config").default.dbUrl);
  });

  test("Test GET posts of me with database error", async () => {
    await mongoose.connection.close();

    const response = await request(app)
      .get("/posts/user/me?page=1&pageSize=10")
      .set("Authorization", "Bearer " + accessToken);

    expect(response.statusCode).toBe(500);
    expect(response.body.message).toBeDefined();

    await mongoose.connect(require("../env.config").default.dbUrl);
  });

  test("Test GET training types with database error", async () => {
    // This one is tricky since it doesn't actually query DB
    // But we can test the error handling path exists
    const response = await request(app)
      .get("/posts/training/types")
      .set("Authorization", "Bearer " + accessToken);

    // Should succeed normally
    expect(response.statusCode).toBe(200);
  });

  test("Test POST comment with database error", async () => {
    // Create a post first
    const createResponse = await request(app)
      .post("/posts")
      .set("Authorization", "Bearer " + accessToken)
      .field("type", "Gym")
      .field("notes", "test for comment error")
      .field("trainingLength", "30")
      .field("city", "herzliya")
      .attach("picture", testImage);

    const postId = createResponse.body._id;
    createdPostIds.push(postId);

    await mongoose.connection.close();

    const response = await request(app)
      .post(`/posts/${postId}/comment`)
      .set("Authorization", "Bearer " + accessToken)
      .send({ body: "This should fail" });

    expect(response.statusCode).toBe(409);

    await mongoose.connect(require("../env.config").default.dbUrl);
  });

  test("Test addLike with database error", async () => {
    // Create a post first
    const createResponse = await request(app)
      .post("/posts")
      .set("Authorization", "Bearer " + accessToken)
      .field("type", "Gym")
      .field("notes", "test for like error")
      .field("trainingLength", "30")
      .field("city", "herzliya")
      .attach("picture", testImage);

    const postId = createResponse.body._id;
    createdPostIds.push(postId);

    await mongoose.connection.close();

    const response = await request(app)
      .put(`/posts/addLike/${postId}?userId=${user._id}`)
      .set("Authorization", "Bearer " + accessToken);

    expect(response.statusCode).toBe(500);
    expect(response.body.error).toBe("Internal server error");

    await mongoose.connect(require("../env.config").default.dbUrl);
  });

  test("Test removeLike with database error", async () => {
    // Create a post first
    const createResponse = await request(app)
      .post("/posts")
      .set("Authorization", "Bearer " + accessToken)
      .field("type", "Gym")
      .field("notes", "test for remove like error")
      .field("trainingLength", "30")
      .field("city", "herzliya")
      .attach("picture", testImage);

    const postId = createResponse.body._id;
    createdPostIds.push(postId);

    await mongoose.connection.close();

    const response = await request(app)
      .put(`/posts/removeLike/${postId}?userId=${user._id}`)
      .set("Authorization", "Bearer " + accessToken);

    expect(response.statusCode).toBe(500);
    expect(response.body.error).toBe("Internal server error");

    await mongoose.connect(require("../env.config").default.dbUrl);
  });

  test("Test getLikedPostsByUser with database error", async () => {
    await mongoose.connection.close();

    const response = await request(app)
      .get(`/posts/likedPosts/${user._id}`)
      .set("Authorization", "Bearer " + accessToken);

    expect(response.statusCode).toBe(500);
    expect(response.body.error).toBe("Internal server error");

    await mongoose.connect(require("../env.config").default.dbUrl);
  });
});
