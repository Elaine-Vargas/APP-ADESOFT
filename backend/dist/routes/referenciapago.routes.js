"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const referenciapago_controller_1 = require("../controllers/referenciapago.controller");
const router = (0, express_1.Router)();
// Get all referencias de pago
router.get('/', referenciapago_controller_1.getAllReferenciaPagos);
// Get referencia de pago by ID
router.get('/:id', referenciapago_controller_1.getReferenciaPagoById);
// Dynamic search
router.get('/search', referenciapago_controller_1.searchReferenciaPagos);
// Create referencia de pago
router.post('/', referenciapago_controller_1.createReferenciaPago);
// Update referencia de pago
router.put('/:id', referenciapago_controller_1.updateReferenciaPago);
// router.delete('/:id', deleteReferenciaPago);
exports.default = router;
//# sourceMappingURL=referenciapago.routes.js.map