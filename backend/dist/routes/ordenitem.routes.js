"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const ordenitem_controller_1 = require("../controllers/ordenitem.controller");
const router = (0, express_1.Router)();
// Get all orden items
router.get('/', ordenitem_controller_1.getAllOrdenItems);
// Get orden item by composite key
router.get('/:IdOrden/:IdProducto', ordenitem_controller_1.getOrdenItemById);
// Dynamic search
router.get('/search', ordenitem_controller_1.searchOrdenItems);
// Create orden item
router.post('/', ordenitem_controller_1.createOrdenItem);
// Update orden item
router.put('/:IdOrden/:IdProducto', ordenitem_controller_1.updateOrdenItem);
// Delete orden item
router.delete('/:IdOrden/:IdProducto', ordenitem_controller_1.deleteOrdenItem);
exports.default = router;
//# sourceMappingURL=ordenitem.routes.js.map