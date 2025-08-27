import { Router } from 'express';
import { getSellerStats } from '../controllers/dashboard.controller';

const router = Router();

router.get('/vendedor/:VendedorId', getSellerStats);

export default router;