// ================================
//  SERVER.JS — Git Masters API
// ================================
import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import helmet from 'helmet';
import session from 'express-session';
import passport from 'passport';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
//  Importa la especificación Swagger (export default)
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
import rankHistoryRoutes from './src/modules/rankHistory/routes/rankHistory.routes.js';
import adminRoutes from './src/modules/admin/routes/admin.routes.js';
// --- MIDDLEWARES Y SERVICIOS GLOBALES ---
import requestLogger from './src/shared/middlewares/requestLogger.js';
import { initializeSchedulers } from './src/shared/service/scheduler.service.js';

//  Importar el reinicio de rangos para activar el cron mensual
import './src/scheduler/resetRanks.js';

const app = express();
const PORT = process.env.PORT || 3000;

// ================================
// --- AJUSTE CRITICO PARA NGROK ---
// ================================
// Esto es obligatorio para que Express confíe en que Ngrok está usando HTTPS
app.set('trust proxy', 1);

// ================================
// --- MIDDLEWARES GLOBALES ---
// ================================
app.use(requestLogger);
app.use(
  cors({
    // Asegúrate que esta variable en el .env tenga el link de Ngrok del FRONTEND (puerto 5173)
    origin: process.env.FRONTEND_URL || 'http://localhost:5173', 
    credentials: true,
  })
);
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use(helmet());


// --- CONFIGURACIÓN DE SESIONES Y PASSPORT ---
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'un_secreto_muy_fuerte',
    resave: false,
    saveUninitialized: false,
    cookie: {
      // --- CAMBIOS PARA QUE NO TE BOTE EL LOGIN ---
      // Forzamos secure: true porque Ngrok es HTTPS
      secure: true, 
      // Forzamos 'none' para que la cookie viaje entre el dominio del Front y el del Back
      sameSite: 'none',
      maxAge: 24 * 60 * 60 * 1000 // 1 día de vida
    },
  })
);
app.use(passport.initialize());
app.use(passport.session());

// ================================
// --- RUTA PRINCIPAL ---
// ================================
app.get('/', (req, res) => {
  res.send('API de Git Masters funcionando! 🚀');
});

// ================================
// --- DOCUMENTACIÓN SWAGGER ---
// ================================
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// ================================
// --- ORDEN DE MIDDLEWARES ---
// ================================

//  Webhooks (parser raw) DEBE IR PRIMERO
app.use('/webhooks', express.raw({ type: 'application/json' }), webhookRoutes);

//  Luego express.json() sin conflicto
app.use(express.json());

// ================================
// --- RUTAS DE LA APLICACIÓN ---
// ================================
app.use('/auth', authRoutes);
app.use('/points', pointRoutes);
app.use('/events', eventsRoutes);
app.use('/profile', profileRoutes);
app.use('/leaderboard', leaderboardRoutes);
app.use('/teams', teamsRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/badges', badgesRoutes);
app.use('/statistics', statisticsRoutes);
app.use('/api', rankHistoryRoutes);
app.use('/admin', adminRoutes);


// ================================
// --- RUTA DE FALLBACK ---
// ================================
app.get('/login-failed', (req, res) => {
  res.status(401).send('Fallo la autenticación.');
});

// ================================
// --- INICIAR SERVIDOR ---
// ================================
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
  console.log(`Documentación Swagger: http://localhost:${PORT}/api-docs`);

  //  Inicializa schedulers generales
  initializeSchedulers();

  console.log('Sistema de reinicio mensual de rangos cargado correctamente.');
});
