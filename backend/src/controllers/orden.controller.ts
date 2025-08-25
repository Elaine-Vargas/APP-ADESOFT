import prisma from '../prisma';
import { Request, Response } from 'express';

// Get all ordenes with optional filtering
export const getAllOrdenes = async (req: Request, res: Response) => {
  try {
    const { IdVendedor, Estado } = req.query;
    
    const where: any = {};
    if (IdVendedor) where.IdVendedor = IdVendedor as string;
    if (Estado) where.Estado = Estado as string;
    
    // Intentar primero la consulta completa
    try {
      const ordenes = await prisma.orden.findMany({ 
        where,
        include: { 
          items: { 
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
              } 
            } 
          }, 
          Cliente: true, 
          Vendedor: true 
        },
        orderBy: {
          FechaCreacion: 'desc'
        }
      });
      
      // Filtrar items que puedan tener producto null
      const validOrdenes = ordenes.map(orden => ({
        ...orden,
        items: orden.items.filter(item => item.Producto !== null)
      }));
      
      res.json(validOrdenes);
    } catch (prismaError: any) {
      // Si hay error de datos inconsistentes, usar consulta alternativa
      if (prismaError.message?.includes('Field Producto is required to return data')) {
        console.warn('Detected orphaned order items, using alternative query method');
        
        const ordenes = await prisma.orden.findMany({ 
          where,
          include: { 
            Cliente: true, 
            Vendedor: true 
          },
          orderBy: {
            FechaCreacion: 'desc'
          }
        });

        // Obtener items válidos por separado
        const ordenesWithItems = await Promise.all(
          ordenes.map(async (orden) => {
            // Obtener IDs de productos válidos
            const validProductIds = await prisma.producto.findMany({
              select: { IdProducto: true }
            }).then(products => products.map(p => p.IdProducto));

            const items = await prisma.ordenItem.findMany({
              where: { 
                IdOrden: orden.IdOrden,
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
                }
              }
            });
            
            return { ...orden, items };
          })
        );
        
        res.json(ordenesWithItems);
      } else {
        throw prismaError;
      }
    }
  } catch (error) {
    console.error('Error in getAllOrdenes:', error);
    res.status(500).json({ error: 'Server error', details: error });
  }
};

// Get orden by Id
export const getOrdenById = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    try {
      const orden = await prisma.orden.findUnique({
        where: { IdOrden: parseInt(id) },
        include: { 
          items: { 
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
              } 
            }
          }, 
          Cliente: true, 
          Vendedor: true 
        }
      });
      
      if (!orden) {
        return res.status(404).json({ message: 'Orden no encontrada' });
      }
      
      // Filtrar items válidos
      const validOrden = {
        ...orden,
        items: orden.items.filter(item => item.Producto !== null)
      };
      
      res.json(validOrden);
    } catch (prismaError: any) {
      if (prismaError.message?.includes('Field Producto is required to return data')) {
        // Consulta alternativa
        const orden = await prisma.orden.findUnique({
          where: { IdOrden: parseInt(id) },
          include: { Cliente: true, Vendedor: true }
        });
        
        if (!orden) {
          return res.status(404).json({ message: 'Orden no encontrada' });
        }
        
        const validProductIds = await prisma.producto.findMany({
          select: { IdProducto: true }
        }).then(products => products.map(p => p.IdProducto));

        const items = await prisma.ordenItem.findMany({
          where: { 
            IdOrden: parseInt(id),
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
            }
          }
        });
        
        res.json({ ...orden, items });
      } else {
        throw prismaError;
      }
    }
  } catch (error) {
    console.error('Error in getOrdenById:', error);
    res.status(500).json({ error: 'Server error', details: error });
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

    try {
      const ordenes = await prisma.orden.findMany({ 
        where, 
        include: { 
          items: { 
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
              } 
            }
          }, 
          Cliente: true, 
          Vendedor: true 
        } 
      });
      
      // Filtrar items válidos
      const validOrdenes = ordenes.map(orden => ({
        ...orden,
        items: orden.items.filter(item => item.Producto !== null)
      }));
      
      res.json(validOrdenes);
    } catch (prismaError: any) {
      if (prismaError.message?.includes('Field Producto is required to return data')) {
        const ordenes = await prisma.orden.findMany({ 
          where,
          include: { Cliente: true, Vendedor: true }
        });

        const ordenesWithItems = await Promise.all(
          ordenes.map(async (orden) => {
            const validProductIds = await prisma.producto.findMany({
              select: { IdProducto: true }
            }).then(products => products.map(p => p.IdProducto));

            const items = await prisma.ordenItem.findMany({
              where: { 
                IdOrden: orden.IdOrden,
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
                }
              }
            });
            
            return { ...orden, items };
          })
        );
        
        res.json(ordenesWithItems);
      } else {
        throw prismaError;
      }
    }
  } catch (error) {
    console.error('Error in searchOrdenes:', error);
    res.status(500).json({ error: 'Server error', details: error });
  }
};

