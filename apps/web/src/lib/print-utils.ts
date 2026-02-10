// =============================================================================
// SAL Accounting System - Print Utilities
// =============================================================================

export interface PrintStyles {
    pageSize?: 'A4' | 'Letter' | 'Legal';
    orientation?: 'portrait' | 'landscape';
    margin?: string;
}

/**
 * Print the inner HTML of a DOM element identified by its id.
 *
 * If the element is not found, logs an error and does nothing.
 *
 * @param elementId - The id of the DOM element whose inner HTML will be printed
 * @param title - Optional title to include in the printed document
 */
export function printElement(elementId: string, title?: string): void {
    const element = document.getElementById(elementId);
    if (!element) {
        console.error(`Element with id "${elementId}" not found`);
        return;
    }

    printHTML(element.innerHTML, title);
}

/**
 * Opens a print-friendly window and prints the provided HTML content.
 *
 * Writes a complete HTML document into a new browser window, injects the given content, applies print styles (page size, orientation, margin), and triggers the browser print dialog. If the popup is blocked, displays an alert in Indonesian and does not attempt to print.
 *
 * @param htmlContent - HTML string to render inside the print window's body
 * @param title - Optional document title for the print window (defaults to "Print")
 * @param styles - Optional print settings; `pageSize` defaults to "A4", `orientation` defaults to "portrait", and `margin` defaults to "10mm"
 */
