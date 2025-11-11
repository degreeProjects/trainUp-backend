import { Express } from "express";
import swaggerUI from "swagger-ui-express";
import swaggerJsDoc from "swagger-jsdoc";
export const configSwagger = (app: Express) => {
  const options = {
    definition: {
      openapi: "3.0.0",
      info: {
        title: "TrainUp Application REST API",
        version: "1.0.1",
        description: "REST server including authentication using JWT",
      },
      servers: [{ url: "http://localhost:3000" }],
    },
    apis: ["./src/routes/*.ts"],
  };

  const specs = swaggerJsDoc(options);

  app.use("/api-docs", swaggerUI.serve, swaggerUI.setup(specs));
};
