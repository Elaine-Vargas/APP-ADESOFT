import { Router } from 'express';
import {
  getAllReferenciaPagos,
  getReferenciaPagoById,
  searchReferenciaPagos,
  createReferenciaPago,
  updateReferenciaPago,
  // deleteReferenciaPago
} from '../controllers/referenciapago.controller';

const router = Router();

// Get all referencias de pago
router.get('/', getAllReferenciaPagos);

// Get referencia de pago by ID
router.get('/:id', getReferenciaPagoById);

// Dynamic search
router.get('/search', searchReferenciaPagos);

// Create referencia de pago
router.post('/', createReferenciaPago);

// Update referencia de pago
router.put('/:id', updateReferenciaPago);

// router.delete('/:id', deleteReferenciaPago);

export default router;
