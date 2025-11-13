// ================================
// 🌐 SERVER.JS — Git Masters API (Ruta Admin Corregida)
// ================================
import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import session from 'express-session';
import passport from 'passport';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
// ✅ Esta línea AHORA SÍ funciona porque swagger.js tiene un 'export default'
import swaggerSpec from './src/docs/swagger.js'; 
import './src/config/passport.js';

// --- IMPORTACIÓN DE RUTAS ---
import authRoutes from './src/modules/auth/routes/auth.routes.js';
import webhookRoutes from './src/modules/webhooks/routes/webhook.routes.js';
import pointRoutes from './src/modules/rules-points/routes/point.routes.js';
import eventsRoutes from './src/modules/events/routes/events.routes.js';
import profileRoutes from './src/modules/profile/routes/profile.routes.js';
import leaderboardRoutes from './src/modules/leaderboard/routes/leaderboard.routes.js';
import teamsRoutes from './src/modules/teams/routes/teams.routes.js';
import dashboardRoutes from './src/modules/dashboard/routes/dashboard.routes.js';
import badgesRoutes from './src/modules/badges/routes/badges.routes.js';
import statisticsRoutes from './src/modules/statistics/routes/statistics.routes.js';
import adminRoutes from './src/modules/admin/routes/admin.routes.js'; // ⬅️ RUTA CORREGIDA

import requestLogger from './src/shared/middlewares/requestLogger.js';
import { initializeSchedulers } from './src/shared/validators/scheduler.service.js';

const app = express();
const PORT = process.env.PORT || 3000;

// --- MIDDLEWARES GLOBALES ---
app.use(requestLogger);
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  })
);
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));

// --- CONFIGURACIÓN DE SESIONES Y PASSPORT ---
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'un_secreto_muy_fuerte',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'Lax',
    },
  })
);
app.use(passport.initialize());
app.use(passport.session());

// --- RUTA PRINCIPAL ---
app.get('/', (req, res) => {
  res.send('API de Git Masters funcionando! 🚀');
});

// --- DOCUMENTACIÓN SWAGGER ---
// ✅ Esta línea funciona porque 'swaggerSpec' se importa correctamente
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// ✅ Webhooks (parser raw) DEBE IR PRIMERO
app.use('/webhooks', express.raw({ type: 'application/json' }), webhookRoutes);

// ✅ Luego express.json() sin conflicto
app.use(express.json());

// --- RUTAS DE LA APLICACIÓN ---
app.use('/auth', authRoutes);
app.use('/points', pointRoutes);
app.use('/events', eventsRoutes);
app.use('/profile', profileRoutes);
app.use('/leaderboard', leaderboardRoutes);
app.use('/teams', teamsRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/badges', badgesRoutes);
app.use('/statistics', statisticsRoutes);
app.use('/admin', adminRoutes); // ⬅️ USO DEL ENDPOINT /admin

// --- RUTA DE FALLBACK ---
app.get('/login-failed', (req, res) => {
  res.status(401).send('Fallo la autenticación.');
});

// --- INICIAR SERVIDOR ---
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
  console.log(
    `Documentación de la API disponible en http://localhost:${PORT}/api-docs`
  );

  // ✅ Inicializa el sistema de tareas automáticas
  initializeSchedulers();
});