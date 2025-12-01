// src/modules/sync/sync.docs.js
 
/**
 * @swagger
 * tags:
 *   - name: Sync
 *     description: Sincronización de equipos y miembros desde GitHub hacia la base de datos local.
 */
 
/**
 * @swagger
 * /sync/run:
 *   post:
 *     summary: Ejecuta la sincronización manual de equipos y miembros.
 *
 *      
 *      requiere las variables de entorno `GITHUB_ORG` y `GITHUB_TOKEN` correctamente configuradas.
 *     tags: [Sync]
 *     responses:
 *       200:
 *         description: Sincronización completada exitosamente.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Sincronización completada."
 *       400:
 *         description: Faltan variables de entorno requeridas (`GITHUB_ORG` o `GITHUB_TOKEN`).
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Fallo en la sincronización: Faltan GITHUB_ORG o GITHUB_TOKEN."
 *       500:
 *         description: Error interno del servidor durante la sincronización.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Error al ejecutar la sincronización."
 *                 error:
 *                   type: string
 *                   example: "Fallo en el proceso de sincronización: Error en la API de GitHub."
 */