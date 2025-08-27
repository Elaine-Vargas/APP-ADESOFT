"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const dashboard_controller_1 = require("../controllers/dashboard.controller");
const router = (0, express_1.Router)();
router.get('/vendedor/:VendedorId', dashboard_controller_1.getSellerStats);
exports.default = router;
//# sourceMappingURL=dashboard.routes.js.map