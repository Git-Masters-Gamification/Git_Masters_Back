import { jest } from "@jest/globals";

// Mock de applyPoints
const applyPointsMock = jest.fn();

await jest.unstable_mockModule(
  "../../../../src/modules/rules-points/service/point.service.js",
  () => ({
    applyPoints: applyPointsMock,
  })
);

const { processBranchRule } = await import(
  "../../../../src/modules/rules-points/engine/rules/branch.rule.js"
);

describe("Branch Rule", () => {
  const user = { id: "user1", role: "DEV" };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("debería otorgar puntos por nombre válido al crear rama", async () => {
    const event = {
      eventType: "create",
      payload: { ref_type: "branch", ref: "PROJ-123_fix_bug_caso1" },
    };

    await processBranchRule(event, user);

    expect(applyPointsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user1",
        points: 20,
        ruleKey: "branch.creation.valid_name",
        entityId: "PROJ-123_fix_bug_caso1",
      })
    );
  });

  it("no debería otorgar puntos si el nombre de la rama no es válido", async () => {
    const event = {
      eventType: "create",
      payload: { ref_type: "branch", ref: "bad-branch" },
    };

    await processBranchRule(event, user);

    expect(applyPointsMock).not.toHaveBeenCalled();
  });

  it("debería penalizar por push directo a rama protegida", async () => {
    const event = {
      eventType: "push",
      payload: { ref: "refs/heads/main", forced: false, after: "abc123" },
    };

    await processBranchRule(event, user);

    expect(applyPointsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user1",
        points: -50,
        ruleKey: "branch.push.direct_push_penalty",
        entityId: "abc123",
      })
    );
  });

  it("no debería penalizar si el usuario tiene rol de excepción", async () => {
    const adminUser = { id: "user2", role: "ADMIN" };
    const event = {
      eventType: "push",
      payload: { ref: "refs/heads/main", forced: false, after: "abc123" },
    };

    await processBranchRule(event, adminUser);

    expect(applyPointsMock).not.toHaveBeenCalled();
  });

  it("debería penalizar por force-push en rama protegida", async () => {
    const event = {
      eventType: "push",
      payload: { ref: "refs/heads/develop", forced: true, after: "def456" },
    };

    await processBranchRule(event, user);

    expect(applyPointsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user1",
        points: -100,
        ruleKey: "branch.push.force_push_penalty",
        entityId: "def456",
        isReversible: false,
      })
    );
  });

  it("debería ignorar eventos de borrado de ramas", async () => {
    const event = { eventType: "delete", payload: {} };

    await processBranchRule(event, user);

    expect(applyPointsMock).not.toHaveBeenCalled();
  });
});
