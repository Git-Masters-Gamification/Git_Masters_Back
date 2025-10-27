// tests/profile/service/profile.service.test.js
import { jest } from "@jest/globals";

// --- Mock PrismaClient ---
const findUniqueMock = jest.fn();
const updateMock = jest.fn();
const findManyActivityMock = jest.fn();
const findManyPointsMock = jest.fn();

await jest.unstable_mockModule("@prisma/client", () => {
  return {
    PrismaClient: jest.fn().mockImplementation(() => ({
      user: {
        findUnique: findUniqueMock,
        update: updateMock,
      },
      activityLog: {
        findMany: findManyActivityMock,
      },
      pointLedger: {
        findMany: findManyPointsMock,
      },
    })),
  };
});

// Importamos después de mockear
const {
  getProfileByUserId,
  updateProfile,
  getActivityLogByUserId,
  getPointsHistoryByUserId,
} = await import(
  "../../../src/modules/profile/service/profile.service.js"
);

describe("Profile Service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getProfileByUserId", () => {
    it("retorna null si no se encuentra el usuario", async () => {
      findUniqueMock.mockResolvedValue(null);

      const result = await getProfileByUserId("123");
      expect(result).toBeNull();
    });

    it("aplanta y retorna el perfil si se encuentra", async () => {
      findUniqueMock.mockResolvedValue({
        id: "123",
        githubId: "gh123",
        username: "tester",
        email: "t@test.com",
        avatarUrl: "http://avatar.com",
        role: "USER",
        pointsBalance: 100,
        createdAt: new Date("2023-01-01"),
        profile: { level: 5, bio: "Hola" },
        team: { id: "team1", name: "Team A" },
        assignedBadges: [
          {
            obtainedAt: new Date("2023-01-02"),
            badge: { name: "Badge1", description: "desc" },
          },
        ],
      });

      const result = await getProfileByUserId("123");
      expect(result).toEqual({
        id: "123",
        githubId: "gh123",
        username: "tester",
        avatarUrl: "http://avatar.com",
        email: "t@test.com",
        role: "USER",
        points: 100,
        memberSince: new Date("2023-01-01"),
        level: 5,
        bio: "Hola",
        team: { id: "team1", name: "Team A" },
        badges: [
          {
            name: "Badge1",
            description: "desc",
            obtainedAt: new Date("2023-01-02"),
          },
        ],
      });
    });
  });

  describe("updateProfile", () => {
    it("lanza error si bio no está definido", async () => {
      await expect(updateProfile("123", {})).rejects.toThrow(
        "El campo 'bio' es requerido para la actualización."
      );
    });

    it("actualiza el perfil con la bio", async () => {
      updateMock.mockResolvedValue({
        id: "123",
        profile: { bio: "Nueva bio" },
      });

      const result = await updateProfile("123", { bio: "Nueva bio" });
      expect(result).toEqual({ bio: "Nueva bio" });
    });
  });

  describe("getActivityLogByUserId", () => {
    it("retorna la lista de actividades", async () => {
      const fakeActivities = [{ id: 1, action: "LOGIN" }];
      findManyActivityMock.mockResolvedValue(fakeActivities);

      const result = await getActivityLogByUserId("123");
      expect(result).toEqual(fakeActivities);
    });
  });

  describe("getPointsHistoryByUserId", () => {
    it("retorna el historial de puntos", async () => {
      const fakeHistory = [{ id: 1, points: 10 }];
      findManyPointsMock.mockResolvedValue(fakeHistory);

      const result = await getPointsHistoryByUserId("123");
      expect(result).toEqual(fakeHistory);
    });
  });
});
