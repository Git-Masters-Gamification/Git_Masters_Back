/**
 * @openapi
 * tags:
 *   - name: Events
 *     description: Gestión y consulta de eventos.
 *
 * components:
 *   schemas:
 *     Event:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           example: "evt_123456"
 *         delivery_id:
 *           type: string
 *           example: "deliv_78910"
 *         event_type:
 *           type: string
 *           example: "push"
 *         action:
 *           type: string
 *           example: "created"
 *         repo_full_name:
 *           type: string
 *           example: "openai/chatgpt"
 *         sender_login:
 *           type: string
 *           example: "octocat"
 *         commits_count:
 *           type: integer
 *           example: 5
 *         github_created_at:
 *           type: string
 *           format: date-time
 *           example: "2023-10-05T12:34:56Z"
 *         received_at:
 *           type: string
 *           format: date-time
 *           example: "2023-10-05T12:35:10Z"
 *         processed_status:
 *           type: string
 *           example: "processed"
 *         payload:
 *           type: object
 *           description: Se incluye solo si se solicita con `include=payload`.
 *

 */

/**
 * @openapi
 * /events:
 *   get:
 *     tags:
 *       - Events
 *     summary: Listar eventos
 *     description: Obtiene una lista de eventos con filtros, paginación y ordenamiento.
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: query
 *         name: user
 *         schema:
 *           type: string
 *         description: Filtra eventos por usuario
 *       - in: query
 *         name: repo
 *         schema:
 *           type: string
 *         description: Filtra eventos por repositorio
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *         description: Filtra eventos por tipo
 *       - in: query
 *         name: action
 *         schema:
 *           type: string
 *         description: Filtra eventos por acción
 *       - in: query
 *         name: since
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Fecha inicial (ISO 8601)
 *       - in: query
 *         name: until
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Fecha final (ISO 8601)
 *       - in: query
 *         name: processed
 *         schema:
 *           type: boolean
 *         description: Filtra si el evento ya fue procesado
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Número de página para la paginación
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Cantidad de resultados por página
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           default: received_at:desc
 *         description: Ordenamiento de resultados (`campo:asc|desc`)
 *     responses:
 *       200:
 *         description: Lista de eventos obtenida exitosamente.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 page:
 *                   type: integer
 *                   example: 1
 *                 limit:
 *                   type: integer
 *                   example: 20
 *                 total:
 *                   type: integer
 *                   example: 100
 *                 items:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Event'
 *       500:
 *         description: Error interno del servidor.
 */

/**
 * @openapi
 * /events/{id}:
 *   get:
 *     tags:
 *       - Events
 *     summary: Obtener un evento por ID
 *     description: Retorna un evento específico, con opción de incluir el payload.
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del evento
 *       - in: query
 *         name: include
 *         schema:
 *           type: string
 *         description: Si contiene `payload`, se incluye el payload completo
 *     responses:
 *       200:
 *         description: Evento encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Event'
 *       404:
 *         description: Evento no encontrado.
 *       500:
 *         description: Error interno del servidor.
 */
