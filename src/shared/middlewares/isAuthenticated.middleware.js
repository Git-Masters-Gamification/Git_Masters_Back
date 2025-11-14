// src/shared/middlewares/isAuthenticated.middleware.js

import jwt from 'jsonwebtoken';

/**
 * Middleware para verificar si existe un token JWT válido en cookies, headers o query params.
 * Si es válido, adjunta el payload del usuario a req.user.
 */
const isAuthenticated = (req, res, next) => {
  // 1️⃣ Obtener el token desde varios lugares posibles
  const token =
    req.cookies?.token ||                 // Token en cookie
    req.header('Authorization')?.replace('Bearer ', '') ||  // Token en header
    req.query?.token;                     // Token en query param (opcional)

  if (!token) {
    return res.status(401).json({
      message: 'Acceso denegado. Se requiere un token de autenticación (JWT).',
    });
  }

  try {
    // 2️⃣ Verificar el token usando la clave secreta
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 3️⃣ Adjuntar los datos decodificados al request
    req.user = decoded;

    // 4️⃣ Continuar al siguiente middleware/controlador
    next();
  } catch (err) {
    // Si el token es inválido o ha expirado
    res.clearCookie('token');
    console.error('Error de verificación JWT:', err.message);

    return res.status(401).json({
      message: 'Token inválido o expirado. Por favor, inicie sesión nuevamente.',
    });
  }
};

export default isAuthenticated;
