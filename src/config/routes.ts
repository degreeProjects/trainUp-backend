import { Express } from "express";
import usersRoute from "../routes/userRoutes";
import postsRoute from "../routes/postRoutes";
import authRoute from "../routes/authRoutes";

export const configRoutes = (app: Express) => {
  app.use("/api/users", usersRoute);
  app.use("/api/posts", postsRoute);
  app.use("/api/auth", authRoute);
};
