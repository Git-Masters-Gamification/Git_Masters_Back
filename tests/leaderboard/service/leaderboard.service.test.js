// tests/leaderboard/service/leaderboard.service.test.js
import { jest } from "@jest/globals";

// --- Mock de @prisma/client ---
const findManyMock = jest.fn();

jest.unstable_mockModule("@prisma/client", () => {
  return {
    PrismaClient: jest.fn(() => ({
      user: { findMany: findManyMock },
    })),
  };
});

// --- Importar el servicio después del mock ---
const { getTopUsers } = await import(
  "../../../src/modules/leaderboard/service/leaderboard.service.js"
);

describe("Leaderboard Service: getTopUsers", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("retorna el top 10 usuarios transformados correctamente", async () => {
    findManyMock.mockResolvedValue([
      {
        id: 1,
        username: "alice",
        avatarUrl: "http://img.com/a.png",
        pointsBalance: 300,
        profile: { level: 2 },
      },
      {
        id: 2,
        username: "bob",
        avatarUrl: null,
        pointsBalance: 200,
        profile: null, // sin nivel => default 1
      },
    ]);

    const result = await getTopUsers();

    expect(findManyMock).toHaveBeenCalledWith({
      orderBy: { pointsBalance: "desc" },
      take: 10,
      select: {
        id: true,
        username: true,
        avatarUrl: true,
        pointsBalance: true,
        profile: { select: { level: true } },
      },
    });

    expect(result).toEqual([
      {
        id: 1,
        username: "alice",
        avatarUrl: "http://img.com/a.png",
        points: 300,
        level: 2,
      },
      {
        id: 2,
        username: "bob",
        avatarUrl: null,
        points: 200,
        level: 1,
      },
    ]);
  });

  it("lanza error si prisma falla", async () => {
    findManyMock.mockRejectedValue(new Error("DB error"));

    await expect(getTopUsers()).rejects.toThrow("DB error");
  });
});
