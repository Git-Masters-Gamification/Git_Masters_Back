// jest.config.js
export default {
  testEnvironment: "node",
 
  // Usa babel-jest para soportar módulos ES (import/export)
  transform: {
    "^.+\\.[tj]sx?$": "babel-jest"
  },
 
  transformIgnorePatterns: [],
 
  // Patrón de búsqueda de tests
  testMatch: ["**/tests/**/*.test.js"],
 
  // Alias para evitar rutas largas relativas
  moduleNameMapper: {
    "^@config/(.*)$": "<rootDir>/src/config/$1",
    "^@rules/(.*)$": "<rootDir>/src/modules/rules-points/engine/rules/$1",
    "^@modules/(.*)$": "<rootDir>/src/modules/$1",
    "^@shared/(.*)$": "<rootDir>/src/shared/$1"
  },
 
  // Extensiones reconocidas
  moduleFileExtensions: ["js", "json"],
 
  // Soporte para ESM dinámico (import/export asíncrono)
  extensionsToTreatAsEsm: [".js"],
 
  // Cobertura
  collectCoverage: true,
  coverageDirectory: "coverage",
  collectCoverageFrom: [
    "src/**/*.js",
    "!src/config/**", // Ignorar configuración de Prisma
    "!src/server.js"  // Ignorar arranque del servidor
  ],
 
  verbose: true,
 
  // Ajuste recomendado para ESM (import.meta.url)
  testEnvironmentOptions: {
    customExportConditions: ["node", "node-addons"]
  }
};