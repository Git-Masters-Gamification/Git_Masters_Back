/**
 * @swagger
 * tags:
 *   name: Teams
 *   description: Endpoints relacionados con equipos de usuarios
 */

/**
 * @swagger
 * /teams:
 *   get:
 *     summary: Listar todos los equipos
 *     tags: [Teams]
 *     responses:
 *       200:
 *         description: Lista de equipos con sus miembros
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                   name:
 *                     type: string
 *                   members:
 *                     type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         username:
 *                           type: string
 *                         avatarUrl:
 *                           type: string
 *                   _count:
 *                     type: object
 *                     properties:
 *                       members:
 *                         type: integer
 *       500:
 *         description: Error al listar equipos
 */

/**
 * @swagger
 * /teams/{id}:
 *   get:
 *     summary: Obtener detalles de un equipo por ID
 *     tags: [Teams]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del equipo
 *     responses:
 *       200:
 *         description: Detalles del equipo
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 name:
 *                   type: string
 *                 members:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       username:
 *                         type: string
 *                       avatarUrl:
 *                         type: string
 *                       pointsBalance:
 *                         type: integer
 *       404:
 *         description: Equipo no encontrado
 *       500:
 *         description: Error al obtener detalles del equipo
 */

/**
 * @swagger
 * /teams:
 *   post:
 *     summary: Crear un nuevo equipo
 *     tags: [Teams]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Equipo Rocket"
 *     responses:
 *       201:
 *         description: Equipo creado exitosamente
 *       400:
 *         description: El nombre del equipo es requerido
 *       409:
 *         description: El usuario ya pertenece a un equipo
 *       500:
 *         description: Error al crear el equipo
 */

/**
 * @swagger
 * /teams/{id}/join:
 *   post:
 *     summary: Unirse a un equipo existente
 *     tags: [Teams]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del equipo
 *     responses:
 *       200:
 *         description: Te has unido al equipo exitosamente
 *       409:
 *         description: El usuario ya pertenece a un equipo
 *       500:
 *         description: Error al unirse al equipo
 */

/**
 * @swagger
 * /teams/leave:
 *   post:
 *     summary: Abandonar el equipo actual
 *     tags: [Teams]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Has abandonado el equipo exitosamente
 *       400:
 *         description: El usuario no pertenece a ningún equipo
 *       500:
 *         description: Error al abandonar el equipo
 */
