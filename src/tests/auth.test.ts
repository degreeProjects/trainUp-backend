process.env.JWT_EXPIRATION = "4s";

import request from "supertest";
import mongoose from "mongoose";
import { Express } from "express";
import path from "path";
import { initApp } from "../app";
import User, { IUser } from "../models/user";
import config from "../env.config";

let app: Express;
const user: IUser = {
  email: "test@auth.test",
  password: "1234567890",
  fullName: "test",
  homeCity: "test",
};
const testImage = path.resolve(__dirname, "./testImage.png");

beforeAll(async () => {
  app = await initApp();
  await User.deleteMany({ email: user.email });
  await User.deleteMany({ email: user.email + "1" });
});

afterAll(async () => {
  await mongoose.connection.close();
});

let accessToken: string;
let refreshToken: string;
let newRefreshToken: string;

describe("Auth tests", () => {
  test("Test Register without picture", async () => {
    const response = await request(app)
      .post("/auth/register")
      .field("email", user.email + "1")
      .field("password", user.password)
      .field("fullName", user.fullName!)
      .field("homeCity", user.homeCity!);
    expect(response.statusCode).toBe(201);
  });

  test("Test Register", async () => {
    const response = await request(app)
      .post("/auth/register")
      .field("email", user.email)
      .field("password", user.password)
      .field("fullName", user.fullName!)
      .field("homeCity", user.homeCity!)
      .attach("picture", testImage);
    expect(response.statusCode).toBe(201);
  });

  test("Test Register exist email", async () => {
    const response = await request(app)
      .post("/auth/register")
      .field("email", user.email)
      .field("password", user.password)
      .field("fullName", user.fullName!)
      .field("homeCity", user.homeCity!)
      .attach("picture", testImage);
    expect(response.statusCode).toBe(409);
  });

  test("Test Register missing password", async () => {
    const response = await request(app)
      .post("/auth/register")
      .field("email", user.email);
    expect(response.statusCode).toBe(400);
  });

  test("Test Login", async () => {
    const response = await request(app).post("/auth/login").send(user);
    expect(response.statusCode).toBe(200);
    accessToken = response.body.accessToken;
    refreshToken = response.body.refreshToken;
    expect(accessToken).toBeDefined();
  });

  test("Test forbidden access without token", async () => {
    const response = await request(app).get("/users/me");
    expect(response.statusCode).toBe(401);
  });

  test("Test access with valid token", async () => {
    const response = await request(app)
      .get("/users/me")
      .set("Authorization", "Bearer " + accessToken);
    expect(response.statusCode).toBe(200);
  });

  test("Test access with invalid token", async () => {
    const response = await request(app)
      .get("/users/me")
      .set("Authorization", "Bearer 1" + accessToken);
    expect(response.statusCode).toBe(401);
  });

  test("Test access after timeout of token", async () => {
    await new Promise((resolve) => setTimeout(() => resolve("done"), 7000));

    const response = await request(app)
      .get("/users/me")
      .set("Authorization", "Bearer " + accessToken);
    expect(response.statusCode).not.toBe(200);
  });

  test("Test refresh token", async () => {
    const response = await request(app)
      .get("/auth/refresh")
      .set("Authorization", "Bearer " + refreshToken)
      .send();
    expect(response.statusCode).toBe(200);
    expect(response.body.accessToken).toBeDefined();
    expect(response.body.refreshToken).toBeDefined();

    const newAccessToken = response.body.accessToken;
    newRefreshToken = response.body.refreshToken;

    const response2 = await request(app)
      .get("/users/me")
      .set("Authorization", "Bearer " + newAccessToken);
    expect(response2.statusCode).toBe(200);
  });

  test("Test double use of refresh token", async () => {
    const response = await request(app)
      .get("/auth/refresh")
      .set("Authorization", "Bearer " + refreshToken)
      .send();
    expect(response.statusCode).not.toBe(200);

    //verify that the new token is not valid as well
    const response1 = await request(app)
      .get("/auth/refresh")
      .set("Authorization", "Bearer " + newRefreshToken)
      .send();
    expect(response1.statusCode).not.toBe(200);
  });
});
