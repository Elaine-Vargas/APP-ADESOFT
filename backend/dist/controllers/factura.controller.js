"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateFacturaPDFWithSize = exports.generateFacturaTransaccionIN = exports.getFacturaData = void 0;
const pdfkit_1 = __importDefault(require("pdfkit"));
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
// Get invoice data without generating PDF (for preview or other uses)
const getFacturaData = async (req, res) => {
    const { id } = req.params;
    try {
        const orden = await prisma.orden.findUnique({
            where: { IdOrden: parseInt(id) },
            include: {
                items: {
                    include: { Producto: true }
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
    }
    catch (error) {
        console.error('Error getting invoice data:', error);
        res.status(500).json({ error: 'Error obteniendo datos de la cotización' });
    }
};
exports.getFacturaData = getFacturaData;
// Generate PDF invoice with improved design
// Helper function to get the next DocumentoIN number
const getNextDocumentoIN = async () => {
    const lastRef = await prisma.referenciaPago.findFirst({
        orderBy: { IdReferencia: 'desc' },
        select: { DocumentoIN: true }
    });
    const nextId = lastRef
        ? (parseInt(lastRef.DocumentoIN) + 1).toString().padStart(8, '0')
        : '00000001';
    return nextId;
};
// Paper size configurations
const PAPER_CONFIGS = {
    letter: {
        size: 'LETTER',
        width: 612,
        height: 792,
        margin: 40,
        contentWidth: 512
    },
    thermal: {
        size: [216, 1000], // 3 inch width (216 points), variable height
        width: 216,
        height: 1000,
        margin: 10,
        contentWidth: 196
    }
};
const generateFacturaTransaccionIN = async (req, res) => {
    const { id } = req.params;
    const { action = 'download', paperSize = 'thermal' } = req.query; // 'download' or 'print', default thermal
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
        const vendedor = await prisma.vendedor.findUnique({
            where: { IdVendedor: transaccion.IdVendedor }
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
        // Validate paper size
        const validPaperSizes = ['letter', 'thermal'];
        const selectedPaperSize = validPaperSizes.includes(paperSize) ? paperSize : 'letter';
        const paperConfig = PAPER_CONFIGS[selectedPaperSize];
        // Create PDF document with appropriate size
        const doc = new pdfkit_1.default({
            size: paperConfig.size,
            margin: paperConfig.margin
        });
        // Set response headers for PDF
        const sizePrefix = selectedPaperSize === 'thermal' ? 'RECIBO-THERMAL' : 'RECIBO';
        const fileName = `${sizePrefix}-${String(transaccion.IdTransa).padStart(8, '0')}.pdf`;
        if (action === 'print') {
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);
        }
        else {
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        }
        // Pipe PDF directly to response
        doc.pipe(res);
        // Helper functions
        const formatDate = (date) => {
            if (!date)
                return 'N/A';
            try {
                const d = new Date(date);
                if (isNaN(d.getTime()))
                    return 'N/A';
                return d.toLocaleDateString('es-DO', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit'
                });
            }
            catch (e) {
                return 'N/A';
            }
        };
        const formatDateShort = (date) => {
            if (!date)
                return 'N/A';
            try {
                const d = new Date(date);
                if (isNaN(d.getTime()))
                    return 'N/A';
                const day = String(d.getDate()).padStart(2, '0');
                const month = String(d.getMonth() + 1).padStart(2, '0');
                const year = d.getFullYear();
                return `${day}/${month}/${year}`;
            }
            catch (e) {
                return 'N/A';
            }
        };
        const formatDateTime = (date) => {
            if (!date)
                return 'N/A';
            try {
                const d = new Date(date);
                if (isNaN(d.getTime()))
                    return 'N/A';
                return d.toLocaleDateString('es-DO', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true
                });
            }
            catch (e) {
                return 'N/A';
            }
        };
        const formatCurrency = (amount) => {
            if (amount === null || amount === undefined)
                return 'RD$ 0.00';
            return new Intl.NumberFormat('es-DO', {
                style: 'currency',
                currency: 'DOP'
            }).format(amount);
        };
        // Helper function to split text into two lines for thermal printing
        const splitTextIntoTwoLines = (text, maxWidth, fontSize) => {
            const avgCharWidth = fontSize * 0.6;
            const maxCharsPerLine = Math.floor(maxWidth / avgCharWidth);
            if (text.length <= maxCharsPerLine) {
                return [text, ''];
            }
            const idealBreak = maxCharsPerLine;
            let breakPoint = idealBreak;
            for (let i = idealBreak; i >= Math.floor(idealBreak * 0.7); i--) {
                if (text[i] === ' ') {
                    breakPoint = i;
                    break;
                }
            }
            if (breakPoint === idealBreak && text[idealBreak] !== ' ') {
                while (breakPoint > Math.floor(idealBreak * 0.7) && text[breakPoint] !== ' ') {
                    breakPoint--;
                }
                if (breakPoint <= Math.floor(idealBreak * 0.7)) {
                    breakPoint = idealBreak;
                }
            }
            const firstLine = text.substring(0, breakPoint).trim();
            let secondLine = text.substring(breakPoint).trim();
            if (secondLine.length > maxCharsPerLine) {
                secondLine = secondLine.substring(0, maxCharsPerLine).trim();
            }
            return [firstLine, secondLine];
        };
        // Generate content based on paper size
        if (selectedPaperSize === 'thermal') {
            // Thermal receipt layout
            let currentY = 10;
            const margin = paperConfig.margin;
            const contentWidth = paperConfig.contentWidth;
            const center = { width: contentWidth, align: 'center' };
            // Company header
            doc.fontSize(10).font('Helvetica-Bold').text(config.Compania, margin, currentY, center);
            currentY += 15;
            // Address and company info
            doc.fontSize(8);
            if (config.Direccion1) {
                doc.text(config.Direccion1, margin, currentY, center);
                currentY += 10;
            }
            if (config.Telefono) {
                doc.text(`Tel: ${config.Telefono}`, margin, currentY, center);
                currentY += 10;
            }
            if (config.Rnc) {
                doc.text(`RNC: ${config.Rnc}`, margin, currentY, center);
                currentY += 15;
            }
            // Document info
            doc.moveTo(margin, currentY).lineTo(margin + contentWidth, currentY).stroke();
            currentY += 10;
            const docNumber = transaccion.Documento || transaccion.IdTransa.toString().padStart(8, '0');
            doc.fontSize(10).font('Helvetica-Bold').text('RECIBO DE PAGO', margin, currentY, center);
            currentY += 15;
            doc.fontSize(8);
            doc.text(`Doc: ${docNumber}`, margin, currentY);
            doc.text(`Fecha: ${formatDateShort(transaccion.Fecha)}`, margin + 100, currentY);
            currentY += 12;
            // Show Document VE if exists
            if (referencias && referencias.length > 0 && referencias[0].DocumentoVE) {
                doc.font('Helvetica-Bold').text('Doc. Venta:', margin, currentY);
                doc.font('Helvetica').text(referencias[0].DocumentoVE, margin + 55, currentY);
                currentY += 18;
            }
            // Client info
            doc.moveTo(margin, currentY).lineTo(margin + contentWidth, currentY).stroke();
            currentY += 10;
            const clientName = cliente?.NombreC || 'N/A';
            const clientLines = splitTextIntoTwoLines(clientName, 200, 8);
            const clientText = 'CLIENTE: ' + clientLines[0];
            const clientTextWidth = doc.widthOfString(clientText);
            doc.font('Helvetica-Bold').text(clientText, margin, currentY + 12, { width: clientTextWidth });
            if (clientLines[1]) {
                currentY += 12;
                doc.text(clientLines[1], margin, currentY + 12);
            }
            currentY += 24;
            // VENDOR information
            const vendorName = vendedor?.NombreV || 'N/A';
            const vendorLines = splitTextIntoTwoLines(vendorName, 200, 8);
            const vendorText = 'VENDEDOR: ' + vendorLines[0];
            const vendorTextWidth = doc.widthOfString(vendorText);
            doc.font('Helvetica-Bold').text(vendorText, margin, currentY + 12, { width: vendorTextWidth });
            if (vendorLines[1]) {
                currentY += 12;
                doc.text(vendorLines[1], margin, currentY + 12);
            }
            currentY += 12;
            // Payment methods section
            currentY += 10;
            doc.moveTo(margin, currentY).lineTo(margin + contentWidth, currentY).stroke();
            currentY += 8;
            doc.font('Helvetica-Bold').fontSize(8);
            doc.text('METODO PAGO', margin, currentY);
            const montoText = 'MONTO';
            const montoX = margin + contentWidth - doc.widthOfString(montoText);
            doc.text(montoText, montoX, currentY);
            currentY += 12;
            doc.moveTo(margin, currentY).lineTo(margin + contentWidth, currentY).stroke();
            currentY += 8;
            // Payment methods
            const paymentMethods = [
                { name: 'Efectivo', value: transaccion.Efectivo || 0 },
                { name: 'Tarjeta', value: transaccion.Tarjeta || 0 },
                { name: 'Cheque', value: transaccion.Cheque || 0 },
                { name: 'Transferencia', value: transaccion.Transferencia || 0 }
            ].filter(method => method.value > 0);
            doc.font('Helvetica').fontSize(8);
            paymentMethods.forEach((method) => {
                doc.text(method.name, margin, currentY);
                const amountText = formatCurrency(method.value).replace('RD$', '').trim();
                const amountX = margin + contentWidth - doc.widthOfString(amountText);
                doc.text(amountText, amountX, currentY);
                currentY += 12;
            });
            // Total
            doc.moveTo(margin, currentY).lineTo(margin + contentWidth, currentY).stroke();
            currentY += 10;
            doc.font('Helvetica-Bold').fontSize(12);
            doc.text('TOTAL PAGADO:', margin, currentY);
            const totalText = formatCurrency(transaccion.Valor || 0).replace('RD$', '').trim();
            const totalX = margin + contentWidth - doc.widthOfString(totalText);
            doc.text(totalText, totalX, currentY);
            currentY += 20;
            // Reference payment details (if any)
            if (referencias && referencias.length > 0) {
                doc.moveTo(margin, currentY).lineTo(margin + contentWidth, currentY).stroke();
                currentY += 10;
                doc.font('Helvetica-Bold').fontSize(8);
                doc.text('REFERENCIAS DE PAGO:', margin, currentY, center);
                currentY += 15;
                referencias.forEach((ref, idx) => {
                    doc.font('Helvetica').fontSize(7);
                    if (ref.DocumentoIN) {
                        doc.text(`Doc: ${ref.DocumentoIN}`, margin, currentY);
                        currentY += 10;
                    }
                    doc.text(`Monto: ${formatCurrency(Number(ref.ValorPago))}`, margin, currentY);
                    currentY += 10;
                    if (ref.CreatedAt) {
                        doc.text(`Fecha: ${formatDateTime(ref.CreatedAt)}`, margin, currentY);
                        currentY += 10;
                    }
                    if (ref.DocumentoVE) {
                        doc.text(`Aplicado a: ${ref.DocumentoVE}`, margin, currentY);
                        currentY += 10;
                    }
                    if (idx < referencias.length - 1) {
                        currentY += 8; // Space between references
                    }
                });
            }
            // Footer
            currentY += 20;
            doc.font('Helvetica').fontSize(7);
            doc.text('Gracias por su pago', margin, currentY, center);
            currentY += 15;
            doc.text(`Impreso: ${formatDateTime(new Date())}`, margin, currentY, center);
        }
        else {
            // Letter size layout (original layout)
            const headerY = 60;
            const companyInfoX = 60;
            const documentInfoX = 400;
            // Company information on the left
            doc.fontSize(16).font('Helvetica-Bold').text(config.Compania, companyInfoX, headerY);
            doc.fontSize(10).font('Helvetica');
            let companyY = headerY + 20;
            // Combine address lines with semicolon separator
            let addressLine = '';
            if (config.Direccion1)
                addressLine += config.Direccion1;
            if (config.Direccion2) {
                if (addressLine)
                    addressLine += '; ';
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
            let docY = companyY + 60;
            // Client information
            docY += 10;
            doc.fontSize(10)
                .font('Helvetica-Bold')
                .text('Cliente:', 60, docY)
                .font('Helvetica')
                .text(cliente?.NombreC || 'N/A', 100, docY);
            docY += 20;
            doc.fontSize(10)
                .font('Helvetica-Bold')
                .text('Vendedor:', 60, docY)
                .font('Helvetica')
                .text(vendedor?.NombreV || 'N/A', 115, docY);
            docY += 40;
            // Line separator with better styling
            doc.moveTo(50, docY - 10).lineTo(550, docY - 10).lineWidth(1).stroke('#cccccc');
            doc.moveTo(50, docY - 9).lineTo(550, docY - 9).lineWidth(1).stroke('#ffffff');
            docY += 15;
            // Concepto
            doc.font('Helvetica-Bold').fillColor('#333333');
            doc.text(`CONCEPTO: ${transaccion.Concepto}`, 60, docY);
            docY += 20;
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
            doc.text('MONTO', 450, docY, { width: 100, align: 'right' });
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
                    .text(formatCurrency(method.value), 450, rowY, { width: 100, align: 'right' });
                // Add separator line
                doc.moveTo(50, rowY + 15).lineTo(550, rowY + 15).lineWidth(0.5).stroke('#eeeeee');
            });
            // Total
            const totalY = docY + (paymentMethods.length * 20) + 10;
            doc.moveTo(350, totalY - 5).lineTo(550, totalY - 5).stroke('#cccccc');
            doc.font('Helvetica-Bold').fontSize(12)
                .text('TOTAL PAGADO:', 350, totalY + 1)
                .fontSize(14)
                .text(formatCurrency(transaccion.Valor || 0), 400, totalY, { width: 150, align: 'right' });
            // Reference payment details
            let refY = totalY + 40;
            if (referencias && referencias.length > 0) {
                // Section header
                doc.fontSize(12).font('Helvetica-Bold').fillColor('#333333')
                    .text('Gracias por su Pago', 60, refY + 5);
                refY += 30;
                // Reference items
                referencias.forEach((ref, idx) => {
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
                        .text('MONTO:', 140, refItemY + 25, { align: 'right', width: 80 })
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
                            .text('APLICADO A COTIZACION:', 300, refItemY + 25)
                            .font('Helvetica')
                            .text(ref.DocumentoVE, 440, refItemY + 25, { width: 100, align: 'right' });
                    }
                    refY += 75; // Add some space between reference items
                });
            }
        }
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
                    DocumentoIN: '' // Only check for empty string
                }
            });
            const nullDocRefs = await prisma.$queryRaw `
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
                await prisma.$executeRaw `
          UPDATE "ReferenciaPago" 
          SET "DocumentoIN" = ${nextDocNumber}
          WHERE "IdTransa" = ${transaccion.IdTransa}
          AND "DocumentoIN" IS NULL
        `;
            }
        }
    }
    catch (error) {
        console.error('Error generating transaction receipt:', error);
        return res.status(500).json({
            message: 'Error al generar el recibo de pago',
            error: error instanceof Error ? error.message : 'Error desconocido'
        });
    }
};
exports.generateFacturaTransaccionIN = generateFacturaTransaccionIN;
const generateFacturaPDFWithSize = async (req, res) => {
    const { id } = req.params;
    const { paperSize = 'thermal' } = req.query; // Default to thermal size
    try {
        // Get order with all related data
        const orden = await prisma.orden.findUnique({
            where: { IdOrden: parseInt(id) },
            include: {
                items: {
                    include: { Producto: true }
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
        // Validate paper size
        const validPaperSizes = ['letter', 'thermal'];
        const selectedPaperSize = validPaperSizes.includes(paperSize) ? paperSize : 'letter';
        const paperConfig = PAPER_CONFIGS[selectedPaperSize];
        // Create PDF document with appropriate size
        const doc = new pdfkit_1.default({
            size: paperConfig.size,
            margin: paperConfig.margin
        });
        // Set response headers for PDF
        const sizePrefix = selectedPaperSize === 'thermal' ? 'FACT-THERMAL' : 'FACT';
        const fileName = `${sizePrefix}-${String(orden.IdOrden).padStart(8, '0')}.pdf`;
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        // Pipe PDF directly to response
        doc.pipe(res);
        // Helper functions
        const formatDocumentNumber = (id) => {
            return String(id).padStart(8, '0');
        };
        const formatCurrency = (amount) => {
            return new Intl.NumberFormat('es-DO', {
                style: 'currency',
                currency: 'DOP'
            }).format(amount);
        };
        const formatDate = (date) => {
            return new Intl.DateTimeFormat('es-DO', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            }).format(new Date(date));
        };
        const formatDateShort = (date) => {
            const d = new Date(date);
            const day = String(d.getDate()).padStart(2, '0');
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const year = d.getFullYear();
            return `${day}/${month}/${year}`;
        };
        const formatDateTime = (date) => {
            return new Intl.DateTimeFormat('es-DO', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            }).format(new Date(date));
        };
        // Helper function to calculate ITBIS based on product value and tax type
        const calculateITBIS = (cantidad, precioV, tipoImpuesto) => {
            const valorTotal = cantidad * precioV;
            const ITBIS_RATE = 0.18; // 18% ITBIS rate
            if (tipoImpuesto === 'I') { // Incluido
                // ITBIS = valorTotal / (1 + rate) * rate
                return valorTotal / (1 + ITBIS_RATE) * ITBIS_RATE;
            }
            else { // Aplicado
                // ITBIS = valorTotal * rate
                return valorTotal * ITBIS_RATE;
            }
        };
        // Helper function to split text into two lines based on width
        const splitTextIntoTwoLines = (text, maxWidth, fontSize) => {
            const avgCharWidth = fontSize * 0.6;
            const maxCharsPerLine = Math.floor(maxWidth / avgCharWidth);
            if (text.length <= maxCharsPerLine) {
                return [text, ''];
            }
            // Try to find a good break point (space) near the middle
            const idealBreak = maxCharsPerLine;
            let breakPoint = idealBreak;
            // Look for a space before the ideal break point
            for (let i = idealBreak; i >= Math.floor(idealBreak * 0.7); i--) {
                if (text[i] === ' ') {
                    breakPoint = i;
                    break;
                }
            }
            // If no good break point found, just cut at max length
            if (breakPoint === idealBreak && text[idealBreak] !== ' ') {
                // Check if we're in the middle of a word, if so, try to find a better cut
                while (breakPoint > Math.floor(idealBreak * 0.7) && text[breakPoint] !== ' ') {
                    breakPoint--;
                }
                if (breakPoint <= Math.floor(idealBreak * 0.7)) {
                    breakPoint = idealBreak;
                }
            }
            const firstLine = text.substring(0, breakPoint).trim();
            let secondLine = text.substring(breakPoint).trim();
            // Truncate second line if it's too long
            if (secondLine.length > maxCharsPerLine) {
                secondLine = secondLine.substring(0, maxCharsPerLine).trim();
            }
            return [firstLine, secondLine];
        };
        // Generate content based on paper size
        if (selectedPaperSize === 'thermal') {
            // Thermal receipt layout
            let currentY = 10;
            const margin = paperConfig.margin;
            const contentWidth = paperConfig.contentWidth;
            const center = { width: contentWidth, align: 'center' };
            // Company header
            doc.fontSize(10).font('Helvetica-Bold').text(config.Compania, margin, currentY, center);
            currentY += 15;
            // Address
            doc.fontSize(8);
            if (config.Direccion1) {
                doc.text(config.Direccion1, margin, currentY, center);
                currentY += 10;
            }
            if (config.Telefono) {
                doc.text(`Tel: ${config.Telefono}`, margin, currentY, center);
                currentY += 10;
            }
            if (config.Rnc) {
                doc.text(`RNC: ${config.Rnc}`, margin, currentY, center);
                currentY += 15;
            }
            if (config.TipoImpuesto) {
                const nombreTipoImpuesto = config.TipoImpuesto === 'A' ? 'Aplicado' : 'Incluido';
                doc.text(`Tipo de Impuesto: ${nombreTipoImpuesto}`, margin, currentY, center);
                currentY += 15;
            }
            // Document info
            doc.moveTo(margin, currentY).lineTo(margin + contentWidth, currentY).stroke();
            currentY += 10;
            const docNumber = formatDocumentNumber(orden.IdOrden);
            doc.fontSize(10).font('Helvetica-Bold').text('COTIZACION', margin, currentY, center);
            currentY += 15;
            doc.fontSize(8);
            doc.text(`Doc: ${docNumber}`, margin, currentY);
            doc.text(`Fecha: ${formatDateShort(orden.Fecha)}`, margin + 100, currentY);
            currentY += 12;
            // Client info
            doc.moveTo(margin, currentY).lineTo(margin + contentWidth, currentY).stroke();
            currentY += 10;
            doc.font('Helvetica-Bold').text('VENDEDOR:', margin, currentY);
            doc.font('Helvetica').text(orden.Vendedor.NombreV, margin + 50, currentY);
            currentY += 24;
            doc.font('Helvetica-Bold').text('CLIENTE:', margin, currentY);
            doc.font('Helvetica').text(orden.Cliente.NombreC, margin + 40, currentY);
            currentY += 18;
            if (orden.Cliente.Rnc) {
                doc.font('Helvetica-Oblique').text(`RNC: ${orden.Cliente.Rnc}`, margin + 40, currentY);
                currentY += 12;
            }
            currentY += 10;
            // Items header
            doc.moveTo(margin, currentY).lineTo(margin + contentWidth, currentY).stroke();
            currentY += 8;
            // Column headers for thermal
            doc.font('Helvetica-Bold').fontSize(10);
            doc.text('PRODUCTO', margin, currentY);
            // Right align ITBIS and VALOR headers
            const itbisHeader = 'ITBIS';
            const valorHeader = 'VALOR';
            const itbisHeaderX = margin + 135 - doc.widthOfString(itbisHeader);
            const valorHeaderX = margin + 185 - doc.widthOfString(valorHeader);
            doc.text(itbisHeader, itbisHeaderX, currentY);
            doc.text(valorHeader, valorHeaderX, currentY);
            currentY += 12;
            doc.moveTo(margin, currentY).lineTo(margin + contentWidth, currentY).stroke();
            currentY += 8;
            // Items with new format
            let total = 0;
            let totalITBIS = 0;
            orden.items.forEach(item => {
                const cantidad = item.Cantidad || 0;
                const precioUnitario = item.PrecioV || 0;
                const valorTotal = cantidad * precioUnitario;
                const itbis = calculateITBIS(cantidad, precioUnitario, config.TipoImpuesto || 'A');
                total += valorTotal;
                totalITBIS += itbis;
                doc.font('Helvetica').fontSize(8);
                // Product name split into two lines
                const maxProductWidth = 90;
                const productLines = splitTextIntoTwoLines(item.Producto.NombreP, maxProductWidth, 8);
                // First line of product name
                doc.text(productLines[0], margin, currentY);
                // Right align ITBIS and VALOR on first line
                const itbisText = formatCurrency(itbis).replace('RD$', '');
                const valorText = formatCurrency(valorTotal).replace('RD$', '');
                const itbisX = margin + 135 - doc.widthOfString(itbisText);
                const valorX = margin + 185 - doc.widthOfString(valorText);
                doc.text(itbisText, itbisX, currentY);
                doc.text(valorText, valorX, currentY);
                currentY += 10;
                // Second line of product name (if exists)
                if (productLines[1]) {
                    doc.text(productLines[1], margin, currentY);
                    currentY += 10;
                }
                // Presentation, quantity and unit price on next line
                const presentacion = item.Producto.PresentacionP || 'Unidad';
                const detalleLinea = `(${presentacion}) - ${cantidad} x ${formatCurrency(precioUnitario).replace('RD$', '')}`;
                doc.fontSize(7).text(detalleLinea, margin, currentY);
                currentY += 15; // Extra spacing between products
            });
            // Totals
            doc.moveTo(margin, currentY).lineTo(margin + contentWidth, currentY).stroke();
            currentY += 10;
            // Helper function to align text to right
            const rightAlignText = (text, y) => {
                const textWidth = doc.widthOfString(text);
                doc.text(text, margin + contentWidth - textWidth, y);
            };
            doc.font('Helvetica-Bold').fontSize(12);
            rightAlignText(`SUBTOTAL: ${formatCurrency(total - totalITBIS).replace('RD$', '')}`, currentY);
            currentY += 12;
            rightAlignText(`ITBIS: ${formatCurrency(totalITBIS).replace('RD$', '')}`, currentY);
            currentY += 12;
            rightAlignText(`TOTAL: ${formatCurrency(total).replace('RD$', '')}`, currentY);
            currentY += 20;
            // Footer
            doc.font('Helvetica').fontSize(7);
            doc.text(`Impreso: ${formatDateTime(new Date())}`, margin, currentY, center);
        }
        else {
            // Letter size layout
            const headerY = 60;
            const companyInfoX = 60;
            const documentInfoX = 400;
            // Company information on the left
            doc.fontSize(16).font('Helvetica-Bold').text(config.Compania, companyInfoX, headerY);
            doc.fontSize(10).font('Helvetica');
            let companyY = headerY + 20;
            let addressLine = '';
            if (config.Direccion1) {
                addressLine += config.Direccion1;
            }
            if (config.Direccion2) {
                if (addressLine)
                    addressLine += '; ';
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
                companyY += 15;
            }
            if (config.TipoImpuesto) {
                const nombreTipoImpuesto = config.TipoImpuesto === 'A' ? 'Aplicado' : 'Incluido';
                doc.text(`Tipo de Impuesto: ${nombreTipoImpuesto}`, companyInfoX, companyY);
                companyY += 15;
            }
            // Document information on the right
            const documentNumber = formatDocumentNumber(orden.IdOrden);
            doc.fontSize(12).font('Helvetica-Bold').text(`Documento: ${documentNumber}`, documentInfoX, headerY);
            doc.fontSize(10).font('Helvetica');
            doc.text(`Fecha: ${formatDate(orden.Fecha)}`, documentInfoX, headerY + 20);
            doc.text(`Fecha de Creación: ${formatDateTime(orden.FechaCreacion || new Date())}`, documentInfoX, headerY + 35);
            doc.moveDown(2);
            // Client and Vendor information
            const infoX = 60;
            let currentY = doc.y;
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
            currentY += 10;
            doc.fontSize(12).font('Helvetica-Bold').text('VENDEDOR', infoX, currentY);
            doc.fontSize(10).font('Helvetica');
            currentY += 20;
            doc.text(`Vendedor: ${orden.Vendedor.NombreV}`, infoX, currentY);
            currentY += 15;
            if (orden.Vendedor.TelefonoV) {
                doc.text(`Teléfono: ${orden.Vendedor.TelefonoV}`, infoX, currentY);
                currentY += 15;
            }
            doc.y = currentY;
            doc.moveDown(2);
            // Items section with table format
            doc.fontSize(12).font('Helvetica-Bold').fillColor('black').text('DETALLES DE LA COTIZACION');
            doc.moveDown(1);
            // Table headers
            const headerY2 = doc.y;
            const colProduct = 70;
            const colITBIS = 300;
            const colValor = 420;
            doc.rect(60, headerY2 - 5, 495, 25).fill('#f0f0f0');
            doc.fontSize(10).font('Helvetica-Bold').fillColor('black');
            doc.text('PRODUCTO', colProduct, headerY2);
            // Right align ITBIS and VALOR headers
            const itbisHeader = 'ITBIS';
            const valorHeader = 'VALOR';
            const itbisHeaderX = colValor - 30 - doc.widthOfString(itbisHeader);
            const valorHeaderX = colValor + 90 - doc.widthOfString(valorHeader);
            doc.text(itbisHeader, itbisHeaderX, headerY2);
            doc.text(valorHeader, valorHeaderX, headerY2);
            doc.moveTo(60, headerY2 + 20).lineTo(555, headerY2 + 20).stroke();
            doc.moveDown(1);
            let itemY = doc.y;
            let totalSubtotal = 0;
            let totalITBIS = 0;
            let rowCount = 0;
            orden.items.forEach((item) => {
                const cantidad = item.Cantidad || 0;
                const precioUnitario = item.PrecioV || 0;
                const valorTotal = cantidad * precioUnitario;
                const itbis = calculateITBIS(cantidad, precioUnitario, config.TipoImpuesto || 'A');
                totalSubtotal += (valorTotal - itbis);
                totalITBIS += itbis;
                // Calculate row height (minimum 50px for three lines: 2 product + 1 detail)
                const rowHeight = 50;
                // Alternating row background
                if (rowCount % 2 === 0) {
                    doc.rect(60, itemY - 5, 495, rowHeight).fill('#fafafa');
                }
                doc.fontSize(9).font('Helvetica').fillColor('black');
                // Product name split into two lines
                const maxProductWidth = 220;
                const productLines = splitTextIntoTwoLines(item.Producto.NombreP, maxProductWidth, 9);
                // First line of product name
                doc.text(productLines[0], colProduct, itemY);
                // Right align ITBIS and VALOR values on first line
                const itbisText = formatCurrency(itbis);
                const valorText = formatCurrency(valorTotal);
                const itbisX = colValor - 30 - doc.widthOfString(itbisText);
                const valorX = colValor + 90 - doc.widthOfString(valorText);
                doc.text(itbisText, itbisX, itemY);
                doc.text(valorText, valorX, itemY);
                // Second line of product name (if exists)
                let productSecondLineY = itemY + 12;
                if (productLines[1]) {
                    doc.text(productLines[1], colProduct, productSecondLineY);
                    productSecondLineY += 12;
                }
                // Presentation, quantity and unit price on next line
                const presentacion = item.Producto.PresentacionP || 'Unidad';
                const detalleLinea = `(${presentacion}) - ${cantidad} x ${formatCurrency(precioUnitario)}`;
                doc.fontSize(8).text(detalleLinea, colProduct, productSecondLineY);
                itemY += rowHeight + 3; // Move to next row
                rowCount++;
            });
            // Draw line after items
            doc.moveTo(60, itemY).lineTo(555, itemY).stroke();
            doc.moveDown(6);
            // Totals section
            const totalsY = doc.y;
            doc.text(`FECHA DE IMPRESION: ${formatDateTime(new Date())}`, 60, totalsY - 10);
            doc.rect(350, totalsY - 10, 205, 80).stroke();
            doc.fontSize(12).font('Helvetica-Bold').fillColor('black');
            doc.text('TOTALES', 360, totalsY);
            doc.fontSize(10).font('Helvetica').fillColor('black');
            doc.text(`Subtotal: ${formatCurrency(totalSubtotal)}`, 360, totalsY + 20);
            doc.text(`ITBIS: ${formatCurrency(totalITBIS)}`, 360, totalsY + 35);
            doc.fontSize(14).font('Helvetica-Bold').fillColor('black');
            doc.text(`TOTAL: ${formatCurrency(orden.Total || (totalSubtotal + totalITBIS))}`, 360, totalsY + 50);
            doc.fontSize(10).font('Helvetica').fillColor('black');
        }
        // Finalize PDF
        doc.end();
    }
    catch (error) {
        console.error('Error generating PDF:', error);
        res.status(500).json({ error: 'Error generando la cotizacion PDF' });
    }
};
exports.generateFacturaPDFWithSize = generateFacturaPDFWithSize;
//# sourceMappingURL=factura.controller.js.map