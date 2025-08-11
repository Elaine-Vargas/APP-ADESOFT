import prisma from '../prisma';
import { Request, Response } from 'express';

// Obtener todas las zonas
export const getAllZonas = async (req: Request, res: Response) => {
  try {
    const zonas = await prisma.zonas.findMany();
    res.json(zonas);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error del servidor' });
  }
};

// Buscar zonas por el campo Zona
export const searchZonas = async (req: Request, res: Response) => {
  const { q } = req.query;
  try {
    const zonas = await prisma.zonas.findMany({
      where: q ? { Zona: { contains: q as string } } : undefined,
    });
    res.json(zonas);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error del servidor' });
  }
};

// Buscar zonas por el campo Idzona
export const searchZonasIdZona = async (req: Request, res: Response) => {
  const { q } = req.query;
  try {
    const zonas = await prisma.zonas.findMany({
      where: q ? { Idzona: { contains: q as string } } : undefined,
    });
    res.json(zonas);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error del servidor' });
  }
}; 