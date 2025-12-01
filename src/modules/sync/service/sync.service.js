import { PrismaClient } from "@prisma/client";
import { Octokit } from "octokit";
 
const prisma = new PrismaClient();
const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
const GITHUB_ORG = process.env.GITHUB_ORG;
 
/**
 * Función central que consulta GitHub y sincroniza Equipos y Miembros en la BD local.
 */
export const syncTeamsAndMembers = async () => {
  if (!GITHUB_ORG || !process.env.GITHUB_TOKEN) {
    console.error("Error: GITHUB_ORG o GITHUB_TOKEN no están configurados.");
    // Devolvemos el error si faltan credenciales
    throw new Error("Fallo en la sincronización: Faltan GITHUB_ORG o GITHUB_TOKEN.");
  }
 
  console.log(`Iniciando sincronización de equipos de la organización ${GITHUB_ORG}...`);
 
  try {
    // --- A. OBTENER DATOS DE GITHUB ---
    const { data: ghTeams } = await octokit.rest.teams.list({
      org: GITHUB_ORG,
      per_page: 100,
    });
   
    const ghTeamIds = new Set(ghTeams.map(team => team.id));
    const localTeams = await prisma.team.findMany({ select: { githubId: true } });
    const localGhIds = localTeams.map(team => team.githubId);
 
 
    // --- B. SINCRONIZAR MODELO TEAM (Creación, Actualización y ELIMINACIÓN) ---
 
    // B1. Eliminación: Borrar equipos que ya NO existen en GitHub
    const teamsToDelete = localGhIds.filter(id => !ghTeamIds.has(id));
    if (teamsToDelete.length > 0) {
      console.log(`Borrando ${teamsToDelete.length} equipos obsoletos de la BD...`);
      await prisma.team.deleteMany({
        where: { githubId: { in: teamsToDelete } },
      });
    }
 
    // B2. Creación/Actualización de equipos
    for (const ghTeam of ghTeams) {
      await prisma.team.upsert({
        where: { githubId: ghTeam.id },
        update: {
          name: ghTeam.name,
          slug: ghTeam.slug,
          description: ghTeam.description,
        },
        create: {
          githubId: ghTeam.id,
          name: ghTeam.name,
          slug: ghTeam.slug,
          description: ghTeam.description,
        },
      });
    }
 
 
    // ----------------------------------------------------------------------------------
    // --- C. SINCRONIZAR USUARIOS (Upsert de todos los miembros) ---
    // Se usa 'username' en el WHERE para asegurar la actualización de usuarios existentes.
    // ----------------------------------------------------------------------------------
    console.log("C. Sincronizando registros de usuarios (Upsert)...");

    const uniqueGhMembers = new Map();

    // 1. Recolectar todos los miembros únicos de todos los equipos
    for (const ghTeam of ghTeams) {
      const { data: ghMembers } = await octokit.rest.teams.listMembersInOrg({
        org: GITHUB_ORG,
        team_slug: ghTeam.slug,
        per_page: 100,
      });
      for (const m of ghMembers) {
        uniqueGhMembers.set(m.id, m);
      }
    }

    const ghUsersToSync = Array.from(uniqueGhMembers.values());

    // 2. Crear o actualizar registros de usuarios
    for (const ghUser of ghUsersToSync) {
      await prisma.user.upsert({
        // ⭐ CAMBIO CLAVE: Búsqueda por username (login) para garantizar la actualización del githubId
        where: { username: ghUser.login }, 
        update: {
          githubId: ghUser.id,        // Aseguramos que el ID se guarde
          avatarUrl: ghUser.avatar_url,
        },
        create: {
          githubId: ghUser.id,
          username: ghUser.login,
          avatarUrl: ghUser.avatar_url,
          // Proporciona valores iniciales para campos requeridos por tu esquema
          email: `${ghUser.login}@github.local`, 
          pointsBalance: 0,                     
          role: "MEMBER",                        
        },
      });
    }

    console.log(`Sincronización de ${ghUsersToSync.length} usuarios completada.`);
 
 
    // ----------------------------------------------------------------------------------
    // --- D. SINCRONIZAR MIEMBROS DE USUARIO (Asignar teamId) ---
    // CORRECCIÓN 2: Uso del githubId para la asignación
    // ----------------------------------------------------------------------------------
   
    // D1. Desasignar a TODOS los usuarios (Limpieza inicial)
    await prisma.user.updateMany({
      where: { teamId: { not: null } },
      data: { teamId: null },
    });
 
    // D2. Reasignar miembros equipo por equipo
    for (const ghTeam of ghTeams) {
      const { data: ghMembers } = await octokit.rest.teams.listMembersInOrg({
        org: GITHUB_ORG,
        team_slug: ghTeam.slug,
        per_page: 100,
      });
 
      // Obtenemos el ID único de GitHub (Int) para buscar en nuestra tabla User
      const memberGithubIds = ghMembers.map(m => m.id);

      // Agregamos debug para verificar si el usuario es listado por GitHub
      console.log(`Debug D2: Equipo ${ghTeam.slug}. IDs GitHub encontrados:`, memberGithubIds);
 
      if (memberGithubIds.length > 0) {
        const localTeam = await prisma.team.findUnique({
          where: { githubId: ghTeam.id },
          select: { id: true },
        });
       
        if (localTeam) {
             await prisma.user.updateMany({
                // ⭐ USO FINAL: Buscamos por githubId, que ahora está garantizado por el paso C
                where: { githubId: { in: memberGithubIds } }, 
                data: { teamId: localTeam.id },
});
        }
      }
    }
 
    console.log("Sincronización de equipos completada con éxito.");
    return { success: true, message: "Sincronización completada." };
 
  } catch (error) {
    const detailedErrorMessage = error.message; 
    console.error("Error grave durante la sincronización de GitHub:", detailedErrorMessage);
   
    // Lanza el mensaje de error real, incluyendo el detalle, para el controlador
    throw new Error(`Fallo en el proceso de sincronización: ${detailedErrorMessage}`);
  }
};
 
/**
 * Función expuesta para ser llamada por el controlador (manual o cron job).
 */
export const runManualSync = async () => {
    return await syncTeamsAndMembers();
}