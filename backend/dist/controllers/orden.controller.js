"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateOrdenWithItems = exports.updateOrden = exports.createOrdenWithItems = exports.createOrden = exports.searchOrdenes = exports.getOrdenById = exports.getAllOrdenes = void 0;
const prisma_1 = __importDefault(require("../prisma"));
// Get all ordenes with optional filtering
const getAllOrdenes = async (req, res) => {
    try {
        const { IdVendedor, Estado } = req.query;
        const where = {};
        if (IdVendedor)
            where.IdVendedor = IdVendedor;
        if (Estado)
            where.Estado = Estado;
        const ordenes = await prisma_1.default.orden.findMany({
            where,
            include: {
                items: {
                    include: { producto: true }
                },
                Cliente: true,
                Vendedor: true
            },
            orderBy: {
                FechaCreacion: 'desc'
            }
        });
        res.json(ordenes);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
};
exports.getAllOrdenes = getAllOrdenes;
// Get orden by Id
const getOrdenById = async (req, res) => {
    const { id } = req.params;
    try {
        const orden = await prisma_1.default.orden.findUnique({
            where: { IdOrden: parseInt(id) },
            include: {
                items: {
                    include: { producto: true }
                },
                Cliente: true,
                Vendedor: true
            }
        });
        if (!orden) {
            return res.status(404).json({ message: 'Orden no encontrada' });
        }
        res.json(orden);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
};
exports.getOrdenById = getOrdenById;
// Dynamic search for ordenes
const searchOrdenes = async (req, res) => {
    try {
        const { Documento, IdCliente, IdVendedor, Estado, minTotal, maxTotal, Fecha } = req.query;
        const where = {};
        if (Documento)
            where.Documento = { contains: Documento };
        if (IdCliente)
            where.IdCliente = IdCliente;
        if (IdVendedor)
            where.IdVendedor = IdVendedor;
        if (Estado)
            where.Estado = Estado;
        if (Fecha)
            where.Fecha = new Date(Fecha);
        if (minTotal || maxTotal) {
            where.Total = {};
            if (minTotal)
                where.Total.gte = parseFloat(minTotal);
            if (maxTotal)
                where.Total.lte = parseFloat(maxTotal);
        }
        const ordenes = await prisma_1.default.orden.findMany({
            where,
            include: {
                items: {
                    include: { producto: true }
                },
                Cliente: true,
                Vendedor: true
            }
        });
        res.json(ordenes);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
};
exports.searchOrdenes = searchOrdenes;
// Create orden
const createOrden = async (req, res) => {
    const data = req.body;
    try {
        const newOrden = await prisma_1.default.orden.create({ data });
        res.status(201).json(newOrden);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
};
exports.createOrden = createOrden;
// Create orden with items in transaction
const createOrdenWithItems = async (req, res) => {
    const { ordenData, items } = req.body;
    try {
        const result = await prisma_1.default.$transaction(async (tx) => {
            // Create the order
            const now = new Date(); // Usar la misma fecha actual para ambos campos
            const newOrden = await tx.orden.create({
                data: {
                    ...ordenData,
                    Fecha: now, // Usar fecha actual del sistema
                    FechaCreacion: now, // Usar fecha actual del sistema
                }
            });
            // Create all order items
            const orderItems = await Promise.all(items.map((item) => tx.ordenItem.create({
                data: {
                    IdOrden: newOrden.IdOrden,
                    IdProducto: item.IdProducto,
                    Cantidad: item.Cantidad,
                    PrecioV: item.PrecioV,
                    Impuesto: item.Impuesto || 0,
                }
            })));
            // Fetch the complete order with relations
            const completeOrden = await tx.orden.findUnique({
                where: { IdOrden: newOrden.IdOrden },
                include: {
                    items: {
                        include: { producto: true }
                    },
                    Cliente: true,
                    Vendedor: true
                }
            });
            return {
                orden: completeOrden,
                items: orderItems
            };
        });
        res.status(201).json(result);
    }
    catch (error) {
        console.error('Error creating order with items:', error);
        res.status(500).json({ error: 'Server error', details: error });
    }
};
exports.createOrdenWithItems = createOrdenWithItems;
// Update orden
const updateOrden = async (req, res) => {
    const { id } = req.params;
    const data = req.body;
    try {
        const updated = await prisma_1.default.orden.update({
            where: { IdOrden: parseInt(id) },
            data,
        });
        res.json(updated);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
};
exports.updateOrden = updateOrden;
// Update orden and its items in a transaction
const updateOrdenWithItems = async (req, res) => {
    const { id } = req.params;
    const { ordenData, items } = req.body;
    try {
        const result = await prisma_1.default.$transaction(async (tx) => {
            // Update the main order
            const updatedOrden = await tx.orden.update({
                where: { IdOrden: parseInt(id) },
                data: ordenData,
            });
            // Get existing items for this order
            const existingItems = await tx.ordenItem.findMany({
                where: { IdOrden: parseInt(id) },
            });
            const existingIds = existingItems.map((i) => i.IdProducto);
            const newIds = items.map((i) => i.IdProducto);
            // Delete items that are no longer present
            const toDelete = existingItems.filter((i) => !newIds.includes(i.IdProducto));
            for (const item of toDelete) {
                await tx.ordenItem.delete({
                    where: { IdOrden_IdProducto: { IdOrden: parseInt(id), IdProducto: item.IdProducto } },
                });
            }
            // Upsert new and existing items
            for (const item of items) {
                if (existingIds.includes(item.IdProducto)) {
                    // Update existing item
                    await tx.ordenItem.update({
                        where: { IdOrden_IdProducto: { IdOrden: parseInt(id), IdProducto: item.IdProducto } },
                        data: {
                            Cantidad: item.Cantidad,
                            PrecioV: item.PrecioV,
                            Impuesto: item.Impuesto || 0,
                        },
                    });
                }
                else {
                    // Create new item
                    await tx.ordenItem.create({
                        data: {
                            IdOrden: parseInt(id),
                            IdProducto: item.IdProducto,
                            Cantidad: item.Cantidad,
                            PrecioV: item.PrecioV,
                            Impuesto: item.Impuesto || 0,
                        },
                    });
                }
            }
            // Fetch the complete updated order with relations
            const completeOrden = await tx.orden.findUnique({
                where: { IdOrden: parseInt(id) },
                include: {
                    items: { include: { producto: true } },
                    Cliente: true,
                    Vendedor: true,
                },
            });
            if (!completeOrden) {
                throw new Error('No se encontró la orden actualizada');
            }
            // Validación extra: asegurar que hay items
            if (!completeOrden.items || completeOrden.items.length === 0) {
                console.warn('La orden no tiene items después de la actualización');
            }
            return completeOrden;
        });
        res.json(result);
    }
    catch (error) {
        console.error('Error updating order with items:', error);
        res.status(500).json({ error: 'Server error', details: error });
    }
};
exports.updateOrdenWithItems = updateOrdenWithItems;
// Delete orden
// export const deleteOrden = async (req: Request, res: Response) => {
//   const { id } = req.params;
//   try {
//     await prisma.orden.delete({
//       where: { IdOrden: parseInt(id) },
//     });
//     res.json({ message: 'Orden eliminada' });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ error: 'Server error' });
//   }
// };
//# sourceMappingURL=orden.controller.js.map