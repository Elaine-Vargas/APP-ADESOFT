"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zonas_controller_1 = require("../controllers/zonas.controller");
const router = (0, express_1.Router)();
// Mostrar todas las zonas
router.get('/', zonas_controller_1.getAllZonas);
// Buscar zonas por el campo Zona (query param: q)
router.get('/search', zonas_controller_1.searchZonas);
// Buscar zonas por el campo Idzona (query param: q)
router.get('/searchIdZona', zonas_controller_1.searchZonasIdZona);
exports.default = router;
//# sourceMappingURL=zonas.routes.js.map