// src/modules/admin/admin.routes.js

import express from 'express';
const router = express.Router();

// Importación de los controladores
import { listUsers, assignAdmin, testAssignAdmin } from '../controller/admin.controller.js';

// Importación de middlewares (asegúrate de que las rutas son correctas)
import isAuthenticated from '../../../shared/middlewares/isAuthenticated.middleware.js';
import isAdmin from '../../../shared/middlewares/isAdmin.middleware.js';

// =======================================================
// 🧩 RUTAS DEL MÓDULO DE ADMINISTRACIÓN
// =======================================================

/**
 * GET /api/admin/users
 * Lista todos los usuarios con filtros (solo accesible por administradores autenticados)
 */
router.get(
  '/users',
  isAuthenticated,
  isAdmin,
  listUsers
);

/**
 * POST /api/admin/assign
 * Asigna permisos de administrador a un usuario (solo para superadmins)
 */
router.post(
  '/assign',
  isAuthenticated,
  isAdmin,
  assignAdmin
);

/**
 * 🧪 POST /api/admin/test-assign
 * Endpoint temporal para pruebas (sin autenticación)
 * Permite promover a un usuario enviando el userId en el body.
 * Ejemplo: { "userId": "123" }
 */
router.post('/test-assign', testAssignAdmin);

// =======================================================
// Exportación del router
// =======================================================
export default router;
