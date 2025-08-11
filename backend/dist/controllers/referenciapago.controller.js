"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateReferenciaPago = exports.createReferenciaPago = exports.searchReferenciaPagos = exports.getReferenciaPagoById = exports.getAllReferenciaPagos = void 0;
const prisma_1 = __importDefault(require("../prisma"));
// Get all referencias de pago
const getAllReferenciaPagos = async (req, res) => {
    try {
        const referencias = await prisma_1.default.referenciaPago.findMany({ include: { Transaccion: true } });
        res.json(referencias);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'ERROR DEL SERVIDOR' });
    }
};
exports.getAllReferenciaPagos = getAllReferenciaPagos;
// Get referencia de pago by Id
const getReferenciaPagoById = async (req, res) => {
    const { id } = req.params;
    try {
        const referencia = await prisma_1.default.referenciaPago.findUnique({
            where: { IdReferencia: parseInt(id) },
            include: { Transaccion: true }
        });
        if (!referencia) {
            return res.status(404).json({ message: 'ReferenciaPago no encontrada' });
        }
        res.json(referencia);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'ERROR DEL SERVIDOR' });
    }
};
exports.getReferenciaPagoById = getReferenciaPagoById;
// Dynamic search for referencias de pago
const searchReferenciaPagos = async (req, res) => {
    try {
        const { IdTransa, DocumentoIN, DocumentoVE, IdCliente, IdVendedor, minValorPago, maxValorPago } = req.query;
        const where = {};
        if (IdTransa)
            where.IdTransa = parseInt(IdTransa);
        if (DocumentoIN)
            where.DocumentoIN = { contains: DocumentoIN };
        if (DocumentoVE)
            where.DocumentoVE = { contains: DocumentoVE };
        if (IdCliente)
            where.IdCliente = IdCliente;
        if (IdVendedor)
            where.IdVendedor = IdVendedor;
        if (minValorPago || maxValorPago) {
            where.ValorPago = {};
            if (minValorPago)
                where.ValorPago.gte = parseFloat(minValorPago);
            if (maxValorPago)
                where.ValorPago.lte = parseFloat(maxValorPago);
        }
        const referencias = await prisma_1.default.referenciaPago.findMany({ where, include: { Transaccion: true } });
        res.json(referencias);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'ERROR DEL SERVIDOR' });
    }
};
exports.searchReferenciaPagos = searchReferenciaPagos;
// Create referencia de pago
const createReferenciaPago = async (req, res) => {
    const data = req.body;
    try {
        const result = await prisma_1.default.$transaction(async (tx) => {
            // Crear la referencia de pago
            const newReferencia = await tx.referenciaPago.create({ data });
            // Obtener la transacción actual
            const transaccion = await tx.transaccion.findUnique({ where: { IdTransa: data.IdTransa } });
            if (!transaccion)
                throw new Error('Transacción no encontrada');
            // Calcular nuevo pendiente
            const pendienteActual = transaccion.Pendiente ?? transaccion.Valor ?? 0;
            const valorPago = typeof data.ValorPago === 'number' ? data.ValorPago : parseFloat(data.ValorPago);
            const nuevoPendiente = pendienteActual - valorPago;
            // Actualizar pendiente
            const transaccionActualizada = await tx.transaccion.update({
                where: { IdTransa: data.IdTransa },
                data: { Pendiente: nuevoPendiente }
            });
            return { newReferencia, transaccionActualizada };
        });
        res.status(201).json(result);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'ERROR DEL SERVIDOR' });
    }
};
exports.createReferenciaPago = createReferenciaPago;
// Update referencia de pago
const updateReferenciaPago = async (req, res) => {
    const { id } = req.params;
    const data = req.body;
    try {
        const updated = await prisma_1.default.referenciaPago.update({
            where: { IdReferencia: parseInt(id) },
            data,
        });
        res.json(updated);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'ERROR DEL SERVIDOR' });
    }
};
exports.updateReferenciaPago = updateReferenciaPago;
// Delete referencia de pago
// export const deleteReferenciaPago = async (req: Request, res: Response) => {
//   const { id } = req.params;
//   try {
//     await prisma.referenciaPago.delete({
//       where: { IdReferencia: parseInt(id) },
//     });
//     res.json({ message: 'ReferenciaPago eliminada' });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ error: 'ERROR DEL SERVIDOR' });
//   }
// };
//# sourceMappingURL=referenciapago.controller.js.map