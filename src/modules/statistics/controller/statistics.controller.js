//backend/src/modules/statistics/controller/statistics.controller.js
 
import { getPersonalStats } from '../service/statistics.service.js';
 
export const fetchPersonalStats = async (req, res) => {
  try {
    const userId = req.user.id;
    const stats = await getPersonalStats(userId);
    res.status(200).json(stats);
  } catch (error) {
    console.error("Error al obtener las estadísticas personales:", error);
    res.status(500).json({ message: "Error interno del servidor." });
  }
};