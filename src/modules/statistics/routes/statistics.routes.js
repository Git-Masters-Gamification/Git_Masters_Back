import { Router } from 'express';
import { PrismaClient } from "@prisma/client";
import { fetchPersonalStats } from '../controller/statistics.controller.js';
import requireAuth from '../../../shared/middlewares/auth.middleware.js';
 
const router = Router();
const prisma = new PrismaClient();
 
// Middleware para bypass de autenticación en Postman (versión para equipos)
async function testBypassAuth(req, res, next) {
  const key = req.header('X-API-Key');
  if (process.env.TEST_API_KEY && key === process.env.TEST_API_KEY) {
   
    const testUserLogin = req.header('X-Test-User-Login');
    let testUser;
 
    if (testUserLogin) {
      // Si se especifica un usuario en el header, búscalo a él.
      testUser = await prisma.user.findUnique({
        where: { username: testUserLogin }
      });
      if (!testUser) {
        return res.status(404).json({ message: `Usuario de prueba '${testUserLogin}' no encontrado.` });
      }
    } else {
      // Si no se especifica, busca al primer usuario (comportamiento anterior).
      testUser = await prisma.user.findFirst();
    }
 
    if (testUser) {
      req.user = testUser;
      return next();
    }
  }
 
  return requireAuth(req, res, next);
}
 
// @route   GET /statistics/me
router.get('/me', testBypassAuth, fetchPersonalStats);
 
export default router;