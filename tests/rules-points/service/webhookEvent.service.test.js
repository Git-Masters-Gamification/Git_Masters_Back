import { jest } from "@jest/globals";

// --- Mock de Prisma ---
const createMock = jest.fn();
const findUniqueMock = jest.fn();

await jest.unstable_mockModule("../../../src/config/prisma.js", () => ({
  default: {
    GithubEvent: {
      create: createMock,
      findUnique: findUniqueMock,
    },
  },
}));

// --- Importar después del mock ---
const { saveGithubEvent } = await import(
  "../../../src/modules/rules-points/service/webhookEvent.service.js"
);

describe("WebhookEvent Service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("debería guardar un evento correctamente", async () => {
    const record = { delivery_id: "abc123", action: "push" };
    const savedEvent = { id: 1, ...record };
    createMock.mockResolvedValue(savedEvent);

    const result = await saveGithubEvent(record);

    expect(createMock).toHaveBeenCalledWith({ data: record });
    expect(result).toEqual(savedEvent);
  });

  it("debería devolver el evento existente si es duplicado (P2002)", async () => {
    const record = { delivery_id: "abc123", action: "push" };
    const existingEvent = { id: 99, ...record };

    createMock.mockRejectedValue({
      code: "P2002",
      meta: { target: ["delivery_id"] },
    });
    findUniqueMock.mockResolvedValue(existingEvent);

    const result = await saveGithubEvent(record);

    expect(findUniqueMock).toHaveBeenCalledWith({
      where: { delivery_id: "abc123" },
    });
    expect(result).toEqual(existingEvent);
  });

  it("debería relanzar otros errores distintos a P2002", async () => {
    const record = { delivery_id: "xyz789", action: "commit" };
    const unexpectedError = new Error("Fallo inesperado");
    createMock.mockRejectedValue(unexpectedError);

    await expect(saveGithubEvent(record)).rejects.toThrow("Fallo inesperado");
    expect(findUniqueMock).not.toHaveBeenCalled();
  });
});
