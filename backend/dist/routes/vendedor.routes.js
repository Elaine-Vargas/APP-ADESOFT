"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const vendedor_controller_1 = require("../controllers/vendedor.controller");
const router = (0, express_1.Router)();
// Get all vendedores
router.get('/', vendedor_controller_1.getAllVendedores);
// Get vendedor by ID
router.get('/:id', vendedor_controller_1.getVendedorById);
// Login vendedor
router.post('/login', vendedor_controller_1.loginVendedor);
// Create vendedor
// router.post('/', createVendedor);
// Update vendedor
router.put('/:id', vendedor_controller_1.updateVendedor);
// Delete vendedor
// router.delete('/:id', deleteVendedor);
exports.default = router;
//# sourceMappingURL=vendedor.routes.js.map