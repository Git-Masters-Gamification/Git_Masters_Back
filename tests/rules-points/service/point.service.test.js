// tests/rules-points/service/point.service.test.js
import { jest } from "@jest/globals";

// --- Mock de Prisma ---
await jest.unstable_mockModule("../../../src/config/prisma.js", () => ({
  default: {
    $transaction: jest.fn(),
    pointLedger: { create: jest.fn() },
    user: { update: jest.fn() },
  },
}));

// --- Importar después del mock ---
const { applyPoints } = await import(
  "../../../src/modules/rules-points/service/point.service.js"
);
const prisma = (await import("../../../src/config/prisma.js")).default;

describe("Point Service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("debería aplicar puntos correctamente", async () => {
    prisma.$transaction.mockResolvedValue([
      { id: "ledger1", userId: "user1", points: 10 },
    ]);

    const result = await applyPoints({
      userId: "user1",
      points: 10,
      ruleKey: "commit.valid_message",
      entityId: "abc123",
    });

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    const [calls] = prisma.$transaction.mock.calls[0];

    expect(prisma.pointLedger.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "user1",
        points: 10,
        ruleKey: "commit.valid_message",
      }),
    });

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: "user1" },
      data: { pointsBalance: { increment: 10 } },
    });

    expect(result).toBeTruthy();
  });

  it("no debería crear entrada si los puntos son 0", async () => {
    const result = await applyPoints({
      userId: "user2",
      points: 0,
      ruleKey: "commit.empty",
      entityId: "zzz",
    });

    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(result).toBeNull();
  });

  it("debería lanzar error si la transacción falla", async () => {
    prisma.$transaction.mockRejectedValue(new Error("DB error"));

    await expect(
      applyPoints({
        userId: "user3",
        points: 5,
        ruleKey: "commit.valid",
        entityId: "err123",
      })
    ).rejects.toThrow("DB error");
  });
});
