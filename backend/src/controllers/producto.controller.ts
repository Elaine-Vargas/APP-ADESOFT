import prisma from '../prisma'; 
import { Request, Response } from 'express';

// Get all products
export const getAllProductos = async (req: Request, res: Response) => {
  try {
    const productos = await prisma.producto.findMany();
    res.json(productos);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get all products (direct, for internal use) testing
export const getAllProductosDirect = async () => {
  return await prisma.producto.findMany();
};

// Get product by Id
export const getProductoById = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const producto = await prisma.producto.findUnique({
      where: { IdProducto: parseInt(id) },
    });
    if (!producto) {
      return res.status(404).json({ message: 'Producto no encontrado' });
    }
    res.json(producto);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Dynamic search for products
export const searchProductos = async (req: Request, res: Response) => {
  try {
    const {
      q,
      CodigoP,
      ReferenciaP,
      PresentacionP,
      NombreP,
      GrupoP,
    } = req.query;

    let where: any = {};

    if (q) {
      where.OR = [
        { NombreP: { contains: q as string } },
        { CodigoP: { contains: q as string } },
        { ReferenciaP: { contains: q as string } },
        { PresentacionP: { contains: q as string } },
        { GrupoP: { contains: q as string } },
      ];
    } else {
      if (CodigoP) where.CodigoP = { contains: CodigoP };
      if (ReferenciaP) where.ReferenciaP = { contains: ReferenciaP };
      if (PresentacionP) where.PresentacionP = { contains: PresentacionP };
      if (NombreP) where.NombreP = { contains: NombreP };
      if (GrupoP) where.GrupoP = { contains: GrupoP };
    }

    const productos = await prisma.producto.findMany({ where });
    res.json(productos);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

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
export const updateProducto = async (req: Request, res: Response) => {
  const { id } = req.params;
  const data = req.body;
  try {
    const updated = await prisma.producto.update({
      where: { IdProducto: parseInt(id) },
      data,
    });
    res.json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

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
