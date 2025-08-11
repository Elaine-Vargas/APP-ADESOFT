import { Request, Response } from 'express';
import PDFDocument from 'pdfkit';
import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

// Generate PDF invoice for an order
export const generateFacturaPDF = async (req: Request, res: Response) => {
  const { id } = req.params;
  
  try {
    // Get order with all related data
    const orden = await prisma.orden.findUnique({
      where: { IdOrden: parseInt(id) },
      include: { 
        items: { 
          include: { producto: true } 
        }, 
        Cliente: true, 
        Vendedor: true 
      }
    });

    if (!orden) {
      return res.status(404).json({ message: 'Orden no encontrada' });
    }

    // Get company configuration
    const config = await prisma.config.findFirst();
    if (!config) {
      return res.status(404).json({ message: 'Configuración de empresa no encontrada' });
    }

    // Create PDF document
    const doc = new PDFDocument({
      size: 'A4',
      margin: 50
    });

    // Set response headers for PDF download
    const fileName = `FACT-${String(orden.IdOrden).padStart(8, '0')}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    
    // Pipe PDF directly to response
    doc.pipe(res);

    // Helper function to format number as 8-digit string
    const formatDocumentNumber = (id: number): string => {
      return String(id).padStart(8, '0');
    };

    // Helper function to format currency
    const formatCurrency = (amount: number): string => {
      return new Intl.NumberFormat('es-DO', {
        style: 'currency',
        currency: 'DOP'
      }).format(amount);
    };

    // Helper function to format date
    const formatDate = (date: Date): string => {
      return new Intl.DateTimeFormat('es-DO', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }).format(new Date(date));
    };

    // Helper function to format date and time
    const formatDateTime = (date: Date): string => {
      return new Intl.DateTimeFormat('es-DO', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      }).format(new Date(date));
    };

    // Header section with company info on left and document info on right
    const headerY = 60;
    const companyInfoX = 60;
    const documentInfoX = 400;
    
    // Company information on the left
    doc.fontSize(16).font('Helvetica-Bold').text(config.Compania, companyInfoX, headerY);
    doc.fontSize(10).font('Helvetica');
    
    let companyY = headerY + 20;
    
    // Combine address lines with semicolon separator
    let addressLine = '';
    if (config.Direccion1) {
      addressLine += config.Direccion1;
    }
    if (config.Direccion2) {
      if (addressLine) addressLine += '; ';
      addressLine += config.Direccion2;
    }
    if (addressLine) {
      doc.text(addressLine, companyInfoX, companyY);
      companyY += 15;
    }
    
    if (config.Telefono) {
      doc.text(`Tel: ${config.Telefono}`, companyInfoX, companyY);
      companyY += 15;
    }
    if (config.Rnc) {
      doc.text(`RNC: ${config.Rnc}`, companyInfoX, companyY);
    }

    // Document information on the right
    const documentNumber = formatDocumentNumber(orden.IdOrden);
    doc.fontSize(12).font('Helvetica-Bold').text(`Documento: ${documentNumber}`, documentInfoX, headerY);
    doc.fontSize(10).font('Helvetica');
    doc.text(`Fecha: ${formatDate(orden.Fecha)}`, documentInfoX, headerY + 20);
    doc.text(`Fecha de Creación: ${formatDateTime(orden.FechaCreacion || new Date())}`, documentInfoX, headerY + 35);
    doc.moveDown(2);

    // Client and Vendor information side by side
    const leftColumnX = 60;
    const rightColumnX = 300;
    const infoY = doc.y;

    // Client information on the left
    doc.fontSize(12).font('Helvetica-Bold').text('CLIENTE', leftColumnX, infoY);
    doc.fontSize(10).font('Helvetica');
    let clientY = infoY + 20;
    doc.text(`Cliente: ${orden.Cliente.NombreC}`, leftColumnX, clientY);
    clientY += 15;
    if (orden.Cliente.Rnc) {
      doc.text(`RNC: ${orden.Cliente.Rnc}`, leftColumnX, clientY);
      clientY += 15;
    }
    if (orden.Cliente.TelefonoC) {
      doc.text(`Teléfono: ${orden.Cliente.TelefonoC}`, leftColumnX, clientY);
    }

    // Vendor information on the right (same Y level as client)
    doc.fontSize(12).font('Helvetica-Bold').text('VENDEDOR', rightColumnX, infoY);
    doc.fontSize(10).font('Helvetica');
    let vendorInfoY = infoY + 40;
    doc.text(`Vendedor: ${orden.Vendedor.NombreV}`, leftColumnX, vendorInfoY);
    vendorInfoY += 15;
    if (orden.Vendedor.TelefonoV) {
      doc.text(`Teléfono: ${orden.Vendedor.TelefonoV}`, leftColumnX, vendorInfoY);
    }

    // Items table header
    doc.fontSize(12).font('Helvetica-Bold').text('DETALLES DE LA ORDEN');
    doc.moveDown(0.5);

    // Table headers
    const tableY = doc.y;
    const colWidths = [50, 200, 80, 80, 80, 80];
    const colX = [50, 100, 300, 380, 460, 540];

    doc.fontSize(10).font('Helvetica-Bold');
    doc.text('Cant.', colX[0], tableY);
    doc.text('Producto', colX[1], tableY);
    doc.text('Código', colX[2], tableY);
    doc.text('Precio', colX[3], tableY);
    doc.text('Subtotal', colX[4], tableY);
    doc.text('ITBIS', colX[5], tableY);

    // Draw header line
    doc.moveTo(50, tableY + 15).lineTo(620, tableY + 15).stroke();
    doc.moveDown(0.5);

    // Items rows
    let currentY = doc.y;
    let totalSubtotal = 0;
    let totalITBIS = 0;

    orden.items.forEach((item) => {
      const subtotal = (item.Cantidad || 0) * (item.PrecioV || 0);
      const itbis = item.Impuesto || 0;
      
      totalSubtotal += subtotal;
      totalITBIS += itbis;

      // Ensure text color is black for visibility
      doc.fontSize(9).font('Helvetica').fillColor('black');
      doc.text(String(item.Cantidad || 0), colX[0], currentY);
      doc.text(item.producto.NombreP, colX[1], currentY);
      doc.text(item.producto.CodigoP, colX[2], currentY);
      doc.text(formatCurrency(item.PrecioV || 0), colX[3], currentY);
      doc.text(formatCurrency(subtotal), colX[4], currentY);
      doc.text(formatCurrency(itbis), colX[5], currentY);

      currentY += 20;
    });

    // Draw bottom line
    doc.moveTo(50, currentY + 5).lineTo(620, currentY + 5).stroke();
    doc.moveDown(1);

    // Totals section
    const totalsY = doc.y;
    // Ensure text color is black for totals
    doc.fontSize(12).font('Helvetica-Bold').fillColor('black');
    doc.text('TOTALES', 450, totalsY);
    doc.fontSize(10).font('Helvetica').fillColor('black');
    doc.text(`Subtotal: ${formatCurrency(totalSubtotal)}`, 450, totalsY + 20);
    doc.text(`ITBIS: ${formatCurrency(totalITBIS)}`, 450, totalsY + 35);
    doc.fontSize(12).font('Helvetica-Bold').fillColor('black');
    doc.text(`TOTAL: ${formatCurrency(orden.Total || 0)}`, 450, totalsY + 50);

    // Footer with user and print information in gray
    doc.moveDown(2);
    doc.fontSize(10).font('Helvetica').fillColor('black').text('Gracias por su compra', { align: 'center' });
    doc.text('Este documento es una representación impresa de una factura electrónica', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(9).font('Helvetica').fillColor('#666666').text(`Vendedor: ${orden.Vendedor.NombreV} - Fecha de impresión: ${formatDateTime(new Date())}`, { align: 'center' });

    // Finalize PDF
    doc.end();

  } catch (error) {
    console.error('Error generating PDF:', error);
    res.status(500).json({ error: 'Error generando la cotización PDF' });
  }
};

// Get invoice data without generating PDF (for preview or other uses)
export const getFacturaData = async (req: Request, res: Response) => {
  const { id } = req.params;
  
  try {
    const orden = await prisma.orden.findUnique({
      where: { IdOrden: parseInt(id) },
      include: { 
        items: { 
          include: { producto: true } 
        }, 
        Cliente: true, 
        Vendedor: true 
      }
    });

    if (!orden) {
      return res.status(404).json({ message: 'Orden no encontrada' });
    }

    const config = await prisma.config.findFirst();
    if (!config) {
      return res.status(404).json({ message: 'Configuración de empresa no encontrada' });
    }

    // Format document number
    const documentNumber = String(orden.IdOrden).padStart(8, '0');

    // Calculate totals
    const itemsWithTotals = orden.items.map(item => {
      const subtotal = (item.Cantidad || 0) * (item.PrecioV || 0);
      return {
        ...item,
        subtotal,
        itbis: item.Impuesto || 0
      };
    });

    const totalSubtotal = itemsWithTotals.reduce((sum, item) => sum + item.subtotal, 0);
    const totalITBIS = itemsWithTotals.reduce((sum, item) => sum + item.itbis, 0);

    const facturaData = {
      documentNumber,
      orden,
      config,
      itemsWithTotals,
      totals: {
        subtotal: totalSubtotal,
        itbis: totalITBIS,
        total: orden.Total || 0
      }
    };

    res.json(facturaData);

  } catch (error) {
    console.error('Error getting invoice data:', error);
    res.status(500).json({ error: 'Error obteniendo datos de la cotización' });
  }
};

// Generate PDF invoice with improved design
// Helper function to get the next DocumentoIN number
const getNextDocumentoIN = async (): Promise<string> => {
  const lastRef = await prisma.referenciaPago.findFirst({
    orderBy: { IdReferencia: 'desc' },
    select: { DocumentoIN: true }
  });

  const nextId = lastRef 
    ? (parseInt(lastRef.DocumentoIN) + 1).toString().padStart(8, '0')
    : '00000001';

  return nextId;
};

export const generateFacturaTransaccionIN = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { action = 'download' } = req.query; // 'download' or 'print'
  
  try {
    // Get transaction
    const transaccion = await prisma.transaccion.findUnique({
      where: { IdTransa: parseInt(id) }
    });

    if (!transaccion) {
      return res.status(404).json({ message: 'Transacción no encontrada' });
    }

    if (transaccion.Tipo !== 'IN') {
      return res.status(400).json({ message: 'Solo se pueden generar facturas para transacciones de tipo IN' });
    }

    // Get client details
    const cliente = await prisma.cliente.findUnique({
      where: { IdCliente: transaccion.IdCliente }
    });

    // Get payment references
    const referencias = await prisma.referenciaPago.findMany({
      where: { IdTransa: transaccion.IdTransa }
    });

    // Get company configuration
    const config = await prisma.config.findFirst();
    if (!config) {
      return res.status(404).json({ message: 'Configuración de empresa no encontrada' });
    }

    // Create PDF document with better margins
    const doc = new PDFDocument({
      size: 'A4',
      margin: 40
    });

    // Set response headers for PDF
    const fileName = `RECIBO-${String(transaccion.IdTransa).padStart(8, '0')}.pdf`;
    
    if (action === 'print') {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);
    } else {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    }
    
    // Pipe PDF directly to response
    doc.pipe(res);

    // Helper function to format date
    const formatDate = (date: Date | string | null | undefined): string => {
      if (!date) return 'N/A';
      try {
        const d = new Date(date);
        if (isNaN(d.getTime())) return 'N/A';
        return d.toLocaleDateString('es-DO', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        });
      } catch (e) {
        return 'N/A';
      }
    };

    // Helper function to format date and time
    const formatDateTime = (date: Date | string | null | undefined): string => {
      if (!date) return 'N/A';
      try {
        const d = new Date(date);
        if (isNaN(d.getTime())) return 'N/A';
        return d.toLocaleDateString('es-DO', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        });
      } catch (e) {
        return 'N/A';
      }
    };

    // Helper function to format currency
    const formatCurrency = (amount: number | null | undefined): string => {
      if (amount === null || amount === undefined) return 'RD$ 0.00';
      return new Intl.NumberFormat('es-DO', {
        style: 'currency',
        currency: 'DOP'
      }).format(amount);
    };

    // Header section with company info on left and document info on right
    const headerY = 60;
    const companyInfoX = 60;
    const documentInfoX = 400;
    
    // Company information on the left
    doc.fontSize(16).font('Helvetica-Bold').text(config.Compania, companyInfoX, headerY);
    doc.fontSize(10).font('Helvetica');
    
    let companyY = headerY + 20;
    
    // Combine address lines with semicolon separator
    let addressLine = '';
    if (config.Direccion1) addressLine += config.Direccion1;
    if (config.Direccion2) {
      if (addressLine) addressLine += '; ';
      addressLine += config.Direccion2;
    }
    
    if (addressLine) {
      doc.text(addressLine, companyInfoX, companyY, { width: 300 });
      companyY += 15;
    }
    
    if (config.Telefono) {
      doc.text(`Tel: ${config.Telefono}`, companyInfoX, companyY);
      companyY += 15;
    }
    
    if (config.Rnc) {
      doc.text(`RNC: ${config.Rnc}`, companyInfoX, companyY);
    }

    // Document information on the right
    const docNumber = transaccion.Documento || transaccion.IdTransa.toString().padStart(8, '0');
    doc.fontSize(12).font('Helvetica-Bold').text(`Documento: ${docNumber}`, documentInfoX, headerY);
    doc.fontSize(10).font('Helvetica');
    doc.text(`Fecha: ${formatDate(transaccion.Fecha)}`, documentInfoX, headerY + 20);
    
    // Show Documento VE if it exists in the references
    if (referencias && referencias.length > 0 && referencias[0].DocumentoVE) {
      doc.text(`Doc. Venta: ${referencias[0].DocumentoVE}`, documentInfoX, headerY + 40);
    }
    
    // Main header centered below company info
    doc.fontSize(18)
       .font('Helvetica-Bold')
       .text('RECIBO DE PAGO', companyInfoX, companyY + 40, { 
         align: 'left',
         width: doc.page.width - 100,
         lineGap: 2
       });
    
    // Reset Y position for the rest of the content
    let docY = companyY + 80;
    
    docY += 15;
    // Client information
    docY += 10;
    doc.fontSize(10)
       .font('Helvetica-Bold')
       .text('Cliente:', 50, docY)
       .font('Helvetica')
       .text(cliente?.NombreC || 'N/A', 100, docY);

    
    docY += 20;

    // Line separator with better styling
    doc.moveTo(50, docY - 10).lineTo(550, docY - 10).lineWidth(1).stroke('#cccccc');
    doc.moveTo(50, docY - 9).lineTo(550, docY - 9).lineWidth(1).stroke('#ffffff');
    docY += 15;

    // Payment details section header
    doc.rect(50, docY, 500, 25).fill('#f0f0f0');
    doc.fontSize(12).font('Helvetica-Bold').fillColor('#333333')
       .text('DETALLE DE PAGO', 60, docY + 5);
    docY += 30;

    // Payment methods table
    const paymentMethods = [
      { name: 'Efectivo', value: transaccion.Efectivo || 0 },
      { name: 'Tarjeta', value: transaccion.Tarjeta || 0 },
      { name: 'Cheque', value: transaccion.Cheque || 0 },
      { name: 'Transferencia', value: transaccion.Transferencia || 0 }
    ].filter(method => method.value > 0);

    // Table header
    doc.font('Helvetica-Bold').fillColor('#333333');
    doc.text('MÉTODO DE PAGO', 60, docY);
    doc.text('MONTO', 400, docY, { width: 100, align: 'right' });
    
    docY += 20;
    
    // Table rows
    paymentMethods.forEach((method, index) => {
      const rowY = docY + (index * 20);
      
      // Alternate row background
      if (index % 2 === 0) {
        doc.rect(50, rowY - 5, 500, 20).fill('#f9f9f9');
      }
      
      doc.font('Helvetica').fillColor('#333333')
         .text(method.name, 60, rowY)
         .text(formatCurrency(method.value), 400, rowY, { width: 100, align: 'right' });
      
      // Add separator line
      doc.moveTo(50, rowY + 15).lineTo(550, rowY + 15).lineWidth(0.5).stroke('#eeeeee');
    });

    // Total
    const totalY = docY + (paymentMethods.length * 20) + 10;
    doc.moveTo(350, totalY - 5).lineTo(550, totalY - 5).stroke('#cccccc');
    
    doc.font('Helvetica-Bold').fontSize(12)
       .text('TOTAL PAGADO:', 350, totalY + 5)
       .fontSize(14)
       .text(formatCurrency(transaccion.Valor || 0), 400, totalY, { width: 150, align: 'right' });

    // Reference payment details
    let refY = totalY + 40;
    
    if (referencias && referencias.length > 0) {
      // Section header
      doc.rect(50, refY, 500, 25).fill('#f0f0f0');
      doc.fontSize(12).font('Helvetica-Bold').fillColor('#333333')
         .text('REFERENCIAS DE PAGO', 60, refY + 5);
      
      refY += 30;
      
      // Reference items
      referencias.forEach((ref: any, idx: number) => {
        const refItemY = refY + (idx * 70);
        
        // Card-like container
        doc.roundedRect(50, refItemY, 500, 65, 5)
           .fill('#f9f9f9')
           .stroke('#eeeeee');
        
        // Document info
        doc.font('Helvetica-Bold').fontSize(10)
           .text('DOCUMENTO:', 60, refItemY + 10)
           .font('Helvetica')
           .text(ref.DocumentoIN || 'N/A', 150, refItemY + 10);
        
        // Amount
        doc.font('Helvetica-Bold').fontSize(10)
           .text('MONTO:', 60, refItemY + 25)
           .font('Helvetica')
           .text(formatCurrency(Number(ref.ValorPago)), 150, refItemY + 25);
        
        // Date
        doc.font('Helvetica-Bold').fontSize(10)
           .text('FECHA:', 60, refItemY + 40)
           .font('Helvetica')
           .text(formatDateTime(ref.CreatedAt || null), 150, refItemY + 40);
        
        // Applied to invoice (if applicable)
        if (ref.DocumentoVE) {
          doc.font('Helvetica-Bold').fontSize(10)
             .text('APLICADO A FACTURA:', 300, refItemY + 25)
             .font('Helvetica')
             .text(ref.DocumentoVE, 440, refItemY + 25, { width: 100, align: 'right' });
        }
        
        refY += 75; // Add some space between reference items
      });
    }

    // Footer with thank you message
    const footerY = 750;
    doc.fontSize(10).font('Helvetica')
       .fillColor('#666666')
       .text('Gracias por su pago', 50, footerY, { align: 'center', width: 500 });
    
    // Add company info at the bottom with better styling
    const footerText = [
      config.Compania,
      config.Direccion1,
      config.Telefono ? `Tel: ${config.Telefono}` : '',
      config.Rnc ? `RNC: ${config.Rnc}` : ''
    ].filter(Boolean).join(' | ');
    
    doc.fontSize(8).fillColor('#999999')
       .text(footerText, 50, 780, { 
         align: 'center', 
         width: 500,
         lineGap: 2
       });

    // Finalize the PDF
    doc.end();

    // Update the transaction with the document number if not set
    if (!transaccion.Documento) {
      const nextDocNumber = await getNextDocumentoIN();
      
      // Update transaction
      await prisma.transaccion.update({
        where: { IdTransa: transaccion.IdTransa },
        data: { Documento: nextDocNumber }
      });

      // Also update the ReferenciaPago if it doesn't have a DocumentoIN
      // First find references with empty or null DocumentoIN
      const emptyDocRefs = await prisma.referenciaPago.findMany({
        where: { 
          IdTransa: transaccion.IdTransa,
          DocumentoIN: ''  // Only check for empty string
        }
      });

      // For null checks, we need to use a raw query with proper typing
      interface ReferenciaPago {
        IdReferencia: number;
        IdTransa: number;
        DocumentoIN: string | null;
        // Add other fields as needed
      }
      
      const nullDocRefs = await prisma.$queryRaw<ReferenciaPago[]>`
        SELECT * FROM "ReferenciaPago" 
        WHERE "IdTransa" = ${transaccion.IdTransa} 
        AND "DocumentoIN" IS NULL
      `;

      // Update empty DocumentoIN references
      if (emptyDocRefs.length > 0) {
        await prisma.referenciaPago.updateMany({
          where: { 
            IdTransa: transaccion.IdTransa,
            DocumentoIN: ''
          },
          data: { 
            DocumentoIN: nextDocNumber
          }
        });
      }

      // Update null DocumentoIN references using raw query
      if (nullDocRefs && nullDocRefs.length > 0) {
        await prisma.$executeRaw`
          UPDATE "ReferenciaPago" 
          SET "DocumentoIN" = ${nextDocNumber}
          WHERE "IdTransa" = ${transaccion.IdTransa}
          AND "DocumentoIN" IS NULL
        `;
      }
    }
  } catch (error) {
    console.error('Error generating transaction receipt:', error);
    return res.status(500).json({ 
      message: 'Error al generar el recibo de pago',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

export const generateFacturaPDFImproved = async (req: Request, res: Response) => {
  const { id } = req.params;
  
  try {
    // Get order with all related data
    const orden = await prisma.orden.findUnique({
      where: { IdOrden: parseInt(id) },
      include: { 
        items: { 
          include: { producto: true } 
        }, 
        Cliente: true, 
        Vendedor: true 
      }
    });

    if (!orden) {
      return res.status(404).json({ message: 'Orden no encontrada' });
    }

    // Get company configuration
    const config = await prisma.config.findFirst();
    if (!config) {
      return res.status(404).json({ message: 'Configuración de empresa no encontrada' });
    }

    // Create PDF document with better margins
    const doc = new PDFDocument({
      size: 'A4',
      margin: 40
    });

    // Set response headers for PDF download
    const fileName = `FACT-${String(orden.IdOrden).padStart(8, '0')}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    
    // Pipe PDF directly to response
    doc.pipe(res);

    // Helper functions
    const formatDocumentNumber = (id: number): string => {
      return String(id).padStart(8, '0');
    };

    const formatCurrency = (amount: number): string => {
      return new Intl.NumberFormat('es-DO', {
        style: 'currency',
        currency: 'DOP'
      }).format(amount);
    };

    const formatDate = (date: Date): string => {
      return new Intl.DateTimeFormat('es-DO', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }).format(new Date(date));
    };

    const formatDateTime = (date: Date): string => {
      return new Intl.DateTimeFormat('es-DO', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      }).format(new Date(date));
    };

    // Header section with company info on left and document info on right
    const headerY = 60;
    const companyInfoX = 60;
    const documentInfoX = 400;
    
    // Company information on the left
    doc.fontSize(16).font('Helvetica-Bold').text(config.Compania, companyInfoX, headerY);
    doc.fontSize(10).font('Helvetica');
    
    let companyY = headerY + 20;
    
    // Combine address lines with semicolon separator
    let addressLine = '';
    if (config.Direccion1) {
      addressLine += config.Direccion1;
    }
    if (config.Direccion2) {
      if (addressLine) addressLine += '; ';
      addressLine += config.Direccion2;
    }
    if (addressLine) {
      doc.text(addressLine, companyInfoX, companyY);
      companyY += 15;
    }
    
    if (config.Telefono) {
      doc.text(`Tel: ${config.Telefono}`, companyInfoX, companyY);
      companyY += 15;
    }
    if (config.Rnc) {
      doc.text(`RNC: ${config.Rnc}`, companyInfoX, companyY);
    }

    // Document information on the right
    const documentNumber = formatDocumentNumber(orden.IdOrden);
    doc.fontSize(12).font('Helvetica-Bold').text(`Documento: ${documentNumber}`, documentInfoX, headerY);
    doc.fontSize(10).font('Helvetica');
    doc.text(`Fecha: ${formatDate(orden.Fecha)}`, documentInfoX, headerY + 20);
    doc.text(`Fecha de Creación: ${formatDateTime(orden.FechaCreacion || new Date())}`, documentInfoX, headerY + 35);
    doc.moveDown(2);

    // Client and Vendor information stacked vertically
    const infoX = 60;
    let currentY = doc.y;

    // Client information section
    doc.fontSize(12).font('Helvetica-Bold').text('CLIENTE', infoX, currentY);
    doc.fontSize(10).font('Helvetica');
    currentY += 20;
    doc.text(`Cliente: ${orden.Cliente.NombreC}`, infoX, currentY);
    currentY += 15;
    if (orden.Cliente.Rnc) {
      doc.text(`RNC: ${orden.Cliente.Rnc}`, infoX, currentY);
      currentY += 15;
    }
    if (orden.Cliente.TelefonoC) {
      doc.text(`Teléfono: ${orden.Cliente.TelefonoC}`, infoX, currentY);
      currentY += 15;
    }

    // Add some space between client and vendor sections
    currentY += 10;

    // Vendor information section (below client)
    doc.fontSize(12).font('Helvetica-Bold').text('VENDEDOR', infoX, currentY);
    doc.fontSize(10).font('Helvetica');
    currentY += 20;
    doc.text(`Vendedor: ${orden.Vendedor.NombreV}`, infoX, currentY);
    currentY += 15;
    if (orden.Vendedor.TelefonoV) {
      doc.text(`Teléfono: ${orden.Vendedor.TelefonoV}`, infoX, currentY);
      currentY += 15;
    }

    // Update document position for next section
    doc.y = currentY;

    doc.moveDown(2);

    // Items table with better formatting
    doc.fontSize(12).font('Helvetica-Bold').fillColor('black').text('DETALLES DE LA COTIZACIÓN');
    doc.moveDown(0.5);

    // Table headers with background
    const tableY = doc.y;
    const colX = [60, 200, 280, 350, 420, 490];
    
    // Header background
    doc.rect(60, tableY - 5, 495, 25).fill('#f0f0f0');
    
    doc.fontSize(10).font('Helvetica-Bold').fillColor('black');
    doc.text('Producto', colX[0], tableY);
    doc.text('Cant.', colX[1], tableY);
    doc.text('Precio', colX[2], tableY);
    doc.text('Impuesto', colX[3], tableY);
    doc.text('Subtotal', colX[4], tableY);
    doc.text('ITBIS', colX[5], tableY);

    // Draw header line
    doc.moveTo(60, tableY + 20).lineTo(555, tableY + 20).stroke();
    doc.moveDown(0.5);

    // Items rows with alternating background
    let tableRowY = doc.y;
    let totalSubtotal = 0;
    let totalITBIS = 0;
    let rowCount = 0;

    orden.items.forEach((item) => {
      const subtotal = (item.Cantidad || 0) * (item.PrecioV || 0);
      const itbis = item.Impuesto || 0;
      const tipoImpuesto = config.TipoImpuesto === 'A' ? 'Aplicado' : 'Incluido';
      
      totalSubtotal += subtotal;
      totalITBIS += itbis;

      // Alternate row background
      if (rowCount % 2 === 0) {
        doc.rect(60, tableRowY - 5, 495, 20).fill('#fafafa');
      }

      // Ensure text color is black for visibility
      doc.fontSize(9).font('Helvetica').fillColor('black');
      doc.text(item.producto.NombreP.substring(0, 25), colX[0], tableRowY);
      doc.text(String(item.Cantidad || 0), colX[1], tableRowY);
      doc.text(formatCurrency(item.PrecioV || 0), colX[2], tableRowY);
      doc.text(tipoImpuesto, colX[3], tableRowY);
      doc.text(formatCurrency(subtotal), colX[4], tableRowY);
      doc.text(formatCurrency(itbis), colX[5], tableRowY);

      tableRowY += 25;
      rowCount++;
    });

    // Draw bottom line
    doc.moveTo(60, tableRowY + 5).lineTo(555, tableRowY + 5).stroke();
    doc.moveDown(5); // Much more space between details and totals

    // Totals section with better formatting
    const totalsY = doc.y;
    doc.rect(350, totalsY - 10, 205, 80).stroke();
    
    // Ensure text color is black for totals
    doc.fontSize(12).font('Helvetica-Bold').fillColor('black');
    doc.text('TOTALES', 360, totalsY);
    doc.fontSize(10).font('Helvetica').fillColor('black');
    doc.text(`Subtotal: ${formatCurrency(totalSubtotal)}`, 360, totalsY + 20);
    doc.text(`ITBIS: ${formatCurrency(totalITBIS)}`, 360, totalsY + 35);
    doc.fontSize(14).font('Helvetica-Bold').fillColor('black');
    doc.text(`TOTAL: ${formatCurrency(orden.Total || 0)}`, 360, totalsY + 55);

    // Footer with user and print information in gray
    doc.moveDown(2);
    doc.fontSize(9).font('Helvetica').fillColor('#666666').text(`Vendedor: ${orden.Vendedor.NombreV} - Fecha de impresión: ${formatDateTime(new Date())}`, { align: 'center' });

    // Finalize PDF
    doc.end();

  } catch (error) {
    console.error('Error generating PDF:', error);
    res.status(500).json({ error: 'Error generando la cotización PDF' });
  }
}; 