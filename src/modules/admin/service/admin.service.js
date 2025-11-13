// src/modules/admin/admin.service.js

import { PrismaClient } from '@prisma/client'; // ✅ Importación correcta del cliente de Prisma
const prisma = new PrismaClient();

/**
 * 🔍 Obtiene todos los usuarios, permitiendo búsqueda y filtrado por estado de administrador.
 */
export const getUsersWithAdminStatus = async ({ search = '', filter = 'ALL' }) => {
  try {
    // 1️⃣ Construir la cláusula WHERE para la búsqueda de texto
    const searchFilter = search
      ? {
          OR: [
            { username: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {};

    let adminFilter = {};

    // 2️⃣ Aplicar el filtro de estado de administrador
    if (filter === 'ADMINS') {
      adminFilter = { adminStatus: { isNot: null } }; // usuarios con registro en Admin
    } else if (filter === 'NON_ADMINS') {
      adminFilter = { adminStatus: { is: null } }; // usuarios sin registro en Admin
    }

    // 3️⃣ Combinar todos los filtros
    const where = {
      ...searchFilter,
      ...adminFilter,
    };

    // 4️⃣ Ejecutar la consulta
    const users = await prisma.user.findMany({
      where,
      include: {
        adminStatus: {
          select: {
            adminLevel: true,
            assignedAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return users;
  } catch (error) {
    console.error('❌ Error en getUsersWithAdminStatus:', error);
    throw new Error('Error al obtener la lista de usuarios.');
  }
};

/**
 * 🧑‍💼 Promueve un usuario existente a administrador insertando un registro en la tabla Admin.
 */
export const assignAdminRole = async (userIdToPromote) => {
  try {
    // 1️⃣ Verificar si el usuario a promover existe
    const userExists = await prisma.user.findUnique({
      where: { id: userIdToPromote },
    });

    if (!userExists) {
      return { success: false, message: 'Usuario no encontrado.' };
    }

    // 2️⃣ Verificar si ya es administrador
    const existingAdmin = await prisma.admin.findUnique({
      where: { userId: userIdToPromote },
    });

    if (existingAdmin) {
      return { success: false, message: 'El usuario ya tiene privilegios de administrador.' };
    }

    // 3️⃣ Crear el registro en la tabla Admin
    await prisma.admin.create({
      data: {
        userId: userIdToPromote,
        adminLevel: 'FULL_ADMIN',
        assignedAt: new Date(), // ✅ Registrar fecha de asignación
      },
    });

    return {
      success: true,
      message: `✅ Usuario ${userExists.username} promovido a administrador exitosamente.`,
    };
  } catch (error) {
    console.error('❌ Error en assignAdminRole:', error);
    throw new Error('Error al asignar el rol de administrador.');
  }
};
