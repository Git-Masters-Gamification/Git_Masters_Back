import { jest } from "@jest/globals";
import path from "path";

// --- Prisma Mock ---
const findUniqueEventMock = jest.fn();
const updateEventMock = jest.fn();
const findUniqueUserMock = jest.fn();

const prismaPath = path.resolve("src/config/prisma.js");
await jest.unstable_mockModule(prismaPath, () => ({
  default: {
    GithubEvent: {
      findUnique: findUniqueEventMock,
      update: updateEventMock,
    },
    user: {
      findUnique: findUniqueUserMock,
    },
  },
}));

// --- Mocks de reglas ---
const processCommitRuleMock = jest.fn();
const processBranchRuleMock = jest.fn();
const processPullRequestRuleMock = jest.fn();
const processReviewRuleMock = jest.fn();
const processOtherEventsRuleMock = jest.fn();

await jest.unstable_mockModule(
  path.resolve("src/modules/rules-points/engine/rules/commit.rule.js"),
  () => ({ processCommitRule: processCommitRuleMock })
);

await jest.unstable_mockModule(
  path.resolve("src/modules/rules-points/engine/rules/branch.rule.js"),
  () => ({ processBranchRule: processBranchRuleMock })
);

await jest.unstable_mockModule(
  path.resolve("src/modules/rules-points/engine/rules/pr.rule.js"),
  () => ({ processPullRequestRule: processPullRequestRuleMock })
);

await jest.unstable_mockModule(
  path.resolve("src/modules/rules-points/engine/rules/review.rule.js"),
  () => ({ processReviewRule: processReviewRuleMock })
);

await jest.unstable_mockModule(
  path.resolve("src/modules/rules-points/engine/rules/other.rule.js"),
  () => ({ processOtherEventsRule: processOtherEventsRuleMock })
);

// --- Import real del engine ---
const { runRulesForActivity } = await import(
  path.resolve("src/modules/rules-points/engine/ruleEngine.js")
);

// --- Tests ---
describe("Rule Engine", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("debería ejecutar reglas de commit y branch para evento push", async () => {
    findUniqueEventMock.mockResolvedValue({
      id: 1,
      deliveryId: "abc123",
      eventType: "push",
      processedStatus: "stored",
      senderLogin: "tester",
    });
    findUniqueUserMock.mockResolvedValue({ id: 99, username: "tester" });

    await runRulesForActivity("abc123");

    // ✅ Fijate en el objeto con { where, data }
    expect(updateEventMock).toHaveBeenNthCalledWith(1, {
      where: { id: 1 },
      data: { processedStatus: "processing" },
    });
    expect(processCommitRuleMock).toHaveBeenCalled();
    expect(processBranchRuleMock).toHaveBeenCalled();
    expect(updateEventMock).toHaveBeenNthCalledWith(2, {
      where: { id: 1 },
      data: { processedStatus: "processed_ok" },
    });
  });

  it("debería marcar como failed_user_not_found si no existe el usuario", async () => {
    findUniqueEventMock.mockResolvedValue({
      id: 2,
      deliveryId: "xyz456",
      eventType: "push",
      processedStatus: "stored",
      senderLogin: "ghost",
    });
    findUniqueUserMock.mockResolvedValue(null);

    await runRulesForActivity("xyz456");

    expect(updateEventMock).toHaveBeenNthCalledWith(1, {
      where: { id: 2 },
      data: { processedStatus: "processing" },
    });
    expect(updateEventMock).toHaveBeenNthCalledWith(2, {
      where: { id: 2 },
      data: { processedStatus: "failed_user_not_found" },
    });
  });
});
