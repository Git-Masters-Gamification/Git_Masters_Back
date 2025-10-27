/**
 * @openapi
 * /webhooks/github:
 *   post:
 *     tags:
 *       - Webhooks
 *     summary: Recibe eventos enviados por GitHub
 *     description: Endpoint público para recibir y procesar webhooks de GitHub.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               action:
 *                 type: string
 *                 example: "opened"
 *               repository:
 *                 type: object
 *                 properties:
 *                   full_name:
 *                     type: string
 *                     example: "123"
 *               sender:
 *                 type: object
 *                 properties:
 *                   login:
 *                     type: string
 *                     example: "usuario123"
 *     responses:
 *       200:
 *         description: ✅ Ping recibido (cuando GitHub prueba la conexión).
 *       202:
 *         description: ✅ Webhook aceptado y enviado a procesamiento en segundo plano.
 *       400:
 *         description: ❌ Solicitud inválida (faltan headers requeridos).
 *       500:
 *         description: ❌ Error interno en el servidor.
 */