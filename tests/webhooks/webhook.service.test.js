// tests/webhooks/webhook.service.test.js
import { jest } from "@jest/globals";

// --- Silenciar logs de consola ---
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

// --- Mock de dependencias ---
const prismaMock = {
  user: { findUnique: jest.fn() },
  githubEvent: { create: jest.fn() },
  activityLog: { create: jest.fn() },
};

const runRulesForActivityMock = jest.fn(() => Promise.resolve());

await jest.unstable_mockModule("../../src/config/prisma.js", () => ({
  default: prismaMock,
}));

await jest.unstable_mockModule(
  "../../src/modules/rules-points/engine/ruleEngine.js",
  () => ({ runRulesForActivity: runRulesForActivityMock })
);

// --- Importar el service DESPUÉS de mockear ---
const { processGitHubEvent } = await import(
  "../../src/modules/webhooks/service/webhook.service.js"
);

describe("Webhook Service: processGitHubEvent", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("ignora evento si githubEvent === 'ping'", async () => {
    await processGitHubEvent({}, "d1", "ping");

    expect(prismaMock.githubEvent.create).not.toHaveBeenCalled();
    expect(runRulesForActivityMock).not.toHaveBeenCalled();
  });

  it("ignora evento si el usuario no existe", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);

    await processGitHubEvent({ pusher: { name: "ghost" } }, "d2", "push");

    expect(prismaMock.githubEvent.create).not.toHaveBeenCalled();
    expect(runRulesForActivityMock).not.toHaveBeenCalled();
  });

  it("guarda el evento y lanza reglas en background si el usuario existe", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: "u1", username: "anderson" });
    prismaMock.githubEvent.create.mockResolvedValue({
      id: "e1",
      deliveryId: "d3",
    });
    prismaMock.activityLog.create.mockResolvedValue({});

    const payload = {
      repository: { full_name: "user/repo" },
      pusher: { name: "anderson" },
      action: "opened",
    };

    await processGitHubEvent(payload, "d3", "push");

    expect(prismaMock.githubEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        deliveryId: "d3",
        eventType: "push",
        senderLogin: "anderson",
      }),
    });

    expect(prismaMock.activityLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "u1",
        type: "push",
      }),
    });

    expect(runRulesForActivityMock).toHaveBeenCalledWith("d3");
  });

  it("ignora evento duplicado si Prisma lanza P2002", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: "u2", username: "dupUser" });
    const err = new Error("Unique constraint failed");
    err.code = "P2002";
    err.meta = { target: ["deliveryId"] };

    prismaMock.githubEvent.create.mockRejectedValue(err);

    await processGitHubEvent({}, "dup123", "push");

    expect(runRulesForActivityMock).not.toHaveBeenCalled();
  });

  it("re-lanza error si no es P2002", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: "u3", username: "tester" });
    const err = new Error("DB down");
    prismaMock.githubEvent.create.mockRejectedValue(err);

    await expect(processGitHubEvent({}, "x", "push")).rejects.toThrow("DB down");
  });

  it("cuando falta sender, usa pusher.name o null", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: "u4", username: "pusher-name" });
    prismaMock.githubEvent.create.mockResolvedValue({
      id: "e2",
      deliveryId: "d4",
    });
    prismaMock.activityLog.create.mockResolvedValue({});

    const payload = {
      repository: { full_name: "user/repo" },
      pusher: { name: "pusher-name" },
    };

    await processGitHubEvent(payload, "d4", "push");

    expect(prismaMock.githubEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        senderLogin: "pusher-name",
      }),
    });
  });
});
