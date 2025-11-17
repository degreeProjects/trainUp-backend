import { Express } from "express";
import usersRoute from "../routes/userRouter";
import postsRoute from "../routes/postRouter";
import authRoute from "../routes/authRouter";

export const configRoutes = (app: Express) => {
  app.use("/users", usersRoute);
  app.use("/posts", postsRoute);
  app.use("/auth", authRoute);
};
