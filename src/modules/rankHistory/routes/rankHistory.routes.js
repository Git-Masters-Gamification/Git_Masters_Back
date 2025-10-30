import express from "express";
import { getUserRankHistory } from "../controller/rankHistory.controller.js";

const router = express.Router();

/**
 * 📍 Rutas de Rank History
 * GET /api/rank-history/:id → historial mensual del usuario
 */
router.get("/rank-history/:id", getUserRankHistory);

export default router;