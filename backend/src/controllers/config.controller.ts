
import prisma from '../prisma';
import { Request, Response } from 'express';

// Get all configs
export const getAllConfigs = async (req: Request, res: Response) => {
  try {
    const configs = await prisma.config.findMany();
    res.json(configs);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get config by Id
export const getConfigById = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const config = await prisma.config.findUnique({
      where: { IdConfig: parseInt(id) },
    });
    if (!config) {
      return res.status(404).json({ message: 'Config no encontrado' });
    }
    res.json(config);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

// // Dynamic search for configs
// export const searchConfigs = async (req: Request, res: Response) => {
//   try {
//     const {
//       Compania,
//       Rnc,
//       Telefono,
//       Email,
//       TipoImpuesto
//     } = req.query;

//     const where: any = {};
//     if (Compania) where.Compania = { contains: Compania };
//     if (Rnc) where.Rnc = { contains: Rnc };
//     if (Telefono) where.Telefono = { contains: Telefono };
//     if (Email) where.Email = { contains: Email };
//     if (TipoImpuesto) where.TipoImpuesto = TipoImpuesto;

//     const configs = await prisma.config.findMany({ where });
//     res.json(configs);
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ error: 'Server error' });
//   }
// };

// // Create config
// export const createConfig = async (req: Request, res: Response) => {
//   const data = req.body;
//   try {
//     const newConfig = await prisma.config.create({ data });
//     res.status(201).json(newConfig);
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ error: 'Server error' });
//   }
// };

// // Update config
// export const updateConfig = async (req: Request, res: Response) => {
//   const { id } = req.params;
//   const data = req.body;
//   try {
//     const updated = await prisma.config.update({
//       where: { IdConfig: parseInt(id) },
//       data,
//     });
//     res.json(updated);
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ error: 'Server error' });
//   }
// };

// // Delete config 
// // export const deleteConfig = async (req: Request, res: Response) => {
// //   const { id } = req.params;
// //   try {
// //     await prisma.config.delete({
// //       where: { IdConfig: parseInt(id) },
// //     });
// //     res.json({ message: 'Config eliminado' });
// //   } catch (error) {
// //     console.error(error);
// //     res.status(500).json({ error: 'Server error' });
// //   }
// // };
