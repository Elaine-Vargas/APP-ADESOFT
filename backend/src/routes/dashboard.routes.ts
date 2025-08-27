import { Router } from 'express';
import dashboardController from '../controllers/dashboard.controller';

const router = Router();

/**
 * @route GET /api/dashboard/seller/:sellerId
 * @description Get seller statistics including orders and income transactions
 * @query startDate (optional) - Start date in YYYY-MM-DD format (default: current date)
 * @query endDate (optional) - End date in YYYY-MM-DD format (default: current date)
 * @returns {Object} Seller statistics
 */
router.get('/vendedor/:VendedorId', dashboardController.getSellerStats);

export default router;