import swaggerJsdoc from 'swagger-jsdoc';
 
// ❌ No importes swaggerUi aquí, el server.js ya lo hace.
 
const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Git-Masters V3 API',
      version: '1.0.0',
      description:
        'Documentación modular de la API de Git-Masters V3, que gamifica las buenas prácticas de desarrollo.',
    },
    servers: [
      {
        url: process.env.BACKEND_URL || 'http://localhost:3000',
        description: 'Servidor local de desarrollo',
      },
    ],
    components: {
      securitySchemes: {
        // ✅ ÚNICO esquema de autenticación permitido
        cookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'token',
          description:
            'Autenticación mediante una cookie httpOnly que se obtiene al hacer login.',
        },
      },
    },
    // ✅ Aplica cookieAuth globalmente a toda la API
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
      { name: 'Rank History', description: 'Historial de rangos, puntos y niveles de los usuarios a lo largo del tiempo (mensual).' },
    ],
  },
  // ✅ Ruta donde Swagger buscará tus docs
  apis: ['./src/modules/**/*.docs.js'],
};
 
// 1️⃣ Genera la especificación base
const swaggerSpec = swaggerJsdoc(options);
 
// 2️⃣ Limpieza de esquemas extra (por si otros .docs.js agregaron bearerAuth o apiKeyAuth)
if (swaggerSpec.components && swaggerSpec.components.securitySchemes) {
  swaggerSpec.components.securitySchemes = {
    cookieAuth: swaggerSpec.components.securitySchemes.cookieAuth,
  };
}
swaggerSpec.security = [{ cookieAuth: [] }];
 
// 3️⃣ Exporta la especificación final
export default swaggerSpec;