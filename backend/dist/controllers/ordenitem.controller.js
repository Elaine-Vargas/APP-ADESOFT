"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteOrdenItem = exports.updateOrdenItem = exports.createOrdenItem = exports.searchOrdenItems = exports.getOrdenItemById = exports.getAllOrdenItems = void 0;
const prisma_1 = __importDefault(require("../prisma"));
// Get all orden items
const getAllOrdenItems = async (req, res) => {
    try {
        const items = await prisma_1.default.ordenItem.findMany({ include: { producto: true, orden: true } });
        res.json(items);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
};
exports.getAllOrdenItems = getAllOrdenItems;
// Get orden item by composite key
const getOrdenItemById = async (req, res) => {
    const { IdOrden, IdProducto } = req.params;
    try {
        const item = await prisma_1.default.ordenItem.findUnique({
            where: { IdOrden_IdProducto: { IdOrden: parseInt(IdOrden), IdProducto: parseInt(IdProducto) } },
            include: { producto: true, orden: true }
        });
        if (!item) {
            return res.status(404).json({ message: 'OrdenItem no encontrado' });
        }
        res.json(item);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
};
exports.getOrdenItemById = getOrdenItemById;
// Dynamic search for orden items
const searchOrdenItems = async (req, res) => {
    try {
        const { IdOrden, IdProducto, minCantidad, maxCantidad, minPrecioV, maxPrecioV } = req.query;
        const where = {};
        if (IdOrden)
            where.IdOrden = parseInt(IdOrden);
        if (IdProducto)
            where.IdProducto = parseInt(IdProducto);
        if (minCantidad || maxCantidad) {
            where.Cantidad = {};
            if (minCantidad)
                where.Cantidad.gte = parseFloat(minCantidad);
            if (maxCantidad)
                where.Cantidad.lte = parseFloat(maxCantidad);
        }
        if (minPrecioV || maxPrecioV) {
            where.PrecioV = {};
            if (minPrecioV)
                where.PrecioV.gte = parseFloat(minPrecioV);
            if (maxPrecioV)
                where.PrecioV.lte = parseFloat(maxPrecioV);
        }
        const items = await prisma_1.default.ordenItem.findMany({ where, include: { producto: true, orden: true } });
        res.json(items);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
};
exports.searchOrdenItems = searchOrdenItems;
// Create orden item
const createOrdenItem = async (req, res) => {
    const data = req.body;
    try {
        const newItem = await prisma_1.default.ordenItem.create({ data });
        res.status(201).json(newItem);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
};
exports.createOrdenItem = createOrdenItem;
// Update orden item
const updateOrdenItem = async (req, res) => {
    const { IdOrden, IdProducto } = req.params;
    const data = req.body;
    try {
        const updated = await prisma_1.default.ordenItem.update({
            where: { IdOrden_IdProducto: { IdOrden: parseInt(IdOrden), IdProducto: parseInt(IdProducto) } },
            data,
        });
        res.json(updated);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
};
exports.updateOrdenItem = updateOrdenItem;
// Delete orden item
const deleteOrdenItem = async (req, res) => {
    const { IdOrden, IdProducto } = req.params;
    try {
        await prisma_1.default.ordenItem.delete({
            where: { IdOrden_IdProducto: { IdOrden: parseInt(IdOrden), IdProducto: parseInt(IdProducto) } },
        });
        res.json({ message: 'OrdenItem eliminado' });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
};
exports.deleteOrdenItem = deleteOrdenItem;
//# sourceMappingURL=ordenitem.controller.js.map