
import { Router } from 'express';
import {
  getAllVendedores,
  getVendedorById,
//   createVendedor,
  updateVendedor,
//   deleteVendedor,
  loginVendedor
} from '../controllers/vendedor.controller';

const router = Router();


// Get all vendedores
router.get('/', getAllVendedores);

// Get vendedor by ID
router.get('/:id', getVendedorById);

// Login vendedor
router.post('/login', loginVendedor);

// Create vendedor
// router.post('/', createVendedor);

// Update vendedor
router.put('/:id', updateVendedor);

// Delete vendedor
// router.delete('/:id', deleteVendedor);

export default router;