export function printHTML(htmlContent: string, title?: string, styles?: PrintStyles): void {
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) {
        alert('Silakan izinkan popup untuk mencetak');
        return;
    }

    const pageSize = styles?.pageSize || 'A4';
    const orientation = styles?.orientation || 'portrait';
    const margin = styles?.margin || '10mm';

    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>${title || 'Print'}</title>
            <style>
                @page {
                    size: ${pageSize} ${orientation};
                    margin: ${margin};
                }
                
                * {
                    box-sizing: border-box;
                    margin: 0;
                    padding: 0;
                }
                
                body {
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    font-size: 10pt;
                    line-height: 1.4;
                    color: #333;
                }
                
                .print-header {
                    text-align: center;
                    margin-bottom: 20px;
                    border-bottom: 2px solid #333;
                    padding-bottom: 10px;
                }
                
                .print-header h1 {
                    font-size: 16pt;
                    margin-bottom: 5px;
                }
                
                .print-header p {
                    font-size: 9pt;
                    color: #666;
                }
                
                table {
                    width: 100%;
                    border-collapse: collapse;
                    margin: 10px 0;
                }
                
                th, td {
                    border: 1px solid #ddd;
                    padding: 6px 8px;
                    text-align: left;
                    font-size: 9pt;
                }
                
                th {
                    background-color: #f5f5f5;
                    font-weight: 600;
                }
                
                tr:nth-child(even) {
                    background-color: #fafafa;
                }
                
                .text-right {
                    text-align: right;
                }
                
                .text-center {
                    text-align: center;
                }
                
                .money {
                    text-align: right;
                    font-family: 'Consolas', monospace;
                }
                
                .total-row {
                    font-weight: bold;
                    background-color: #e8e8e8 !important;
                }
                
                .print-footer {
                    margin-top: 30px;
                    padding-top: 10px;
                    border-top: 1px solid #ddd;
                    font-size: 8pt;
                    color: #666;
                    display: flex;
                    justify-content: space-between;
                }
                
                .signature-area {
                    margin-top: 40px;
                    display: flex;
                    justify-content: space-between;
                }
                
                .signature-box {
                    width: 200px;
                    text-align: center;
                }
                
                .signature-line {
                    border-bottom: 1px solid #333;
                    height: 60px;
                    margin-bottom: 5px;
                }
                
                .info-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 20px;
                    margin-bottom: 20px;
                }
                
                .info-section {
                    font-size: 9pt;
                }
                
                .info-section label {
                    font-weight: 600;
                    display: inline-block;
                    width: 120px;
                }
                
                .bank-info {
                    margin-top: 20px;
                    padding: 10px 14px;
                    background: #f9fafb;
                    border: 1px solid #e5e7eb;
                    border-radius: 4px;
                    font-size: 9pt;
                    line-height: 1.6;
                }
                
                .invoice-footer-text {
                    margin-top: 15px;
                    padding-top: 10px;
                    border-top: 1px dashed #ddd;
                    font-size: 8pt;
                    color: #666;
                    line-height: 1.5;
                    text-align: center;
                }
                
                @media print {
                    body {
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                }
            </style>
        </head>
        <body>
            ${htmlContent}
        </body>
        </html>
    `);

    printWindow.document.close();

    // Wait for content to load then print
    printWindow.onload = () => {
        printWindow.focus();
        printWindow.print();
        printWindow.close();
    };
}

/**
 * Build an HTML string for a printable table with an optional header, subtitle, timestamp, and totals row.
 *
 * @param data - Array of row objects to render in the table.
 * @param columns - Column definitions. Each column must provide `header` and an `accessor` which is either a property key of the row objects or a function that returns the cell value; optional `className` is applied to both header and cell elements.
 * @param options - Optional presentation settings:
 *   - `title`: main title shown above the table
 *   - `subtitle`: subtitle shown under the title
 *   - `showTotal`: when true, a totals row is appended
 *   - `totalColumns`: list of column accessor keys whose numeric values will be summed for the totals row
 * @returns An HTML string containing a print header (title, subtitle, and print timestamp) and a table with THEAD, TBODY of rows, and an appended totals row when requested. Numeric totals are summed across the provided data; non-numeric values are treated as zero.
export function generatePrintTable<T extends object>(
    data: T[],
    columns: { header: string; accessor: keyof T | ((row: T) => string | number); className?: string }[],
    options?: {
        title?: string;
        subtitle?: string;
        showTotal?: boolean;
        totalColumns?: string[];
    }
): string {
    const headers = columns.map(col =>
        `<th class="${col.className || ''}">${col.header}</th>`
    ).join('');

    const rows = data.map(item => {
        const cells = columns.map(col => {
            const value = typeof col.accessor === 'function'
                ? col.accessor(item)
                : item[col.accessor];
            return `<td class="${col.className || ''}">${value ?? ''}</td>`;
        }).join('');
        return `<tr>${cells}</tr>`;
    }).join('');

    // Calculate totals if needed
    let totalRow = '';
    if (options?.showTotal && options?.totalColumns) {
        const totalCells = columns.map((col, idx) => {
            const accessor = typeof col.accessor === 'string' ? col.accessor : '';
            if (options.totalColumns?.includes(accessor as string)) {
                const sum = data.reduce((acc, item) => {
                    const value = typeof col.accessor === 'function'
                        ? col.accessor(item)
                        : item[col.accessor];
                    return acc + (typeof value === 'number' ? value : 0);
                }, 0);
                return `<td class="money total-row">${formatNumber(sum)}</td>`;
            }
            return idx === 0
                ? `<td class="total-row"><strong>TOTAL</strong></td>`
                : `<td class="total-row"></td>`;
        }).join('');
        totalRow = `<tr class="total-row">${totalCells}</tr>`;
    }

    return `
        <div class="print-header">
            <h1>SAL Accounting System</h1>
            ${options?.title ? `<h2 style="font-size: 14pt; margin-top: 10px;">${options.title}</h2>` : ''}
            ${options?.subtitle ? `<p>${options.subtitle}</p>` : ''}
            <p>Dicetak: ${new Date().toLocaleDateString('id-ID')} ${new Date().toLocaleTimeString('id-ID')}</p>
        </div>
        <table>
            <thead>
                <tr>${headers}</tr>
            </thead>
            <tbody>
                ${rows}
                ${totalRow}
            </tbody>
        </table>
    `;
}

/**
 * Invoice Header Settings interface
 */
export interface InvoiceHeaderSettings {
    template?: 'classic' | 'modern' | 'minimal';
    companyName?: string;
    companyAddress?: string;
    companyPhone?: string;
    companyEmail?: string;
    companyNpwp?: string;
    companyLogo?: string;
    companyLetterhead?: string;
    bankName?: string;
    bankAccount?: string;
    bankHolder?: string;
    invoiceFooter?: string;
    signLeft?: string;
    signRight?: string;
    showLogo?: boolean;
    showBank?: boolean;
    showSignature?: boolean;
}

/**
 * Create an InvoiceHeaderSettings object from a flat settings record.
 *
 * @param settings - A mapping of setting keys to string values; may be undefined.
 * @returns An InvoiceHeaderSettings populated from `settings`, or `undefined` if `settings` is undefined.
 *
 * Notes:
 * - If `invoice_template` is not provided, the `template` defaults to `'classic'`.
 * - Visibility flags (`invoice_show_logo`, `invoice_show_bank`, `invoice_show_signature`) are interpreted as `false` only when the value is exactly `'false'`; any other value is treated as `true`.
 */
export function buildHeaderSettings(settings: Record<string, string> | undefined): InvoiceHeaderSettings | undefined {
    if (!settings) return undefined;
    return {
        template: (settings['invoice_template'] || 'classic') as 'classic' | 'modern' | 'minimal',
        companyName: settings['company_name'],
        companyAddress: settings['company_address'],
        companyPhone: settings['company_phone'],
        companyEmail: settings['company_email'],
        companyNpwp: settings['company_npwp'],
        companyLogo: settings['company_logo'],
        companyLetterhead: settings['company_letterhead'],
        bankName: settings['company_bank_name'],
        bankAccount: settings['company_bank_account'],
        bankHolder: settings['company_bank_holder'],
        invoiceFooter: settings['invoice_footer'],
        signLeft: settings['invoice_sign_left'],
        signRight: settings['invoice_sign_right'],
        showLogo: settings['invoice_show_logo'] !== 'false',
        showBank: settings['invoice_show_bank'] !== 'false',
        showSignature: settings['invoice_show_signature'] !== 'false',
    };
}

/**
 * Build a complete HTML document for printing an invoice-like document.
 *
 * @returns A string containing the fully assembled HTML for the printable document (header, info grid, item table, totals, optional bank/footer/signature sections, and a print timestamp)
 */
export function generateDocumentPrint(options: {
    documentType: string;
    documentNo: string;
    date: string;
    dueDate?: string;
    partyName: string;
    partyAddress?: string;
    lines: { description: string; qty: number; unitPrice: number; total: number }[];
    subtotal: number;
    taxTotal: number;
    grandTotal: number;
    memo?: string;
    headerSettings?: InvoiceHeaderSettings;
}): string {
    const s = options.headerSettings || {};
    const template = s.template || 'classic';
    const companyName = s.companyName || 'SAL Accounting System';
    const showLogo = s.showLogo !== false;
    const showBank = s.showBank !== false && (s.bankName || s.bankAccount);
    const showSignature = s.showSignature !== false;
    const signLeft = s.signLeft || 'Dibuat Oleh';
    const signRight = s.signRight || 'Diterima Oleh';

    const lineRows = options.lines.map((line, idx) => `
        <tr>
            <td class="text-center">${idx + 1}</td>
            <td>${line.description}</td>
            <td class="text-right">${line.qty}</td>
            <td class="money">${formatNumber(line.unitPrice)}</td>
            <td class="money">${formatNumber(line.total)}</td>
        </tr>
    `).join('');

    // Generate header based on template
    const header = generateHeader(template, companyName, options, s, showLogo);

    // Bank info section
    const bankSection = showBank ? `
        <div class="bank-info">
            <strong>Informasi Pembayaran:</strong><br/>
            ${s.bankName ? `Bank: ${s.bankName}<br/>` : ''}
            ${s.bankAccount ? `No. Rekening: ${s.bankAccount}<br/>` : ''}
            ${s.bankHolder ? `Atas Nama: ${s.bankHolder}` : ''}
        </div>
    ` : '';

    // Signature area
    const signatureSection = showSignature ? `
        <div class="signature-area">
            <div class="signature-box">
                <div class="signature-line"></div>
                <p>${signLeft}</p>
            </div>
            <div class="signature-box">
                <div class="signature-line"></div>
                <p>${signRight}</p>
            </div>
        </div>
    ` : '';

    // Footer text
    const footerText = s.invoiceFooter ? `
        <div class="invoice-footer-text">
            ${s.invoiceFooter.replace(/\n/g, '<br/>')}
        </div>
    ` : '';

    return `
        ${header}
        
        <div class="info-grid">
            <div class="info-section">
                <p><label>No Dokumen:</label> <strong>${options.documentNo}</strong></p>
                <p><label>Tanggal:</label> ${options.date}</p>
                ${options.dueDate ? `<p><label>Jatuh Tempo:</label> ${options.dueDate}</p>` : ''}
            </div>
            <div class="info-section">
                <p><label>Kepada:</label></p>
                <p><strong>${options.partyName}</strong></p>
                ${options.partyAddress ? `<p>${options.partyAddress}</p>` : ''}
            </div>
        </div>
        
        <table>
            <thead>
                <tr>
                    <th style="width: 40px" class="text-center">No</th>
                    <th>Deskripsi</th>
                    <th style="width: 60px" class="text-right">Jml</th>
                    <th style="width: 120px" class="money">Harga Satuan</th>
                    <th style="width: 120px" class="money">Total</th>
                </tr>
            </thead>
            <tbody>
                ${lineRows}
            </tbody>
            <tfoot>
                <tr>
                    <td colspan="4" class="text-right"><strong>Subtotal</strong></td>
                    <td class="money">${formatNumber(options.subtotal)}</td>
                </tr>
                <tr>
                    <td colspan="4" class="text-right"><strong>Pajak</strong></td>
                    <td class="money">${formatNumber(options.taxTotal)}</td>
                </tr>
                <tr class="total-row">
                    <td colspan="4" class="text-right"><strong>TOTAL KESELURUHAN</strong></td>
                    <td class="money"><strong>${formatNumber(options.grandTotal)}</strong></td>
                </tr>
            </tfoot>
        </table>
        
        ${options.memo ? `<p style="margin-top: 15px;"><strong>Memo:</strong> ${options.memo}</p>` : ''}

        ${bankSection}
        ${footerText}
        ${signatureSection}
        
        <div class="print-footer">
            <span>Dicetak: ${new Date().toLocaleDateString('id-ID')} ${new Date().toLocaleTimeString('id-ID')}</span>
            <span>${companyName}</span>
        </div>
    `;
}

/**
 * Build the HTML header block for a printable document using the selected visual template.
 *
 * @param template - One of the header templates: `'classic'`, `'modern'`, or `'minimal'`
 * @param companyName - The company name to display prominently in the header
 * @param options - Document metadata; must include `documentType` (label shown in header) and `documentNo` (identifier shown where applicable)
 * @param s - Invoice header settings providing company contact, logo, NPWP, and additional header configuration
 * @param showLogo - When `true`, include the company logo from `s.companyLogo` if present
 * @returns The HTML string for the composed header block ready to be injected into the printable document
 */
function generateHeader(
    template: string,
    companyName: string,
    options: { documentType: string; documentNo: string },
    s: InvoiceHeaderSettings,
    showLogo: boolean,
): string {
    const logoHtml = showLogo && s.companyLogo
        ? `<img src="${s.companyLogo}" alt="Logo" style="max-height: 60px; max-width: 180px; object-fit: contain;" />`
        : '';

    const companyInfoHtml = `
        ${s.companyAddress ? `<div style="font-size: 9pt; color: #555;">${s.companyAddress}</div>` : ''}
        ${s.companyPhone ? `<div style="font-size: 9pt; color: #555;">Telp: ${s.companyPhone}</div>` : ''}
        ${s.companyEmail ? `<div style="font-size: 9pt; color: #555;">Email: ${s.companyEmail}</div>` : ''}
        ${s.companyNpwp ? `<div style="font-size: 9pt; color: #555;">NPWP: ${s.companyNpwp}</div>` : ''}
    `;

    // =========================================================================
    // TEMPLATE: CLASSIC - Traditional header with border, centered layout
    // =========================================================================
    if (template === 'classic') {
        return `
            <div class="print-header" style="border-bottom: 3px double #333; padding-bottom: 15px; margin-bottom: 20px;">
                <div style="display: flex; align-items: center; justify-content: center; gap: 20px;">
                    ${logoHtml ? `<div>${logoHtml}</div>` : ''}
                    <div style="text-align: center;">
                        <h1 style="font-size: 18pt; margin: 0; letter-spacing: 1px;">${companyName}</h1>
                    </div>
                </div>
                <h2 style="font-size: 14pt; margin-top: 12px; text-transform: uppercase; letter-spacing: 2px; color: #444;">${options.documentType}</h2>
            </div>
        `;
    }

    // =========================================================================
    // TEMPLATE: MODERN - Color accent header with gradient bar
    // =========================================================================
    if (template === 'modern') {
        return `
            <div class="print-header" style="border-bottom: none; padding-bottom: 0; margin-bottom: 20px;">
                <div style="background: linear-gradient(135deg, #1a56db, #3b82f6); color: #fff; padding: 16px 20px; border-radius: 8px; margin-bottom: 12px;">
                    <div style="display: flex; align-items: center; justify-content: space-between;">
                        <div style="display: flex; align-items: center; gap: 16px;">
                            ${logoHtml ? `<div style="background: #fff; padding: 6px; border-radius: 6px;">${logoHtml}</div>` : ''}
                            <div style="text-align: left;">
                                <h1 style="font-size: 16pt; margin: 0; color: #fff; letter-spacing: 0.5px;">${companyName}</h1>
                            </div>
                        </div>
                        <div style="text-align: right; font-size: 8pt; color: rgba(255,255,255,0.9); line-height: 1.6;">
                            ${s.companyAddress ? `<div>${s.companyAddress}</div>` : ''}
                            ${s.companyPhone ? `<div>Telp: ${s.companyPhone}</div>` : ''}
                            ${s.companyEmail ? `<div>${s.companyEmail}</div>` : ''}
                            ${s.companyNpwp ? `<div>NPWP: ${s.companyNpwp}</div>` : ''}
                        </div>
                    </div>
                </div>
                <div style="display: flex; align-items: center; justify-content: space-between; padding: 0 4px;">
                    <h2 style="font-size: 14pt; margin: 0; color: #1a56db; font-weight: 700;">${options.documentType}</h2>
                    <div style="font-size: 11pt; color: #333; font-weight: 600;">#${options.documentNo}</div>
                </div>
                <div style="height: 2px; background: linear-gradient(to right, #1a56db, #93c5fd, transparent); margin-top: 8px;"></div>
            </div>
        `;
    }

    // =========================================================================
    // TEMPLATE: MINIMAL - Clean typography, left-aligned
    // =========================================================================
    return `
        <div class="print-header" style="border-bottom: 1px solid #e5e7eb; padding-bottom: 12px; margin-bottom: 20px; text-align: left;">
            <div style="display: flex; align-items: flex-start; justify-content: space-between;">
                <div style="display: flex; align-items: center; gap: 12px;">
                    ${logoHtml ? `<div>${logoHtml}</div>` : ''}
                    <div>
                        <h1 style="font-size: 14pt; margin: 0; font-weight: 600; color: #111;">${companyName}</h1>
                        <div style="font-size: 8pt; color: #888; margin-top: 4px; line-height: 1.5;">
                            ${[s.companyAddress, s.companyPhone ? `Telp: ${s.companyPhone}` : '', s.companyEmail].filter(Boolean).join(' • ')}
                        </div>
                        ${s.companyNpwp ? `<div style="font-size: 8pt; color: #888;">NPWP: ${s.companyNpwp}</div>` : ''}
                    </div>
                </div>
                <div style="text-align: right;">
                    <div style="font-size: 12pt; font-weight: 700; color: #111; text-transform: uppercase;">${options.documentType}</div>
                    <div style="font-size: 10pt; color: #555; margin-top: 2px;">${options.documentNo}</div>
                </div>
            </div>
        </div>
    `;
}

/**
 * Formats a numeric value using Indonesian locale conventions.
 *
 * @param value - The number to format
 * @returns The value formatted as a string using the `id-ID` locale number separators
 */
function formatNumber(value: number): string {
    return new Intl.NumberFormat('id-ID').format(value);
}