"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchRutasIdRuta = exports.searchRutas = exports.getAllRutas = void 0;
const prisma_1 = __importDefault(require("../prisma"));
// Obtener todas las rutas
const getAllRutas = async (req, res) => {
    try {
        const rutas = await prisma_1.default.rutas.findMany();
        res.json(rutas);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error del servidor' });
    }
};
exports.getAllRutas = getAllRutas;
// Buscar rutas por el campo Ruta
const searchRutas = async (req, res) => {
    const { q } = req.query;
    try {
        const rutas = await prisma_1.default.rutas.findMany({
            where: q ? { Ruta: { contains: q } } : undefined,
        });
        res.json(rutas);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error del servidor' });
    }
};
exports.searchRutas = searchRutas;
// Buscar rutas por el campo IdRuta
const searchRutasIdRuta = async (req, res) => {
    const { q } = req.query;
    try {
        const rutas = await prisma_1.default.rutas.findMany({
            where: q ? { Idruta: { contains: q } } : undefined,
        });
        res.json(rutas);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error del servidor' });
    }
};
exports.searchRutasIdRuta = searchRutasIdRuta;
//# sourceMappingURL=rutas.controller.js.map