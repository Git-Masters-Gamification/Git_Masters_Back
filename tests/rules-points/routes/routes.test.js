import request from "supertest";
import express from "express";
import { jest } from "@jest/globals";  // 👈 necesario en ESM

let app;
let router;
let handleActivityMock;

beforeAll(async () => {
  // --- Mock del controlador ---
  handleActivityMock = jest.fn((req, res) =>
    res.status(200).json({ message: "mock ejecutado" })
  );

  await jest.unstable_mockModule(
    "../../../src/modules/rules-points/controller/rule.controller.js",
    () => ({
      handleActivity: handleActivityMock,
    })
  );

  const routesModule = await import(
    "../../../src/modules/rules-points/routes/routes.js"
  );
  router = routesModule.default;

  app = express();
  app.use(express.json());
  app.use("/rules", router);
});

describe("Rule Points Routes", () => {
  it("POST /rules/evaluar debería llamar a handleActivity", async () => {
    const res = await request(app)
      .post("/rules/evaluar")
      .send({ actividad: "test" });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ message: "mock ejecutado" });
    expect(handleActivityMock).toHaveBeenCalled();
  });
});
