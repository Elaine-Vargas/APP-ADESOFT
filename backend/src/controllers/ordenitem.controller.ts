
import prisma from '../prisma';
import { Request, Response } from 'express';

// Get all orden items
export const getAllOrdenItems = async (req: Request, res: Response) => {
  try {
    const items = await prisma.ordenItem.findMany({ include: { Producto: true, orden: true } });
    res.json(items);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get orden item by composite key
export const getOrdenItemById = async (req: Request, res: Response) => {
  const { IdOrden, IdProducto } = req.params;
  try {
    const item = await prisma.ordenItem.findUnique({
      where: { IdOrden_IdProducto: { IdOrden: parseInt(IdOrden), IdProducto: parseInt(IdProducto) } },
      include: { Producto: true, orden: true }
    });
    if (!item) {
      return res.status(404).json({ message: 'OrdenItem no encontrado' });
    }
    res.json(item);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Dynamic search for orden items
export const searchOrdenItems = async (req: Request, res: Response) => {
  try {
    const {
      IdOrden,
      IdProducto,
      minCantidad,
      maxCantidad,
      minPrecioV,
      maxPrecioV
    } = req.query;

    const where: any = {};
    if (IdOrden) where.IdOrden = parseInt(IdOrden as string);
    if (IdProducto) where.IdProducto = parseInt(IdProducto as string);
    if (minCantidad || maxCantidad) {
      where.Cantidad = {};
      if (minCantidad) where.Cantidad.gte = parseFloat(minCantidad as string);
      if (maxCantidad) where.Cantidad.lte = parseFloat(maxCantidad as string);
    }
    if (minPrecioV || maxPrecioV) {
      where.PrecioV = {};
      if (minPrecioV) where.PrecioV.gte = parseFloat(minPrecioV as string);
      if (maxPrecioV) where.PrecioV.lte = parseFloat(maxPrecioV as string);
    }

    const items = await prisma.ordenItem.findMany({ where, include: { Producto: true, orden: true } });
    res.json(items);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Create orden item
export const createOrdenItem = async (req: Request, res: Response) => {
  const data = req.body;
  try {
    const newItem = await prisma.ordenItem.create({ data });
    res.status(201).json(newItem);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Update orden item
export const updateOrdenItem = async (req: Request, res: Response) => {
  const { IdOrden, IdProducto } = req.params;
  const data = req.body;
  try {
    const updated = await prisma.ordenItem.update({
      where: { IdOrden_IdProducto: { IdOrden: parseInt(IdOrden), IdProducto: parseInt(IdProducto) } },
      data,
    });
    res.json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Delete orden item
export const deleteOrdenItem = async (req: Request, res: Response) => {
  const { IdOrden, IdProducto } = req.params;
  try {
    await prisma.ordenItem.delete({
      where: { IdOrden_IdProducto: { IdOrden: parseInt(IdOrden), IdProducto: parseInt(IdProducto) } },
    });
    res.json({ message: 'OrdenItem eliminado' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};
