// tests/leaderboard/controller/leaderboard.controller.test.js
import { jest } from "@jest/globals";

// --- mockear el service ANTES de importar el controller ---
const getTopUsersMock = jest.fn();

await jest.unstable_mockModule(
  "../../../src/modules/leaderboard/service/leaderboard.service.js",
  () => ({ getTopUsers: getTopUsersMock })
);

// ahora importamos el controller con el mock activo
const { getLeaderboard } = await import(
  "../../../src/modules/leaderboard/controller/leaderboard.controller.js"
);

describe("Leaderboard Controller: getLeaderboard", () => {
  let req, res;
  let consoleErrorSpy;

  beforeAll(() => {
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterAll(() => {
    consoleErrorSpy.mockRestore();
  });

  beforeEach(() => {
    req = {};
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    jest.clearAllMocks();
  });

  it("retorna 200 y datos del leaderboard", async () => {
    const mockData = [{ id: 1, username: "User1", points: 100 }];
    getTopUsersMock.mockResolvedValue(mockData);

    await getLeaderboard(req, res);

    expect(getTopUsersMock).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(mockData);
  });

  it("retorna 500 si ocurre un error", async () => {
    getTopUsersMock.mockRejectedValue(new Error("DB error"));

    await getLeaderboard(req, res);

    expect(getTopUsersMock).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: "Error interno del servidor." });
  });
});
