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

  test("Test DELETE post", async () => {
    const response = await request(app)
      .delete(`/posts/${post._id}`)
      .set("Authorization", "Bearer " + accessToken);

    expect(response.statusCode).toBe(200);
    expect(response.body._id).toBe(post._id);
  });
});
