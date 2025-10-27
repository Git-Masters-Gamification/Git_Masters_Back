import * as eventsService from '../service/events.service.js';

/**
 * Controlador para listar eventos con filtros, orden y paginación.
 * GET /events
 */
export const listEvents = async (req, res) => {
  try {
    // --- Filtros ---
    const filters = {
      user: req.query.user || null,
      repo: req.query.repo || null,
      type: req.query.type || null,
      action: req.query.action || null,
      since: req.query.since || null,
      until: req.query.until || null,
      processed: req.query.processed || null,
    };

    // --- Paginación y orden ---
    const pagination = {
      page: req.query.page ? parseInt(req.query.page, 10) : 1,
      limit: req.query.limit ? parseInt(req.query.limit, 10) : 20,
      sortField: req.query.sort?.split(':')[0] || 'received_at',
      sortOrder: req.query.sort?.split(':')[1] || 'desc',
    };

    // --- Servicio principal ---
    const result = await eventsService.searchEvents(filters, pagination);

    // --- Respuesta estructurada ---
    return res.status(200).json({
      success: true,
      message: 'Eventos obtenidos correctamente',
      ...result,
    });
  } catch (err) {
    console.error('❌ Error al listar eventos:', err);
    return res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
    });
  }
};

/**
 * Controlador para obtener un evento específico por ID.
 * GET /events/:id
 */
export const getEventById = async (req, res) => {
  try {
    const id = req.params.id;
    if (!id) {
      return res.status(400).json({ success: false, error: 'ID requerido' });
    }

    const includePayload = (req.query.include || '')
      .split(',')
      .includes('payload');

    const event = await eventsService.getEventById(id, includePayload);

    if (!event) {
      return res.status(404).json({
        success: false,
        error: `No se encontró un evento con id ${id}`,
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Evento obtenido correctamente',
      event,
    });
  } catch (err) {
    console.error('❌ Error al obtener evento:', err);
    return res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
    });
  }
};