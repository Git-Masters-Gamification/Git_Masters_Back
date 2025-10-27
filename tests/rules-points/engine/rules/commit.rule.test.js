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
  "../../../../src/config/prisma.js", // 👈 ruta corregida
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

describe("Commit Rule", () => {
  const user = { id: "u1", username: "tester" };

  beforeEach(() => {
    jest.clearAllMocks();
    aggregateMock.mockResolvedValue({ _sum: { points: 0 } });
    findManyMock.mockResolvedValue([]);
  });

  it("debería otorgar puntos base por commit válido", async () => {
    const event = {
      payload: {
        commits: [
          { id: "c1", message: "feat: algo nuevo", distinct: true, parents: [] },
        ],
      },
    };

    await processCommitRule(event, user);

    expect(applyPointsMock).toHaveBeenCalledWith(
      expect.objectContaining({ ruleKey: "commit.creation", points: 5 })
    );
  });

  it("debería otorgar bono por mensaje convencional", async () => {
    const event = {
      payload: {
        commits: [
          { id: "c2", message: "fix(core): corrige bug crítico", distinct: true, parents: [] },
        ],
      },
    };

    await processCommitRule(event, user);

    expect(applyPointsMock).toHaveBeenCalledWith(
      expect.objectContaining({ ruleKey: "commit.conventional", points: 8 })
    );
  });

  it("debería otorgar bono por atomicidad (pocos archivos)", async () => {
    const event = {
      payload: {
        commits: [
          { id: "c3", message: "feat: cambio pequeño", distinct: true, parents: [], added: ["a.js"], modified: [] },
        ],
      },
    };

    await processCommitRule(event, user);

    expect(applyPointsMock).toHaveBeenCalledWith(
      expect.objectContaining({ ruleKey: "commit.atomicity_bonus" })
    );
  });

  it("debería otorgar bono por incluir #time en el mensaje", async () => {
    const event = {
      payload: {
        commits: [
          { id: "c4", message: "feat: incluye tiempo #time", distinct: true, parents: [] },
        ],
      },
    };

    await processCommitRule(event, user);

    expect(applyPointsMock).toHaveBeenCalledWith(
      expect.objectContaining({ ruleKey: "commit.includes_time", points: 5 })
    );
  });

  it("debería ignorar commits cherry-pick", async () => {
    const event = {
      payload: {
        commits: [
          { id: "c5", message: "chore: algo (cherry picked from commit 123)", distinct: true, parents: [] },
        ],
      },
    };

    await processCommitRule(event, user);

    expect(applyPointsMock).not.toHaveBeenCalled();
  });

  it("debería revertir un commit y anular sus puntos", async () => {
    // Simulamos que había un commit anterior con 10 pts
    findManyMock.mockResolvedValue([{ points: 10, ruleKey: "commit.creation" }]);

    const event = {
      payload: {
        commits: [
          {
            id: "c6",
            message: "Revert \"feat: original\"\n\nThis reverts commit 1234567890abcdef1234567890abcdef12345678.",
            distinct: true,
            parents: [],
          },
        ],
      },
    };

    await processCommitRule(event, user);

    expect(applyPointsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        ruleKey: "commit.revert",
        points: -10,
        isReversible: false,
      })
    );
  });

  it("no debería exceder el límite diario de puntos", async () => {
    aggregateMock.mockResolvedValue({ _sum: { points: 60 } });

    const event = {
      payload: {
        commits: [
          { id: "c7", message: "feat: algo", distinct: true, parents: [] },
        ],
      },
    };

    await processCommitRule(event, user);

    expect(applyPointsMock).not.toHaveBeenCalled();
  });
});
