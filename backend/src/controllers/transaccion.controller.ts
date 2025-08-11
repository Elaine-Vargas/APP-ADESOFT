import prisma from '../prisma';
import { Request, Response } from 'express';

// Get ingreso (IN) transaccion by Documento
export const getIngresoByDocumento = async (req: Request, res: Response) => {
  const { documento } = req.params;
  if (!documento) {
    return res.status(400).json({ error: 'El documento es requerido' });
  }
  try {
    const ingreso = await prisma.transaccion.findFirst({
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
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'ERROR DEL SERVIDOR' });
  }
};

// Get all transacciones
export const getAllTransacciones = async (req: Request, res: Response) => {
  try {
    const transacciones = await prisma.transaccion.findMany({ 
      include: { 
        ReferenciaPago: true 
      } 
    });
    res.json(transacciones);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'ERROR DEL SERVIDOR' });
  }
};


// Dynamic search for transacciones
export const searchTransacciones = async (req: Request, res: Response) => {
  try {
    const {
      Documento,
      IdCliente,
      IdVendedor,
      Tipo,
      Concepto,
      minValor,
      maxValor,
      Fecha
    } = req.query;

    const where: any = {};
    if (Documento) where.Documento = { contains: Documento };
    if (IdCliente) where.IdCliente = IdCliente;
    if (IdVendedor) where.IdVendedor = IdVendedor;
    if (Tipo) where.Tipo = Tipo;
    if (Concepto) where.Concepto = { contains: Concepto };
    if (Fecha) where.Fecha = new Date(Fecha as string);
    if (minValor || maxValor) {
      where.Valor = {};
      if (minValor) where.Valor.gte = parseFloat(minValor as string);
      if (maxValor) where.Valor.lte = parseFloat(maxValor as string);
    }

    const transacciones = await prisma.transaccion.findMany({ where, include: { ReferenciaPago: true } });
    res.json(transacciones);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'ERROR DEL SERVIDOR' });
  }
};

