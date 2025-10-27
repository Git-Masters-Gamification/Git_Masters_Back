/**
 * @swagger
 * tags:
 *   name: Rules-Points
 *   description: Endpoints relacionados con el sistema de puntos, rankings y reglas automáticas.
 */

/**
 * @swagger 
 * components:

 *
 *   schemas:
 *     Badge:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *           example: "Top Committer"
 *         description:
 *           type: string
 *           example: "Otorgado por más de 50 commits válidos."
 *
 *     HistoryItem:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           example: "evt-123abc"
 *         ruleKey:
 *           type: string
 *           example: "commit.aggregate"
 *         points:
 *           type: integer
 *           example: 15
 *         notes:
 *           type: string
 *           example: "+5 commit base, +10 bono convencional"
 *         createdAt:
 *           type: string
 *           format: date-time
 *           example: "2025-10-02T12:00:00Z"
 *
 *     TeamRanking:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           example: "team-123abc"
 *         name:
 *           type: string
 *           example: "Team Alpha"
 *         totalPoints:
 *           type: integer
 *           example: 430
 *
 *     DashboardResponse:
 *       type: object
 *       properties:
 *         userId:
 *           type: string
 *           format: uuid
 *           example: "user-abc-123"
 *         pointsTotal:
 *           type: integer
 *           example: 250
 *         rank:
 *           type: integer
 *           example: 3
 *         badges:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Badge'
 *         history:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/HistoryItem'
 *         teamRanking:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/TeamRanking'
 *
 *     LeaderboardUser:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           example: "user-abc-456"
 *         username:
 *           type: string
 *           example: "Kevin-Beltran"
 *         pointsBalance:
 *           type: integer
 *           example: 580
 *         rank:
 *           type: integer
 *           example: 1
 *
 *     LeaderboardResponse:
 *       type: array
 *       items:
 *         $ref: '#/components/schemas/LeaderboardUser'
 *
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *           example: "Error interno del servidor"
 */

/**
 * @swagger
 * /points/me:
 *   get:
 *     summary: Obtiene el dashboard de puntos del usuario autenticado
 *     tags: [Rules-Points]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: header
 *         name: X-API-Key
 *         schema:
 *           type: string
 *         required: false
 *         description: API Key opcional para pruebas (bypass de autenticación)
 *     responses:
 *       200:
 *         description: Dashboard obtenido correctamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DashboardResponse'
 *       401:
 *         description: No autorizado - Token inválido o faltante
 *       404:
 *         description: Perfil no encontrado
 *       500:
 *         description: Error interno del servidor
 */

/**
 * @swagger
 * /points/leaderboard:
 *   get:
 *     summary: Obtiene el ranking general de usuarios por puntos acumulados
 *     tags: [Rules-Points]
 *     responses:
 *       200:
 *         description: Ranking obtenido exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LeaderboardResponse'
 *       500:
 *         description: Error interno del servidor
 */