"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const orden_controller_1 = require("../controllers/orden.controller");
const router = (0, express_1.Router)();
// Get all ordenes
router.get('/', orden_controller_1.getAllOrdenes);
// Get orden by ID
router.get('/:id', orden_controller_1.getOrdenById);
// Dynamic search
router.get('/search', orden_controller_1.searchOrdenes);
// Create orden
router.post('/', orden_controller_1.createOrden);
// Create orden with items
router.post('/with-items', orden_controller_1.createOrdenWithItems);
// Update orden with items
router.put('/:id/with-items', orden_controller_1.updateOrdenWithItems);
// Update orden
router.put('/:id', orden_controller_1.updateOrden);
// router.delete('/:id', deleteOrden);
exports.default = router;
//# sourceMappingURL=orden.routes.js.map