Git Masters
Backend de Gamificación Este es el backend para Git Masters, una plataforma de gamificación interna diseñada para fomentar la adopción de mejores prácticas de desarrollo dentro de la empresa. El sistema se integra directamente con los webhooks de GitHub para analizar la actividad de los repositorios en tiempo real, recompensando a los desarrolladores con puntos e insignias por seguir las convenciones y estándares establecidos.
 
Características Principales Integración con GitHub Webhooks: Procesa eventos como push, pull_request, create, release, etc., en tiempo real.
 
Motor de Reglas Complejo: Lógica de negocio detallada para asignar puntos basados en condiciones específicas (mensajes de commit, nombres de ramas, calidad de PRs).
 
Sistema de Puntos y Logros: Asigna puntos por acciones positivas y penalizaciones por prácticas riesgosas. La base para un futuro sistema de insignias está implementada.
 
Autenticación Segura: Login de usuarios a través de GitHub (OAuth 2.0) usando Passport.js.
 
Arquitectura Modular y Escalable: El código está organizado en módulos y sigue un patrón de capas (Rutas, Controlador, Servicio) para un fácil mantenimiento.
 
Base de Datos Robusta: Usa Prisma y PostgreSQL para una gestión de datos transaccional y segura.
 
Pila Tecnológica (Tech Stack) Backend: Node.js, Express.js
 
Base de Datos: PostgreSQL
 
ORM: Prisma
 
Autenticación: Passport.js (Estrategia de GitHub), JSON Web Tokens (JWT)
 
Contenerización: Docker
 
Pruebas: Jest
 
Cómo Empezar Sigue estos pasos para levantar el entorno de desarrollo local.
 
Prerrequisitos Node.js (v18 o superior)
 
npm (o tu gestor de paquetes preferido)
 
Una instancia de PostgreSQL corriendo localmente o en Docker.
 
Una cuenta de GitHub y una App de OAuth para obtener credenciales.
 
Instalación Bash
1. Clona el repositorio
git clone (https://github.com/Andrey-Ft/Git_Masters_V4_Back)
 
1. Navega a la carpeta del backend
cd backend
 
1. Instala las dependencias
npm install 2. Configuración del Entorno Crea un archivo .env en la raíz de la carpeta backend y usa el siguiente contenido como plantilla.
 
Fragmento de código
 
# --- Base de datos ---
DATABASE_URL=postgresql://postgres:GrupoASD123@localhost:5433/Git-Masters
 
# --- App ---
PORT=3000
BASE_URL=http://localhost:3000
 
# --- OAuth GitHub  ---
GITHUB_CLIENT_ID=Ov23li6Nji0oVYfFSj47
GITHUB_CLIENT_SECRET=ceef2f10e25a80b4d7176ef770957c79abf7cdb1
 
# --- Seguridad ---
JWT_SECRET=una_clave_secreta_fuerte_y_larga_para_jwt
SESSION_SECRET=otra_clave_secreta_para_sesiones
GITHUB_WEBHOOK_SECRET=clavegitmaster1347
TEST_API_KEY=sup3r_prueba_123
FRONTEND_URL=http://localhost:5173  
 
Bash
 
npx prisma migrate dev --name init
 
4. Iniciar la Aplicación Bash
 
Iniciar el servidor en modo de desarrollo (con recarga automática)
npm run dev El servidor debería estar corriendo en http://localhost:3000.
 
Pruebas (Testing) Para ejecutar la suite de pruebas automatizadas, utiliza el siguiente comando:
 
Bash
 
npm test
 
Despliegue (Deployment) La aplicación está diseñada para ser contenerizada con Docker y desplegada en servicios de hosting modernos como Vercel o Railway.
 
 
Proyectos Relacionados
Git Masters - Frontend: Repositorio del frontend, desarrollado con React y Vite (https://github.com/Andrey-Ft/Frontend_Git_Masters).
 
Licencia Este proyecto está bajo la Licencia MIT. Ver el archivo LICENSE para más detalles.