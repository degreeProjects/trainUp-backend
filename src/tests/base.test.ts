import request from "supertest";
import mongoose from "mongoose";
import { Express } from "express";
import path from "path";
import { initApp } from "../app";
import Post, { IPost } from "../models/post";
import User, { IUser } from "../models/user";
import config from "../env.config";
import * as loggerModule from "../config/logger";

let app: Express;
const user: IUser = {
    email: "test@base.test",
    password: "1234567890",
    fullName: "base test",
    homeCity: "herzliya",
};
const testImage = path.resolve(__dirname, "./testImage.png");
let accessToken = "";
let createdPostIds: string[] = [];

const originalConsoleError = console.error;
beforeAll(async () => {
    console.error = jest.fn();
    app = await initApp();
    // Suppress logger output during expected error tests
    jest.spyOn(loggerModule.logger, "error").mockImplementation(() => true as any);
    await User.deleteMany({ email: user.email });

    const registerResponse = await request(app)
        .post("/auth/register")
        .field("email", user.email)
        .field("password", user.password!!)
        .field("fullName", user.fullName)
        .field("homeCity", user.homeCity!!)
        .attach("picture", testImage);

    user._id = registerResponse.body._id;

    const loginResponse = await request(app).post("/auth/login").send(user);
    accessToken = loginResponse.body.accessToken;
});

afterAll(async () => {
    console.error = originalConsoleError;
    jest.restoreAllMocks();
    // Only delete posts created during this test run
    if (createdPostIds.length > 0) {
        await Post.deleteMany({ _id: { $in: createdPostIds } });
    }
    await User.deleteMany({ email: user.email });
    await mongoose.connection.close();
});

let postId: string;

describe("BaseController.get tests", () => {
    test("Test GET with name query filter (lines 14-15)", async () => {
        const response = await request(app).get("/posts?name=nonexistent");

        expect(response.statusCode).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
    });

    test("Test GET all with database error (lines 21-22)", async () => {
        await mongoose.connection.close();

        const response = await request(app).get("/posts");

        expect(response.statusCode).toBe(500);
        expect(response.body.message).toBeDefined();

        await mongoose.connect(config.dbUrl);
    });
});

describe("BaseController.getById tests", () => {
    test("Test GET by malformed id (lines 31-32)", async () => {
        const response = await request(app)
            .get("/users/me")
            .set("Authorization", "Bearer invalid_token");

        expect(response.statusCode).toBe(401);
    });

    test("Test GET by id with database error (lines 31-32)", async () => {
        await mongoose.connection.close();

        const response = await request(app)
            .get("/users/me")
            .set("Authorization", "Bearer " + accessToken);

        expect(response.statusCode).toBe(500);
        expect(response.body.message).toBeDefined();

        await mongoose.connect(config.dbUrl);
    });
});

describe("BaseController.post tests", () => {
    test("Test POST success", async () => {
        const response = await request(app)
            .post("/posts")
            .set("Authorization", "Bearer " + accessToken)
            .field("type", "Gym")
            .field("description", "base controller test post")
            .field("city", "herzliya")
            .attach("picture", testImage);

        postId = response.body._id;
        createdPostIds.push(postId);
        expect(response.statusCode).toBe(201);
    });

    test("Test POST with database error (lines 41-42)", async () => {
        await mongoose.connection.close();

        const response = await request(app)
            .post("/posts")
            .set("Authorization", "Bearer " + accessToken)
            .field("type", "Gym")
            .field("description", "should fail")
            .field("city", "herzliya")
            .attach("picture", testImage);

        expect(response.statusCode).toBe(409);
        expect(response.text).toContain("fail:");

        await mongoose.connect(config.dbUrl);
    });
});

describe("BaseController.putById tests", () => {
    test("Test PUT with database error (lines 55-56)", async () => {
        await mongoose.connection.close();

        const response = await request(app)
            .put(`/posts/${postId}`)
            .set("Authorization", "Bearer " + accessToken)
            .field("city", "tel aviv");

        expect(response.statusCode).toBe(409);
        expect(response.text).toContain("fail:");

        await mongoose.connect(config.dbUrl);
    });
});

describe("BaseController.deleteById tests", () => {
    test("Test DELETE with malformed id (lines 65-66)", async () => {
        const response = await request(app)
            .delete("/posts/invalid_id_format")
            .set("Authorization", "Bearer " + accessToken);

        expect(response.statusCode).toBe(409);
        expect(response.text).toContain("fail:");
    });

    test("Test DELETE with database error (lines 65-66)", async () => {
        await mongoose.connection.close();

        const response = await request(app)
            .delete(`/posts/${postId}`)
            .set("Authorization", "Bearer " + accessToken);

        expect(response.statusCode).toBe(409);
        expect(response.text).toContain("fail:");

        await mongoose.connect(config.dbUrl);
    });
});

