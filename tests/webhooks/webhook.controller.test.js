// tests/webhooks/webhook.controller.test.js
import { jest } from "@jest/globals";

// --- mock del servicio ---
const processGitHubEventMock = jest.fn();

await jest.unstable_mockModule(
  "../../src/modules/webhooks/service/webhook.service.js",
  () => ({
    processGitHubEvent: processGitHubEventMock,
  })
);

const { handleGitHubWebhook } = await import(
  "../../src/modules/webhooks/controller/webhook.controller.js"
);

describe("Webhook Controller: handleGitHubWebhook", () => {
  let req, res;

  beforeEach(() => {
    jest.clearAllMocks();
    req = {
      headers: {},
      body: { some: "payload" },
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    };
  });

  it("retorna 400 si faltan headers", () => {
    handleGitHubWebhook(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: "Faltan headers requeridos.",
    });
  });

  it('retorna 200 con "Ping recibido." si eventType === ping', () => {
    req.headers = { "x-github-delivery": "d1", "x-github-event": "ping" };

    handleGitHubWebhook(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith("Ping recibido.");
    expect(processGitHubEventMock).not.toHaveBeenCalled();
  });

  it('retorna 202 con "Webhook aceptado para procesamiento." si eventType !== ping', () => {
    req.headers = { "x-github-delivery": "d2", "x-github-event": "push" };

    handleGitHubWebhook(req, res);

    expect(res.status).toHaveBeenCalledWith(202);
    expect(res.send).toHaveBeenCalledWith(
      "Webhook aceptado para procesamiento."
    );
    expect(processGitHubEventMock).toHaveBeenCalledWith(
      { some: "payload" },
      "d2",
      "push"
    );
  });

  it("loggea error si processGitHubEvent falla", async () => {
    req.headers = { "x-github-delivery": "d3", "x-github-event": "push" };

    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    processGitHubEventMock.mockRejectedValueOnce(new Error("fail"));

    handleGitHubWebhook(req, res);

    // esperar un microtask porque el catch es async
    await new Promise(setImmediate);

    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining("Error en el procesamiento en segundo plano"),
      expect.any(Error)
    );

    errorSpy.mockRestore();
  });
});
