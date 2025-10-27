import fs from 'fs';
import path from 'path';

class FileEventStore {
  constructor(filePath = path.join(process.cwd(), '.data', 'events.json')) {
    this.filePath = filePath;
    this.events = this._load();
  }

  _load() {
    try {
      const fileContent = fs.readFileSync(this.filePath, 'utf-8');
      return JSON.parse(fileContent);
    } catch (error) {
      if (error.code === 'ENOENT') {
        return [];
      }
      console.error('❌ Error al cargar el archivo de eventos:', error);
      return [];
    }
  }

  _save() {
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(this.filePath, JSON.stringify(this.events, null, 2));
  }

  add(event) {
    this.events.push(event);
    this._save();
    return event;
  }

  findById(id) {
    return this.events.find(event => event.id === id);
  }

  /**
   * Busca eventos con filtros, paginación y orden.
   * @param {object} criteria - Filtros de búsqueda (type, user, repo, etc.)
   * @param {object} pagination - Parámetros de paginación { page, limit, sort }
   * @returns {object} { total, page, limit, items }
   */
  search(criteria = {}, pagination = {}) {
    let results = [...this.events];

    // Filtros básicos
    if (criteria.type) {
      results = results.filter(event => event.event_type === criteria.type);
    }
    if (criteria.user) {
      results = results.filter(event => event.sender_login === criteria.user);
    }
    if (criteria.repo) {
      results = results.filter(event => event.repo_full_name === criteria.repo);
    }

    // Ordenamiento (por defecto: fecha descendente)
    const sortField = pagination.sortField || 'received_at';
    const sortOrder = pagination.sortOrder === 'asc' ? 1 : -1;
    results.sort((a, b) => {
      const dateA = new Date(a[sortField] || 0);
      const dateB = new Date(b[sortField] || 0);
      return sortOrder * (dateB - dateA);
    });

    // Paginación
    const page = parseInt(pagination.page) || 1;
    const limit = parseInt(pagination.limit) || 20;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;

    const paginatedItems = results.slice(startIndex, endIndex);

    return {
      total: results.length,
      page,
      limit,
      items: paginatedItems
    };
  }
}

// Exportar una sola instancia (singleton)
export default new FileEventStore();