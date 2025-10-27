import { jest } from "@jest/globals";
import request from "supertest";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
 
// --- Resolución dinámica del rootDir (evita errores en Windows/Linux) ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "../../../src");
 
// 🧩 Mock del controlador rule.controller.js
const handleActivityMock = jest.fn((req, res) =>
  res.status(200).json({ message: "mock ejecutado" })
);
 
// ✅ Mock dinámico usando ruta absoluta para evitar errores de resolución
await jest.unstable_mockModule(
  path.join(projectRoot, "modules/rules-points/controller/rule.controller.js"),
  () => ({
    handleActivity: handleActivityMock,
  })
);
 
// 🚀 Importamos el router después de mockear el controlador
const { default: router } = await import(
  path.join(projectRoot, "modules/rules-points/routes/routes.js")
);
 
describe("Rule Controller", () => {
  let app;
 
  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use("/rules", router); // Montar el router base
  });
 
  afterEach(() => {
    jest.clearAllMocks();
  });
 
  it("POST /rules/evaluar debería llamar a handleActivity", async () => {
    await request(app)
      .post("/rules/evaluar")
      .send({ activity: "commit", user: { id: 1 } })
      .expect(200);
 
    expect(handleActivityMock).toHaveBeenCalled();
  });
});