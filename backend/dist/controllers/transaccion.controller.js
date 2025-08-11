"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTransaccionById = exports.getReferenciasByDocumento = exports.getTransaccionesIngresos = exports.getTransaccionesPendientesPorCliente = exports.getTransaccionesPendientesPorVendedor = exports.updateTransaccion = exports.createIngresoAndPago = exports.createTransaccion = exports.searchTransacciones = exports.getAllTransacciones = exports.getIngresoByDocumento = void 0;
const prisma_1 = __importDefault(require("../prisma"));
// Get ingreso (IN) transaccion by Documento
const getIngresoByDocumento = async (req, res) => {
    const { documento } = req.params;
    if (!documento) {
        return res.status(400).json({ error: 'El documento es requerido' });
    }
    try {
        const ingreso = await prisma_1.default.transaccion.findFirst({
            where: {
                Tipo: 'IN',
                Documento: documento
            },
            include: { ReferenciaPago: true }
        });
        if (!ingreso) {
            return res.status(404).json({ message: 'Transacción de ingreso no encontrada' });
        }
        res.json(ingreso);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'ERROR DEL SERVIDOR' });
    }
};
exports.getIngresoByDocumento = getIngresoByDocumento;
// Get all transacciones
const getAllTransacciones = async (req, res) => {
    try {
        const transacciones = await prisma_1.default.transaccion.findMany({
            include: {
                ReferenciaPago: true
            }
        });
        res.json(transacciones);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'ERROR DEL SERVIDOR' });
    }
};
exports.getAllTransacciones = getAllTransacciones;
// Dynamic search for transacciones
const searchTransacciones = async (req, res) => {
    try {
        const { Documento, IdCliente, IdVendedor, Tipo, Concepto, minValor, maxValor, Fecha } = req.query;
        const where = {};
        if (Documento)
            where.Documento = { contains: Documento };
        if (IdCliente)
            where.IdCliente = IdCliente;
        if (IdVendedor)
            where.IdVendedor = IdVendedor;
        if (Tipo)
            where.Tipo = Tipo;
        if (Concepto)
            where.Concepto = { contains: Concepto };
        if (Fecha)
            where.Fecha = new Date(Fecha);
        if (minValor || maxValor) {
            where.Valor = {};
            if (minValor)
                where.Valor.gte = parseFloat(minValor);
            if (maxValor)
                where.Valor.lte = parseFloat(maxValor);
        }
        const transacciones = await prisma_1.default.transaccion.findMany({ where, include: { ReferenciaPago: true } });
        res.json(transacciones);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'ERROR DEL SERVIDOR' });
    }
};
exports.searchTransacciones = searchTransacciones;
// Create transaccion
const createTransaccion = async (req, res) => {
    const data = req.body;
    try {
        const newTransaccion = await prisma_1.default.transaccion.create({ data });
        res.status(201).json(newTransaccion);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'ERROR DEL SERVIDOR' });
    }
};
exports.createTransaccion = createTransaccion;
const createIngresoAndPago = async (req, res) => {
    const { transaccionData, // Data for the new INGRESO transaction
    transaccionOriginalId, // ID of the original transaction (VE)
    montoPago // Payment amount
     } = req.body;
    try {
        // 1. Obtener el último IdTransa para DocumentoIN correlativo
        const lastTransa = await prisma_1.default.transaccion.findFirst({
            orderBy: { IdTransa: 'desc' },
            select: { IdTransa: true }
        });
        let nextNumber = 1;
        if (lastTransa?.IdTransa) {
            nextNumber = lastTransa.IdTransa + 1;
        }
        const documentoIN = nextNumber.toString().padStart(8, '0');
        // 2. Create the INGRESO transaction
        const newIngreso = await prisma_1.default.transaccion.create({
            data: {
                ...transaccionData,
                Documento: documentoIN,
                Tipo: 'IN',
                Pendiente: 0,
                ReferenciaId: null,
                SECNCF: null,
                FechaSinc: null,
                // Ensure these are set from the original transaction
                IdCliente: transaccionData.IdCliente,
                IdVendedor: transaccionData.IdVendedor,
            }
        });
        // 3. Get the original transaction to get its Documento
        const transaccionOriginal = await prisma_1.default.transaccion.findUnique({
            where: { IdTransa: transaccionOriginalId },
            select: { Documento: true }
        });
        if (!transaccionOriginal) {
            throw new Error('Transacción original no encontrada');
        }
        // 3. Get the original transaction to get its Documento
        const transaccionNew = await prisma_1.default.transaccion.findUnique({
            where: { IdTransa: newIngreso.IdTransa },
            select: { Documento: true }
        });
        if (!transaccionNew) {
            throw new Error('Transacción nueva no encontrada');
        }
        // 4. Create the ReferenciaPago
        const newReferencia = await prisma_1.default.referenciaPago.create({
            data: {
                IdTransa: newIngreso.IdTransa,
                DocumentoIN: documentoIN,
                DocumentoVE: transaccionOriginal.Documento || '',
                IdCliente: transaccionData.IdCliente,
                IdVendedor: transaccionData.IdVendedor,
                ValorPago: parseFloat(montoPago)
            }
        });
        // 5. Update the INGRESO transaction with the ReferenciaId
        const updatedIngreso = await prisma_1.default.transaccion.update({
            where: { IdTransa: newIngreso.IdTransa },
            data: {
                ReferenciaId: newReferencia.IdReferencia.toString()
            }
        });
        // 6. Update the original transaction to subtract the payment amount from Pendiente
        const updatedOriginal = await prisma_1.default.transaccion.update({
            where: { IdTransa: transaccionOriginalId },
            data: {
                Pendiente: {
                    decrement: parseFloat(montoPago)
                }
            }
        });
        res.status(201).json({
            ingreso: updatedIngreso,
            referencia: newReferencia
        });
    }
    catch (error) {
        console.error('Error al crear ingreso y pago:', error);
        res.status(500).json({
            error: 'Error al procesar el pago',
            details: error instanceof Error ? error.message : String(error)
        });
    }
};
exports.createIngresoAndPago = createIngresoAndPago;
// Update transaccion
const updateTransaccion = async (req, res) => {
    const { id } = req.params;
    const data = req.body;
    try {
        const updated = await prisma_1.default.transaccion.update({
            where: { IdTransa: parseInt(id) },
            data,
        });
        res.json(updated);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'ERROR DEL SERVIDOR' });
    }
};
exports.updateTransaccion = updateTransaccion;
// Get pending transactions by Vendedor's route
const getTransaccionesPendientesPorVendedor = async (req, res) => {
    const { idVendedor } = req.params;
    const { Documento, Tipo } = req.query;
    if (!idVendedor) {
        return res.status(400).json({ error: 'El ID del vendedor es requerido' });
    }
    try {
        // Find the vendor to get their route ID
        const vendedor = await prisma_1.default.vendedor.findUnique({
            where: { IdVendedor: idVendedor },
            select: { IdRuta: true },
        });
        // Build the where clause for Prisma
        const where = {
            Pendiente: { gt: 0 },
        };
        // Si el vendedor no existe, devuelve todas las transacciones pendientes (sin filtrar por vendedor)
        if (!vendedor || !vendedor.IdRuta) {
            // No se filtra por IdVendedor, solo por Pendiente > 0
            // (ya está en where)
        }
        else {
            // Si el vendedor tiene ruta, filtra por vendedores en esa ruta
            const vendedoresEnRuta = await prisma_1.default.vendedor.findMany({
                where: { IdRuta: vendedor.IdRuta },
                select: { IdVendedor: true },
            });
            const idsVendedoresEnRuta = vendedoresEnRuta.map((v) => v.IdVendedor);
            where.IdVendedor = { in: idsVendedoresEnRuta };
        }
        if (Documento) {
            where.Documento = { contains: Documento };
        }
        if (Tipo) {
            where.Tipo = { equals: Tipo };
        }
        // Fetch transactions
        const transacciones = await prisma_1.default.transaccion.findMany({
            where,
            include: {
                ReferenciaPago: true
            },
            orderBy: {
                Fecha: 'desc',
            },
        });
        res.json(transacciones);
    }
    catch (error) {
        console.error('Error fetching pending transactions:', error);
        res.status(500).json({ error: 'ERROR DEL SERVIDOR' });
    }
};
exports.getTransaccionesPendientesPorVendedor = getTransaccionesPendientesPorVendedor;
// Get pending transactions by Vendedor's route
const getTransaccionesPendientesPorCliente = async (req, res) => {
    const { idCliente } = req.params;
    const { Documento, Tipo } = req.query;
    if (!idCliente) {
        return res.status(400).json({ error: 'El ID del cliente es requerido' });
    }
    try {
        // Find the vendor to get their route ID
        const cliente = await prisma_1.default.cliente.findUnique({
            where: { IdCliente: idCliente },
        });
        if (!cliente) {
            return res.status(404).json({ error: 'Cliente no encontrado' });
        }
        // Build the where clause for Prisma
        const where = {
            AND: [
                { Pendiente: { gt: 0 } },
                { IdCliente: cliente.IdCliente },
            ],
        };
        if (Documento) {
            where.AND.push({ Documento: { contains: Documento } });
        }
        if (Tipo) {
            where.AND.push({ Tipo: { equals: Tipo } });
        }
        // Fetch transactions
        const transacciones = await prisma_1.default.transaccion.findMany({
            where,
            include: {
                ReferenciaPago: true
            },
            orderBy: {
                Fecha: 'desc',
            },
        });
        res.json(transacciones);
    }
    catch (error) {
        console.error('Error fetching pending transactions:', error);
        res.status(500).json({ error: 'ERROR DEL SERVIDOR' });
    }
};
exports.getTransaccionesPendientesPorCliente = getTransaccionesPendientesPorCliente;
const getTransaccionesIngresos = async (req, res) => {
    try {
        // Accept query params for filtering
        const { IdCliente, Documento } = req.query;
        // Build where clause
        const where = {
            Tipo: 'IN',
            Documento: { not: null },
        };
        if (IdCliente) {
            where.IdCliente = IdCliente;
        }
        if (Documento) {
            where.Documento = { contains: Documento };
        }
        // Paso 1: Obtener todas las transacciones tipo IN filtradas
        const transacciones = await prisma_1.default.transaccion.findMany({
            where,
            orderBy: {
                Fecha: 'desc',
            },
        });
        // Extraer los Documentos únicos de estas transacciones
        const documentos = transacciones.map(t => t.Documento);
        // Paso 2: Obtener las referencias con DocumentoIN que coincida con alguno de los documentos anteriores
        const referencias = await prisma_1.default.referenciaPago.findMany({
            where: {
                DocumentoIN: {
                    in: documentos,
                },
            },
        });
        // Paso 3: Unir los datos manualmente
        const transaccionesConReferencias = transacciones.map(t => {
            const referenciasAsociadas = referencias.filter(ref => ref.DocumentoIN === t.Documento);
            return {
                ...t,
                ReferenciaPago: referenciasAsociadas,
            };
        });
        res.json(transaccionesConReferencias);
    }
    catch (error) {
        console.error('Error fetching ingresos:', error);
        res.status(500).json({ error: 'ERROR DEL SERVIDOR' });
    }
};
exports.getTransaccionesIngresos = getTransaccionesIngresos;
// In transaccion.controller.ts
// Get payment references by document (VE or IN)
const getReferenciasByDocumento = async (req, res) => {
    const { documento, tipo } = req.params;
    if (!documento || !tipo) {
        return res.status(400).json({
            error: 'Documento y tipo son requeridos'
        });
    }
    try {
        // For IN type, find the transaction and its references
        if (tipo.toUpperCase() === 'IN') {
            const transaccion = await prisma_1.default.transaccion.findFirst({
                where: {
                    Documento: documento,
                    Tipo: 'IN'
                },
                include: {
                    ReferenciaPago: true
                }
            });
            if (!transaccion) {
                return res.status(404).json({
                    message: 'Transacción de ingreso no encontrada'
                });
            }
            return res.json({
                ...transaccion,
                // Ensure we return an array even if no references
                ReferenciaPago: transaccion.ReferenciaPago || []
            });
        }
        // For VE type, find all references that match DocumentoVE
        if (tipo.toUpperCase() === 'VE') {
            const referencias = await prisma_1.default.referenciaPago.findMany({
                where: {
                    DocumentoVE: documento
                },
                include: {
                    Transaccion: true
                }
            });
            if (!referencias || referencias.length === 0) {
                return res.status(404).json({
                    message: 'No se encontraron referencias de pago para esta transacción'
                });
            }
            return res.json(referencias);
        }
        return res.status(400).json({
            error: 'Tipo de documento inválido. Use "VE" o "IN"'
        });
    }
    catch (error) {
        console.error('Error al buscar referencias de pago:', error);
        return res.status(500).json({
            error: 'Error del servidor al buscar referencias de pago'
        });
    }
};
exports.getReferenciasByDocumento = getReferenciasByDocumento;
// Update getTransaccionById to include references
const getTransaccionById = async (req, res) => {
    const { id } = req.params;
    const idNum = parseInt(id);
    if (isNaN(idNum)) {
        return res.status(400).json({ error: 'IdTransa inválido' });
    }
    try {
        const transaccion = await prisma_1.default.transaccion.findUnique({
            where: { IdTransa: idNum },
            include: {
                ReferenciaPago: true
            }
        });
        if (!transaccion) {
            return res.status(404).json({ message: 'Transacción no encontrada' });
        }
        // If it's a VE type, we need to find all references where DocumentoVE matches
        if (transaccion.Tipo === 'VE') {
            const referencias = await prisma_1.default.referenciaPago.findMany({
                where: {
                    DocumentoVE: transaccion.Documento
                }
            });
            return res.json({
                ...transaccion,
                ReferenciaPago: referencias
            });
        }
        return res.json(transaccion);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'ERROR DEL SERVIDOR' });
    }
};
exports.getTransaccionById = getTransaccionById;
// Delete transaccion 
// export const deleteTransaccion = async (req: Request, res: Response) => {
//   const { id } = req.params;
//   try {
//     await prisma.transaccion.delete({
//       where: { IdTransa: parseInt(id) },
//     });
//     res.json({ message: 'Transaccion eliminada' });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ error: 'ERROR DEL SERVIDOR' });
//   }
// };
//# sourceMappingURL=transaccion.controller.js.map