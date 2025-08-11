"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const cliente_controller_1 = require("../controllers/cliente.controller");
const router = (0, express_1.Router)();
// Get all clientes
router.get('/', cliente_controller_1.getAllClientes);
// Dynamic search
router.get('/search', cliente_controller_1.searchClientes);
// Get cliente by ID
router.get('/:id', cliente_controller_1.getClienteById);
// Create cliente
router.post('/', cliente_controller_1.createCliente);
// Update cliente
router.put('/:id', cliente_controller_1.updateCliente);
// // Delete cliente
// router.delete('/:id', deleteCliente);
exports.default = router;
//# sourceMappingURL=cliente.routes.js.map