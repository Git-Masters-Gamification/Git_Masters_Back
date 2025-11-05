// tests/rules-points/controller/rule.controller.test.js
import { jest } from "@jest/globals";
import request from "supertest";
import express from "express";

// --- Mock del servicio ---
const getDashboardDataMock = jest.fn();
const getLeaderboardMock = jest.fn();

// 🧩 Mock dinámico del servicio original
await jest.unstable_mockModule(
  "../../../src/modules/rules-points/service/point.service.js",
  () => ({
    getDashboardData: getDashboardDataMock,
    getLeaderboard: getLeaderboardMock,
  })
);

// Importar el controlador real (después del mock)
const {
  getDashboardForLoggedUser,
  getTopUsersLeaderboard,
} = await import("../../../src/modules/rules-points/controller/point.controller.js");

describe("Point Controller", () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    // Simulamos el req.user manualmente con middleware inline
    app.get("/points/me", (req, res) => {
      req.user = { id: 1 };
      return getDashboardForLoggedUser(req, res);
    });
    app.get("/points/leaderboard", (req, res) =>
      getTopUsersLeaderboard(req, res)
    );

    jest.clearAllMocks();
  });

  // 🔹 TEST 1: Dashboard
  it("GET /points/me debe devolver 200 con los datos del dashboard", async () => {
    getDashboardDataMock.mockResolvedValueOnce({ points: 150, rank: 5 });

    const res = await request(app).get("/points/me");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ points: 150, rank: 5 });
    expect(getDashboardDataMock).toHaveBeenCalledWith(1);
  });

  it("GET /points/me debe devolver 404 si no hay datos", async () => {
    getDashboardDataMock.mockResolvedValueOnce(null);

    const res = await request(app).get("/points/me");

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ message: "Perfil de usuario no encontrado." });
  });

  it("GET /points/me debe devolver 500 si ocurre un error en el servicio", async () => {
    getDashboardDataMock.mockRejectedValueOnce(new Error("DB error"));

    const res = await request(app).get("/points/me");

    expect(res.status).toBe(500);
    expect(res.body).toEqual({
      message: "DB error",
    });
  });

  // 🔹 TEST 2: Leaderboard
  it("GET /points/leaderboard debe devolver 200 con lista de usuarios", async () => {
    const leaderboard = [
      { id: 1, username: "alice", points: 300 },
      { id: 2, username: "bob", points: 250 },
    ];
    getLeaderboardMock.mockResolvedValueOnce(leaderboard);

    const res = await request(app).get("/points/leaderboard");

    expect(res.status).toBe(200);
    expect(res.body).toEqual(leaderboard);
    expect(getLeaderboardMock).toHaveBeenCalledWith(10); // default limit = 10
  });

  it("GET /points/leaderboard maneja errores con status 500", async () => {
    getLeaderboardMock.mockRejectedValueOnce(new Error("Error interno"));

    const res = await request(app).get("/points/leaderboard");

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ message: "Error interno" });
  });
});