// Create transaccion
export const createTransaccion = async (req: Request, res: Response) => {
  const data = req.body;
  try {
    const newTransaccion = await prisma.transaccion.create({ data });
    res.status(201).json(newTransaccion);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'ERROR DEL SERVIDOR' });
  }
};
export const createIngresoAndPago = async (req: Request, res: Response) => {
  const { 
    transaccionData,  // Data for the new INGRESO transaction
    transaccionOriginalId,  // ID of the original transaction (VE)
    montoPago  // Payment amount
  } = req.body;

  try {
    // 1. Obtener el último IdTransa para DocumentoIN correlativo
    const lastTransa = await prisma.transaccion.findFirst({
      orderBy: { IdTransa: 'desc' },
      select: { IdTransa: true }
    });
    let nextNumber = 1;
    if (lastTransa?.IdTransa) {
      nextNumber = lastTransa.IdTransa + 1;
    }
    const documentoIN = nextNumber.toString().padStart(8, '0');

    // 2. Create the INGRESO transaction
    const newIngreso = await prisma.transaccion.create({
      data: {
        ...transaccionData,
        Documento: documentoIN,
        Tipo: 'IN' as const,
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
    const transaccionOriginal = await prisma.transaccion.findUnique({
      where: { IdTransa: transaccionOriginalId },
      select: { Documento: true }
    });

    if (!transaccionOriginal) {
      throw new Error('Transacción original no encontrada');
    }
    // 3. Get the original transaction to get its Documento
    const transaccionNew = await prisma.transaccion.findUnique({
      where: { IdTransa: newIngreso.IdTransa },
      select: { Documento: true }
    });

    if (!transaccionNew) {
      throw new Error('Transacción nueva no encontrada');
    }
    // 4. Create the ReferenciaPago
    const newReferencia = await prisma.referenciaPago.create({
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
    const updatedIngreso = await prisma.transaccion.update({
      where: { IdTransa: newIngreso.IdTransa },
      data: {
        ReferenciaId: newReferencia.IdReferencia.toString()
      }
    });

    // 6. Update the original transaction to subtract the payment amount from Pendiente
    const updatedOriginal = await prisma.transaccion.update({
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

  } catch (error) {
    console.error('Error al crear ingreso y pago:', error);
    res.status(500).json({ 
      error: 'Error al procesar el pago',
      details: error instanceof Error ? error.message : String(error)
    });
  }
};

// Update transaccion
export const updateTransaccion = async (req: Request, res: Response) => {
  const { id } = req.params;
  const data = req.body;
  try {
    const updated = await prisma.transaccion.update({
      where: { IdTransa: parseInt(id) },
      data,
    });
    res.json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'ERROR DEL SERVIDOR' });
  }
};

// Get pending transactions by Vendedor's route
export const getTransaccionesPendientesPorVendedor = async (req: Request, res: Response) => {
  const { idVendedor } = req.params;
  const { Documento, Tipo } = req.query;

  if (!idVendedor) {
    return res.status(400).json({ error: 'El ID del vendedor es requerido' });
  }

  try {
    // Find the vendor to get their route ID
    const vendedor = await prisma.vendedor.findUnique({
      where: { IdVendedor: idVendedor as string },
      select: { IdRuta: true },
    });

    // Build the where clause for Prisma
    const where: any = {
      Pendiente: { gt: 0 },
    };

    // Si el vendedor no existe, devuelve todas las transacciones pendientes (sin filtrar por vendedor)
    if (!vendedor || !vendedor.IdRuta) {
      // No se filtra por IdVendedor, solo por Pendiente > 0
      // (ya está en where)
    } else {
      // Si el vendedor tiene ruta, filtra por vendedores en esa ruta
      const vendedoresEnRuta = await prisma.vendedor.findMany({
        where: { IdRuta: vendedor.IdRuta },
        select: { IdVendedor: true },
      });
      const idsVendedoresEnRuta = vendedoresEnRuta.map((v) => v.IdVendedor);
      where.IdVendedor = { in: idsVendedoresEnRuta };
    }

    if (Documento) {
      where.Documento = { contains: Documento as string };
    }

    if (Tipo) {
      where.Tipo = { equals: Tipo as string };
    }

    // Fetch transactions
    const transacciones = await prisma.transaccion.findMany({
      where,
      include: { 
        ReferenciaPago: true 
      },
      orderBy: {
        Fecha: 'desc',
      },
    });

    res.json(transacciones);
  } catch (error) {
    console.error('Error fetching pending transactions:', error);
    res.status(500).json({ error: 'ERROR DEL SERVIDOR' });
  }
};

// Get pending transactions by Vendedor's route
export const getTransaccionesPendientesPorCliente = async (req: Request, res: Response) => {
  const { idCliente } = req.params;
  const { Documento, Tipo } = req.query;

  if (!idCliente) {
    return res.status(400).json({ error: 'El ID del cliente es requerido' });
  }

  try {
    // Find the vendor to get their route ID
    const cliente = await prisma.cliente.findUnique({
      where: { IdCliente: idCliente as string },
    });

    if (!cliente) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    // Build the where clause for Prisma
    const where: any = {
      AND: [
        { Pendiente: { gt: 0 } },
        { IdCliente: cliente.IdCliente },
      ],
    };

    if (Documento) {
      where.AND.push({ Documento: { contains: Documento as string } });
    }

    if (Tipo) {
      where.AND.push({ Tipo: { equals: Tipo as string } });
    }

    // Fetch transactions
    const transacciones = await prisma.transaccion.findMany({
      where,
      include: { 
        ReferenciaPago: true 
      },
      orderBy: {
        Fecha: 'desc',
      },
    });

    res.json(transacciones);
  } catch (error) {
    console.error('Error fetching pending transactions:', error);
    res.status(500).json({ error: 'ERROR DEL SERVIDOR' });
  }
};
export const getTransaccionesIngresos = async (req: Request, res: Response) => {
  try {
    // Accept query params for filtering
    const { IdCliente, Documento } = req.query;

    // Build where clause
    const where: any = {
      Tipo: 'IN',
      Documento: { not: null },
    };
    if (IdCliente) {
      where.IdCliente = IdCliente;
    }
    if (Documento) {
      where.Documento = { contains: Documento as string };
    }

    // Paso 1: Obtener todas las transacciones tipo IN filtradas
    const transacciones = await prisma.transaccion.findMany({
      where,
      orderBy: {
        Fecha: 'desc',
      },
    });

    // Extraer los Documentos únicos de estas transacciones
    const documentos = transacciones.map(t => t.Documento!);

    // Paso 2: Obtener las referencias con DocumentoIN que coincida con alguno de los documentos anteriores
    const referencias = await prisma.referenciaPago.findMany({
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
  } catch (error) {
    console.error('Error fetching ingresos:', error);
    res.status(500).json({ error: 'ERROR DEL SERVIDOR' });
  }
};

// In transaccion.controller.ts

// Get payment references by document (VE or IN)
export const getReferenciasByDocumento = async (req: Request, res: Response) => {
  const { documento, tipo } = req.params;

  if (!documento || !tipo) {
    return res.status(400).json({ 
      error: 'Documento y tipo son requeridos' 
    });
  }

  try {
    // For IN type, find the transaction and its references
    if (tipo.toUpperCase() === 'IN') {
      const transaccion = await prisma.transaccion.findFirst({
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
      const referencias = await prisma.referenciaPago.findMany({
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

  } catch (error) {
    console.error('Error al buscar referencias de pago:', error);
    return res.status(500).json({ 
      error: 'Error del servidor al buscar referencias de pago' 
    });
  }
};

// Update getTransaccionById to include references
export const getTransaccionById = async (req: Request, res: Response) => {
  const { id } = req.params;
  const idNum = parseInt(id);
  
  if (isNaN(idNum)) {
    return res.status(400).json({ error: 'IdTransa inválido' });
  }

  try {
    const transaccion = await prisma.transaccion.findUnique({
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
      const referencias = await prisma.referenciaPago.findMany({
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
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'ERROR DEL SERVIDOR' });
  }
};



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
