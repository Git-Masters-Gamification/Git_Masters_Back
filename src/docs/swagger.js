import swaggerJsdoc from 'swagger-jsdoc';
// ❌ NO importes swaggerUi aquí, tu server.js ya lo hace.

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Git-Masters V3 API',
      version: '1.0.0',
      description: 'Documentación modular de la API de Git-Masters V3, que gamifica las buenas prácticas de desarrollo.',
    },
    servers: [
      {
        url: process.env.BACKEND_URL || 'http://localhost:3000',
        description: 'Servidor local de desarrollo',
      },
    ],
    components: {
      securitySchemes: {
        // ✅ Este es el único que querías dejar
        cookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'token',
          description: 'Autenticación mediante una cookie httpOnly que se obtiene al hacer login.',
        },
      },
    },
    security: [{ cookieAuth: [] }],
    tags: [
      { name: 'Auth', description: 'Operaciones de autenticación de usuarios.' },
      { name: 'Badges', description: 'Gestiona las insignias o logros que puede ganar el usuario.' },
      { name: 'Dashboard', description: 'Visualización general de métricas del usuario.' },
      { name: 'Events', description: 'Gestión de eventos.' },
      { name: 'Leaderboard', description: 'Muestra y organiza los puntajes de los usuarios.' },
      { name: 'Profile', description: 'Gestión de perfiles de usuario.' },
      { name: 'Statistics', description: 'Endpoints para la gestión de estadísticas.' },
      { name: 'Teams', description: 'Gestión de equipos.' },
      { name: 'Webhooks', description: 'Controla los webhooks.' },
    ],
  },
  // ✅ Apunta a tus módulos para encontrar las rutas
  apis: ['./src/modules/**/*.docs.js'], 
};

// 1. Genera el objeto de la especificación
const swaggerSpec = swaggerJsdoc(options);

// 2. ✅ EXPORTA POR DEFECTO (esto arregla el error)
export default swaggerSpec;