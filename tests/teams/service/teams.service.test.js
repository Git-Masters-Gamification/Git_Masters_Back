import { jest } from "@jest/globals";

// --- Mock de Prisma ---
const findManyMock = jest.fn();
const findUniqueMock = jest.fn();
const createMock = jest.fn();
const updateMock = jest.fn();

await jest.unstable_mockModule("@prisma/client", () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    team: {
      findMany: findManyMock,
      findUnique: findUniqueMock,
      create: createMock,
    },
    user: {
      findUnique: findUniqueMock,
      update: updateMock,
    },
  })),
}));

// --- Importar después de mockear ---
const {
  getAllTeams,
  createTeam,
  getTeamById,
  joinTeam,
  leaveTeam,
} = await import("../../../src/modules/teams/service/teams.service.js");

// --- Limpiar mocks ---
beforeEach(() => {
  jest.clearAllMocks();
});

describe("Team Service", () => {
  it("getAllTeams debería retornar lista de equipos", async () => {
    const mockTeams = [{ id: 1, name: "Team A" }];
    findManyMock.mockResolvedValue(mockTeams);

    const result = await getAllTeams();

    expect(findManyMock).toHaveBeenCalled();
    expect(result).toEqual(mockTeams);
  });

  it("createTeam debería crear un equipo si el usuario no tiene uno", async () => {
    findUniqueMock.mockResolvedValue({ teamId: null });
    createMock.mockResolvedValue({ id: 1, name: "Nuevo Team" });

    const result = await createTeam("Nuevo Team", 99);

    expect(findUniqueMock).toHaveBeenCalledWith({
      where: { id: 99 },
      select: { teamId: true },
    });
    expect(createMock).toHaveBeenCalledWith({
      data: {
        name: "Nuevo Team",
        members: { connect: { id: 99 } },
      },
    });
    expect(result).toEqual({ id: 1, name: "Nuevo Team" });
  });

  it("createTeam debería lanzar error si el usuario ya tiene equipo", async () => {
    findUniqueMock.mockResolvedValue({ teamId: 1 });

    await expect(createTeam("Team B", 99)).rejects.toThrow(
      "El usuario ya pertenece a un equipo."
    );
  });

  it("getTeamById debería retornar detalles del equipo", async () => {
    const mockTeam = { id: 1, name: "Team A" };
    findUniqueMock.mockResolvedValue(mockTeam);

    const result = await getTeamById(1);

    expect(findUniqueMock).toHaveBeenCalledWith({
      where: { id: 1 },
      include: {
        members: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
            pointsBalance: true,
          },
        },
      },
    });
    expect(result).toEqual(mockTeam);
  });

  it("joinTeam debería permitir unirse a un equipo si no pertenece a otro", async () => {
    findUniqueMock.mockResolvedValue({ teamId: null });
    updateMock.mockResolvedValue({ id: 99, teamId: 1 });

    const result = await joinTeam(1, 99);

    expect(updateMock).toHaveBeenCalledWith({
      where: { id: 99 },
      data: { teamId: 1 },
    });
    expect(result).toEqual({ id: 99, teamId: 1 });
  });

  it("joinTeam debería lanzar error si ya pertenece a un equipo", async () => {
    findUniqueMock.mockResolvedValue({ teamId: 2 });

    await expect(joinTeam(1, 99)).rejects.toThrow(
      "El usuario ya pertenece a un equipo y no puede unirse a otro."
    );
  });

  it("leaveTeam debería permitir salir del equipo si pertenece a uno", async () => {
    findUniqueMock.mockResolvedValue({ teamId: 1 });
    updateMock.mockResolvedValue({ id: 99, teamId: null });

    const result = await leaveTeam(99);

    expect(updateMock).toHaveBeenCalledWith({
      where: { id: 99 },
      data: { teamId: null },
    });
    expect(result).toEqual({ id: 99, teamId: null });
  });

  it("leaveTeam debería lanzar error si no pertenece a ningún equipo", async () => {
    findUniqueMock.mockResolvedValue({ teamId: null });

    await expect(leaveTeam(99)).rejects.toThrow(
      "El usuario no pertenece a ningún equipo."
    );
  });
});
