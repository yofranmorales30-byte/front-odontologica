const express = require('express');
const router = express.Router();
const citasController = require('../controllers/citasController');
const rolsController = require('../controllers/rolController');
const userController = require('../controllers/userController');
const pacienteController = require('../controllers/pacienteController');
const citaCompletaController = require('../controllers/citaCompletaController')
const loginController = require('../controllers/loginController');
const saludController = require('../controllers/saludController');
const { requireAuth, requireRole, ROLES } = require('../middleware/auth');
const { citasAlDia } = require('../jobs/completarCitas');

const { ADMIN, DOCTOR, ASISTENTE, PACIENTE } = ROLES;

// Niveles de acceso
const staff = [requireAuth, requireRole(ADMIN, DOCTOR, ASISTENTE)];     // ver agenda y confirmar/cancelar
const gestion = [requireAuth, requireRole(ADMIN, ASISTENTE)];           // crear y editar pacientes/turnos
const admin = [requireAuth, requireRole(ADMIN)];                        // usuarios, roles y borrados
const paciente = [requireAuth, requireRole(PACIENTE)];
const agendar = [requireAuth, requireRole(ADMIN, ASISTENTE, PACIENTE)];

// Rutas públicas
router.get('/salud', saludController.salud);
router.post('/login', loginController.login);
router.post('/registro', citaCompletaController.registrarPaciente);
router.get('/disponibilidad', citaCompletaController.getDisponibilidad);

// Sesión actual (para recuperarla al recargar la página)
router.get('/me', requireAuth, loginController.me);

// Rutas para las citas
// citasAlDia: antes de mostrar citas, pasa a COMPLETADA las que ya terminaron
router.get('/citas', staff, citasAlDia, citasController.getCitas);
router.get('/citas/:id', staff, citasAlDia, citasController.getCitaById);
router.post('/citas', agendar, citasController.createCita);
router.put('/citas/:id', gestion, citasController.updateCita);
router.delete('/citas/:id', admin, citasController.deleteCita);

//rutas para los roles
router.get('/rols', admin, rolsController.getRols);
router.get('/rols/:id', admin, rolsController.getRolById);
router.post('/rols', admin, rolsController.createRol);
router.put('/rols/:id', admin, rolsController.updateRol);
router.delete('/rols/:id', admin, rolsController.deleteRol);

//ruta para los usuarios
router.get('/users', admin, userController.getUsers);
router.get('/users/:id', admin, userController.getUserById);
router.post('/users', admin, userController.createUser);
router.put('/users/:id', admin, userController.updateUser);
router.delete('/users/:id', admin, userController.deleteUser);

//ruta para los pacientes
router.get('/pacientes', staff, pacienteController.getPacientes);
router.get('/pacientes/:id', staff, pacienteController.getPacienteById);
router.post('/pacientes', gestion, pacienteController.createPaciente);
router.put('/pacientes/:id', gestion, pacienteController.updatePaciente);
router.delete('/pacientes/:id', admin, pacienteController.deletePaciente);

// Rutas especiales
router.get('/mis-citas', paciente, citasAlDia, citaCompletaController.getMisCitas);
router.post('/citaCompleta', gestion, citaCompletaController.createCitaCompleta);
router.get('/citaCompleta', staff, citasAlDia, citaCompletaController.getCitasCompletas);
router.get('/citaVista', staff, citasAlDia, citaCompletaController.getCitasVistas);
router.get('/citaPorVer', staff, citasAlDia, citaCompletaController.getCitasPorVer);

router.put('/citaCompletaStatus/:id', staff, citaCompletaController.UpdateSatusCita);
router.put('/citaCompletaDate/:id', gestion, citaCompletaController.UpdateDateCita);
router.put('/citaCompletaDuracion/:id', gestion, citaCompletaController.UpdateDuracionCita);
router.put('/citaCompletaLogic/:id', staff, citaCompletaController.logicCita);

module.exports = router;
