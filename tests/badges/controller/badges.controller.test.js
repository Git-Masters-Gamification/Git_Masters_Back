import { jest } from "@jest/globals";

// --- Silenciar logs ruidosos ---
beforeAll(() => {
  jest.spyOn(console, "error").mockImplementation(() => {});
});
afterAll(() => {
  console.error.mockRestore();
});

// --- Mock de prisma ---
const findManyMock = jest.fn();
const findUniqueMock = jest.fn();

await jest.unstable_mockModule("../../../src/config/prisma.js", () => ({
  default: {
    badge: { findMany: findManyMock },
    user: { findUnique: findUniqueMock },
  },
}));

// Importar controller después de mockear prisma
const { getAllBadges, getUserBadges } = await import(
  "../../../src/modules/badges/controller/badges.controller.js"
);

// Helpers
const makeRes = () => {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
};

describe("Badges Controller", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getAllBadges", () => {
    it("200 con lista de insignias", async () => {
      const req = {};
      const res = makeRes();
      const badges = [
        { key: "first_commit", name: "Primer commit", description: "Tu primer commit" },
      ];

      findManyMock.mockResolvedValue(badges);

      await getAllBadges(req, res);

      expect(findManyMock).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(badges);
    });

    it("500 si ocurre un error en prisma", async () => {
      const req = {};
      const res = makeRes();

      findManyMock.mockRejectedValue(new Error("DB error"));

      await getAllBadges(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: "Error interno del servidor al obtener insignias.",
      });
    });
  });

  describe("getUserBadges", () => {
    it("200 con insignias del usuario", async () => {
      const req = { params: { username: "anderson" } };
      const res = makeRes();

      findUniqueMock.mockResolvedValue({
        assignedBadges: [
          {
            obtainedAt: "2025-01-01",
            badge: { key: "first_commit", name: "Primer commit", description: "Tu primer commit" },
          },
        ],
      });

      await getUserBadges(req, res);

      expect(findUniqueMock).toHaveBeenCalledWith({
        where: { username: "anderson" },
        select: expect.any(Object),
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith([
        {
          key: "first_commit",
          name: "Primer commit",
          description: "Tu primer commit",
          obtainedAt: "2025-01-01",
        },
      ]);
    });

    it("404 si el usuario no existe", async () => {
      const req = { params: { username: "ghost" } };
      const res = makeRes();

      findUniqueMock.mockResolvedValue(null);

      await getUserBadges(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: "Usuario no encontrado." });
    });

    it("500 si ocurre un error en prisma", async () => {
      const req = { params: { username: "anderson" } };
      const res = makeRes();

      findUniqueMock.mockRejectedValue(new Error("DB error"));

      await getUserBadges(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: "Error interno del servidor." });
    });
  });
});
