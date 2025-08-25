"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllOrdenItemsRaw = exports.cleanOrphanedOrdenItems = exports.getOrphanedOrdenItems = exports.deleteOrdenItem = exports.updateOrdenItem = exports.createOrdenItem = exports.searchOrdenItems = exports.getOrdenItemById = exports.getAllOrdenItems = void 0;
const prisma_1 = __importDefault(require("../prisma"));
// Get all orden items
const getAllOrdenItems = async (req, res) => {
    try {
        try {
            const items = await prisma_1.default.ordenItem.findMany({
                include: {
                    Producto: {
                        select: {
                            IdProducto: true,
                            CodigoP: true,
                            NombreP: true,
                            PrecioP: true,
                            ImpuestoP: true,
                            ExistenciaP: true,
                            GrupoP: true
                        }
                    },
                    orden: {
                        include: {
                            Cliente: true,
                            Vendedor: true
                        }
                    }
                }
            });
            // Filtrar items que tengan producto válido
            const validItems = items.filter(item => item.Producto !== null);
            res.json(validItems);
        }
        catch (prismaError) {
            if (prismaError.message?.includes('Field Producto is required to return data')) {
                console.warn('Detected orphaned order items, using alternative query method');
                // Obtener IDs de productos válidos
                const validProductIds = await prisma_1.default.producto.findMany({
                    select: { IdProducto: true }
                }).then(products => products.map(p => p.IdProducto));
                // Consulta alternativa solo con items válidos
                const items = await prisma_1.default.ordenItem.findMany({
                    where: {
                        IdProducto: { in: validProductIds }
                    },
                    include: {
                        Producto: {
                            select: {
                                IdProducto: true,
                                CodigoP: true,
                                NombreP: true,
                                PrecioP: true,
                                ImpuestoP: true,
                                ExistenciaP: true,
                                GrupoP: true
                            }
                        },
                        orden: {
                            include: {
                                Cliente: true,
                                Vendedor: true
                            }
                        }
                    }
                });
                res.json(items);
            }
            else {
                throw prismaError;
            }
        }
    }
    catch (error) {
        console.error('Error in getAllOrdenItems:', error);
        res.status(500).json({ error: 'Server error', details: error });
    }
};
exports.getAllOrdenItems = getAllOrdenItems;
// Get orden item by composite key
const getOrdenItemById = async (req, res) => {
    const { IdOrden, IdProducto } = req.params;
    try {
        try {
            const item = await prisma_1.default.ordenItem.findUnique({
                where: { IdOrden_IdProducto: { IdOrden: parseInt(IdOrden), IdProducto: parseInt(IdProducto) } },
                include: {
                    Producto: {
                        select: {
                            IdProducto: true,
                            CodigoP: true,
                            NombreP: true,
                            PrecioP: true,
                            ImpuestoP: true,
                            ExistenciaP: true,
                            GrupoP: true
                        }
                    },
                    orden: {
                        include: {
                            Cliente: true,
                            Vendedor: true
                        }
                    }
                }
            });
            if (!item) {
                return res.status(404).json({ message: 'OrdenItem no encontrado' });
            }
            // Verificar si el producto existe
            if (item.Producto === null) {
                return res.status(404).json({
                    message: 'OrdenItem encontrado pero el producto asociado no existe',
                    item: {
                        IdOrden: item.IdOrden,
                        IdProducto: item.IdProducto,
                        Cantidad: item.Cantidad,
                        PrecioV: item.PrecioV,
                        Impuesto: item.Impuesto,
                        orden: item.orden,
                        Producto: null
                    }
                });
            }
            res.json(item);
        }
        catch (prismaError) {
            if (prismaError.message?.includes('Field Producto is required to return data')) {
                // Verificar si el producto existe
                const productExists = await prisma_1.default.producto.findUnique({
                    where: { IdProducto: parseInt(IdProducto) }
                });
                if (!productExists) {
                    return res.status(404).json({
                        message: 'OrdenItem encontrado pero el producto asociado no existe'
                    });
                }
                // Si el producto existe, intentar la consulta de nuevo
                const item = await prisma_1.default.ordenItem.findUnique({
                    where: { IdOrden_IdProducto: { IdOrden: parseInt(IdOrden), IdProducto: parseInt(IdProducto) } },
                    include: {
                        Producto: {
                            select: {
                                IdProducto: true,
                                CodigoP: true,
                                NombreP: true,
                                PrecioP: true,
                                ImpuestoP: true,
                                ExistenciaP: true,
                                GrupoP: true
                            }
                        },
                        orden: {
                            include: {
                                Cliente: true,
                                Vendedor: true
                            }
                        }
                    }
                });
                if (!item) {
                    return res.status(404).json({ message: 'OrdenItem no encontrado' });
                }
                res.json(item);
            }
            else {
                throw prismaError;
            }
        }
    }
    catch (error) {
        console.error('Error in getOrdenItemById:', error);
        res.status(500).json({ error: 'Server error', details: error });
    }
};
exports.getOrdenItemById = getOrdenItemById;
// Dynamic search for orden items - CORREGIDO
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
        try {
            const items = await prisma_1.default.ordenItem.findMany({
                where,
                include: {
                    Producto: {
                        select: {
                            IdProducto: true,
                            CodigoP: true,
                            NombreP: true,
                            PrecioP: true,
                            ImpuestoP: true,
                            ExistenciaP: true,
                            GrupoP: true
                        }
                    },
                    orden: {
                        include: {
                            Cliente: true,
                            Vendedor: true
                        }
                    }
                }
            });
            // Filtrar items válidos
            const validItems = items.filter(item => item.Producto !== null);
            res.json(validItems);
        }
        catch (prismaError) {
            if (prismaError.message?.includes('Field Producto is required to return data')) {
                console.warn('Detected orphaned order items in search, using alternative query method');
                // Obtener IDs de productos válidos
                const validProductIds = await prisma_1.default.producto.findMany({
                    select: { IdProducto: true }
                }).then(products => products.map(p => p.IdProducto));
                // CORRECCIÓN: Crear el where correctamente
                const validWhere = { ...where };
                // Si hay un filtro específico por IdProducto, verificar que esté en la lista válida
                if (where.IdProducto) {
                    // Solo buscar si el producto específico está en la lista válida
                    if (validProductIds.includes(where.IdProducto)) {
                        validWhere.IdProducto = where.IdProducto;
                    }
                    else {
                        // Si el producto específico no es válido, no hay resultados
                        return res.json([]);
                    }
                }
                else {
                    // Si no hay filtro específico, buscar solo en productos válidos
                    validWhere.IdProducto = { in: validProductIds };
                }
                const items = await prisma_1.default.ordenItem.findMany({
                    where: validWhere,
                    include: {
                        Producto: {
                            select: {
                                IdProducto: true,
                                CodigoP: true,
                                NombreP: true,
                                PrecioP: true,
                                ImpuestoP: true,
                                ExistenciaP: true,
                                GrupoP: true
                            }
                        },
                        orden: {
                            include: {
                                Cliente: true,
                                Vendedor: true
                            }
                        }
                    }
                });
                res.json(items);
            }
            else {
                throw prismaError;
            }
        }
    }
    catch (error) {
        console.error('Error in searchOrdenItems:', error);
        res.status(500).json({ error: 'Server error', details: error });
    }
};
exports.searchOrdenItems = searchOrdenItems;
// Create orden item
const createOrdenItem = async (req, res) => {
    const data = req.body;
    try {
        // Validar que el producto existe antes de crear el item
        if (data.IdProducto) {
            const productExists = await prisma_1.default.producto.findUnique({
                where: { IdProducto: data.IdProducto }
            });
            if (!productExists) {
                return res.status(400).json({
                    error: 'Producto no encontrado',
                    IdProducto: data.IdProducto
                });
            }
        }
        // Validar que la orden existe
        if (data.IdOrden) {
            const ordenExists = await prisma_1.default.orden.findUnique({
                where: { IdOrden: data.IdOrden }
            });
            if (!ordenExists) {
                return res.status(400).json({
                    error: 'Orden no encontrada',
                    IdOrden: data.IdOrden
                });
            }
        }
        const newItem = await prisma_1.default.ordenItem.create({ data });
        // Obtener el item creado con sus relaciones
        const itemWithRelations = await prisma_1.default.ordenItem.findUnique({
            where: {
                IdOrden_IdProducto: {
                    IdOrden: newItem.IdOrden,
                    IdProducto: newItem.IdProducto
                }
            },
            include: {
                Producto: {
                    select: {
                        IdProducto: true,
                        CodigoP: true,
                        NombreP: true,
                        PrecioP: true,
                        ImpuestoP: true,
                        ExistenciaP: true,
                        GrupoP: true
                    }
                },
                orden: {
                    include: {
                        Cliente: true,
                        Vendedor: true
                    }
                }
            }
        });
        res.status(201).json(itemWithRelations);
    }
    catch (error) {
        console.error('Error in createOrdenItem:', error);
        res.status(500).json({ error: 'Server error', details: error });
    }
};
exports.createOrdenItem = createOrdenItem;
// Update orden item
const updateOrdenItem = async (req, res) => {
    const { IdOrden, IdProducto } = req.params;
    const data = req.body;
    try {
        // Validar que el item existe
        const existingItem = await prisma_1.default.ordenItem.findUnique({
            where: { IdOrden_IdProducto: { IdOrden: parseInt(IdOrden), IdProducto: parseInt(IdProducto) } }
        });
        if (!existingItem) {
            return res.status(404).json({ message: 'OrdenItem no encontrado' });
        }
        // Si se está actualizando el IdProducto, validar que el nuevo producto existe
        if (data.IdProducto && data.IdProducto !== parseInt(IdProducto)) {
            const productExists = await prisma_1.default.producto.findUnique({
                where: { IdProducto: data.IdProducto }
            });
            if (!productExists) {
                return res.status(400).json({
                    error: 'Producto no encontrado',
                    IdProducto: data.IdProducto
                });
            }
        }
        const updated = await prisma_1.default.ordenItem.update({
            where: { IdOrden_IdProducto: { IdOrden: parseInt(IdOrden), IdProducto: parseInt(IdProducto) } },
            data,
        });
        // Obtener el item actualizado con sus relaciones
        try {
            const updatedWithRelations = await prisma_1.default.ordenItem.findUnique({
                where: {
                    IdOrden_IdProducto: {
                        IdOrden: updated.IdOrden,
                        IdProducto: updated.IdProducto
                    }
                },
                include: {
                    Producto: {
                        select: {
                            IdProducto: true,
                            CodigoP: true,
                            NombreP: true,
                            PrecioP: true,
                            ImpuestoP: true,
                            ExistenciaP: true,
                            GrupoP: true
                        }
                    },
                    orden: {
                        include: {
                            Cliente: true,
                            Vendedor: true
                        }
                    }
                }
            });
            res.json(updatedWithRelations);
        }
        catch (prismaError) {
            if (prismaError.message?.includes('Field Producto is required to return data')) {
                // Si hay error con el producto, devolver solo el item actualizado
                res.json(updated);
            }
            else {
                throw prismaError;
            }
        }
    }
    catch (error) {
        console.error('Error in updateOrdenItem:', error);
        res.status(500).json({ error: 'Server error', details: error });
    }
};
exports.updateOrdenItem = updateOrdenItem;
// Delete orden item
const deleteOrdenItem = async (req, res) => {
    const { IdOrden, IdProducto } = req.params;
    try {
        // Verificar que el item existe antes de eliminarlo
        const existingItem = await prisma_1.default.ordenItem.findUnique({
            where: { IdOrden_IdProducto: { IdOrden: parseInt(IdOrden), IdProducto: parseInt(IdProducto) } }
        });
        if (!existingItem) {
            return res.status(404).json({ message: 'OrdenItem no encontrado' });
        }
        await prisma_1.default.ordenItem.delete({
            where: { IdOrden_IdProducto: { IdOrden: parseInt(IdOrden), IdProducto: parseInt(IdProducto) } },
        });
        res.json({
            message: 'OrdenItem eliminado',
            deletedItem: {
                IdOrden: parseInt(IdOrden),
                IdProducto: parseInt(IdProducto)
            }
        });
    }
    catch (error) {
        console.error('Error in deleteOrdenItem:', error);
        res.status(500).json({ error: 'Server error', details: error });
    }
};
exports.deleteOrdenItem = deleteOrdenItem;
// Función auxiliar para obtener items huérfanos
const getOrphanedOrdenItems = async (req, res) => {
    try {
        // Obtener todos los IDs de productos válidos
        const validProductIds = await prisma_1.default.producto.findMany({
            select: { IdProducto: true }
        }).then(products => products.map(p => p.IdProducto));
        // Encontrar items huérfanos (items que referencian productos que no existen)
        const orphanedItems = await prisma_1.default.ordenItem.findMany({
            where: {
                IdProducto: {
                    notIn: validProductIds
                }
            },
            include: {
                orden: {
                    select: {
                        IdOrden: true,
                        Fecha: true,
                        Total: true
                    }
                }
            }
        });
        res.json({
            count: orphanedItems.length,
            orphanedItems: orphanedItems
        });
    }
    catch (error) {
        console.error('Error getting orphaned items:', error);
        res.status(500).json({ error: 'Server error', details: error });
    }
};
exports.getOrphanedOrdenItems = getOrphanedOrdenItems;
// Función auxiliar para limpiar items huérfanos
const cleanOrphanedOrdenItems = async (req, res) => {
    try {
        // Obtener todos los IDs de productos válidos
        const validProductIds = await prisma_1.default.producto.findMany({
            select: { IdProducto: true }
        }).then(products => products.map(p => p.IdProducto));
        // Encontrar items huérfanos antes de eliminarlos
        const orphanedItems = await prisma_1.default.ordenItem.findMany({
            where: {
                IdProducto: {
                    notIn: validProductIds
                }
            }
        });
        if (orphanedItems.length === 0) {
            return res.json({ message: 'No se encontraron items huérfanos', count: 0 });
        }
        // Eliminar items huérfanos
        const deleteResult = await prisma_1.default.ordenItem.deleteMany({
            where: {
                IdProducto: {
                    notIn: validProductIds
                }
            }
        });
        res.json({
            message: 'Items huérfanos eliminados',
            count: deleteResult.count,
            deletedItems: orphanedItems.map(item => ({
                IdOrden: item.IdOrden,
                IdProducto: item.IdProducto
            }))
        });
    }
    catch (error) {
        console.error('Error cleaning orphaned items:', error);
        res.status(500).json({ error: 'Server error', details: error });
    }
};
exports.cleanOrphanedOrdenItems = cleanOrphanedOrdenItems;
// Función adicional para debugging - Ver todos los items sin filtrar productos
const getAllOrdenItemsRaw = async (req, res) => {
    try {
        const items = await prisma_1.default.ordenItem.findMany({
            include: {
                orden: {
                    select: {
                        IdOrden: true,
                        Fecha: true,
                        Total: true
                    }
                }
            }
        });
        // Obtener productos válidos
        const validProductIds = await prisma_1.default.producto.findMany({
            select: { IdProducto: true }
        }).then(products => products.map(p => p.IdProducto));
        // Separar items válidos e inválidos
        const validItems = items.filter(item => validProductIds.includes(item.IdProducto));
        const invalidItems = items.filter(item => !validProductIds.includes(item.IdProducto));
        res.json({
            total: items.length,
            valid: validItems.length,
            invalid: invalidItems.length,
            validItems: validItems,
            invalidItems: invalidItems,
            validProductIds: validProductIds
        });
    }
    catch (error) {
        console.error('Error in getAllOrdenItemsRaw:', error);
        res.status(500).json({ error: 'Server error', details: error });
    }
};
exports.getAllOrdenItemsRaw = getAllOrdenItemsRaw;
//# sourceMappingURL=ordenitem.controller.js.map