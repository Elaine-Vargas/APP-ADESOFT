"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSellerStats = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const formatDateToUTC = (date) => {
    // Create a new date in local time
    const localDate = new Date(date);
    // Return a new date with the same year, month, and date in local time
    return new Date(localDate.getFullYear(), localDate.getMonth(), localDate.getDate());
};
const getSellerStats = async (req, res) => {
    try {
        const { VendedorId } = req.params;
        let { startDate, endDate } = req.query;
        // If no dates provided, set both to today
        if (!startDate && !endDate) {
            const today = new Date().toISOString().split('T')[0];
            startDate = today;
            endDate = today;
        }
        // Parse dates
        const start = new Date(startDate || '');
        const end = new Date(endDate || '');
        // Set time to start of day for start date (00:00:00)
        const startOfDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());
        // Set time to end of day for end date (23:59:59.999)
        const endOfDay = new Date(end.getFullYear(), end.getMonth(), end.getDate() + 1);
        // Format to UTC for database queries
        const startUTC = formatDateToUTC(startOfDay);
        const endUTC = formatDateToUTC(endOfDay);
        // Get seller information including Vendedor type
        const seller = await prisma.vendedor.findUnique({
            where: { IdVendedor: VendedorId },
            select: {
                IdVendedor: true,
                NombreV: true,
                Vendedor: true
            }
        });
        if (!seller) {
            return res.status(404).json({ error: 'Vendedor no encontrado' });
        }
        // Base where clause for date filtering
        const dateFilter = {
            Fecha: {
                gte: startUTC,
                lte: endUTC
            }
        };
        // Get order count for the date range
        const orderWhereClause = {
            ...dateFilter,
            IdVendedor: VendedorId
        };
        const orderCount = await prisma.orden.count({
            where: orderWhereClause
        });
        const orderIncome = await prisma.orden.aggregate({
            where: {
                ...dateFilter,
                IdVendedor: VendedorId
            },
            _sum: { Total: true }
        });
        // Get income transactions for the date range
        const transactionsWhereClause = {
            ...dateFilter,
            Tipo: 'IN',
            IdVendedor: VendedorId // Always filter by the specific seller
        };
        const incomeTransactions = await prisma.transaccion.findMany({
            where: transactionsWhereClause,
            select: {
                IdVendedor: true,
                Valor: true,
                Fecha: true,
                Concepto: true,
                Vendedor: {
                    select: {
                        IdVendedor: true,
                        NombreV: true
                    }
                }
            },
            orderBy: {
                IdVendedor: 'asc' // Group by seller
            }
        });
        // Process transactions to include seller info
        const processedTransactions = incomeTransactions.map(t => ({
            ...t,
            Vendedor: {
                id: t.Vendedor.IdVendedor,
                nombre: t.Vendedor.NombreV
            },
            Fecha: t.Fecha.toISOString().split('T')[0]
        }));
        // Calculate total income
        const totalIncome = incomeTransactions.reduce((sum, transaction) => {
            return sum + (transaction.Valor || 0);
        }, 0);
        // Prepare response with the exact requested dates
        const responseStartDate = startDate ? startDate.split('T')[0] : new Date().toISOString().split('T')[0];
        const responseEndDate = endDate ? endDate.split('T')[0] : new Date().toISOString().split('T')[0];
        // Determine if seller is admin (assuming Vendedor = 0 means admin, 1 means regular seller)
        const isAdmin = seller.Vendedor === 0;
        // Prepare response
        const response = {
            vendedor: {
                id: seller.IdVendedor,
                nombre: seller.NombreV,
                tipo: isAdmin ? 'Administrador' : 'Vendedor'
            },
            periodo: {
                inicio: responseStartDate,
                fin: responseEndDate
            },
            estadisticas: {
                cotizaciones: orderCount,
                valorCotizaciones: orderIncome._sum.Total || 0,
                ingresos: incomeTransactions.length,
                valorIngresos: totalIncome,
            },
            transacciones: processedTransactions
        };
        // If seller is admin, get statistics for ALL other sellers
        if (isAdmin) {
            console.log(`=== ADMINISTRADOR DETECTADO: ${seller.NombreV} (${VendedorId}) ===`);
            console.log(`Rango de fechas: ${startUTC} a ${endUTC}`);
            // Debug: First check what sellers exist in the database
            const allSellersInDB = await prisma.vendedor.findMany({
                select: {
                    IdVendedor: true,
                    NombreV: true,
                    Vendedor: true,
                },
                orderBy: {
                    IdVendedor: 'asc'
                }
            });
            console.log('\n=== TODOS LOS VENDEDORES EN LA BD ===');
            allSellersInDB.forEach(s => {
                console.log(`${s.IdVendedor} - ${s.NombreV} - Tipo: ${s.Vendedor === 0 ? 'Admin' : 'Vendedor'}`);
            });
            // Debug: Check orders in date range for ALL sellers
            const ordersInRange = await prisma.orden.findMany({
                where: {
                    Fecha: {
                        gte: startUTC,
                        lte: endUTC
                    }
                },
                select: {
                    IdVendedor: true,
                    Total: true,
                    Fecha: true
                }
            });
            console.log('\n=== ÓRDENES EN EL RANGO DE FECHAS ===');
            const ordersByVendor = ordersInRange.reduce((acc, order) => {
                if (!acc[order.IdVendedor]) {
                    acc[order.IdVendedor] = { count: 0, total: 0 };
                }
                acc[order.IdVendedor].count++;
                acc[order.IdVendedor].total += order.Total || 0;
                return acc;
            }, {});
            Object.keys(ordersByVendor).forEach(vendorId => {
                console.log(`${vendorId}: ${ordersByVendor[vendorId].count} órdenes, Total: ${ordersByVendor[vendorId].total}`);
            });
            // Debug: Check transactions in date range for ALL sellers
            const transactionsInRange = await prisma.transaccion.findMany({
                where: {
                    Fecha: {
                        gte: startUTC,
                        lte: endUTC
                    },
                    Tipo: 'IN'
                },
                select: {
                    IdVendedor: true,
                    Valor: true,
                    Fecha: true
                }
            });
            console.log('\n=== TRANSACCIONES IN EN EL RANGO DE FECHAS ===');
            const transactionsByVendor = transactionsInRange.reduce((acc, transaction) => {
                if (!acc[transaction.IdVendedor]) {
                    acc[transaction.IdVendedor] = { count: 0, total: 0 };
                }
                acc[transaction.IdVendedor].count++;
                acc[transaction.IdVendedor].total += transaction.Valor || 0;
                return acc;
            }, {});
            Object.keys(transactionsByVendor).forEach(vendorId => {
                console.log(`${vendorId}: ${transactionsByVendor[vendorId].count} transacciones, Total: ${transactionsByVendor[vendorId].total}`);
            });
            // Now get active sellers excluding current one
            const allSellers = await prisma.vendedor.findMany({
                where: {
                    NOT: {
                        IdVendedor: VendedorId
                    },
                },
                select: {
                    IdVendedor: true,
                    NombreV: true,
                    Vendedor: true
                },
                orderBy: {
                    IdVendedor: 'asc'
                }
            });
            console.log(`\n=== VENDEDORES ACTIVOS (EXCLUYENDO ${VendedorId}) ===`);
            console.log(`Encontrados ${allSellers.length} vendedores activos`);
            allSellers.forEach(s => {
                console.log(`${s.IdVendedor} - ${s.NombreV}`);
            });
            // Get stats for each seller
            const otherSellersStats = [];
            for (const sellerInfo of allSellers) {
                console.log(`\n--- Procesando: ${sellerInfo.NombreV} (${sellerInfo.IdVendedor}) ---`);
                const orderCount = ordersByVendor[sellerInfo.IdVendedor]?.count || 0;
                const orderTotal = ordersByVendor[sellerInfo.IdVendedor]?.total || 0;
                const transactionCount = transactionsByVendor[sellerInfo.IdVendedor]?.count || 0;
                const transactionTotal = transactionsByVendor[sellerInfo.IdVendedor]?.total || 0;
                const vendedorStats = {
                    id: sellerInfo.IdVendedor,
                    nombre: sellerInfo.NombreV,
                    tipo: sellerInfo.Vendedor === 0 ? 'Administrador' : 'Vendedor',
                    cotizaciones: orderCount,
                    valorCotizaciones: orderTotal,
                    ingresos: transactionCount,
                    valorIngresos: transactionTotal,
                };
                console.log(`Resultado para ${sellerInfo.NombreV}:`, vendedorStats);
                const hasActivity = vendedorStats.ingresos > 0 || vendedorStats.cotizaciones > 0;
                console.log(`¿Tiene actividad? ${hasActivity}`);
                if (hasActivity) {
                    otherSellersStats.push(vendedorStats);
                    console.log(`✓ AGREGADO A LA LISTA`);
                }
                else {
                    console.log(`✗ NO AGREGADO (sin actividad)`);
                }
            }
            console.log(`\n=== RESULTADO FINAL ===`);
            console.log(`Total vendedores con actividad: ${otherSellersStats.length}`);
            otherSellersStats.forEach(seller => {
                console.log(`✓ ${seller.id} - ${seller.nombre} (C:${seller.cotizaciones}, I:${seller.ingresos})`);
            });
            response.otrosVendedores = otherSellersStats;
        }
        else {
            console.log(`=== VENDEDOR REGULAR: ${seller.NombreV} (${VendedorId}) ===`);
            console.log('No se incluyen otros vendedores');
        }
        console.log('Respuesta final:', JSON.stringify(response, null, 2));
        res.json(response);
    }
    catch (error) {
        console.error('Error en getSellerStats:', error);
        res.status(500).json({ error: 'Error al obtener estadísticas del vendedor' });
    }
};
exports.getSellerStats = getSellerStats;
//# sourceMappingURL=dashboard.controller.js.map