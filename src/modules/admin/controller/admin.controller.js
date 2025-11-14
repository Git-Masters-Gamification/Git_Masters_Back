// src/modules/admin/admin.controller.js

// Importación de las funciones del servicio
import { getUsersWithAdminStatus, assignAdminRole } from '../service/admin.service.js';

/**
 * 🧾 GET /admin/users
 * Lista todos los usuarios, con opción de búsqueda por texto y filtro por estado de administrador.
 */
export const listUsers = async (req, res) => {
  try {
    // Parámetros opcionales del query: search (texto) y filter (ADMINS/NON_ADMINS/ALL)
    const { search = '', filter = 'ALL' } = req.query;

    const users = await getUsersWithAdminStatus({ search, filter });

    return res.status(200).json({
      success: true,
      count: users.length,
      data: users,
    });
  } catch (error) {
    console.error('❌ Error al listar usuarios:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor al obtener la lista de usuarios.',
    });
  }
};

/**
 * ⚙️ POST /admin/assign
 * Asigna el rol de administrador a un usuario por su ID.
 */
export const assignAdmin = async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere el userId para asignar el rol de administrador.',
      });
    }

    const result = await assignAdminRole(userId);

    if (!result.success) {
      // Si ya es admin o hay conflicto lógico
      return res.status(409).json({
        success: false,
        message: result.message,
      });
    }

    return res.status(201).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    console.error('❌ Error al asignar rol de administrador:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor al asignar el rol de administrador.',
    });
  }
};

/**
 * 🚀 (Opcional) POST /admin/test-assign
 * Endpoint temporal para probar asignación de admin sin middleware de permisos.
 * 👉 Útil para desarrollo y pruebas con Postman.
 */
export const testAssignAdmin = async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'Debes enviar el userId del usuario que deseas promover.',
      });
    }

    const result = await assignAdminRole(userId);

    return res.status(result.success ? 200 : 409).json(result);
  } catch (error) {
    console.error('❌ Error al probar asignación de admin:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor durante la prueba de asignación.',
    });
  }
};
