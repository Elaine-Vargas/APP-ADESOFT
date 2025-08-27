"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const dashboard_controller_1 = __importDefault(require("../controllers/dashboard.controller"));
const router = (0, express_1.Router)();
/**
 * @route GET /api/dashboard/seller/:sellerId
 * @description Get seller statistics including orders and income transactions
 * @query startDate (optional) - Start date in YYYY-MM-DD format (default: current date)
 * @query endDate (optional) - End date in YYYY-MM-DD format (default: current date)
 * @returns {Object} Seller statistics
 */
router.get('/vendedor/:VendedorId', dashboard_controller_1.default.getSellerStats);
exports.default = router;
//# sourceMappingURL=dashboard.routes.js.map