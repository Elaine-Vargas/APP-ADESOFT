
import prisma from '../prisma';
import { Request, Response } from 'express';

// Get all ordenes with optional filtering
export const getAllOrdenes = async (req: Request, res: Response) => {
  try {
    const { IdVendedor, Estado } = req.query;
    
    const where: any = {};
    if (IdVendedor) where.IdVendedor = IdVendedor as string;
    if (Estado) where.Estado = Estado as string;
    
    const ordenes = await prisma.orden.findMany({ 
      where,
      include: { 
        items: { 
          include: { Producto: true } 
        }, 
        Cliente: true, 
        Vendedor: true 
      },
      orderBy: {
        FechaCreacion: 'desc'
      }
    });
    res.json(ordenes);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get orden by Id
export const getOrdenById = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const orden = await prisma.orden.findUnique({
      where: { IdOrden: parseInt(id) },
      include: { 
        items: { 
          include: { Producto: true } 
        }, 
        Cliente: true, 
        Vendedor: true 
      }
    });
    if (!orden) {
      return res.status(404).json({ message: 'Orden no encontrada' });
    }
    res.json(orden);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Dynamic search for ordenes
export const searchOrdenes = async (req: Request, res: Response) => {
  try {
    const {
      Documento,
      IdCliente,
      IdVendedor,
      Estado,
      minTotal,
      maxTotal,
      Fecha
    } = req.query;

    const where: any = {};
    if (Documento) where.Documento = { contains: Documento };
    if (IdCliente) where.IdCliente = IdCliente;
    if (IdVendedor) where.IdVendedor = IdVendedor;
    if (Estado) where.Estado = Estado;
    if (Fecha) where.Fecha = new Date(Fecha as string);
    if (minTotal || maxTotal) {
      where.Total = {};
      if (minTotal) where.Total.gte = parseFloat(minTotal as string);
      if (maxTotal) where.Total.lte = parseFloat(maxTotal as string);
    }

    const ordenes = await prisma.orden.findMany({ 
      where, 
      include: { 
        items: { 
          include: { Producto: true } 
        }, 
        Cliente: true, 
        Vendedor: true 
      } 
    });
    res.json(ordenes);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Create orden
export const createOrden = async (req: Request, res: Response) => {
  const data = req.body;
  try {
    const newOrden = await prisma.orden.create({ data });
    res.status(201).json(newOrden);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Create orden with items in transaction
export const createOrdenWithItems = async (req: Request, res: Response) => {
  const { ordenData, items } = req.body;
  
  try {
    const result = await prisma.$transaction(async (tx) => {
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
      const orderItems = await Promise.all(
        items.map((item: any) =>
          tx.ordenItem.create({
            data: {
              IdOrden: newOrden.IdOrden,
              IdProducto: item.IdProducto,
              Cantidad: item.Cantidad,
              PrecioV: item.PrecioV,
              Impuesto: item.Impuesto || 0,
            }
          })
        )
      );

      // Fetch the complete order with relations
      const completeOrden = await tx.orden.findUnique({
        where: { IdOrden: newOrden.IdOrden },
        include: { 
          items: { 
            include: { Producto: true } 
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
  } catch (error) {
    console.error('Error creating order with items:', error);
    res.status(500).json({ error: 'Server error', details: error });
  }
};

// Update orden
export const updateOrden = async (req: Request, res: Response) => {
  const { id } = req.params;
  const data = req.body;
  try {
    const updated = await prisma.orden.update({
      where: { IdOrden: parseInt(id) },
      data,
    });
    res.json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Update orden and its items in a transaction
export const updateOrdenWithItems = async (req: Request, res: Response) => {

  const { id } = req.params;
  const { ordenData, items } = req.body;
  try {
    const result = await prisma.$transaction(async (tx) => {
      // Update the main order
      const updatedOrden = await tx.orden.update({
        where: { IdOrden: parseInt(id) },
        data: ordenData,
      });

      // Get existing items for this order
      const existingItems = await tx.ordenItem.findMany({
        where: { IdOrden: parseInt(id) },
      });
      const existingIds = existingItems.map((i: any) => i.IdProducto);
      const newIds = items.map((i: any) => i.IdProducto);

      // Delete items that are no longer present
      const toDelete = existingItems.filter((i: any) => !newIds.includes(i.IdProducto));
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
        } else {
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
          items: { include: { Producto: true } },
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
  } catch (error) {
    console.error('Error updating order with items:', error);
    res.status(500).json({ error: 'Server error', details: error });
  }
};

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
