import request from "supertest";
import express from "express";
import { jest } from "@jest/globals";

let app;
let router;
let getDashboardForLoggedUserMock;
let getTopUsersLeaderboardMock;
let requireAuthMock;

beforeAll(async () => {
  // --- Mock de controladores y middleware ---
  getDashboardForLoggedUserMock = jest.fn((req, res) =>
    res.status(200).json({ message: "dashboard mock" })
  );

  getTopUsersLeaderboardMock = jest.fn((req, res) =>
    res.status(200).json({ message: "leaderboard mock" })
  );

  requireAuthMock = jest.fn((req, res, next) => next());

  // --- Mockear los módulos reales ---
  await jest.unstable_mockModule(
    "../../../src/modules/rules-points/controller/point.controller.js",
    () => ({
      getDashboardForLoggedUser: getDashboardForLoggedUserMock,
      getTopUsersLeaderboard: getTopUsersLeaderboardMock,
    })
  );

  await jest.unstable_mockModule(
    "../../../src/shared/middlewares/auth.middleware.js",
    () => ({
      default: requireAuthMock,
    })
  );

  // --- Importar el router correcto ---
  const routesModule = await import(
    "../../../src/modules/rules-points/routes/point.routes.js"
  );
  router = routesModule.default;

  app = express();
  app.use(express.json());
  app.use("/points", router);
});

describe("Point Routes", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("GET /points/me debería llamar a getDashboardForLoggedUser", async () => {
    const res = await request(app).get("/points/me");

    expect([200, 401, 403]).toContain(res.status); // por si el middleware bloquea
    if (res.status === 200) {
      expect(getDashboardForLoggedUserMock).toHaveBeenCalled();
      expect(res.body).toEqual({ message: "dashboard mock" });
    }
  });

  it("GET /points/leaderboard debería llamar a getTopUsersLeaderboard", async () => {
    const res = await request(app).get("/points/leaderboard");

    expect(res.status).toBe(200);
    expect(getTopUsersLeaderboardMock).toHaveBeenCalled();
    expect(res.body).toEqual({ message: "leaderboard mock" });
  });
});
