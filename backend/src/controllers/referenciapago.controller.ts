
import prisma from '../prisma';
import { Request, Response } from 'express';

// Get all referencias de pago
export const getAllReferenciaPagos = async (req: Request, res: Response) => {
  try {
    const referencias = await prisma.referenciaPago.findMany({ include: { Transaccion: true } });
    res.json(referencias);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'ERROR DEL SERVIDOR' });
  }
};

// Get referencia de pago by Id
export const getReferenciaPagoById = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const referencia = await prisma.referenciaPago.findUnique({
      where: { IdReferencia: parseInt(id) },
      include: { Transaccion: true }
    });
    if (!referencia) {
      return res.status(404).json({ message: 'ReferenciaPago no encontrada' });
    }
    res.json(referencia);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'ERROR DEL SERVIDOR' });
  }
};

// Dynamic search for referencias de pago
export const searchReferenciaPagos = async (req: Request, res: Response) => {
  try {
    const {
      IdTransa,
      DocumentoIN,
      DocumentoVE,
      IdCliente,
      IdVendedor,
      minValorPago,
      maxValorPago
    } = req.query;

    const where: any = {};
    if (IdTransa) where.IdTransa = parseInt(IdTransa as string);
    if (DocumentoIN) where.DocumentoIN = { contains: DocumentoIN };
    if (DocumentoVE) where.DocumentoVE = { contains: DocumentoVE };
    if (IdCliente) where.IdCliente = IdCliente;
    if (IdVendedor) where.IdVendedor = IdVendedor;
    if (minValorPago || maxValorPago) {
      where.ValorPago = {};
      if (minValorPago) where.ValorPago.gte = parseFloat(minValorPago as string);
      if (maxValorPago) where.ValorPago.lte = parseFloat(maxValorPago as string);
    }

    const referencias = await prisma.referenciaPago.findMany({ where, include: { Transaccion: true } });
    res.json(referencias);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'ERROR DEL SERVIDOR' });
  }
};

// Create referencia de pago
export const createReferenciaPago = async (req: Request, res: Response) => {
  const data = req.body;
  try {
    const result = await prisma.$transaction(async (tx) => {
      // Crear la referencia de pago
      const newReferencia = await tx.referenciaPago.create({ data });
      // Obtener la transacción actual
      const transaccion = await tx.transaccion.findUnique({ where: { IdTransa: data.IdTransa } });
      if (!transaccion) throw new Error('Transacción no encontrada');
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
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'ERROR DEL SERVIDOR' });
  }
};

// Update referencia de pago
export const updateReferenciaPago = async (req: Request, res: Response) => {
  const { id } = req.params;
  const data = req.body;
  try {
    const updated = await prisma.referenciaPago.update({
      where: { IdReferencia: parseInt(id) },
      data,
    });
    res.json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'ERROR DEL SERVIDOR' });
  }
};

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
