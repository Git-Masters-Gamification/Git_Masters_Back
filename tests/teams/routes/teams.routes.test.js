import { jest } from "@jest/globals";
import express from "express";
import request from "supertest";

// --- Mocks de controladores ---
const listTeamsMock = jest.fn((req, res) => res.status(200).json([{ id: 1, name: "Team Mock" }]));
const createNewTeamMock = jest.fn((req, res) => res.status(201).json({ id: 1, name: "Nuevo Team" }));
const getTeamDetailsMock = jest.fn((req, res) => res.status(200).json({ id: 1, name: "Team Detalle" }));
const joinTeamByIdMock = jest.fn((req, res) => res.status(200).json({ message: "Unido correctamente" }));
const leaveCurrentTeamMock = jest.fn((req, res) => res.status(200).json({ message: "Saliste del equipo" }));

// --- Mock de Prisma y middleware ---
const findUniqueMock = jest.fn();
await jest.unstable_mockModule("../../../src/shared/middlewares/auth.middleware.js", () => ({
  default: jest.fn((req, res, next) => {
    req.user = { id: 99, username: "AuthUser" };
    next();
  }),
}));

await jest.unstable_mockModule("../../../src/modules/teams/controller/teams.controller.js", () => ({
  listTeams: listTeamsMock,
  createNewTeam: createNewTeamMock,
  getTeamDetails: getTeamDetailsMock,
  joinTeamById: joinTeamByIdMock,
  leaveCurrentTeam: leaveCurrentTeamMock,
}));

await jest.unstable_mockModule("@prisma/client", () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    user: { findUnique: findUniqueMock },
  })),
}));

// --- Importar router después de mockear ---
const router = (await import("../../../src/modules/teams/routes/teams.routes.js")).default;

// --- App de Express para test ---
let app;
beforeAll(() => {
  app = express();
  app.use(express.json());
  app.use("/teams", router);
});

describe("Teams Routes", () => {
  beforeEach(() => jest.clearAllMocks());

  it("GET /teams debería listar equipos", async () => {
    const res = await request(app).get("/teams");
    expect(res.statusCode).toBe(200);
    expect(listTeamsMock).toHaveBeenCalled();
    expect(res.body).toEqual(expect.arrayContaining([{ id: 1, name: "Team Mock" }]));
  });

  it("GET /teams/:id debería obtener detalles de un equipo", async () => {
    const res = await request(app).get("/teams/1");
    expect(res.statusCode).toBe(200);
    expect(getTeamDetailsMock).toHaveBeenCalled();
    expect(res.body).toEqual(expect.objectContaining({ id: 1, name: "Team Detalle" }));
  });

  it("POST /teams debería crear un nuevo equipo (bypass autenticación)", async () => {
    process.env.TEST_API_KEY = "secret123";
    findUniqueMock.mockResolvedValue({ id: 1, username: "Andrey-Ft" });

    const res = await request(app)
      .post("/teams")
      .set("X-API-Key", "secret123")
      .send({ name: "Nuevo Team" });

    expect(res.statusCode).toBe(201);
    expect(createNewTeamMock).toHaveBeenCalled();
    expect(res.body).toEqual(expect.objectContaining({ name: "Nuevo Team" }));
  });

  it("POST /teams/:id/join debería permitir unirse a un equipo", async () => {
    process.env.TEST_API_KEY = "secret123";
    findUniqueMock.mockResolvedValue({ id: 2, username: "Andrey-Ft" });

    const res = await request(app)
      .post("/teams/1/join")
      .set("X-API-Key", "secret123");

    expect(res.statusCode).toBe(200);
    expect(joinTeamByIdMock).toHaveBeenCalled();
    expect(res.body.message).toBe("Unido correctamente");
  });

  it("POST /teams/leave debería permitir abandonar un equipo", async () => {
    process.env.TEST_API_KEY = "secret123";
    findUniqueMock.mockResolvedValue({ id: 3, username: "Andrey-Ft" });

    const res = await request(app)
      .post("/teams/leave")
      .set("X-API-Key", "secret123");

    expect(res.statusCode).toBe(200);
    expect(leaveCurrentTeamMock).toHaveBeenCalled();
    expect(res.body.message).toBe("Saliste del equipo");
  });
});
