"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const producto_controller_1 = require("../controllers/producto.controller");
const router = (0, express_1.Router)();
// Get all products
router.get('/', producto_controller_1.getAllProductos);
// Dynamic search
router.get('/search', producto_controller_1.searchProductos);
// Get product by ID
router.get('/:id', producto_controller_1.getProductoById);
// router.post('/', createProducto);
router.put('/:id', producto_controller_1.updateProducto);
// router.delete('/:id', deleteProducto);
exports.default = router;
//# sourceMappingURL=producto.routes.js.map