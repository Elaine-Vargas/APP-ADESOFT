import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface DateRange {
  startDate?: string;
  endDate?: string;
}

const formatDateToUTC = (date: Date): Date => {
  // Returns a new date with time set to 00:00:00 in UTC
  return new Date(Date.UTC(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  ));
};
export const getSellerStats = async (req: Request, res: Response) => {
  try {
    const { VendedorId } = req.params;
    const { startDate, endDate } = req.query as unknown as DateRange;

    // Set default dates if not provided and format to UTC
    const start = startDate ? formatDateToUTC(new Date(startDate)) : formatDateToUTC(new Date());
    const end = endDate ? formatDateToUTC(new Date(endDate)) : formatDateToUTC(new Date());
    
    // For the end date, we want to include the entire day
    const endOfDay = new Date(end);
    endOfDay.setUTCDate(endOfDay.getUTCDate() + 1);
    endOfDay.setUTCMilliseconds(-1);

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
        gte: start,
        lte: endOfDay
      }
    };

    // Get order count for the date range
    const orderWhereClause = {
      ...dateFilter,
      ...(seller.Vendedor === 1 ? { IdVendedor: VendedorId } : {})
    };

    const orderCount = await prisma.orden.count({
      where: orderWhereClause
    });

    // Get income transactions for the date range
    const transactionsWhereClause = {
      ...dateFilter,
      Tipo: 'IN' as const,  // Use 'as const' to ensure type safety with Prisma enum
      ...(seller.Vendedor === 1 ? { IdVendedor: VendedorId } : {})
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

    // Prepare response
    const response: any = {
      vendedor: {
        id: seller.IdVendedor,
        nombre: seller.NombreV,
        tipo: seller.Vendedor === 1 ? 'Exclusivo' : 'General'
      },
      periodo: {
        inicio: start.toISOString().split('T')[0],
        fin: end.toISOString().split('T')[0]
      },
      estadisticas: {
        cotizaciones: orderCount,
        transacciones: incomeTransactions.length,
        ingresos: totalIncome,
      },
      transacciones: processedTransactions
    };

    // If seller is general, get statistics for other sellers
    if (seller.Vendedor !== 1) {
      console.log('Fetching other sellers...');
      // First, get all other sellers
      const allSellers = await prisma.vendedor.findMany({
        where: {
          NOT: {
            IdVendedor: VendedorId
          },
          Activo: 1  // Only active sellers
        },
        select: {
          IdVendedor: true,
          NombreV: true
        }
      });
      console.log('All active sellers:', JSON.stringify(allSellers, null, 2));

      // Then get their transaction stats
      const otherSellersStats = await Promise.all(
        allSellers.map(async (seller) => {
          const [stats, orderCount] = await Promise.all([
            prisma.transaccion.aggregate({
              where: {
                ...dateFilter,
                Tipo: 'IN' as const,
                IdVendedor: seller.IdVendedor
              },
              _sum: { Valor: true },
              _count: { _all: true }
            }),
            prisma.orden.count({
              where: {
                ...dateFilter,
                IdVendedor: seller.IdVendedor
              }
            })
          ]);


          return {
            id: seller.IdVendedor,
            nombre: seller.NombreV,
            transacciones: stats._count._all,
            ingresos: stats._sum.Valor || 0,
            cotizaciones: orderCount
          };
        })
      );

      console.log('All sellers with stats:', JSON.stringify(otherSellersStats, null, 2));
      
      // Add other sellers' statistics to the response
      const filteredSellers = otherSellersStats.filter(seller => seller.transacciones > 0 || seller.cotizaciones > 0);
      response.otrosVendedores = filteredSellers;
      
      console.log('Final response with otrosVendedores:', JSON.stringify({
        ...response,
        otrosVendedores: filteredSellers
      }, null, 2));
    }

    res.json(response);
  } catch (error) {
    console.error('Error en getSellerStats:', error);
    res.status(500).json({ error: 'Error al obtener estadísticas del vendedor' });
  }
};

