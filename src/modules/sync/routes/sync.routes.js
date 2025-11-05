// src/modules/sync/routes/sync.routes.js
import { Router } from 'express';
import { triggerSync } from '../controller/sync.controller.js';
 
const router = Router();
 
// Endpoint para activar la sincronización completa (útil para pruebas y cron jobs)
// POST /api/sync/run
router.post('/run', triggerSync);
 
export default router;