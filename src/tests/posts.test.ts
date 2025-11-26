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

beforeAll(async () => {
  app = await initApp();
  await Post.deleteMany();

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
  await mongoose.connection.close();
});

const post: Partial<IPost> = {
  type: "Gym",
  description: "test",
  city: "herzliya",
  user: user._id,
  likes: [],
};

describe("post tests", () => {
  test("TEST POST post", async () => {
    const response = await request(app)
      .post("/posts")
      .set("Authorization", "Bearer " + accessToken)
      .field("type", post.type!!)
      .field("description", post.description!!)
      .field("city", post.city!!)
      .field("user", post.user!!)
      .field("likes", post.likes!!)
      .attach("picture", testImage);

    post._id = response.body._id;

    expect(response.statusCode).toBe(201);
    expect(response.body.user).toBe(user._id);
    expect(response.body.type).toBe(post.type);
    expect(response.body.description).toBe(post.description);
    expect(response.body.image).toBeDefined();
    expect(response.body.city).toBe(post.city);
    expect(response.body.comments).toStrictEqual([]);
  });

  test("Test POST without picture", async () => {
    const response = await request(app)
      .post("/posts")
      .set("Authorization", "Bearer " + accessToken)
      .field("type", post.type!!)
      .field("description", post.description!!)
      .field("city", post.city!!)
      .field("user", post.user!!);

    expect(response.statusCode).toBe(201);
    expect(response.body.user).toBe(user._id);
    expect(response.body.type).toBe(post.type);
    expect(response.body.description).toBe(post.description);
    expect(response.body.image).not.toBeDefined();
    expect(response.body.city).toBe(post.city);
    expect(response.body.comments).toStrictEqual([]);
  });

  test("Test GET posts", async () => {
    const response = await request(app).get("/posts");

    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveLength(2);
  });

  test("Test GET post by id", async () => {
    const response = await request(app).get(`/posts/${post._id}`);

    expect(response.statusCode).toBe(200);
    expect(response.body.user._id).toBe(user._id);
    expect(response.body.type).toBe(post.type);
    expect(response.body.description).toBe(post.description);
    expect(response.body.image).toBeDefined();
    expect(response.body.city).toBe(post.city);
    expect(response.body.comments).toStrictEqual([]);
  });

  test("Test GET posts by type and city", async () => {
    const response = await request(app).get(
      "/posts/search/cityAndType/?city=herzliya&type=Gym&page=1&pageSize=10"
    );

    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveLength(2);
  });

  test("TEST GET posts of me", async () => {
    const response = await request(app)
      .get("/posts/user/me?page=1&pageSize=10")
      .set("Authorization", "Bearer " + accessToken);

    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveLength(2);
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
