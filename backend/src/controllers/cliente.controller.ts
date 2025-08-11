
import prisma from '../prisma';
import { Request, Response } from 'express';

// Get all clientes
export const getAllClientes = async (req: Request, res: Response) => {
  const { Idruta } = req.query;

  try {
    const whereClause: { Idruta?: string } = {};

    if (Idruta && typeof Idruta === 'string' && Idruta.trim() !== '') {
      whereClause.Idruta = Idruta;
    }

    const clientes = await prisma.cliente.findMany({
      where: whereClause,
    });
    res.json(clientes);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get cliente by Id
export const getClienteById = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const cliente = await prisma.cliente.findUnique({
      where: { IdCliente: id },
    });
    if (!cliente) {
      return res.status(404).json({ message: 'Cliente no encontrado' });
    }
    res.json(cliente);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Dynamic search for clientes
export const searchClientes = async (req: Request, res: Response) => {
  try {
    const {
      NombreC,
      Rnc,
      TelefonoC,
      IdVendedor,
      Idzona,
      Idruta,
      q,
    } = req.query;

    let where: any = {};

    // Agrupación de filtros: si ambos presentes, ambos se aplican (AND)
    if (Idzona) {
      where.Idzona = Idzona;
    }
    if (Idruta) {
      where.Idruta = Idruta;
    }

    // Búsqueda dinámica para los demás campos
    const dynamicOr: any[] = [];
    if (q) {
      dynamicOr.push(
        { NombreC: { contains: q as string } },
        { Rnc: { contains: q as string } },
        { TelefonoC: { contains: q as string } },
        { IdVendedor: { contains: q as string } }
      );
    } else {
      if (NombreC) dynamicOr.push({ NombreC: { contains: NombreC as string } });
      if (Rnc) dynamicOr.push({ Rnc: { contains: Rnc as string } });
      if (TelefonoC) dynamicOr.push({ TelefonoC: { contains: TelefonoC as string } });
      if (IdVendedor) dynamicOr.push({ IdVendedor: { contains: IdVendedor as string } });
    }

    if (dynamicOr.length > 0) {
      where.OR = dynamicOr;
    }

    const clientes = await prisma.cliente.findMany({ where });
    res.json(clientes);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Create cliente
export const createCliente = async (req: Request, res: Response) => {
  const data = req.body;
  try {
    const newCliente = await prisma.cliente.create({ data });
    res.status(201).json(newCliente);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Update cliente
export const updateCliente = async (req: Request, res: Response) => {
  const { id } = req.params;
  const data = req.body;
  try {
    const updated = await prisma.cliente.update({
      where: { IdCliente: id },
      data,
    });
    res.json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Delete cliente
// export const deleteCliente = async (req: Request, res: Response) => {
//   const { id } = req.params;
//   try {
//     await prisma.cliente.delete({
//       where: { IdCliente: id },
//     });
//     res.json({ message: 'Cliente eliminado' });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ error: 'Server error' });
//   }
// };
