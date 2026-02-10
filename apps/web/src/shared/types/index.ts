// =============================================================================
// SAL Accounting System - Shared Types
// =============================================================================

// -----------------------------------------------------------------------------
// Common Types
// -----------------------------------------------------------------------------

export type DocumentStatus = 'DRAFT' | 'POSTED' | 'PARTIALLY_PAID' | 'PAID' | 'VOIDED' | 'CANCELLED';
export type PaymentMethod = 'CASH' | 'BANK_TRANSFER' | 'QRIS' | 'CHECK' | 'OTHER';
export type DebitCredit = 'D' | 'C';
export type AdjustmentReasonCode = 'EXPIRED' | 'DAMAGED' | 'LOST' | 'FOUND' | 'INPUT_ERROR' | 'OTHER';
export type CreditNoteReasonCode = 'RETURN' | 'PRICE_ADJUSTMENT' | 'DAMAGED' | 'OTHER';

// -----------------------------------------------------------------------------
// API Response Types
// -----------------------------------------------------------------------------

export interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: ApiError;
    meta?: PaginationMeta;
}

export interface ApiError {
    code: string;
    message: string;
    details?: Record<string, unknown>;
}

export interface PaginationMeta {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

export interface PaginatedResponse<T> {
    data: T[];
    meta: PaginationMeta;
}

// -----------------------------------------------------------------------------
// Auth Types
// -----------------------------------------------------------------------------

export interface User {
    id: number;
    email: string;
    fullName: string;
    isActive: boolean;
    lastLoginAt?: string;
    roles: Role[];
    permissions: string[];
}

export interface Role {
    id: number;
    code: string;
    name: string;
    description?: string;
}

export interface LoginRequest {
    email: string;
    password: string;
}

export interface LoginResponse {
    user: User;
    token: string;
    expiresAt: string;
}

// -----------------------------------------------------------------------------
// Master Data Types
// -----------------------------------------------------------------------------

export interface Customer {
    id: number;
    customerCode: string;
    name: string;
    email?: string;
    phone?: string;
    billingAddress?: string;
    shippingAddress?: string;
    groupId?: number;
    groupName?: string;
    termsDays: number;
    creditLimit: number;
    currentBalance: number;
    taxCode: string;
    npwp?: string;
    isActive: boolean;
    notes?: string;
}

export interface Supplier {
    id: number;
    supplierCode: string;
    name: string;
    email?: string;
    phone?: string;
    address?: string;
    termsDays: number;
    taxCode: string;
    npwp?: string;
    currentBalance: number;
    isActive: boolean;
    notes?: string;
}

export interface Item {
    id: number;
    sku: string;
    barcode?: string;
    name: string;
    description?: string;
    categoryId?: number;
    categoryName?: string;
    uomId: number;
    uomCode: string;
    avgCost: number;
    lastCost: number;
    sellingPrice: number;
    minStock: number;
    maxStock?: number;
    taxCode: string;
    isActive: boolean;
    isSellable: boolean;
    isPurchasable: boolean;
    trackInventory: boolean;
    onHand?: number;
    available?: number;
}

export interface ItemStock {
    itemId: number;
    itemSku: string;
    itemName: string;
    onHand: number;
    onOrder: number;
    committed: number;
    available: number;
    stockValue: number;
    avgCost: number;
}

export interface TaxCode {
    code: string;
    name: string;
    rate: number;
    isInclusive: boolean;
    isActive: boolean;
}

export interface ChartOfAccount {
    id: number;
    accountCode: string;
    accountName: string;
    accountTypeCode: string;
    parentId?: number;
    isHeader: boolean;
    isActive: boolean;
    isSystem: boolean;
    description?: string;
    children?: ChartOfAccount[];
}

// -----------------------------------------------------------------------------
// Sales Types
// -----------------------------------------------------------------------------

export interface SalesInvoice {
    id: number;
    invoiceNo: string;
    customerId: number;
    customerName: string;
    invoiceDate: string;
    dueDate: string;
    currency: string;
    status: DocumentStatus;
    subtotal: number;
    discountAmount: number;
    taxTotal: number;
    shippingFee: number;
    grandTotal: number;
    paidAmount: number;
    balanceDue: number;
    memo?: string;
    postedAt?: string;
    postedBy?: number;
    lines: SalesInvoiceLine[];
}

export interface SalesInvoiceLine {
    id?: number;
    lineNo: number;
    itemId: number;
    itemSku?: string;
    itemName?: string;
    description?: string;
    qty: number;
    unitPrice: number;
    discountRate: number;
    discountAmount: number;
    taxCode: string;
    taxRate: number;
    lineSubtotal: number;
    lineTax: number;
    lineTotal: number;
    unitCost?: number;
    memo?: string;
}

export interface SalesPayment {
    id: number;
    paymentNo: string;
    customerId: number;
    customerName: string;
    receivedDate: string;
    method: PaymentMethod;
    bankAccountId?: number;
    bankAccountName?: string;
    amountTotal: number;
    referenceNo?: string;
    memo?: string;
    allocations: PaymentAllocation[];
}

export interface PaymentAllocation {
    invoiceId: number;
    invoiceNo: string;
    amount: number;
}

export interface SalesCreditNote {
    id: number;
    creditNoteNo: string;
    invoiceId: number;
    invoiceNo: string;
    customerId: number;
    customerName: string;
    creditDate: string;
    status: DocumentStatus;
    reasonCode: CreditNoteReasonCode;
    restock: boolean;
    subtotal: number;
    taxTotal: number;
    grandTotal: number;
    memo?: string;
    lines: CreditNoteLine[];
}

export interface CreditNoteLine {
    lineNo: number;
    itemId: number;
    itemSku?: string;
    itemName?: string;
    qty: number;
    unitPrice: number;
    taxCode: string;
    taxRate: number;
    lineSubtotal: number;
    lineTax: number;
    lineTotal: number;
    memo?: string;
}

// -----------------------------------------------------------------------------
// Purchase Types
// -----------------------------------------------------------------------------

export interface PurchaseReceipt {
    id: number;
    receiptNo: string;
    supplierId: number;
    supplierName: string;
    receiptDate: string;
    status: DocumentStatus;
    referenceNo?: string;
    memo?: string;
    lines: PurchaseReceiptLine[];
}

export interface PurchaseReceiptLine {
    lineNo: number;
    itemId: number;
    itemSku?: string;
    itemName?: string;
    qty: number;
    unitCost: number;
    taxCode: string;
    taxRate: number;
    lineValue: number;
    lineTax: number;
    memo?: string;
}

export interface PurchaseBill {
    id: number;
    billNo: string;
    supplierId: number;
    supplierName: string;
    billDate: string;
    dueDate: string;
    status: DocumentStatus;
    supplierInvoiceNo?: string;
    subtotal: number;
    taxTotal: number;
    grandTotal: number;
    paidAmount: number;
    balanceDue: number;
    memo?: string;
    lines: PurchaseBillLine[];
}

export interface PurchaseBillLine {
    lineNo: number;
    itemId?: number;
    itemSku?: string;
    itemName?: string;
    accountId?: number;
    accountCode?: string;
    description?: string;
    qty: number;
    unitCost: number;
    taxCode: string;
    taxRate: number;
    lineSubtotal: number;
    lineTax: number;
    lineTotal: number;
    memo?: string;
}

export interface PurchasePayment {
    id: number;
    paymentNo: string;
    supplierId: number;
    supplierName: string;
    paymentDate: string;
    method: PaymentMethod;
    bankAccountId?: number;
    bankAccountName?: string;
    amountTotal: number;
    referenceNo?: string;
    memo?: string;
    allocations: PurchasePaymentAllocation[];
}

export interface PurchasePaymentAllocation {
    billId: number;
    billNo: string;
    amount: number;
}

// -----------------------------------------------------------------------------
// Inventory Types
// -----------------------------------------------------------------------------

export interface StockLedgerEntry {
    id: number;
    occurredAt: string;
    itemId: number;
    itemSku: string;
    itemName: string;
    sourceType: string;
    sourceId: number;
    qtyDelta: number;
    unitCost: number;
    valueDelta: number;
    balanceQty: number;
    balanceValue: number;
    avgCostAfter: number;
    memo?: string;
}

export interface InventoryAdjustment {
    id: number;
    adjustmentNo: string;
    adjDate: string;
    status: DocumentStatus;
    adjustmentType: 'MANUAL' | 'OPNAME';
    memo?: string;
    lines: InventoryAdjustmentLine[];
}

export interface InventoryAdjustmentLine {
    lineNo: number;
    itemId: number;
    itemSku?: string;
    itemName?: string;
    qtyBefore: number;
    qtyCounted: number;
    qtyDelta: number;
    unitCost: number;
    valueDelta: number;
    reasonCode: AdjustmentReasonCode;
    memo?: string;
}

export interface StockOpnameSession {
    id: number;
    sessionNo: string;
    opnameDate: string;
    status: 'OPEN' | 'COUNTING' | 'SUBMITTED' | 'POSTED' | 'CANCELLED';
    location?: string;
    memo?: string;
    items: StockOpnameItem[];
}

export interface StockOpnameItem {
    itemId: number;
    itemSku: string;
    itemName: string;
    systemQty: number;
    countedQty?: number;
    variance: number;
    notes?: string;
}

// -----------------------------------------------------------------------------
// Accounting Types
// -----------------------------------------------------------------------------

export interface JournalEntry {
    id: number;
    entryNo: string;
    entryDate: string;
    sourceType: string;
    sourceId?: number;
    isManual: boolean;
    isReversal: boolean;
    memo?: string;
    totalDebit: number;
    totalCredit: number;
    postedAt: string;
    postedBy: number;
    lines: JournalLine[];
}

export interface JournalLine {
    lineNo: number;
    accountId: number;
    accountCode: string;
    accountName: string;
    dc: DebitCredit;
    amount: number;
    memo?: string;
    entityType?: string;
    entityId?: number;
}

// -----------------------------------------------------------------------------
// Report Types
// -----------------------------------------------------------------------------

export interface SalesSummary {
    period: string;
    totalSales: number;
    totalCogs: number;
    grossProfit: number;
    invoiceCount: number;
}

export interface AgingBucket {
    current: number;
    days1_30: number;
    days31_60: number;
    days61_90: number;
    over90: number;
    total: number;
}

export interface ARAgingReport {
    customerId: number;
    customerCode: string;
    customerName: string;
    aging: AgingBucket;
    invoices: {
        invoiceNo: string;
        invoiceDate: string;
        dueDate: string;
        grandTotal: number;
        balanceDue: number;
        daysPastDue: number;
    }[];
}

export interface APAgingReport {
    supplierId: number;
    supplierCode: string;
    supplierName: string;
    aging: AgingBucket;
    bills: {
        billNo: string;
        billDate: string;
        dueDate: string;
        grandTotal: number;
        balanceDue: number;
        daysPastDue: number;
    }[];
}

export interface InventoryValuationReport {
    asOf: string;
    items: {
        itemId: number;
        sku: string;
        name: string;
        onHand: number;
        avgCost: number;
        totalValue: number;
    }[];
    totalValue: number;
}

export interface TrialBalance {
    asOf: string;
    accounts: {
        accountCode: string;
        accountName: string;
        accountType: string;
        debit: number;
        credit: number;
    }[];
    totalDebit: number;
    totalCredit: number;
}

export interface ProfitLossReport {
    periodFrom: string;
    periodTo: string;
    income: {
        accountCode: string;
        accountName: string;
        amount: number;
    }[];
    totalIncome: number;
    cogs: {
        accountCode: string;
        accountName: string;
        amount: number;
    }[];
    totalCogs: number;
    grossProfit: number;
    expenses: {
        accountCode: string;
        accountName: string;
        amount: number;
    }[];
    totalExpenses: number;
    netIncome: number;
}

export interface BalanceSheet {
    asOf: string;
    assets: {
        accountCode: string;
        accountName: string;
        balance: number;
        isHeader: boolean;
    }[];
    totalAssets: number;
    liabilities: {
        accountCode: string;
        accountName: string;
        balance: number;
        isHeader: boolean;
    }[];
    totalLiabilities: number;
    equity: {
        accountCode: string;
        accountName: string;
        balance: number;
        isHeader: boolean;
    }[];
    totalEquity: number;
}

// -----------------------------------------------------------------------------
// Settings / Audit Types
// -----------------------------------------------------------------------------

export interface AuditLog {
    id: number;
    actorUserId: number;
    actorName?: string;
    action: string;
    entityType: string;
    entityId: number;
    occurredAt: string;
    beforeJson?: string;
    afterJson?: string;
    metaJson?: string;
    ipAddress?: string;
    userAgent?: string;
}
