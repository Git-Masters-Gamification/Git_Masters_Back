// tests/badges/service/badges.service.test.js
import { jest } from "@jest/globals";

// --- silenciar logs ---
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

// --- Mocks ---
const prismaMock = {
  user: { findMany: jest.fn(), findUnique: jest.fn() },
  badge: { findMany: jest.fn(), findUnique: jest.fn() },
  userBadge: { upsert: jest.fn() },
  pointLedger: { findMany: jest.fn() },
  githubEvent: { findMany: jest.fn(), count: jest.fn() },
};

const applyPointsMock = jest.fn();

await jest.unstable_mockModule("../../../src/config/prisma.js", () => ({
  default: prismaMock,
}));
await jest.unstable_mockModule(
  "../../../src/modules/rules-points/service/point.service.js",
  () => ({ applyPoints: applyPointsMock })
);

const {
  evaluateDailyBadges,
  evaluateMonthlyBadges,
} = await import(
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
            rules: [
              { metric: "valid_commits", ruleKey: "commit.valid", target: 1 },
              { metric: "atomicity_rate", ruleKey: "commit.atomic", target: 0.5 },
            ],
          },
        },
      ]);
      prismaMock.pointLedger.findMany.mockResolvedValue([
        { ruleKey: "commit.valid" },
        { ruleKey: "commit.atomic" },
      ]);
      prismaMock.userBadge.upsert.mockResolvedValue({});

      await evaluateDailyBadges();

      expect(prismaMock.userBadge.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId_badgeId: { userId: 1, badgeId: 10 } },
        })
      );
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
            rules: [
              { metric: "valid_commits", ruleKey: "commit.valid", target: 1 },
              { metric: "atomicity_rate", ruleKey: "commit.atomic", target: 0.5 },
            ],
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
        criteria: { min_target: 1, points_reward: 50 },
      });

      // Simular llamadas consecutivas a githubEvent.findMany:
      // 1) Comentarios de review
      prismaMock.githubEvent.findMany
        .mockResolvedValueOnce([
          {
            senderLogin: "alice",
            receivedAt: new Date(),
            payload: {
              pull_request: {
                user: { login: "bob" },
                head: { ref: "main" },
                html_url: "http://pr/1",
              },
            },
          },
        ])
        // 2) Push subsecuente
        .mockResolvedValueOnce([
          {
            senderLogin: "bob",
            receivedAt: new Date(Date.now() + 1000),
            payload: { ref: "refs/heads/main" },
          },
        ]);

      prismaMock.user.findUnique.mockResolvedValue({ id: 1, username: "alice" });
      prismaMock.userBadge.upsert.mockResolvedValue({});

      await evaluateMonthlyBadges();

      expect(prismaMock.userBadge.upsert).toHaveBeenCalled();
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

      expect(prismaMock.userBadge.upsert).not.toHaveBeenCalled();
    });
  });
});
