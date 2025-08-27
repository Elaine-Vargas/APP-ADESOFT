"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const producto_routes_1 = __importDefault(require("./routes/producto.routes"));
const vendedor_routes_1 = __importDefault(require("./routes/vendedor.routes"));
const cliente_routes_1 = __importDefault(require("./routes/cliente.routes"));
const orden_routes_1 = __importDefault(require("./routes/orden.routes"));
const ordenitem_routes_1 = __importDefault(require("./routes/ordenitem.routes"));
const config_routes_1 = __importDefault(require("./routes/config.routes"));
const transaccion_routes_1 = __importDefault(require("./routes/transaccion.routes"));
const referenciapago_routes_1 = __importDefault(require("./routes/referenciapago.routes"));
const rutas_routes_1 = __importDefault(require("./routes/rutas.routes"));
const zonas_routes_1 = __importDefault(require("./routes/zonas.routes"));
const factura_routes_1 = __importDefault(require("./routes/factura.routes"));
const dashboard_routes_1 = __importDefault(require("./routes/dashboard.routes"));
const cors_1 = __importDefault(require("cors"));
const app = (0, express_1.default)();
app.use(express_1.default.json());
app.use((0, cors_1.default)({ origin: process.env.FRONTEND_URL || 'http://localhost:8081' }));
app.use('/api/productos', producto_routes_1.default);
app.use('/api/vendedores', vendedor_routes_1.default);
app.use('/api/clientes', cliente_routes_1.default);
app.use('/api/ordenes', orden_routes_1.default);
app.use('/api/orden-items', ordenitem_routes_1.default);
app.use('/api/configs', config_routes_1.default);
app.use('/api/transacciones', transaccion_routes_1.default);
app.use('/api/referencias-pago', referenciapago_routes_1.default);
app.use('/api/rutas', rutas_routes_1.default);
app.use('/api/zonas', zonas_routes_1.default);
app.use('/api/facturas', factura_routes_1.default);
app.use('/api/estadisticas', dashboard_routes_1.default);
const PORT = process.env.PORT;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
});
//# sourceMappingURL=index.js.map