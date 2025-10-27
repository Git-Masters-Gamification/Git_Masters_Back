import { jest } from "@jest/globals";

// --- Mocks ---
const applyPointsMock = jest.fn();
const findFirstMock = jest.fn();

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
      pointLedger: { findFirst: findFirstMock },
    },
  })
);

const { processReviewRule } = await import(
  "../../../../src/modules/rules-points/engine/rules/review.rule.js"
);

describe("Review Rule - processReviewRule", () => {
  let reviewerUser;

  beforeEach(() => {
    reviewerUser = { id: "r1", username: "reviewer" };
    applyPointsMock.mockClear();
    findFirstMock.mockReset();
  });

  it("no hace nada si action no es 'submitted'", async () => {
    const event = { payload: { action: "edited" } };

    await processReviewRule(event, reviewerUser);

    expect(applyPointsMock).not.toHaveBeenCalled();
  });

  it("no hace nada si review.state no es 'approved' ni 'changes_requested'", async () => {
    const event = {
      payload: {
        action: "submitted",
        review: { state: "commented" },
        pull_request: { id: 10, number: 1 },
      },
    };

    await processReviewRule(event, reviewerUser);

    expect(applyPointsMock).not.toHaveBeenCalled();
  });

  it("no aplica puntos si ya existen puntos previos para ese PR", async () => {
    findFirstMock.mockResolvedValue({ id: "pl1" });

    const event = {
      payload: {
        action: "submitted",
        review: { state: "approved" },
        pull_request: { id: 11, number: 2 },
      },
    };

    await processReviewRule(event, reviewerUser);

    expect(applyPointsMock).not.toHaveBeenCalled();
  });

  it("aplica puntos base por revisión aprobada", async () => {
    findFirstMock.mockResolvedValue(null);

    const event = {
      payload: {
        action: "submitted",
        review: { state: "approved" },
        pull_request: { id: 12, number: 3 },
      },
    };

    await processReviewRule(event, reviewerUser);

    expect(applyPointsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: reviewerUser.id,
        points: 10,
        ruleKey: "review.submission",
      })
    );
  });

  it("aplica puntos base + bonus si incluye un tag válido", async () => {
    findFirstMock.mockResolvedValue(null);

    const event = {
      payload: {
        action: "submitted",
        review: { state: "changes_requested", body: "Falla de #Seguridad detectada" },
        pull_request: { id: 13, number: 4 },
      },
    };

    await processReviewRule(event, reviewerUser);

    expect(applyPointsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: reviewerUser.id,
        points: 30, // 10 base + 20 bonus
        notes: expect.stringContaining("#Seguridad"),
      })
    );
  });

  it("aplica solo puntos base si no hay tag válido en changes_requested", async () => {
    findFirstMock.mockResolvedValue(null);

    const event = {
      payload: {
        action: "submitted",
        review: { state: "changes_requested", body: "Arreglar detalles menores" },
        pull_request: { id: 14, number: 5 },
      },
    };

    await processReviewRule(event, reviewerUser);

    expect(applyPointsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: reviewerUser.id,
        points: 10,
      })
    );
  });
});
