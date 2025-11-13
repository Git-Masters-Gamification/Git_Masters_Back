import passport from "passport";
import {
  generateAndSetToken,
  getCompleteProfile,
  cleanupSession,
} from "../service/auth.service.js";

// Iniciar autenticación con GitHub
export const loginWithGitHub = passport.authenticate("github", { scope: ["user:email"] });

// Callback de GitHub (maneja redirección y token)
export const githubCallback = (req, res, next) => {
  passport.authenticate("github", { session: false }, async (err, user, info) => {
    if (err || !user) {
      console.error("Error en autenticación de GitHub:", err || info);
      return res.redirect(`${process.env.FRONTEND_URL}/login-failed`);
    }

    try {
      // Esperar a que se genere el token antes de redirigir
      await generateAndSetToken(res, user);

      // Importante: usar "return" para cortar el flujo y evitar doble envío
      return res.redirect(`${process.env.FRONTEND_URL}/dashboard`);
    } catch (error) {
      console.error("Error al generar o guardar token:", error);
      return res.redirect(`${process.env.FRONTEND_URL}/login-failed`);
    }
  })(req, res, next);
};

// Obtener perfil completo
export const getProfile = async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: "No autenticado" });
  }

  try {
    const userProfile = await getCompleteProfile(req.user.githubId);

    if (!userProfile) {
      return res.status(404).json({ message: "Perfil de usuario no encontrado en la base de datos." });
    }

    const responseData = {
      ...req.user,
      ...userProfile,
    };

    return res.json(responseData);
  } catch (err) {
    console.error("Error al obtener perfil:", err);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
};

// Logout
export const logout = (req, res, next) => {
  cleanupSession(req, res, next);
};
