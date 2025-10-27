// tests/dashboard/controller/dashboard.controller.test.js
import { jest } from "@jest/globals";

// --- Silenciar logs ---
beforeAll(() => {
  jest.spyOn(console, "error").mockImplementation(() => {});
});
afterAll(() => {
  console.error.mockRestore();
});

// --- Mock del servicio ---
const getDashboardDataMock = jest.fn();

await jest.unstable_mockModule(
  "../../../src/modules/dashboard/service/dashboard.service.js",
  () => ({
    getDashboardData: getDashboardDataMock,
  })
);

const { fetchDashboard } = await import(
  "../../../src/modules/dashboard/controller/dashboard.controller.js"
);

describe("Dashboard Controller", () => {
  let req, res;

  beforeEach(() => {
    req = { user: { id: 1 } };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    jest.clearAllMocks();
  });

  it("retorna 200 y los datos del dashboard si todo va bien", async () => {
    const mockData = { points: 100, badges: ["commit_perfecto"] };
    getDashboardDataMock.mockResolvedValue(mockData);

    await fetchDashboard(req, res);

    expect(getDashboardDataMock).toHaveBeenCalledWith(1);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(mockData);
  });

  it("retorna 500 si el servicio lanza un error", async () => {
    getDashboardDataMock.mockRejectedValue(new Error("DB error"));

    await fetchDashboard(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      message: "Error interno del servidor.",
    });
    expect(console.error).toHaveBeenCalled();
  });
});
