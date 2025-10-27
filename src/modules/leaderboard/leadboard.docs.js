/**
 * @swagger
 * tags:
 *   name: Leaderboard
 *   description: Endpoints relacionados con el ranking de usuarios
 */

/**
 * @swagger
 * /leaderboard:
 *   get:
 *     summary: Obtiene el Top 10 de usuarios por puntos
 *     tags: [Leaderboard]
 *     responses:
 *       200:
 *         description: Lista de los 10 usuarios con más puntos
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                     format: uuid
 *                     example: "c12345f6-7890-1234-5678-abcdef123456"
 *                   username:
 *                     type: string
 *                     example: "Kevinn"
 *                   avatarUrl:
 *                     type: string
 *                     format: uri
 *                     example: "https://avatars.githubusercontent.com/u/123456?v=4"
 *                   points:
 *                     type: integer
 *                     example: 250
 *                   level:
 *                     type: integer
 *                     example: 5
 *       500:
 *         description: Error interno del servidor
 */