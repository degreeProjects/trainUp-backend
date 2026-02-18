import { Express, static as expressStatic } from "express";
import bodyParser from "body-parser";
import cors from "cors";
import path from "path";
import { configRoutes } from "./routes";
import { configSwagger } from "./swagger";

export const configExpress = (app: Express) => {
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: true }));
  app.use(cors());

  configRoutes(app);
  configSwagger(app);

  app.use("/api", expressStatic(path.join(__dirname, "../../public")));
};
