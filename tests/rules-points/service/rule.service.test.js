import { jest } from "@jest/globals";

// --- Mock del ruleEngine ---
await jest.unstable_mockModule("../../../src/modules/rules-points/engine/ruleEngine.js", () => ({
  runRulesForActivity: jest.fn(),
}));

// --- Importar después del mock ---
const { evaluateRules } = await import("../../../src/modules/rules-points/service/rule.service.js");
const { runRulesForActivity } = await import("../../../src/modules/rules-points/engine/ruleEngine.js");

describe("Rule Service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("debería ejecutar runRulesForActivity con el deliveryId correcto", async () => {
    const activity = { deliveryId: "abc123" };
    const user = { id: "user1" };

    await evaluateRules(activity, user);

    expect(runRulesForActivity).toHaveBeenCalledTimes(1);
    expect(runRulesForActivity).toHaveBeenCalledWith("abc123");
  });

  it("debería lanzar error si el activity no tiene deliveryId", async () => {
    const activity = { noDelivery: true };
    const user = { id: "user2" };

    await expect(evaluateRules(activity, user)).rejects.toThrow("El activity no contiene deliveryId");
    expect(runRulesForActivity).not.toHaveBeenCalled();
  });

  it("debería capturar y relanzar errores del ruleEngine", async () => {
    runRulesForActivity.mockRejectedValue(new Error("Error en reglas"));

    const activity = { deliveryId: "x123" };
    const user = { id: "user3" };

    await expect(evaluateRules(activity, user)).rejects.toThrow("Error en reglas");
    expect(runRulesForActivity).toHaveBeenCalledWith("x123");
  });
});
