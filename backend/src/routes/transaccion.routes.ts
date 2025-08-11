import { Router } from 'express';
import {
  getAllTransacciones,
  getTransaccionById,
  searchTransacciones,
  createTransaccion,
  updateTransaccion,
  getTransaccionesPendientesPorVendedor,
  getTransaccionesPendientesPorCliente,
  createIngresoAndPago,
  getTransaccionesIngresos,
  getIngresoByDocumento,
  getReferenciasByDocumento,
  // deleteTransaccion
} from '../controllers/transaccion.controller';

const router = Router();

// Get all transacciones
router.get('/', getAllTransacciones);

router.get('/ingresos', getTransaccionesIngresos);
// Get transaccion by ID
router.get('/:id', getTransaccionById);

router.get('/referencias/:documento/:tipo', getReferenciasByDocumento);
// Get pending transactions by Vendedor's route
router.get('/pendientes/vendedor/:idVendedor', getTransaccionesPendientesPorVendedor);

// Get pending transactions by Cliente
router.get('/pendientes/cliente/:idCliente', getTransaccionesPendientesPorCliente);

// Get ingresos
router.get('/info-ingreso/:documento', getIngresoByDocumento);

// Dynamic search
router.get('/search', searchTransacciones);

// Create transaccion
router.post('/', createTransaccion);
router.post('/ingreso-pago', createIngresoAndPago);

// Update transaccion
router.put('/:id', updateTransaccion);

// router.delete('/:id', deleteTransaccion);

export default router;
