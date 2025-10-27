//backend/src/modules/statistics/routes/statistics.service.js
 
import prisma from '../../../config/prisma.js';
import { subDays } from 'date-fns';
 
export const getPersonalStats = async (userId) => {
  // 1. Puntos ganados en los últimos 7 días
  const sevenDaysAgo = subDays(new Date(), 7);
  const recentPointsPromise = prisma.pointLedger.aggregate({
    _sum: {
      points: true,
    },
    where: {
      userId: userId,
      createdAt: {
        gte: sevenDaysAgo,
      },
    },
  });
 
  // 2. Actividad más rentable (la regla que más puntos ha dado)
  const mostValuableActivityPromise = prisma.pointLedger.groupBy({
    by: ['ruleKey'],
    _sum: {
      points: true,
    },
    where: {
      userId: userId,
    },
    orderBy: {
      _sum: {
        points: 'desc',
      },
    },
    take: 1,
  });
 
  // 3. Desglose de actividades (conteo por tipo de evento)
  const activityBreakdownPromise = prisma.activityLog.groupBy({
    by: ['type'],
    _count: {
      type: true,
    },
    where: {
      userId: userId,
    },
  });
 
  // Ejecutamos todas las consultas en paralelo
  const [recentPointsResult, mostValuableActivityResult, activityBreakdownResult] = await Promise.all([
    recentPointsPromise,
    mostValuableActivityPromise,
    activityBreakdownPromise
  ]);
 
  // Formateamos los resultados para una respuesta limpia
  const mostValuableActivity = mostValuableActivityResult[0];
 
  return {
    pointsLast7Days: recentPointsResult._sum.points || 0,
    mostValuableActivity: mostValuableActivity ? {
      rule: mostValuableActivity.ruleKey,
      totalPoints: mostValuableActivity._sum.points,
    } : null,
    activityBreakdown: activityBreakdownResult.map(item => ({
      type: item.type,
      count: item._count.type,
    })),
  };
};