import express from 'express';
import { 
  getFacturaData, 
  generateFacturaPDF, 
  generateFacturaTransaccionIN,
  generateFacturaPDFWithSize,
  } from '../controllers/factura.controller';

const router = express.Router();
router.get('/test', (req, res) => {
  res.json({ message: 'Test route works!' });
});
// Generate PDF invoice with improved design
router.get('/pdf/:id', generateFacturaPDF);


router.get('/pdf-sized/:id', generateFacturaPDFWithSize);

// Get invoice data without generating PDF
router.get('/data/:id', getFacturaData);

// Generate PDF for IN transaction (payment receipt)
router.get('/transaccion-in/:id', generateFacturaTransaccionIN);



export default router;