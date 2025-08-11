import { Router } from 'express';
import { getAllRutas, searchRutas, searchRutasIdRuta } from '../controllers/rutas.controller';

const router = Router();

// Mostrar todas las rutas
router.get('/', getAllRutas);

// Buscar rutas por el campo Ruta (query param: q)
router.get('/search', searchRutas);

// Buscar rutas por el campo IdRuta (query param: q)
router.get('/searchIdRuta', searchRutasIdRuta);

export default router; 