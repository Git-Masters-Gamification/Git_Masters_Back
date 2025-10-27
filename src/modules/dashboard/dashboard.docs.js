/**
 * @swagger
 * tags:
 *   name: Dashboard
 *   description: Endpoints para visualizar métricas y ranking del usuario
 */
 
/**
 * @swagger
 * /dashboard:
 *   get:
 *     summary: Obtiene el dashboard del usuario autenticado
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: header
 *         name: X-API-Key
 *         schema:
 *           type: string
 *         required: false
 *         description: API Key para bypass de autenticación en entornos de prueba
 *     responses:
 *       200:
 *         description: Dashboard obtenido exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 userId:
 *                   type: string
 *                   format: uuid
 *                   example: "b12345f6-7890-1234-5678-abcdef123456"
 *                 pointsTotal:
 *                   type: integer
 *                   example: 120
 *                 rank:
 *                   type: integer
 *                   example: 3
 *                 badges:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       name:
 *                         type: string
 *                         example: "Top Contributor"
 *                       description:
 *                         type: string
 *                         example: "Más de 100 commits"
 *                 history:
 *                   type: array
 *                   description: Historial de actividad del usuario
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         example: 1
 *                       action:
 *                         type: string
 *                         example: "commit"
 *                       timestamp:
 *                         type: string
 *                         format: date-time
 *                         example: "2025-10-02T12:00:00Z"
 *                 teamRanking:
 *                   type: array
 *                   description: Ranking de equipos por puntos acumulados
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                         example: "team-uuid"
 *                       name:
 *                         type: string
 *                         example: "Team Alpha"
 *                       totalPoints:
 *                         type: integer
 *                         example: 300
 *       401:
 *         description: No autorizado - Token inválido o faltante
 *       500:
 *         description: Error interno del servidor
 */