// tests/dashboard/service/dashboard.service.test.js
import { jest } from "@jest/globals";

// --- Mocks ---
const findUniqueMock = jest.fn();
const findManyMock = jest.fn();
const getActivityLogByUserIdMock = jest.fn();

await jest.unstable_mockModule(
  "../../../src/modules/profile/service/profile.service.js",
  () => ({
    getActivityLogByUserId: getActivityLogByUserIdMock,
  })
);

await jest.unstable_mockModule("../../../src/config/prisma.js", () => ({
  default: {
    user: { findUnique: findUniqueMock, findMany: findManyMock },
    team: { findMany: findManyMock },
  },
}));

// Importar después de mockear
const { getDashboardData } = await import(
  "../../../src/modules/dashboard/service/dashboard.service.js"
);

describe("Dashboard Service: getDashboardData", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("ensambla correctamente los datos del dashboard", async () => {
    // --- Mock de datos ---
    findUniqueMock.mockResolvedValueOnce({
      id: 1,
      pointsBalance: 100,
      assignedBadges: [
        { badge: { name: "Commit Perfecto", description: "Commits limpios" } },
      ],
    });

    findManyMock
      // Para ranking de usuarios
      .mockResolvedValueOnce([{ id: 1 }, { id: 2 }])
      // Para ranking de equipos
      .mockResolvedValueOnce([
        { id: "t1", name: "Team A", members: [{ pointsBalance: 50 }] },
        { id: "t2", name: "Team B", members: [{ pointsBalance: 80 }] },
      ]);

    getActivityLogByUserIdMock.mockResolvedValueOnce([
      { id: "act1", action: "commit", points: 10 },
    ]);

    // --- Ejecutar ---
    const result = await getDashboardData(1);

    // --- Verificaciones ---
    expect(result).toEqual({
      userId: 1,
      pointsTotal: 100,
      rank: 1,
      badges: [
        { name: "Commit Perfecto", description: "Commits limpios" },
      ],
      history: [{ id: "act1", action: "commit", points: 10 }],
      teamRanking: [
        { id: "t2", name: "Team B", totalPoints: 80 },
        { id: "t1", name: "Team A", totalPoints: 50 },
      ],
    });
  });

  it("lanza error si no encuentra el usuario", async () => {
    findUniqueMock.mockResolvedValueOnce(null);

    await expect(getDashboardData(999)).rejects.toThrow(
      "Perfil de usuario no encontrado."
    );
  });
});
