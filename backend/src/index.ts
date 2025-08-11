import express from 'express';
import productoRoutes from './routes/producto.routes';
import vendedorRoutes from './routes/vendedor.routes';
import clienteRoutes from './routes/cliente.routes';
import ordenRoutes from './routes/orden.routes';
import ordenItemRoutes from './routes/ordenitem.routes';
import configRoutes from './routes/config.routes';
import transaccionRoutes from './routes/transaccion.routes';
import referenciaPagoRoutes from './routes/referenciapago.routes';
import rutasRoutes from './routes/rutas.routes';
import zonasRoutes from './routes/zonas.routes';
import facturaRoutes from './routes/factura.routes';

import cors from 'cors';

const app = express();
app.use(express.json());
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:8081' }));

app.use('/api/productos', productoRoutes);
app.use('/api/vendedores', vendedorRoutes);
app.use('/api/clientes', clienteRoutes);
app.use('/api/ordenes', ordenRoutes);
app.use('/api/orden-items', ordenItemRoutes);
app.use('/api/configs', configRoutes);
app.use('/api/transacciones', transaccionRoutes);
app.use('/api/referencias-pago', referenciaPagoRoutes);
app.use('/api/rutas', rutasRoutes);
app.use('/api/zonas', zonasRoutes);
app.use('/api/facturas', facturaRoutes);

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});
