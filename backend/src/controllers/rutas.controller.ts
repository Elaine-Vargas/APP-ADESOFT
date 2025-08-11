import prisma from '../prisma';
import { Request, Response } from 'express';

// Obtener todas las rutas
export const getAllRutas = async (req: Request, res: Response) => {
  try {
    const rutas = await prisma.rutas.findMany();
    res.json(rutas);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error del servidor' });
  }
};

// Buscar rutas por el campo Ruta
export const searchRutas = async (req: Request, res: Response) => {
  const { q } = req.query;
  try {
    const rutas = await prisma.rutas.findMany({
      where: q ? { Ruta: { contains: q as string } } : undefined,
    });
    res.json(rutas);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error del servidor' });
  }
}; 
// Buscar rutas por el campo IdRuta
export const searchRutasIdRuta = async (req: Request, res: Response) => {
  const { q } = req.query;
  try {
    const rutas = await prisma.rutas.findMany({
      where: q ? { Idruta: { contains: q as string } } : undefined,
    });
    res.json(rutas);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error del servidor' });
  }
}; 