import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * 📊 Servicio: obtener historial de rangos y puntos de un usuario
 * @param {string} userId - ID del usuario
 * @returns {Promise<Array>} Historial formateado
 */
export async function getRankHistoryByUserId(userId) {
  try {
    const history = await prisma.rankHistory.findMany({
      where: { userId },
      include: {
        rank: {
          select: {
            name: true,
            color: true,
          },
        },
      },
      orderBy: [
        { year: "desc" },
        { month: "desc" },
      ],
    });

    if (!history.length) return [];

    // 🔧 Formateo de datos para el frontend
    return history.map((h) => ({
      id: h.id,
      month: h.month,
      year: h.year,
      points: h.points,
      level: h.level,
      rankName: h.rank?.name || "Sin rango",
      rankColor: h.rank?.color || "#888",
      createdAt: h.createdAt,
    }));
  } catch (error) {
    console.error("❌ [RankHistoryService] Error al obtener historial:", error);
    throw new Error("Error al consultar el historial de rangos.");
  } finally {
    await prisma.$disconnect();
  }
}