"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchZonasIdZona = exports.searchZonas = exports.getAllZonas = void 0;
const prisma_1 = __importDefault(require("../prisma"));
// Obtener todas las zonas
const getAllZonas = async (req, res) => {
    try {
        const zonas = await prisma_1.default.zonas.findMany();
        res.json(zonas);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error del servidor' });
    }
};
exports.getAllZonas = getAllZonas;
// Buscar zonas por el campo Zona
const searchZonas = async (req, res) => {
    const { q } = req.query;
    try {
        const zonas = await prisma_1.default.zonas.findMany({
            where: q ? { Zona: { contains: q } } : undefined,
        });
        res.json(zonas);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error del servidor' });
    }
};
exports.searchZonas = searchZonas;
// Buscar zonas por el campo Idzona
const searchZonasIdZona = async (req, res) => {
    const { q } = req.query;
    try {
        const zonas = await prisma_1.default.zonas.findMany({
            where: q ? { Idzona: { contains: q } } : undefined,
        });
        res.json(zonas);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error del servidor' });
    }
};
exports.searchZonasIdZona = searchZonasIdZona;
//# sourceMappingURL=zonas.controller.js.map