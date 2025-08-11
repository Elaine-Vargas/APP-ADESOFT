"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getConfigById = exports.getAllConfigs = void 0;
const prisma_1 = __importDefault(require("../prisma"));
// Get all configs
const getAllConfigs = async (req, res) => {
    try {
        const configs = await prisma_1.default.config.findMany();
        res.json(configs);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
};
exports.getAllConfigs = getAllConfigs;
// Get config by Id
const getConfigById = async (req, res) => {
    const { id } = req.params;
    try {
        const config = await prisma_1.default.config.findUnique({
            where: { IdConfig: parseInt(id) },
        });
        if (!config) {
            return res.status(404).json({ message: 'Config no encontrado' });
        }
        res.json(config);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
};
exports.getConfigById = getConfigById;
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
//# sourceMappingURL=config.controller.js.map