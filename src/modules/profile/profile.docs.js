/**
 * @swagger
 * tags:
 *   name: Profile
 *   description: Endpoints relacionados con el perfil del usuario
 */

/**
 * @swagger
 * /profile:
 *   get:
 *     summary: Obtener el perfil del usuario autenticado
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Perfil obtenido con éxito
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 githubId:
 *                   type: string
 *                 username:
 *                   type: string
 *                 email:
 *                   type: string
 *                 avatarUrl:
 *                   type: string
 *                 role:
 *                   type: string
 *                 points:
 *                   type: integer
 *                 memberSince:
 *                   type: string
 *                   format: date-time
 *                 level:
 *                   type: integer
 *                 bio:
 *                   type: string
 *                 team:
 *                   type: object
 *                   nullable: true
 *                   properties:
 *                     id:
 *                       type: string
 *                     name:
 *                       type: string
 *                 badges:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       name:
 *                         type: string
 *                       description:
 *                         type: string
 *                       obtainedAt:
 *                         type: string
 *                         format: date-time
 *       404:
 *         description: Perfil no encontrado
 *       500:
 *         description: Error interno del servidor
 */

/**
 * @swagger
 * /profile:
 *   patch:
 *     summary: Actualizar el perfil del usuario autenticado
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - bio
 *             properties:
 *               bio:
 *                 type: string
 *                 example: "Desarrollador fullstack apasionado por el open source."
 *     responses:
 *       200:
 *         description: Perfil actualizado con éxito
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 bio:
 *                   type: string
 *       400:
 *         description: El campo 'bio' es requerido
 *       500:
 *         description: Error interno del servidor
 */

/**
 * @swagger
 * /profile/activity:
 *   get:
 *     summary: Obtener la actividad reciente del usuario
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de actividades
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                   userId:
 *                     type: string
 *                   action:
 *                     type: string
 *                   createdAt:
 *                     type: string
 *                     format: date-time
 *       500:
 *         description: Error interno del servidor
 */

/**
 * @swagger
 * /profile/points-history:
 *   get:
 *     summary: Obtener historial de puntos del usuario
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de movimientos de puntos
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                   userId:
 *                     type: string
 *                   points:
 *                     type: integer
 *                   reason:
 *                     type: string
 *                   createdAt:
 *                     type: string
 *                     format: date-time
 *       500:
 *         description: Error interno del servidor
 */
