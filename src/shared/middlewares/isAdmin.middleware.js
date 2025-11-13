// src/shared/middlewares/isAdmin.middleware.js

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

/**
 * Middleware para verificar si el usuario autenticado tiene privilegios de administrador.
 * Asume que un middleware de autenticación previo ha adjuntado el userId a req.user.id.
 */
const isAdmin = async (req, res, next) => {
  // Verificar si el usuario ha sido autenticado previamente (req.user debe existir)
  if (!req.user || !req.user.id) {
    return res.status(401).json({
      message: "No autenticado. Por favor, inicie sesión."
    });
  }

  const userId = req.user.id;

  try {
    // Buscar el registro del usuario en la tabla Admin
    const adminRecord = await prisma.admin.findUnique({
      where: { userId }
    });

    if (!adminRecord) {
      // 403 Forbidden: No tiene los permisos necesarios
      return res.status(403).json({
        message: "Acceso denegado. Se requieren permisos de administrador."
      });
    }

    // El usuario es administrador, podemos adjuntar el nivel de admin al request si es necesario
    req.user.isAdmin = true;
    req.user.adminLevel = adminRecord.adminLevel;

    // Continuar a la siguiente función (el controlador de la ruta)
    next();
  } catch (error) {
    console.error("Error al verificar privilegios de administrador:", error);
    res.status(500).json({
      message: "Error interno del servidor al verificar permisos."
    });
  }
};

export default isAdmin;
