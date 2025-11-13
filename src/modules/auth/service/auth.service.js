// src/modules/auth/service/auth.service.js
import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Se encarga de buscar el estado de administrador, crear el token JWT
 * con el payload actualizado y ponerlo en la cookie de la respuesta.
 */
export const generateAndSetToken = async (res, user) => {
  // 1. BUSCAR ESTADO DE ADMINISTRADOR
  // user que llega aquí generalmente solo tiene id, githubId, username, etc.
  const adminRecord = await prisma.admin.findUnique({
    where: { userId: user.id },
    select: { id: true }, // Solo necesitamos saber si existe
  });

  const isAdmin = !!adminRecord; // true si existe el registro, false si es null

  // 2. CREAR PAYLOAD DEL TOKEN (Añadir isAdmin)
  const tokenPayload = {
    ...user, // Conserva las propiedades existentes (id, username, etc.)
    isAdmin: isAdmin, // <-- CAMBIO CLAVE
  };

  const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, {
    expiresIn: "1d",
  });

  // 3. ESTABLECER LA COOKIE
  res.cookie("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "Strict",
    maxAge: 24 * 60 * 60 * 1000, // 1 día
  });
};

// Se encarga de buscar el perfil del usuario y formatear los datos.
// (Esta función no necesita cambios directos para el admin, ya que no maneja el token)
export const getCompleteProfile = async (githubId) => {
  const user = await prisma.user.findUnique({
    where: { githubId: githubId },
    select: {
      pointsBalance: true,
      profile: { select: { level: true } },
      assignedBadges: {
        select: {
          badge: { select: { name: true, description: true } },
        },
      },
      // Opcional: Podrías incluir el estado de admin aquí si el frontend lo necesita fuera del login
      // adminStatus: { select: { adminLevel: true } }, 
    },
  });

  if (!user) {
    return null; // Devuelve nulo si no se encuentra
  }

  const badges = user.assignedBadges.map((ub) => ({
    name: ub.badge.name,
    description: ub.badge.description,
  }));

  const profileData = {
    points: user.pointsBalance ?? 0,
    level: user.profile?.level ?? 1,
    badges,
  };

  return profileData;
};

// Se encarga de toda la lógica de cerrar la sesión
export const cleanupSession = (req, res, next) => {
  req.logout((err) => {
    if (err) {
      console.error("Error al ejecutar req.logout:", err);
      return next(err);
    }

    req.session.destroy((err) => {
      if (err) {
        console.error("Error al destruir la sesión:", err);
        return res.status(500).json({ message: "No se pudo cerrar la sesión." });
      }

      res.clearCookie('connect.sid', {
        path: '/',
      });
      // Asegurar que también se borre la cookie 'token' del JWT
      res.clearCookie('token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "Strict",
      });

      return res.status(200).json({ message: "Sesión cerrada exitosamente." });
    });
  });
};