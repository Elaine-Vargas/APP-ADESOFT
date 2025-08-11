import express from 'express';
import { 
  generateFacturaPDF, 
  getFacturaData, 
  generateFacturaPDFImproved, 
  generateFacturaTransaccionIN,
  } from '../controllers/factura.controller';

const router = express.Router();

// Generate PDF invoice for an order
router.get('/pdf/:id', generateFacturaPDF);

// Generate PDF invoice with improved design
router.get('/pdf-improved/:id', generateFacturaPDFImproved);

// Get invoice data without generating PDF
router.get('/data/:id', getFacturaData);

// Generate PDF for IN transaction (payment receipt)
router.get('/transaccion-in/:id', generateFacturaTransaccionIN);

export default router;