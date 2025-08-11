import { Router } from 'express';
import {
  getAllOrdenes,
  getOrdenById,
  searchOrdenes,
  createOrden,
  createOrdenWithItems,
  updateOrden,
  updateOrdenWithItems,
  // deleteOrden
} from '../controllers/orden.controller';

const router = Router();

// Get all ordenes
router.get('/', getAllOrdenes);

// Get orden by ID
router.get('/:id', getOrdenById);

// Dynamic search
router.get('/search', searchOrdenes);

// Create orden
router.post('/', createOrden);

// Create orden with items
router.post('/with-items', createOrdenWithItems);

// Update orden with items
router.put('/:id/with-items', updateOrdenWithItems);

// Update orden
router.put('/:id', updateOrden);


// router.delete('/:id', deleteOrden);

export default router;
