import { jest } from "@jest/globals";

// --- Silenciar logs ---
beforeAll(() => {
  jest.spyOn(console, "log").mockImplementation(() => {});
  jest.spyOn(console, "info").mockImplementation(() => {});
  jest.spyOn(console, "warn").mockImplementation(() => {});
  jest.spyOn(console, "error").mockImplementation(() => {});
});
afterAll(() => {
  console.log.mockRestore();
  console.info.mockRestore();
  console.warn.mockRestore();
  console.error.mockRestore();
});

// --- Mocks globales ---
const prismaMock = {
  user: { findMany: jest.fn(), findUnique: jest.fn() },
  badge: { findMany: jest.fn(), findUnique: jest.fn() },
  userBadge: { upsert: jest.fn() },
  pointLedger: { findMany: jest.fn(), groupBy: jest.fn(), count: jest.fn() },
};
const applyPointsMock = jest.fn();
const awardBadgeMock = jest.fn();

// 🔹 Mockear módulos base ANTES del import principal
jest.unstable_mockModule("../../../src/config/prisma.js", () => ({
  default: prismaMock,
}));
jest.unstable_mockModule(
  "../../../src/modules/rules-points/service/point.service.js",
  () => ({
    applyPoints: applyPointsMock,
  })
);

// 🔹 Mockear awardBadge de forma controlada
jest.unstable_mockModule(
  "../../../src/modules/badges/service/badges.service.js",
  async () => {
    const actual = await import(
      "../../../src/modules/badges/service/badges.service.js?actual"
    );
    return {
      ...actual,
      awardBadge: awardBadgeMock,
    };
  }
);

// ✅ Importar después de mockear dependencias
const { evaluateDailyBadges, evaluateMonthlyBadges } = await import(
  "../../../src/modules/badges/service/badges.service.js"
);

describe("Badges Service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("evaluateDailyBadges", () => {
    it("otorga insignia commit_perfecto si cumple criterios", async () => {
      prismaMock.user.findMany.mockResolvedValue([{ id: 1, username: "alice" }]);
      prismaMock.badge.findMany.mockResolvedValue([
        {
          id: 10,
          key: "commit_perfecto",
          name: "Commit Perfecto",
          criteria: {
            durationDays: 7,
            minCommits: 1,
            minAtomicityRate: 0.5,
          },
        },
      ]);
      prismaMock.pointLedger.findMany.mockResolvedValue([
        { entityId: "c1", ruleKey: "commit.creation" },
        { entityId: "c1", ruleKey: "commit.atomicity_bonus" },
      ]);

      await evaluateDailyBadges();

      expect(awardBadgeMock).toHaveBeenCalledWith(1, "commit_perfecto");
    });

    it("maneja error en evaluación diaria sin romper loop", async () => {
      prismaMock.user.findMany.mockResolvedValue([{ id: 1, username: "bob" }]);
      prismaMock.badge.findMany.mockResolvedValue([
        {
          id: 11,
          key: "commit_perfecto",
          name: "Commit Perfecto",
          criteria: {
            durationDays: 7,
            minCommits: 1,
            minAtomicityRate: 0.5,
          },
        },
      ]);
      prismaMock.pointLedger.findMany.mockRejectedValue(new Error("DB fail"));

      await evaluateDailyBadges();

      expect(console.error).toHaveBeenCalled();
    });
  });

  describe("evaluateMonthlyBadges", () => {
    it("otorga guardian_de_la_calidad si hay ganador", async () => {
      prismaMock.badge.findUnique.mockResolvedValue({
        id: 20,
        key: "guardian_de_la_calidad",
        name: "Guardián",
        criteria: { minTarget: 1, pointsReward: 50 },
      });

      prismaMock.pointLedger.groupBy.mockResolvedValue([
        { userId: 1, _count: { _all: 3 } },
      ]);
      prismaMock.user.findUnique.mockResolvedValue({
        id: 1,
        username: "alice",
      });

      await evaluateMonthlyBadges();

      expect(awardBadgeMock).toHaveBeenCalledWith(1, "guardian_de_la_calidad");
      expect(applyPointsMock).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 1,
          points: 50,
          ruleKey: "badge.reward.guardian_de_la_calidad",
        })
      );
    });

    it("no hace nada si no hay badge guardian_de_la_calidad", async () => {
      prismaMock.badge.findUnique.mockResolvedValue(null);

      await evaluateMonthlyBadges();

      expect(awardBadgeMock).not.toHaveBeenCalled();
      expect(applyPointsMock).not.toHaveBeenCalled();
    });
  });
});