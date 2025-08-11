"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const factura_controller_1 = require("../controllers/factura.controller");
const router = express_1.default.Router();
// Generate PDF invoice for an order
router.get('/pdf/:id', factura_controller_1.generateFacturaPDF);
// Generate PDF invoice with improved design
router.get('/pdf-improved/:id', factura_controller_1.generateFacturaPDFImproved);
// Get invoice data without generating PDF
router.get('/data/:id', factura_controller_1.getFacturaData);
// Generate PDF for IN transaction (payment receipt)
router.get('/transaccion-in/:id', factura_controller_1.generateFacturaTransaccionIN);
exports.default = router;
//# sourceMappingURL=factura.routes.js.map