import { Router } from 'express';
import {
  getAllConfigs,
  getConfigById,
  // searchConfigs,
  // createConfig,
  // updateConfig,
  // deleteConfig
} from '../controllers/config.controller';

const router = Router();

// Get all configs
router.get('/', getAllConfigs);

// Get config by ID
router.get('/:id', getConfigById);

// // Dynamic search
// router.get('/search', searchConfigs);

// Create config
// router.post('/', createConfig);

// // Update config
// router.put('/:id', updateConfig);

// router.delete('/:id', deleteConfig);

export default router;
