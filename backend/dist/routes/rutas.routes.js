"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const rutas_controller_1 = require("../controllers/rutas.controller");
const router = (0, express_1.Router)();
// Mostrar todas las rutas
router.get('/', rutas_controller_1.getAllRutas);
// Buscar rutas por el campo Ruta (query param: q)
router.get('/search', rutas_controller_1.searchRutas);
// Buscar rutas por el campo IdRuta (query param: q)
router.get('/searchIdRuta', rutas_controller_1.searchRutasIdRuta);
exports.default = router;
//# sourceMappingURL=rutas.routes.js.map