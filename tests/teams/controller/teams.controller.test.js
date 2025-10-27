import { jest } from "@jest/globals";

// --- Mock del servicio ---
const getAllTeamsMock = jest.fn();
const createTeamMock = jest.fn();
const getTeamByIdMock = jest.fn();
const joinTeamMock = jest.fn();
const leaveTeamMock = jest.fn();

await jest.unstable_mockModule("../../../src/modules/teams/service/teams.service.js", () => ({
  getAllTeams: getAllTeamsMock,
  createTeam: createTeamMock,
  getTeamById: getTeamByIdMock,
  joinTeam: joinTeamMock,
  leaveTeam: leaveTeamMock,
}));

// --- Importar después del mock ---
const {
  listTeams,
  createNewTeam,
  getTeamDetails,
  joinTeamById,
  leaveCurrentTeam,
} = await import("../../../src/modules/teams/controller/teams.controller.js");

// --- Mocks auxiliares para req y res ---
const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe("Teams Controller", () => {
  beforeEach(() => jest.clearAllMocks());

  // --- listTeams ---
  it("debería devolver la lista de equipos correctamente", async () => {
    const req = {};
    const res = mockResponse();
    const mockTeams = [{ id: 1, name: "Team A" }];
    getAllTeamsMock.mockResolvedValue(mockTeams);

    await listTeams(req, res);

    expect(getAllTeamsMock).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(mockTeams);
  });

  it("debería manejar errores en listTeams", async () => {
    const req = {};
    const res = mockResponse();
    getAllTeamsMock.mockRejectedValue(new Error("DB Error"));

    await listTeams(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: "Error al listar equipos." }));
  });

  // --- createNewTeam ---
  it("debería crear un nuevo equipo correctamente", async () => {
    const req = { body: { name: "Nuevo Team" }, user: { id: 1 } };
    const res = mockResponse();
    const newTeam = { id: 1, name: "Nuevo Team" };
    createTeamMock.mockResolvedValue(newTeam);

    await createNewTeam(req, res);

    expect(createTeamMock).toHaveBeenCalledWith("Nuevo Team", 1);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(newTeam);
  });

  it("debería retornar 400 si no se pasa el nombre del equipo", async () => {
    const req = { body: {}, user: { id: 1 } };
    const res = mockResponse();

    await createNewTeam(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: "El nombre del equipo es requerido." });
  });

  it("debería manejar conflicto si el usuario ya pertenece a un equipo", async () => {
    const req = { body: { name: "Team A" }, user: { id: 1 } };
    const res = mockResponse();
    createTeamMock.mockRejectedValue(new Error("El usuario ya pertenece a un equipo"));

    await createNewTeam(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({ message: "El usuario ya pertenece a un equipo" });
  });

  // --- getTeamDetails ---
  it("debería devolver detalles de un equipo existente", async () => {
    const req = { params: { id: 1 } };
    const res = mockResponse();
    const team = { id: 1, name: "Team A" };
    getTeamByIdMock.mockResolvedValue(team);

    await getTeamDetails(req, res);

    expect(getTeamByIdMock).toHaveBeenCalledWith(1);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(team);
  });

  it("debería retornar 404 si el equipo no existe", async () => {
    const req = { params: { id: 99 } };
    const res = mockResponse();
    getTeamByIdMock.mockResolvedValue(null);

    await getTeamDetails(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: "Equipo no encontrado." });
  });

  // --- joinTeamById ---
  it("debería permitir unirse a un equipo", async () => {
    const req = { params: { id: 1 }, user: { id: 2 } };
    const res = mockResponse();

    await joinTeamById(req, res);

    expect(joinTeamMock).toHaveBeenCalledWith(1, 2);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ message: "Te has unido al equipo exitosamente." });
  });

  it("debería manejar conflicto si el usuario ya pertenece a un equipo", async () => {
    const req = { params: { id: 1 }, user: { id: 2 } };
    const res = mockResponse();
    joinTeamMock.mockRejectedValue(new Error("El usuario ya pertenece a un equipo"));

    await joinTeamById(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({ message: "El usuario ya pertenece a un equipo" });
  });

  // --- leaveCurrentTeam ---
  it("debería permitir abandonar un equipo", async () => {
    const req = { user: { id: 3 } };
    const res = mockResponse();

    await leaveCurrentTeam(req, res);

    expect(leaveTeamMock).toHaveBeenCalledWith(3);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ message: "Has abandonado el equipo exitosamente." });
  });

  it("debería manejar error si el usuario no pertenece a un equipo", async () => {
    const req = { user: { id: 3 } };
    const res = mockResponse();
    leaveTeamMock.mockRejectedValue(new Error("El usuario no pertenece a ningún equipo"));

    await leaveCurrentTeam(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: "El usuario no pertenece a ningún equipo" });
  });
});
