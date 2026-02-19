process.env.JWT_EXPIRATION = "4s";

import request from "supertest";
import mongoose from "mongoose";
import { Express } from "express";
import path from "path";
import { initApp } from "../app";
import User, { IUser } from "../models/user";
import config from "../env.config";
import bcrypt from "bcrypt";
import { OAuth2Client } from "google-auth-library";

jest.mock("google-auth-library");

let app: Express;
const user: IUser = {
  email: "test@auth.test",
  password: "1234567890",
  fullName: "test",
  homeCity: "test",
};
const testImage = path.resolve(__dirname, "./testImage.png");

// Suppress console.error during tests to reduce noise from expected errors
const originalConsoleError = console.error;
beforeAll(async () => {
  console.error = jest.fn();
  app = await initApp();
  await User.deleteMany({ email: user.email });
  await User.deleteMany({ email: user.email + "1" });
});

afterAll(async () => {
  console.error = originalConsoleError;
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
      .field("password", user.password!!)
      .field("fullName", user.fullName!)
      .field("homeCity", user.homeCity!);
    expect(response.statusCode).toBe(201);
  });

  test("Test Register", async () => {
    const response = await request(app)
      .post("/auth/register")
      .field("email", user.email)
      .field("password", user.password!!)
      .field("fullName", user.fullName!)
      .field("homeCity", user.homeCity!)
      .attach("picture", testImage);
    expect(response.statusCode).toBe(201);
  });

  test("Test Register exist email", async () => {
    const response = await request(app)
      .post("/auth/register")
      .field("email", user.email)
      .field("password", user.password!!)
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

  test("Test Login with missing email", async () => {
    const response = await request(app)
      .post("/auth/login")
      .send({ password: user.password });
    expect(response.statusCode).toBe(400);
  });

  test("Test Login with missing password", async () => {
    const response = await request(app)
      .post("/auth/login")
      .send({ email: user.email });
    expect(response.statusCode).toBe(400);
  });

  test("Test Login with incorrect email", async () => {
    const response = await request(app)
      .post("/auth/login")
      .send({ email: "nonexistent@test.com", password: user.password });
    expect(response.statusCode).toBe(401);
  });

  test("Test Login with incorrect password", async () => {
    const response = await request(app)
      .post("/auth/login")
      .send({ email: user.email, password: "wrongpassword" });
    expect(response.statusCode).toBe(401);
  });

  test("Test Login first time (null refreshTokens) (line 92)", async () => {
    const firstTimeUser = {
      email: "firsttime@test.com",
      password: "password123",
      fullName: "First Time User",
    };

    // Create user directly in DB
    await User.create({
      email: firstTimeUser.email,
      password: await bcrypt.hash(firstTimeUser.password, 10),
      fullName: firstTimeUser.fullName,
    });

    // Mongoose defaults [String] to [], so explicitly unset refreshTokens
    // to make it null/undefined and hit the if (!user.refreshTokens) branch
    await User.updateOne(
      { email: firstTimeUser.email },
      { $unset: { refreshTokens: 1 } }
    );

    // Login should work and initialize refreshTokens = [refreshToken]
    const response = await request(app)
      .post("/auth/login")
      .send({ email: firstTimeUser.email, password: firstTimeUser.password });

    expect(response.statusCode).toBe(200);
    expect(response.body.accessToken).toBeDefined();
    expect(response.body.refreshToken).toBeDefined();

    // Verify refreshTokens was initialized
    const dbUser = await User.findOne({ email: firstTimeUser.email });
    expect(dbUser?.refreshTokens).toHaveLength(1);

    // Cleanup
    await User.deleteMany({ email: firstTimeUser.email });
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

  test("Test refresh without token", async () => {
    const response = await request(app).get("/auth/refresh").send();
    expect(response.statusCode).toBe(401);
  });

  test("Test refresh with invalid token", async () => {
    const response = await request(app)
      .get("/auth/refresh")
      .set("Authorization", "Bearer invalid_token_12345")
      .send();
    expect(response.statusCode).toBe(401);
  });
});

describe("Logout tests", () => {
  let logoutAccessToken: string;
  let logoutRefreshToken: string;

  beforeAll(async () => {
    // Create a fresh login for logout tests
    const response = await request(app).post("/auth/login").send(user);
    logoutAccessToken = response.body.accessToken;
    logoutRefreshToken = response.body.refreshToken;
  });

  test("Test logout without token", async () => {
    const response = await request(app).get("/auth/logout").send();
    expect(response.statusCode).toBe(401);
  });

  test("Test logout with invalid token", async () => {
    const response = await request(app)
      .get("/auth/logout")
      .set("Authorization", "Bearer invalid_token_12345")
      .send();
    expect(response.statusCode).toBe(401);
  });

  test("Test logout with valid token", async () => {
    const response = await request(app)
      .get("/auth/logout")
      .set("Authorization", "Bearer " + logoutRefreshToken)
      .send();
    expect(response.statusCode).toBe(200);
  });

  test("Test logout with already used token", async () => {
    const response = await request(app)
      .get("/auth/logout")
      .set("Authorization", "Bearer " + logoutRefreshToken)
      .send();
    expect(response.statusCode).toBe(401);
  });
});

describe("Google Login tests", () => {
  const mockVerifyIdToken = OAuth2Client.prototype
    .verifyIdToken as jest.Mock;

  afterEach(() => {
    mockVerifyIdToken.mockReset();
  });

  test("Test Google login with missing token", async () => {
    const response = await request(app).post("/auth/google-login").send({});
    expect(response.statusCode).toBe(500);
  });

  test("Test Google login with invalid token", async () => {
    mockVerifyIdToken.mockRejectedValue(new Error("Invalid token"));

    const response = await request(app)
      .post("/auth/google-login")
      .send({ token: "invalid_google_token_12345" });
    expect(response.statusCode).toBe(500);
  });

  test("Test Google login success - new user (lines 117-126)", async () => {
    const googleEmail = "newgoogle@test.com";

    // Cleanup before test
    await User.deleteMany({ email: googleEmail });

    mockVerifyIdToken.mockResolvedValue({
      getPayload: () => ({
        email: googleEmail,
        name: "New Google User",
      }),
    });

    const response = await request(app)
      .post("/auth/google-login")
      .send({ token: "valid_google_token" });

    expect(response.statusCode).toBe(200);
    expect(response.body.accessToken).toBeDefined();
    expect(response.body.refreshToken).toBeDefined();

    // Verify user was created in DB
    const dbUser = await User.findOne({ email: googleEmail });
    expect(dbUser).not.toBeNull();
    expect(dbUser?.fullName).toBe("New Google User");
    expect(dbUser?.refreshTokens).toHaveLength(1);

    // Cleanup
    await User.deleteMany({ email: googleEmail });
  });

  test("Test Google login success - existing user (lines 119, 128-144)", async () => {
    const googleEmail = "existinggoogle@test.com";

    // Create the user beforehand
    await User.deleteMany({ email: googleEmail });
    await User.create({
      email: googleEmail,
      fullName: "Existing Google User",
    });

    mockVerifyIdToken.mockResolvedValue({
      getPayload: () => ({
        email: googleEmail,
        name: "Existing Google User",
      }),
    });

    const response = await request(app)
      .post("/auth/google-login")
      .send({ token: "valid_google_token" });

    expect(response.statusCode).toBe(200);
    expect(response.body.accessToken).toBeDefined();
    expect(response.body.refreshToken).toBeDefined();

    // Login again to test refreshTokens push (line 140)
    const response2 = await request(app)
      .post("/auth/google-login")
      .send({ token: "valid_google_token" });

    expect(response2.statusCode).toBe(200);

    // Verify user has 2 refresh tokens (one per login)
    const dbUser = await User.findOne({ email: googleEmail });
    expect(dbUser?.refreshTokens).toHaveLength(2);

    // Cleanup
    await User.deleteMany({ email: googleEmail });
  });

  test("Test Google login - null refreshTokens init (line 138)", async () => {
    const googleEmail = "googlenull@test.com";

    await User.deleteMany({ email: googleEmail });
    // Create user then unset refreshTokens to make it null
    await User.create({
      email: googleEmail,
      fullName: "Google Null Tokens",
    });
    await User.updateOne(
      { email: googleEmail },
      { $unset: { refreshTokens: 1 } }
    );

    mockVerifyIdToken.mockResolvedValue({
      getPayload: () => ({
        email: googleEmail,
        name: "Google Null Tokens",
      }),
    });

    const response = await request(app)
      .post("/auth/google-login")
      .send({ token: "valid_google_token" });

    expect(response.statusCode).toBe(200);
    expect(response.body.accessToken).toBeDefined();
    expect(response.body.refreshToken).toBeDefined();

    // Verify refreshTokens was initialized
    const dbUser = await User.findOne({ email: googleEmail });
    expect(dbUser?.refreshTokens).toHaveLength(1);

    // Cleanup
    await User.deleteMany({ email: googleEmail });
  });
});

describe("Database Error Handling tests", () => {
  test("Test register with database error", async () => {
    // Temporarily close mongoose connection to simulate DB error
    await mongoose.connection.close();

    const response = await request(app)
      .post("/auth/register")
      .field("email", "dberror@test.com")
      .field("password", "password123")
      .field("fullName", "DB Error Test")
      .field("homeCity", "Test City");

    expect(response.statusCode).toBe(500);

    // Reconnect for other tests
    await mongoose.connect(config.dbUrl);
  });

  test("Test login with database error", async () => {
    // Create user first
    const testUser = {
      email: "logindbtest@test.com",
      password: "password123",
      fullName: "Login DB Test",
    };

    await User.create({
      ...testUser,
      password: await bcrypt.hash(testUser.password, 10),
    });

    // Close connection to simulate DB error
    await mongoose.connection.close();

    const response = await request(app)
      .post("/auth/login")
      .send({ email: testUser.email, password: testUser.password });

    expect(response.statusCode).toBe(500);

    // Reconnect
    await mongoose.connect(config.dbUrl);

    // Cleanup
    await User.deleteMany({ email: testUser.email });
  });

  test("Test logout with database error", async () => {
    // Create user and get refresh token
    const testUser = {
      email: "logoutdbtest@test.com",
      password: "password123",
      fullName: "Logout DB Test",
    };

    const registerResponse = await request(app)
      .post("/auth/register")
      .field("email", testUser.email)
      .field("password", testUser.password)
      .field("fullName", testUser.fullName);

    const loginResponse = await request(app)
      .post("/auth/login")
      .send({ email: testUser.email, password: testUser.password });

    const testRefreshToken = loginResponse.body.refreshToken;

    // Close connection to simulate DB error
    await mongoose.connection.close();

    const response = await request(app)
      .get("/auth/logout")
      .set("Authorization", "Bearer " + testRefreshToken)
      .send();

    expect(response.statusCode).toBe(500);

    // Reconnect
    await mongoose.connect(config.dbUrl);

    // Cleanup
    await User.deleteMany({ email: testUser.email });
  });

  test("Test refresh with database error", async () => {
    // Create user and get refresh token
    const testUser = {
      email: "refreshdbtest@test.com",
      password: "password123",
      fullName: "Refresh DB Test",
    };

    await request(app)
      .post("/auth/register")
      .field("email", testUser.email)
      .field("password", testUser.password)
      .field("fullName", testUser.fullName);

    const loginResponse = await request(app)
      .post("/auth/login")
      .send({ email: testUser.email, password: testUser.password });

    const testRefreshToken = loginResponse.body.refreshToken;

    // Close connection to simulate DB error
    await mongoose.connection.close();

    const response = await request(app)
      .get("/auth/refresh")
      .set("Authorization", "Bearer " + testRefreshToken)
      .send();

    expect(response.statusCode).toBe(500);

    // Reconnect
    await mongoose.connect(config.dbUrl);

    // Cleanup
    await User.deleteMany({ email: testUser.email });
  });
});

describe("Upload Error tests", () => {

  test("Test register with file size exceeding limit", async () => {
    // Create a large buffer (6MB) to exceed the 5MB limit
    const largeBuffer = Buffer.alloc(6 * 1024 * 1024); // 6MB

    const response = await request(app)
      .post("/auth/register")
      .field("email", "largefile@test.com")
      .field("password", "password123")
      .field("fullName", "Large File Test")
      .field("homeCity", "Test City")
      .attach("picture", largeBuffer, "largefile.png");

    // Should return 422 with error about file size
    expect(response.statusCode).toBe(422);
    expect(response.body.errors).toBeDefined();

    // Cleanup
    await User.deleteMany({ email: "largefile@test.com" });
  });
});
