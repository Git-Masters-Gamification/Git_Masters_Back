// tests/dashboard/routes/dashboard.routes.test.js
import request from "supertest";
import express from "express";
import { jest } from "@jest/globals";

// --- Mocks ---
const fetchDashboardMock = jest.fn((req, res) =>
  res.status(200).json({ points: 42, badges: ["commit_perfecto"] })
);
const requireAuthMock = jest.fn((req, res, next) => {
  req.user = { id: 1, username: "mockUser" };
  next();
});

// Mock prisma para interceptar el new PrismaClient()
const prismaUserFindUniqueMock = jest.fn();

jest.unstable_mockModule("../../../src/modules/dashboard/controller/dashboard.controller.js", () => ({
  fetchDashboard: fetchDashboardMock,
}));

jest.unstable_mockModule("../../../src/shared/middlewares/auth.middleware.js", () => ({
  default: requireAuthMock,
}));

jest.unstable_mockModule("@prisma/client", () => {
  return {
    PrismaClient: jest.fn().mockImplementation(() => ({
      user: { findUnique: prismaUserFindUniqueMock },
    })),
  };
});

// Importamos después de mockear
const dashboardRoutes = (
  await import("../../../src/modules/dashboard/routes/dashboard.routes.js")
).default;

describe("Dashboard Routes", () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use("/dashboard", dashboardRoutes);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("retorna 200 y datos del dashboard con autenticación normal", async () => {
    const response = await request(app).get("/dashboard");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ points: 42, badges: ["commit_perfecto"] });
    expect(fetchDashboardMock).toHaveBeenCalled();
    expect(requireAuthMock).toHaveBeenCalled();
  });

  it("bypassea autenticación con X-API-Key válida (modo test)", async () => {
    process.env.TEST_API_KEY = "test-key";

    const testUser = { id: 2, username: "Andrey-Ft" };
    prismaUserFindUniqueMock.mockResolvedValueOnce(testUser);

    const response = await request(app)
      .get("/dashboard")
      .set("X-API-Key", "test-key");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ points: 42, badges: ["commit_perfecto"] });
    expect(fetchDashboardMock).toHaveBeenCalled();
    expect(prismaUserFindUniqueMock).toHaveBeenCalledWith({
      where: { username: "Andrey-Ft" },
    });
  });
});
