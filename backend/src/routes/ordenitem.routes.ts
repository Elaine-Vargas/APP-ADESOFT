import { Router } from 'express';
import {
  getAllOrdenItems,
  getOrdenItemById,
  searchOrdenItems,
  createOrdenItem,
  updateOrdenItem,
  deleteOrdenItem
} from '../controllers/ordenitem.controller';

const router = Router();

// Get all orden items
router.get('/', getAllOrdenItems);

// Get orden item by composite key
router.get('/:IdOrden/:IdProducto', getOrdenItemById);

// Dynamic search
router.get('/search', searchOrdenItems);

// Create orden item
router.post('/', createOrdenItem);

// Update orden item
router.put('/:IdOrden/:IdProducto', updateOrdenItem);

// Delete orden item
router.delete('/:IdOrden/:IdProducto', deleteOrdenItem);

export default router;
