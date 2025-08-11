"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const transaccion_controller_1 = require("../controllers/transaccion.controller");
const router = (0, express_1.Router)();
// Get all transacciones
router.get('/', transaccion_controller_1.getAllTransacciones);
router.get('/ingresos', transaccion_controller_1.getTransaccionesIngresos);
// Get transaccion by ID
router.get('/:id', transaccion_controller_1.getTransaccionById);
router.get('/referencias/:documento/:tipo', transaccion_controller_1.getReferenciasByDocumento);
// Get pending transactions by Vendedor's route
router.get('/pendientes/vendedor/:idVendedor', transaccion_controller_1.getTransaccionesPendientesPorVendedor);
// Get pending transactions by Cliente
router.get('/pendientes/cliente/:idCliente', transaccion_controller_1.getTransaccionesPendientesPorCliente);
// Get ingresos
router.get('/info-ingreso/:documento', transaccion_controller_1.getIngresoByDocumento);
// Dynamic search
router.get('/search', transaccion_controller_1.searchTransacciones);
// Create transaccion
router.post('/', transaccion_controller_1.createTransaccion);
router.post('/ingreso-pago', transaccion_controller_1.createIngresoAndPago);
// Update transaccion
router.put('/:id', transaccion_controller_1.updateTransaccion);
// router.delete('/:id', deleteTransaccion);
exports.default = router;
//# sourceMappingURL=transaccion.routes.js.map