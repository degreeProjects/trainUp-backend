import { Express } from "express";
import usersRoute from "../routes/userRoutes";
import postsRoute from "../routes/postRoutes";
import authRoute from "../routes/authRoutes";

export const configRoutes = (app: Express) => {
  app.use("/users", usersRoute);
  app.use("/posts", postsRoute);
  app.use("/auth", authRoute);
};
