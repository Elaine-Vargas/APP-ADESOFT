import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface DateRange {
  startDate?: string;
  endDate?: string;
}

const formatDateToUTC = (date: Date): Date => {
  // Create a new date in local time
  const localDate = new Date(date);
  // Return a new date with the same year, month, and date in local time
  return new Date(
    localDate.getFullYear(),
    localDate.getMonth(),
    localDate.getDate()
  );
};

export const getSellerStats = async (req: Request, res: Response) => {
  try {
    const { VendedorId } = req.params;
    let { startDate, endDate } = req.query as unknown as DateRange;

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
      Tipo: 'IN' as const,
      IdVendedor: VendedorId  // Always filter by the specific seller
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

    // Prepare response
    const response: any = {
      vendedor: {
        id: seller.IdVendedor,
        nombre: seller.NombreV,
        tipo: seller.Vendedor === 1 ? 'Vendedor' : 'Administrador'
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

    // If seller is general, get statistics for other sellers
    if (seller.Vendedor !== 1) {
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

      // Then get their transaction stats
      const otherSellersStats = await Promise.all(
        allSellers.map(async (seller) => {
          const [stats, orderStats] = await Promise.all([
            prisma.transaccion.aggregate({
              where: {
                ...dateFilter,
                Tipo: 'IN' as const,
                IdVendedor: seller.IdVendedor
              },
              _sum: { Valor: true },
              _count: { _all: true }
            }),
            prisma.orden.aggregate({
              where: {
                ...dateFilter,
                IdVendedor: seller.IdVendedor
              },
              _sum: { Total: true },
              _count: { _all: true }
            })
          ]);

          return {
            id: seller.IdVendedor,
            nombre: seller.NombreV,
            cotizaciones: orderStats._count._all,
            valorCotizaciones: orderStats._sum.Total || 0,
            ingresos: stats._count._all,
            valorIngresos: stats._sum.Valor || 0,
          };
        })
      );

      
      // Add other sellers' statistics to the response
      const filteredSellers = otherSellersStats.filter(seller => seller.ingresos > 0 || seller.cotizaciones > 0);
      response.otrosVendedores = filteredSellers;
      
    }
    res.json(response);
  } catch (error) {
    console.error('Error en getSellerStats:', error);
    res.status(500).json({ error: 'Error al obtener estadísticas del vendedor' });
  }
};
