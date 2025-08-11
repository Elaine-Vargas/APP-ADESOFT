"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateProducto = exports.searchProductos = exports.getProductoById = exports.getAllProductosDirect = exports.getAllProductos = void 0;
const prisma_1 = __importDefault(require("../prisma"));
// Get all products
const getAllProductos = async (req, res) => {
    try {
        const productos = await prisma_1.default.producto.findMany();
        res.json(productos);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
};
exports.getAllProductos = getAllProductos;
// Get all products (direct, for internal use) testing
const getAllProductosDirect = async () => {
    return await prisma_1.default.producto.findMany();
};
exports.getAllProductosDirect = getAllProductosDirect;
// Get product by Id
const getProductoById = async (req, res) => {
    const { id } = req.params;
    try {
        const producto = await prisma_1.default.producto.findUnique({
            where: { IdProducto: parseInt(id) },
        });
        if (!producto) {
            return res.status(404).json({ message: 'Producto no encontrado' });
        }
        res.json(producto);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
};
exports.getProductoById = getProductoById;
// Dynamic search for products
const searchProductos = async (req, res) => {
    try {
        const { q, CodigoP, ReferenciaP, PresentacionP, NombreP, GrupoP, } = req.query;
        let where = {};
        if (q) {
            where.OR = [
                { NombreP: { contains: q } },
                { CodigoP: { contains: q } },
                { ReferenciaP: { contains: q } },
                { PresentacionP: { contains: q } },
                { GrupoP: { contains: q } },
            ];
        }
        else {
            if (CodigoP)
                where.CodigoP = { contains: CodigoP };
            if (ReferenciaP)
                where.ReferenciaP = { contains: ReferenciaP };
            if (PresentacionP)
                where.PresentacionP = { contains: PresentacionP };
            if (NombreP)
                where.NombreP = { contains: NombreP };
            if (GrupoP)
                where.GrupoP = { contains: GrupoP };
        }
        const productos = await prisma_1.default.producto.findMany({ where });
        res.json(productos);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
};
exports.searchProductos = searchProductos;
// // Create product
// export const createProducto = async (req: Request, res: Response) => {
//   const data = req.body;
//   try {
//     const newProducto = await prisma.producto.create({ data });
//     res.status(201).json(newProducto);
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ error: 'Server error' });
//   }
// };
// Update product
const updateProducto = async (req, res) => {
    const { id } = req.params;
    const data = req.body;
    try {
        const updated = await prisma_1.default.producto.update({
            where: { IdProducto: parseInt(id) },
            data,
        });
        res.json(updated);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
};
exports.updateProducto = updateProducto;
// Delete product
// export const deleteProducto = async (req: Request, res: Response) => {
//   const { id } = req.params;
//   try {
//     await prisma.producto.delete({
//       where: { IdProducto: parseInt(id) },
//     });
//     res.json({ message: 'Producto eliminado' });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ error: 'Server error' });
//   }
// };
//# sourceMappingURL=producto.controller.js.map