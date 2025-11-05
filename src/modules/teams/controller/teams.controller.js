import * as teamService from '../service/teams.service.js';
 
export const listTeams = async (req, res) => {
  try {
    const teams = await teamService.getAllTeams();
    res.status(200).json(teams);
  } catch (error) {
    res.status(500).json({ message: "Error al listar equipos.", error: error.message });
  }
};
 
export const getTeamDetails = async (req, res) => {
  // ⭐ CAMBIO 1: Renombramos la variable para claridad y ahora representa el ID
  const { id: teamId } = req.params;
 
  try {
    // ⭐ CAMBIO 2: Llama a la nueva función getTeamById, que busca por el campo 'id' de Prisma
    const team = await teamService.getTeamById(teamId);
   
    if (!team) {
      return res.status(404).json({ message: "Equipo no encontrado." });
    }
    res.status(200).json(team);
  } catch (error) {
    res.status(500).json({ message: "Error al obtener detalles del equipo.", error: error.message });
  }
};
 
// Se eliminan createNewTeam, joinTeamById, y leaveCurrentTeam.