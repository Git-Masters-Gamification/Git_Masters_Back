import { jest } from "@jest/globals";

// --- Mocks ---
const applyPointsMock = jest.fn();
const findFirstMock = jest.fn();
const findUniqueMock = jest.fn();
const mergedBranchCreateMock = jest.fn();

// --- Mock de point.service.js ---
await jest.unstable_mockModule(
  "../../../../src/modules/rules-points/service/point.service.js",
  () => ({
    applyPoints: applyPointsMock,
  })
);

// --- Mock de prisma.js ---
await jest.unstable_mockModule(
  "../../../../src/config/prisma.js",
  () => ({
    default: {
      pointLedger: { findFirst: findFirstMock },
      user: { findUnique: findUniqueMock },
      mergedBranch: { create: mergedBranchCreateMock },
    },
  })
);

// --- Mock para evitar error de awardBadge no definida ---
global.awardBadge = jest.fn();

// --- Import real del módulo después de mockear ---
const { processPullRequestRule } = await import(
  "../../../../src/modules/rules-points/engine/rules/pr.rule.js"
);

describe("PR Rule - processPullRequestRule", () => {
  let user;

  beforeEach(() => {
    user = { id: "u1", username: "author" };
    jest.clearAllMocks();
  });

  it("debería asignar puntos al abrir PR con checklist", async () => {
    findFirstMock.mockResolvedValue(null);

    const event = {
      payload: {
        action: "opened",
        pull_request: {
          number: 10,
          head: { ref: "feature-1" },
          body: "- [x] Checklist item",
        },
      },
    };

    await processPullRequestRule(event, user);

    expect(applyPointsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: user.id,
        points: 30,
        ruleKey: "pr.creation",
      })
    );
    expect(global.awardBadge).toHaveBeenCalledWith(user.id, "rompiendo_el_hielo");
  });

  it("no debería asignar puntos si el PR no tiene checklist", async () => {
    findFirstMock.mockResolvedValue(null);

    const event = {
      payload: {
        action: "opened",
        pull_request: {
          number: 11,
          head: { ref: "feature-2" },
          body: "Sin checklist",
        },
      },
    };

    await processPullRequestRule(event, user);

    expect(applyPointsMock).not.toHaveBeenCalled();
  });

  it("no debería asignar puntos si ya existen puntos previos por creación", async () => {
    findFirstMock.mockResolvedValue({ id: "pl1" });

    const event = {
      payload: {
        action: "opened",
        pull_request: {
          number: 12,
          head: { ref: "feature-3" },
          body: "- [ ] checklist",
        },
      },
    };

    await processPullRequestRule(event, user);

    expect(applyPointsMock).not.toHaveBeenCalled();
  });

  it("debería asignar puntos al autor al hacer merge", async () => {
    findFirstMock.mockResolvedValueOnce(null);
    findUniqueMock.mockResolvedValue(null);

    const event = {
      payload: {
        action: "closed",
        pull_request: {
          number: 20,
          merged: true,
          head: { ref: "feature-merge" },
          merged_by: { login: "author" },
          merge_commit_sha: "sha123",
        },
      },
    };

    await processPullRequestRule(event, user);

    expect(applyPointsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: user.id,
        points: 80,
        ruleKey: "pr.merge",
      })
    );
    expect(mergedBranchCreateMock).toHaveBeenCalled();
  });

  it("debería asignar puntos al merger distinto por resolver conflictos", async () => {
    findFirstMock.mockResolvedValueOnce(null);
    findUniqueMock.mockResolvedValue({ id: "u2", username: "merger" });

    const event = {
      payload: {
        action: "closed",
        pull_request: {
          number: 21,
          merged: true,
          head: { ref: "feature-merge-2" },
          merged_by: { login: "merger" },
          merge_commit_sha: "sha456",
        },
      },
    };

    await processPullRequestRule(event, user);

    expect(applyPointsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "u2",
        points: 25,
        ruleKey: "pr.resolve_conflicts",
      })
    );
  });

  it("no debería asignar puntos si ya existen puntos previos por merge", async () => {
    findFirstMock.mockResolvedValueOnce({ id: "pl2" });

    const event = {
      payload: {
        action: "closed",
        pull_request: {
          number: 22,
          merged: true,
          head: { ref: "feature-merge-3" },
          merged_by: { login: "author" },
          merge_commit_sha: "sha789",
        },
      },
    };

    await processPullRequestRule(event, user);

    expect(applyPointsMock).not.toHaveBeenCalledWith(
      expect.objectContaining({ ruleKey: "pr.merge" })
    );
  });
});
