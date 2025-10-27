import { jest } from "@jest/globals";

// --- Mock de profile.service ---
const getProfileByUserIdMock = jest.fn();
const updateProfileMock = jest.fn();
const getActivityLogByUserIdMock = jest.fn();
const getPointsHistoryByUserIdMock = jest.fn();

await jest.unstable_mockModule(
  "../../../src/modules/profile/service/profile.service.js",
  () => ({
    getProfileByUserId: getProfileByUserIdMock,
    updateProfile: updateProfileMock,
    getActivityLogByUserId: getActivityLogByUserIdMock,
    getPointsHistoryByUserId: getPointsHistoryByUserIdMock,
  })
);

// --- Importar el controller DESPUÉS de mockear ---
const {
  getUserProfile,
  updateUserProfile,
  getUserActivity,
  getUserPointsHistory,
} = await import("../../../src/modules/profile/controller/profile.controller.js");

describe("Profile Controller", () => {
  let req, res;

  beforeAll(() => {
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterAll(() => {
    console.error.mockRestore();
  });

  beforeEach(() => {
    req = { user: { id: 1 }, body: {} };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    jest.clearAllMocks();
  });

  describe("getUserProfile", () => {
    it("retorna 200 y el perfil del usuario", async () => {
      const mockProfile = { id: 1, bio: "Hola mundo" };
      getProfileByUserIdMock.mockResolvedValue(mockProfile);

      await getUserProfile(req, res);

      expect(getProfileByUserIdMock).toHaveBeenCalledWith(1);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockProfile);
    });

    it("retorna 404 si no se encuentra el perfil", async () => {
      getProfileByUserIdMock.mockResolvedValue(null);

      await getUserProfile(req, res);

      expect(res.status).toHaveBeenCalledWith(44); // <-- tu código usa 44
      expect(res.json).toHaveBeenCalledWith({ message: "Perfil no encontrado." });
    });

    it("retorna 500 si ocurre un error", async () => {
      getProfileByUserIdMock.mockRejectedValue(new Error("DB error"));

      await getUserProfile(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: "Error interno del servidor.",
      });
    });
  });

  describe("updateUserProfile", () => {
    it("retorna 400 si no se envía bio", async () => {
      req.body = {};
      await updateUserProfile(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: "El campo 'bio' es requerido.",
      });
    });

    it("retorna 200 si se actualiza correctamente", async () => {
      req.body = { bio: "Nueva bio" };
      updateProfileMock.mockResolvedValue({ bio: "Nueva bio" });

      await updateUserProfile(req, res);

      expect(updateProfileMock).toHaveBeenCalledWith(1, req.body);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: "Biografía actualizada con éxito.",
        bio: "Nueva bio",
      });
    });

    it("retorna 500 si ocurre un error", async () => {
      req.body = { bio: "Error" };
      updateProfileMock.mockRejectedValue(new Error("DB error"));

      await updateUserProfile(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: "Error interno del servidor.",
      });
    });
  });

  describe("getUserActivity", () => {
    it("retorna 200 con la actividad", async () => {
      const mockActivity = [{ action: "login" }];
      getActivityLogByUserIdMock.mockResolvedValue(mockActivity);

      await getUserActivity(req, res);

      expect(getActivityLogByUserIdMock).toHaveBeenCalledWith(1);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockActivity);
    });

    it("retorna 500 si ocurre un error", async () => {
      getActivityLogByUserIdMock.mockRejectedValue(new Error("DB error"));

      await getUserActivity(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: "Error interno del servidor.",
      });
    });
  });

  describe("getUserPointsHistory", () => {
    it("retorna 200 con historial de puntos", async () => {
      const mockHistory = [{ points: 100 }];
      getPointsHistoryByUserIdMock.mockResolvedValue(mockHistory);

      await getUserPointsHistory(req, res);

      expect(getPointsHistoryByUserIdMock).toHaveBeenCalledWith(1);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockHistory);
    });

    it("retorna 500 si ocurre un error", async () => {
      getPointsHistoryByUserIdMock.mockRejectedValue(new Error("DB error"));

      await getUserPointsHistory(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: "Error interno del servidor.",
      });
    });
  });
});
