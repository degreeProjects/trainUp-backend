import { Express } from "express";
import usersRoute from "../routes/userRoutes";
import postsRoute from "../routes/postRoutes";
import authRoute from "../routes/authRoutes";
import caloriesRoute from "../routes/caloriesRoutes";

export const configRoutes = (app: Express) => {
  app.use("/api/users", usersRoute);
  app.use("/api/posts", postsRoute);
  app.use("/api/auth", authRoute);
  app.use("/api/calories", caloriesRoute)
};