// Create orden
export const createOrden = async (req: Request, res: Response) => {
  const data = req.body;
  try {
    const newOrden = await prisma.orden.create({ data });
    res.status(201).json(newOrden);
  } catch (error) {
    console.error('Error in createOrden:', error);
    res.status(500).json({ error: 'Server error', details: error });
  }
};

// Create orden with items in transaction
export const createOrdenWithItems = async (req: Request, res: Response) => {
  const { ordenData, items } = req.body;
  
  try {
    // Validar que todos los productos existen antes de crear la orden
    const productIds = items.map((item: any) => item.IdProducto);
    const existingProducts = await prisma.producto.findMany({
      where: {
        IdProducto: {
          in: productIds
        }
      },
      select: {
        IdProducto: true
      }
    });
    
    const existingProductIds = existingProducts.map(p => p.IdProducto);
    const missingProducts = productIds.filter((id: number) => !existingProductIds.includes(id));
    
    if (missingProducts.length > 0) {
      return res.status(400).json({ 
        error: 'Productos no encontrados', 
        missingProductIds: missingProducts 
      });
    }
    
    const result = await prisma.$transaction(async (tx) => {
      // Create the order
      const now = new Date();
      const newOrden = await tx.orden.create({
        data: {
          ...ordenData,
          Fecha: now,
          FechaCreacion: now,
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
              } 
            } 
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
    console.error('Error in updateOrden:', error);
    res.status(500).json({ error: 'Server error', details: error });
  }
};

// Update orden and its items in a transaction
export const updateOrdenWithItems = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { ordenData, items } = req.body;
  
  try {
    // Validar que todos los productos existen antes de actualizar
    const productIds = items.map((item: any) => item.IdProducto);
    const existingProducts = await prisma.producto.findMany({
      where: {
        IdProducto: {
          in: productIds
        }
      },
      select: {
        IdProducto: true
      }
    });
    
    const existingProductIds = existingProducts.map(p => p.IdProducto);
    const missingProducts = productIds.filter((id: number) => !existingProductIds.includes(id));
    
    if (missingProducts.length > 0) {
      return res.status(400).json({ 
        error: 'Productos no encontrados', 
        missingProductIds: missingProducts 
      });
    }
    
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
      try {
        const completeOrden = await tx.orden.findUnique({
          where: { IdOrden: parseInt(id) },
          include: {
            items: { 
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
                } 
              }
            }, 
            Cliente: true, 
            Vendedor: true 
          }
        });
        
        if (!completeOrden) {
          throw new Error('No se encontró la orden actualizada');
        }
        
        return {
          ...completeOrden,
          items: completeOrden.items.filter(item => item.Producto !== null)
        };
      } catch (prismaError: any) {
        if (prismaError.message?.includes('Field Producto is required to return data')) {
          // Consulta alternativa si hay items huérfanos
          const orden = await tx.orden.findUnique({
            where: { IdOrden: parseInt(id) },
            include: { Cliente: true, Vendedor: true }
          });
          
          if (!orden) {
            throw new Error('No se encontró la orden actualizada');
          }
          
          const validProductIds = await tx.producto.findMany({
            select: { IdProducto: true }
          }).then(products => products.map(p => p.IdProducto));

          const validItems = await tx.ordenItem.findMany({
            where: { 
              IdOrden: parseInt(id),
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
              }
            }
          });
          
          return { ...orden, items: validItems };
        } else {
          throw prismaError;
        }
      }
    });
    
    res.json(result);
  } catch (error) {
    console.error('Error updating order with items:', error);
    res.status(500).json({ error: 'Server error', details: error });
  }
};

// Función auxiliar para limpiar datos huérfanos (opcional)
export const cleanOrphanedOrderItems = async (req: Request, res: Response) => {
  try {
    // Obtener todos los IDs de productos válidos
    const validProductIds = await prisma.producto.findMany({
      select: { IdProducto: true }
    }).then(products => products.map(p => p.IdProducto));
    
    // Encontrar items huérfanos
    const orphanedItems = await prisma.ordenItem.findMany({
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
    const deleteResult = await prisma.ordenItem.deleteMany({
      where: {
        IdProducto: {
          notIn: validProductIds
        }
      }
    });
    
    res.json({ 
      message: 'Items huérfanos eliminados', 
      count: deleteResult.count,
      orphanedItems: orphanedItems.map(item => ({
        IdOrden: item.IdOrden,
        IdProducto: item.IdProducto
      }))
    });
  } catch (error) {
    console.error('Error cleaning orphaned items:', error);
    res.status(500).json({ error: 'Server error', details: error });
  }
};

// Delete orden (comentado en el original)
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