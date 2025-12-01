// RUTA: src/modules/rules-points/service/scoring.calculator.js

import { getRuleValue } from '../../../shared/service/config.service.js';

// --- Definiciones de Patrones Mejoradas ---
const PATTERNS = {
  // Frontend: Archivos de UI, estilos, componentes, o carpetas típicas de front
  FRONTEND: /\.(jsx|tsx|css|scss|sass|less|html|vue|svelte|svg)$|\/client\/|\/frontend\/|\/ui\/|\/components\/|\/views\/|\/pages\/|\/assets\/|\/public\/|\/styles\//i,
  
  // Backend: Lógica de negocio, APIs, Base de datos, Configuración del server
  // Agregamos 'server.js', 'app.js', y carpetas como 'modules', 'config', 'prisma'
  BACKEND: /\.(controller|service|routes|repository|entity|dto|model|schema|job|worker)\.(js|ts)$|^(server|app|main|index)\.(js|ts)$|\.(java|py|go|rb|php|sql)$|\/server\/|\/backend\/|\/api\/|\/prisma\/|\/config\/|\/jobs\/|\/workers\/|\/modules\/|\/controllers\/|\/services\//i,
  
  // Configuración Crítica: Archivos que afectan todo el sistema
  CONFIG: /(package\.json|package-lock\.json|schema\.prisma|dockerfile|docker-compose\.yml|\.env|tsconfig\.json|vite\.config\.js)/i,
  
  // Documentación
  DOCS: /\.(md|txt|doc|docx|pdf)$/i
};

/**
 * Determina el Factor de Módulo (Fm).
 */
async function getModuleFactor(files) {
  let hasFrontend = false;
  let hasBackend = false;

  // Analizamos cada archivo modificado
  for (const file of files) {
    if (PATTERNS.FRONTEND.test(file)) {
        hasFrontend = true;
        // console.log(`[Scoring] Archivo FRONTEND detectado: ${file}`);
    }
    if (PATTERNS.BACKEND.test(file)) {
        hasBackend = true;
        // console.log(`[Scoring] Archivo BACKEND detectado: ${file}`);
    }
  }

  // Debug: Ver qué detectó el sistema
  console.log(`[Scoring] Análisis de Archivos: Total=${files.length} | Front=${hasFrontend} | Back=${hasBackend}`);

  // Prioridad 1: Mixto (Si tocó ambos mundos)
  if (hasFrontend && hasBackend) {
    const value = await getRuleValue('FACTOR_MODULE_MIXED', 1.4);
    console.log(`[Scoring] -> Aplicando Factor MIXTO: ${value}x`);
    return { value, label: 'Mixto' };
  }
  
  // Prioridad 2: Backend Puro
  if (hasBackend) {
    const value = await getRuleValue('FACTOR_MODULE_BACKEND', 1.6);
    console.log(`[Scoring] -> Aplicando Factor BACKEND: ${value}x`);
    return { value, label: 'Backend' };
  }
  
  // Prioridad 3: Frontend Puro
  if (hasFrontend) {
    const value = await getRuleValue('FACTOR_MODULE_FRONTEND', 1.3);
    console.log(`[Scoring] -> Aplicando Factor FRONTEND: ${value}x`);
    return { value, label: 'Frontend' };
  }
  
  // Default: General (Si no cayó en ninguna categoría anterior, ej: un readme.md suelto o archivo desconocido)
  console.log(`[Scoring] -> No se detectó patrón específico. Aplicando Factor GENERAL: 1.0x`);
  return { value: 1.0, label: 'General' };
}

/**
 * Determina el Factor de Impacto (Fi).
 */
async function getImpactFactor(stats, files) {
  const totalChanges = (stats.additions || 0) + (stats.deletions || 0);
  const touchesCriticalConfig = files.some(f => PATTERNS.CONFIG.test(f));
  
  // 1. Impacto Alto: Toca configuración crítica o muchos cambios
  if (touchesCriticalConfig || totalChanges > 300) {
    const value = await getRuleValue('FACTOR_IMPACT_HIGH', 1.6);
    console.log(`[Scoring] -> Impacto ALTO (${value}x) - Cambios: ${totalChanges}, Config: ${touchesCriticalConfig}`);
    return { value, label: 'Alto' };
  }

  // 2. Impacto Medio: Cambios moderados
  if (totalChanges > 20) {
    const value = await getRuleValue('FACTOR_IMPACT_MEDIUM', 1.3);
    console.log(`[Scoring] -> Impacto MEDIO (${value}x) - Cambios: ${totalChanges}`);
    return { value, label: 'Medio' };
  }

  // 3. Impacto Bajo (Documentación): Solo tocó docs
  const touchesOnlyDocs = files.length > 0 && files.every(f => PATTERNS.DOCS.test(f));
  if (touchesOnlyDocs) {
    const value = await getRuleValue('FACTOR_IMPACT_LOW', 1.0);
    console.log(`[Scoring] -> Impacto BAJO (Docs) (${value}x)`);
    return { value, label: 'Bajo (Docs)' };
  }
  
  // 4. Impacto Bajo (Default): Pocos cambios
  const value = await getRuleValue('FACTOR_IMPACT_LOW', 1.0);
  console.log(`[Scoring] -> Impacto BAJO (${value}x) - Cambios: ${totalChanges}`);
  return { value, label: 'Bajo' };
}


export const calculateWeightedScore = async (baseRuleKey, files = [], stats = {}, defaultBase = 10) => {
  try {
    // Obtenemos el valor base actualizado desde la BD
    const basePoints = await getRuleValue(baseRuleKey, defaultBase);
    
    const moduleFactor = await getModuleFactor(files);
    const impactFactor = await getImpactFactor(stats, files);

    // Fórmula Maestra
    const totalPoints = Math.round(basePoints * moduleFactor.value * impactFactor.value);
    
    // Log detallado para depuración
    console.log(`[Scoring] CÁLCULO: ${basePoints} (Base) * ${moduleFactor.value} (${moduleFactor.label}) * ${impactFactor.value} (${impactFactor.label}) = ${totalPoints}`);

    const note = `+${totalPoints} pts (Base: ${basePoints} x ${moduleFactor.label} ${moduleFactor.value}x x Impacto ${impactFactor.label} ${impactFactor.value}x)`;

    return { points: totalPoints, notes: note };
  } catch (error) {
    console.error(`[ScoringCalculator] Error al calcular puntaje para ${baseRuleKey}:`, error);
    return { points: 0, notes: "Error al calcular puntaje ponderado." };
  }
};