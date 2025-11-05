import { jest } from "@jest/globals";

// --- Mocks ---
const applyPointsMock = jest.fn();
const findManyMock = jest.fn();
const aggregateMock = jest.fn();

await jest.unstable_mockModule(
  "../../../../src/modules/rules-points/service/point.service.js",
  () => ({
    applyPoints: applyPointsMock,
  })
);

await jest.unstable_mockModule(
  "../../../../src/config/prisma.js",
  () => ({
    default: {
      pointLedger: {
        findMany: findManyMock,
        aggregate: aggregateMock,
      },
    },
  })
);

const { processCommitRule } = await import(
  "../../../../src/modules/rules-points/engine/rules/commit.rule.js"
);

// Helpers
function sumPointsForEntity(entityId) {
  return applyPointsMock.mock.calls
    .map(call => call[0])
    .filter(arg => arg && arg.entityId === entityId)
    .reduce((acc, arg) => acc + (arg.points || 0), 0);
}

function callsForEntity(entityId) {
  return applyPointsMock.mock.calls
    .map(call => call[0])
    .filter(arg => arg && arg.entityId === entityId);
}

describe("Commit Rule", () => {
  const user = { id: "u1", username: "tester" };

  beforeEach(() => {
    jest.clearAllMocks();
    aggregateMock.mockResolvedValue({ _sum: { points: 0 } });
    findManyMock.mockResolvedValue([]);
  });

  it("debería otorgar puntos base por commit válido (suma de sub-reglas)", async () => {
    const event = {
      payload: {
        commits: [
          { id: "c1", message: "feat: algo nuevo", distinct: true, parents: [], stats: { total: 0 } },
        ],
      },
    };

    await processCommitRule(event, user);

    // CREATION(5) + CONVENTIONAL(8) + ATOMICITY(5) = 18
    const total = sumPointsForEntity("c1");
    expect(total).toBe(18);
  });

  it("debería otorgar bono por mensaje convencional (fix/...)", async () => {
    const event = {
      payload: {
        commits: [
          { id: "c2", message: "fix(core): corrige bug crítico", distinct: true, parents: [], stats: { total: 0 } },
        ],
      },
    };

    await processCommitRule(event, user);

    // CREATION(5) + CONVENTIONAL(8) + ATOMICITY(5) = 18
    const total = sumPointsForEntity("c2");
    expect(total).toBe(18);
  });

  it("debería otorgar bono por atomicidad (pocos archivos)", async () => {
    const event = {
      payload: {
        commits: [
          {
            id: "c3",
            message: "feat: cambio pequeño",
            distinct: true,
            parents: [],
            added: ["a.js"],
            modified: [],
            stats: { total: 0 },
          },
        ],
      },
    };

    await processCommitRule(event, user);

    // CREATION(5) + CONVENTIONAL(8) + ATOMICITY(5) = 18
    const total = sumPointsForEntity("c3");
    expect(total).toBe(18);
  });

  it("debería otorgar bono por incluir #time en el mensaje", async () => {
    const event = {
      payload: {
        commits: [
          { id: "c4", message: "feat: incluye tiempo #time", distinct: true, parents: [], stats: { total: 0 } },
        ],
      },
    };

    await processCommitRule(event, user);

    // CREATION(5) + CONVENTIONAL(8) + ATOMICITY(5) + INCLUDES_TIME(5) = 23
    const total = sumPointsForEntity("c4");
    expect(total).toBe(23);
  });

  it("debería ignorar commits cherry-pick", async () => {
    const event = {
      payload: {
        commits: [
          { id: "c5", message: "chore: algo (cherry picked from commit 123)", distinct: true, parents: [], stats: { total: 0 } },
        ],
      },
    };

    await processCommitRule(event, user);

    expect(applyPointsMock).not.toHaveBeenCalled();
  });

  it("debería revertir un commit y anular parcialmente sus puntos", async () => {
    findManyMock.mockResolvedValue([{ points: 10, ruleKey: "commit.creation" }]);

    const event = {
      payload: {
        commits: [
          {
            id: "c6",
            message:
              'Revert "feat: original"\n\nThis reverts commit 1234567890abcdef1234567890abcdef12345678.',
            distinct: true,
            parents: [],
            stats: { total: 0 },
          },
        ],
      },
    };

    await processCommitRule(event, user);

    const calls = callsForEntity("c6");
    expect(calls.length).toBeGreaterThan(0);
    const revertCall = calls.find(c => c.ruleKey && c.ruleKey.includes("revert"));
    expect(revertCall).toBeDefined();
    expect(revertCall.isReversible).toBe(false);
    expect(revertCall.points).toBeLessThan(0);
  });

  it("no debería exceder el límite diario de puntos (150)", async () => {
    aggregateMock.mockResolvedValue({ _sum: { points: 150 } });

    const event = {
      payload: {
        commits: [
          { id: "c7", message: "feat: algo", distinct: true, parents: [], stats: { total: 0 } },
        ],
      },
    };

    await processCommitRule(event, user);

    expect(applyPointsMock).not.toHaveBeenCalled();
  });
});
