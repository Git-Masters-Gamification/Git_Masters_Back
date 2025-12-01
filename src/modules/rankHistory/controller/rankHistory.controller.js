import * as rankHistoryService from "../service/rankHistory.service.js";

/**
 * 📊 Controlador: Obtener historial de rangos de un usuario
 */
export async function getUserRankHistory(req, res) {
  const { id } = req.params;

  try {
    const history = await rankHistoryService.getRankHistoryByUserId(id);

    if (!history.length) {
      return res.status(404).json({
        success: false,
        message: "No hay historial disponible para este usuario.",
        data: [],
      });
    }

    return res.json({
      success: true,
      message: "Historial obtenido correctamente.",
      data: history,
    });
  } catch (error) {
    console.error("❌ [RankHistoryController] Error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Error al obtener el historial de rangos.",
    });
  }
}