import { PrismaClient } from "@prisma/client";
import cron from "node-cron";

const prisma = new PrismaClient();

/**
 * 🔄 Script de reinicio mensual de rangos y puntos
 *
 * - Guarda el historial mensual de rango/nivel/puntos en RankHistory.
 * - Crea registro en PointLedger antes del reinicio.
 * - Reinicia los puntos de todos los usuarios.
 * - Registra la acción global en la tabla de actividad.
 */
export async function resetUserRanks() {
  console.log("🚀 [resetRanks] Iniciando proceso de reinicio mensual...");

  const now = new Date();
  const formattedDate = now.toISOString().split("T")[0];
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  try {
    // 1️⃣ Obtener todos los usuarios
    const users = await prisma.user.findMany({
      select: { id: true, username: true, pointsBalance: true },
    });

    if (!users.length) {
      console.log("⚠️ No hay usuarios registrados. Nada que reiniciar.");
      return;
    }

    // 2️⃣ Crear registros históricos (snapshot de puntos antes de reinicio)
    const historyEntries = users.map((u) => ({
      userId: u.id,
      points: u.pointsBalance,
      reason: `🏁 Reinicio mensual (${formattedDate})`,
      createdAt: now,
    }));

    await prisma.pointLedger.createMany({ data: historyEntries });
    console.log(`🗃️ Historial guardado en PointLedger (${users.length} usuarios).`);

    // 2️⃣b Guardar historial mensual de rango y nivel en RankHistory
    console.log("🧠 Guardando historial mensual en RankHistory...");

    for (const u of users) {
      // Obtener perfil y rango actual
      const profile = await prisma.profile.findUnique({
        where: { userId: u.id },
        include: { rank: true },
      });

      await prisma.rankHistory.create({
        data: {
          userId: u.id,
          rankId: profile?.rank?.id || null,
          month,
          year,
          points: u.pointsBalance,
          level: profile?.level || 1,
        },
      });
    }

    console.log("📊 Historial mensual de rangos y niveles guardado correctamente.");

    // 3️⃣ Reiniciar puntos de todos los usuarios a 0
    await prisma.user.updateMany({ data: { pointsBalance: 0 } });
    console.log("🔁 Puntos reiniciados exitosamente.");

    // 4️⃣ Registrar el evento global en activityLog
    await prisma.activityLog.create({
      data: {
        userId: null,
        action: "RESETRANKS",
        description: `Reinicio mensual completado el ${formattedDate}.`,
        createdAt: now,
      },
    });

    console.log("✅ Reinicio mensual completado sin errores.");
  } catch (error) {
    console.error("❌ Error durante el reinicio mensual:", error);

    await prisma.activityLog.create({
      data: {
        userId: null,
        action: "RESETRANKS_ERROR",
        description: `Error al intentar reiniciar puntos: ${error.message}`,
        createdAt: new Date(),
      },
    });
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * 🕒 Configuración del cron job automático
 *
 * Formato cron: "0 3 1 * *"
 * → Ejecuta el script el día 1 de cada mes a las 03:00 AM hora del servidor.
 *
 * Cambia el horario si lo necesitas.
 */
cron.schedule("0 3 1 * *", async () => {
  console.log("🕒 [CRON] Ejecutando reinicio mensual programado...");
  await resetUserRanks();
});

/**
 * 🧩 Ejecución manual
 *
 * Permite ejecutar el script directamente con:
 *   node src/scheduler/resetRanks.js
 */
if (import.meta.url === `file://${process.argv[1]}`) {
  resetUserRanks()
    .then(() => {
      console.log("🧩 Ejecución manual completada.");
      process.exit(0);
    })
    .catch((err) => {
      console.error("❌ Error en ejecución manual:", err);
      process.exit(1);
    });
}