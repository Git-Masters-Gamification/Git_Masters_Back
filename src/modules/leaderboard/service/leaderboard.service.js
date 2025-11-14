// En: src/modules/leaderboard/service/leaderboard.service.js
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

// Define un valor por defecto para el tamaño de la página
const DEFAULT_PAGE_SIZE = 10;

export const getTopUsers = async (page = 1, pageSize = DEFAULT_PAGE_SIZE) => {
    // 1. Calcular el desplazamiento (skip)
    // El 'skip' indica cuántos registros debe saltar la base de datos.
    // Fórmula: (Número de página - 1) * Tamaño de página
    const skip = (page - 1) * pageSize;

    // 2. Obtener los usuarios de la página actual
    const topUsers = await prisma.user.findMany({
        // Aplica el salto (skip) y el límite (take) para la paginación
        skip: skip,
        take: pageSize, 
        
        // Ordena los usuarios por puntos de mayor a menor
        orderBy: {
            pointsBalance: 'desc',
        },
        
        // Selecciona solo los datos que queremos mostrar públicamente
        select: {
            id: true,
            username: true,
            avatarUrl: true,
            pointsBalance: true,
            profile: {
                select: {
                    level: true,
                },
            },
        },
    });

    // 3. (Opcional pero recomendado) Obtener el conteo total para metadata de paginación
    const totalUsers = await prisma.user.count();
    const totalPages = Math.ceil(totalUsers / pageSize);

    // Mapeamos para aplanar la respuesta y hacerla más fácil de usar en el front
    const data = topUsers.map(user => ({
        id: user.id,
        username: user.username,
        avatarUrl: user.avatarUrl,
        points: user.pointsBalance,
        level: user.profile?.level ?? 1
    }));
    
    // 4. Retornar los datos junto con la metadata de paginación
    return {
        data: data,
        pagination: {
            totalItems: totalUsers,
            totalPages: totalPages,
            currentPage: page,
            pageSize: pageSize,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1,
        }
    };
};