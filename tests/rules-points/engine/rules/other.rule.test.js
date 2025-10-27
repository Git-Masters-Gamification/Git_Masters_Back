import { jest } from "@jest/globals";

const applyPointsMock = jest.fn();

// --- Mock de point.service.js ---
await jest.unstable_mockModule(
  "../../../../src/modules/rules-points/service/point.service.js",
  () => ({
    applyPoints: applyPointsMock,
  })
);

// --- Importamos el módulo bajo prueba ---
const { processOtherEventsRule } = await import(
  "../../../../src/modules/rules-points/engine/rules/other.rule.js"
);

describe("Other Rule - processOtherEventsRule", () => {
  let user;

  beforeEach(() => {
    user = { id: "u1", username: "tester" };
    applyPointsMock.mockClear();
  });

  it("debería asignar puntos si el release es semántico y tiene changelog", async () => {
    const event = {
      eventType: "release",
      payload: {
        action: "published",
        release: {
          id: 123,
          tag_name: "v1.2.3",
          body: "Changelog content",
        },
      },
    };

    await processOtherEventsRule(event, user);

    expect(applyPointsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: user.id,
        points: 50,
        ruleKey: "release.semantic.creation",
        entityId: "123",
      })
    );
  });

  it("no debería asignar puntos si el tag no es semántico", async () => {
    const event = {
      eventType: "release",
      payload: {
        action: "published",
        release: {
          id: 456,
          tag_name: "release-1.0",
          body: "Contenido changelog",
        },
      },
    };

    await processOtherEventsRule(event, user);

    expect(applyPointsMock).not.toHaveBeenCalled();
  });

  it("no debería asignar puntos si falta body en el release", async () => {
    const event = {
      eventType: "release",
      payload: {
        action: "published",
        release: {
          id: 789,
          tag_name: "v2.0.0",
          body: "",
        },
      },
    };

    await processOtherEventsRule(event, user);

    expect(applyPointsMock).not.toHaveBeenCalled();
  });

  it("no debería asignar puntos si no es un release publicado", async () => {
    const event = {
      eventType: "release",
      payload: {
        action: "draft",
        release: {
          id: 999,
          tag_name: "v3.0.0",
          body: "Contenido",
        },
      },
    };

    await processOtherEventsRule(event, user);

    expect(applyPointsMock).not.toHaveBeenCalled();
  });
});
