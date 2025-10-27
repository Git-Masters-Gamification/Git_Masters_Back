import express from 'express';
import requireAuth from '../../../shared/middlewares/auth.middleware.js';
import { listEvents, getEventById } from '../controller/events.controller.js';

const router = express.Router();

/**
 * Middleware de autenticación flexible.
 * Permite saltarse la autenticación con una API Key especial para pruebas (Postman, local, etc.).
 */
function testBypassAuth(req, res, next) {
  try {
    const apiKey = req.header('X-API-Key');

    // ✅ Si está definida TEST_API_KEY en el entorno y coincide con el header, omite autenticación
    if (process.env.TEST_API_KEY && apiKey === process.env.TEST_API_KEY) {
      console.log('🔓 Bypass de autenticación habilitado (TEST_API_KEY)');
      return next();
    }

    // Caso contrario, requiere autenticación normal
    return requireAuth(req, res, next);
  } catch (error) {
    console.error('❌ Error en testBypassAuth:', error);
    return res.status(500).json({ success: false, error: 'Error interno en autenticación' });
  }
}

/**
 * @route GET /events
 * @desc Lista los eventos registrados con filtros, orden y paginación
 * @access Protegido o bypass con TEST_API_KEY
 */
router.get('/', testBypassAuth, listEvents);

/**
 * @route GET /events/:id
 * @desc Obtiene un evento específico por su ID
 * @access Protegido o bypass con TEST_API_KEY
 */
router.get('/:id', testBypassAuth, getEventById);

export default router;