// tests/leaderboard/routes/leaderboard.routes.test.js
import request from "supertest";
import express from "express";
import { jest } from "@jest/globals";

// --- mockear el controller antes de importar la ruta ---
const getLeaderboardMock = jest.fn((req, res) =>
  res.status(200).json([{ id: 1, username: "mockUser", points: 100 }])
);

await jest.unstable_mockModule(
  "../../../src/modules/leaderboard/controller/leaderboard.controller.js",
  () => ({ getLeaderboard: getLeaderboardMock })
);

const leaderboardRoutes = (await import(
  "../../../src/modules/leaderboard/routes/leaderboard.routes.js"
)).default;

describe("Leaderboard Routes", () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use("/leaderboard", leaderboardRoutes);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("GET /leaderboard responde 200 con datos mockeados", async () => {
    const res = await request(app).get("/leaderboard");

    expect(res.status).toBe(200);
    expect(res.body).toEqual([{ id: 1, username: "mockUser", points: 100 }]);
    expect(getLeaderboardMock).toHaveBeenCalled();
  });
});
