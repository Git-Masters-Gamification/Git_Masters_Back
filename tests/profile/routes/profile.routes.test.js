// tests/profile/routes/profile.routes.test.js
import { jest } from "@jest/globals";
import request from "supertest";
import express from "express";
import path from "path";

// --- Mocks ---
const getUserProfileMock = jest.fn((req, res) =>
  res.json({ message: "getUserProfile ejecutado" })
);
const updateUserProfileMock = jest.fn((req, res) =>
  res.json({ message: "updateUserProfile ejecutado" })
);
const getUserActivityMock = jest.fn((req, res) =>
  res.json({ message: "getUserActivity ejecutado" })
);
const getUserPointsHistoryMock = jest.fn((req, res) =>
  res.json({ message: "getUserPointsHistory ejecutado" })
);

// Mock directo de @prisma/client para evitar conexión real
const findFirstMock = jest.fn();

await jest.unstable_mockModule("@prisma/client", () => {
  return {
    PrismaClient: jest.fn().mockImplementation(() => ({
      user: { findFirst: findFirstMock },
    })),
  };
});

// Mock del controller
const controllerPath = path.resolve(
  process.cwd(),
  "src/modules/profile/controller/profile.controller.js"
);
await jest.unstable_mockModule(controllerPath, () => ({
  getUserProfile: getUserProfileMock,
  updateUserProfile: updateUserProfileMock,
  getUserActivity: getUserActivityMock,
  getUserPointsHistory: getUserPointsHistoryMock,
}));

const router = (await import(
  path.resolve(process.cwd(), "src/modules/profile/routes/profile.routes.js")
)).default;

describe("Profile Routes", () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use("/profile", router);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("GET /profile debería ejecutar getUserProfile con bypass de API Key", async () => {
    process.env.TEST_API_KEY = "test-key";
    findFirstMock.mockResolvedValue({ id: 1, username: "tester" });

    await request(app)
      .get("/profile")
      .set("X-API-Key", "test-key")
      .expect(200);

    expect(getUserProfileMock).toHaveBeenCalled();
  });

  it("PATCH /profile debería ejecutar updateUserProfile", async () => {
    process.env.TEST_API_KEY = "test-key";
    findFirstMock.mockResolvedValue({ id: 1, username: "tester" });

    await request(app)
      .patch("/profile")
      .set("X-API-Key", "test-key")
      .send({ bio: "nueva bio" })
      .expect(200);

    expect(updateUserProfileMock).toHaveBeenCalled();
  });

  it("GET /profile/activity debería ejecutar getUserActivity", async () => {
    process.env.TEST_API_KEY = "test-key";
    findFirstMock.mockResolvedValue({ id: 1, username: "tester" });

    await request(app)
      .get("/profile/activity")
      .set("X-API-Key", "test-key")
      .expect(200);

    expect(getUserActivityMock).toHaveBeenCalled();
  });

  it("GET /profile/points-history debería ejecutar getUserPointsHistory", async () => {
    process.env.TEST_API_KEY = "test-key";
    findFirstMock.mockResolvedValue({ id: 1, username: "tester" });

    await request(app)
      .get("/profile/points-history")
      .set("X-API-Key", "test-key")
      .expect(200);

    expect(getUserPointsHistoryMock).toHaveBeenCalled();
  });
});