/**
 * @openapi
 * components:
 *   schemas:
 *     PersonalStats:
 *       type: object
 *       properties:
 *         totalProjects:
 *           type: integer
 *           description: Número total de proyectos del usuario.
 *           example: 15
 *         completedTasks:
 *           type: integer
 *           description: Número total de tareas completadas.
 *           example: 120
 *         pendingTasks:
 *           type: integer
 *           description: Número de tareas pendientes.
 *           example: 35
 *         hoursLogged:
 *           type: number
 *           format: float
 *           description: Total de horas registradas por el usuario.
 *           example: 250.5
 */
 
/**
 * @openapi
 * /statistics/me:
 *   get:
 *     summary: Obtiene las estadísticas personales del usuario autenticado
 *     description: Recupera un resumen con las estadísticas clave (proyectos, tareas, horas registradas) del usuario que ha iniciado sesión.
 *     tags: [Statistics]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       '200':
 *         description: Estadísticas personales obtenidas con éxito.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PersonalStats'
 *       '401':
 *         description: No autenticado. El usuario debe iniciar sesión o enviar un token válido.
 *       '404':
 *         description: Usuario no encontrado o sin estadísticas disponibles.
 *       '500':
 *         description: Error interno del servidor.
 */