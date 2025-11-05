// src/modules/sync/controller/sync.controller.js
import * as syncService from '../service/sync.service.js';
 
// Controlador para la ejecución manual (ej: Postman, Cron Job).
export const triggerSync = async (req, res) => {
    try {
        const result = await syncService.runManualSync();
        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({ message: "Error al ejecutar la sincronización.", error: error.message });
    }
};