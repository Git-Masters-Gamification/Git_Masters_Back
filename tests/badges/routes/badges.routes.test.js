import request from "supertest";
import express from "express";
import { jest } from "@jest/globals";

// --- Mocks de los controllers ---
const getAllBadgesMock = jest.fn((req, res) =>
  res.status(200).json([{ key: "first_commit", name: "Primer commit" }])
);

const getUserBadgesMock = jest.fn((req, res) =>
  res.status(200).json([{ key: "first_commit", obtainedAt: "2025-01-01" }])
);

// Mockear el controller ANTES de importar el router
await jest.unstable_mockModule("../../../src/modules/badges/controller/badges.controller.js", () => ({
  getAllBadges: getAllBadgesMock,
  getUserBadges: getUserBadgesMock,
}));

// Importar el router después del mock
const badgesRouter = (await import("../../../src/modules/badges/routes/badges.routes.js")).default;

// Configurar una app express de prueba
const app = express();
app.use(express.json());
app.use("/badges", badgesRouter);

describe("Badges Routes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("GET /badges debe llamar a getAllBadges", async () => {
    const res = await request(app).get("/badges");

    expect(res.statusCode).toBe(200);
    expect(getAllBadgesMock).toHaveBeenCalled();
    expect(res.body).toEqual([{ key: "first_commit", name: "Primer commit" }]);
  });

  it("GET /badges/user/:username debe llamar a getUserBadges", async () => {
    const res = await request(app).get("/badges/user/anderson");

    expect(res.statusCode).toBe(200);
    expect(getUserBadgesMock).toHaveBeenCalled();
    expect(res.body).toEqual([{ key: "first_commit", obtainedAt: "2025-01-01" }]);
  });
});
