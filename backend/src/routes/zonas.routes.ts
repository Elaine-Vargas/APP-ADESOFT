import { Router } from 'express';
import { getAllZonas, searchZonas, searchZonasIdZona } from '../controllers/zonas.controller';

const router = Router();

// Mostrar todas las zonas
router.get('/', getAllZonas);

// Buscar zonas por el campo Zona (query param: q)
router.get('/search', searchZonas);

// Buscar zonas por el campo Idzona (query param: q)
router.get('/searchIdZona', searchZonasIdZona);

export default router; 