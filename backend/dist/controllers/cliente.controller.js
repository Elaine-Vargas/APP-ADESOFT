"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateCliente = exports.createCliente = exports.searchClientes = exports.getClienteById = exports.getAllClientes = void 0;
const prisma_1 = __importDefault(require("../prisma"));
// Get all clientes
const getAllClientes = async (req, res) => {
    const { Idruta } = req.query;
    try {
        const whereClause = {};
        if (Idruta && typeof Idruta === 'string' && Idruta.trim() !== '') {
            whereClause.Idruta = Idruta;
        }
        const clientes = await prisma_1.default.cliente.findMany({
            where: whereClause,
        });
        res.json(clientes);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
};
exports.getAllClientes = getAllClientes;
// Get cliente by Id
const getClienteById = async (req, res) => {
    const { id } = req.params;
    try {
        const cliente = await prisma_1.default.cliente.findUnique({
            where: { IdCliente: id },
        });
        if (!cliente) {
            return res.status(404).json({ message: 'Cliente no encontrado' });
        }
        res.json(cliente);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
};
exports.getClienteById = getClienteById;
// Dynamic search for clientes
const searchClientes = async (req, res) => {
    try {
        const { NombreC, Rnc, TelefonoC, IdVendedor, Idzona, Idruta, q, } = req.query;
        let where = {};
        // Agrupación de filtros: si ambos presentes, ambos se aplican (AND)
        if (Idzona) {
            where.Idzona = Idzona;
        }
        if (Idruta) {
            where.Idruta = Idruta;
        }
        // Búsqueda dinámica para los demás campos
        const dynamicOr = [];
        if (q) {
            dynamicOr.push({ NombreC: { contains: q } }, { Rnc: { contains: q } }, { TelefonoC: { contains: q } }, { IdVendedor: { contains: q } });
        }
        else {
            if (NombreC)
                dynamicOr.push({ NombreC: { contains: NombreC } });
            if (Rnc)
                dynamicOr.push({ Rnc: { contains: Rnc } });
            if (TelefonoC)
                dynamicOr.push({ TelefonoC: { contains: TelefonoC } });
            if (IdVendedor)
                dynamicOr.push({ IdVendedor: { contains: IdVendedor } });
        }
        if (dynamicOr.length > 0) {
            where.OR = dynamicOr;
        }
        const clientes = await prisma_1.default.cliente.findMany({ where });
        res.json(clientes);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
};
exports.searchClientes = searchClientes;
// Create cliente
const createCliente = async (req, res) => {
    const data = req.body;
    try {
        const newCliente = await prisma_1.default.cliente.create({ data });
        res.status(201).json(newCliente);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
};
exports.createCliente = createCliente;
// Update cliente
const updateCliente = async (req, res) => {
    const { id } = req.params;
    const data = req.body;
    try {
        const updated = await prisma_1.default.cliente.update({
            where: { IdCliente: id },
            data,
        });
        res.json(updated);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
};
exports.updateCliente = updateCliente;
// Delete cliente
// export const deleteCliente = async (req: Request, res: Response) => {
//   const { id } = req.params;
//   try {
//     await prisma.cliente.delete({
//       where: { IdCliente: id },
//     });
//     res.json({ message: 'Cliente eliminado' });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ error: 'Server error' });
//   }
// };
//# sourceMappingURL=cliente.controller.js.map