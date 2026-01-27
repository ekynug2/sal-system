// =============================================================================
// SAL Accounting System - Zod Schemas
// =============================================================================

import { z } from 'zod';

// -----------------------------------------------------------------------------
// Common Schemas
// -----------------------------------------------------------------------------

export const Money = z.number().finite();
export const Qty = z.number().finite();
export const ISODate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
export const IdempotencyKeyHeader = z.string().min(8).max(128);

export const PaginationQuery = z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const DateRangeQuery = z.object({
    from: ISODate.optional(),
    to: ISODate.optional(),
});

// -----------------------------------------------------------------------------
// Auth Schemas
// -----------------------------------------------------------------------------

export const LoginInputSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
});
export type LoginInput = z.infer<typeof LoginInputSchema>;

// -----------------------------------------------------------------------------
// Customer Schemas
// -----------------------------------------------------------------------------

export const CreateCustomerInput = z.object({
    name: z.string().min(1).max(190),
    email: z.string().email().optional().nullable(),
    phone: z.string().max(32).optional().nullable(),
    billingAddress: z.string().optional().nullable(),
    shippingAddress: z.string().optional().nullable(),
    groupId: z.number().int().positive().optional().nullable(),
    termsDays: z.number().int().min(0).default(0),
    creditLimit: Money.nonnegative().default(0),
    taxCode: z.string().min(1).default('NON'),
    npwp: z.string().max(32).optional().nullable(),
    notes: z.string().optional().nullable(),
});
export type CreateCustomerInput = z.infer<typeof CreateCustomerInput>;

export const UpdateCustomerInput = CreateCustomerInput.partial();
export type UpdateCustomerInput = z.infer<typeof UpdateCustomerInput>;

// -----------------------------------------------------------------------------
// Supplier Schemas
// -----------------------------------------------------------------------------

export const CreateSupplierInput = z.object({
    name: z.string().min(1).max(190),
    email: z.string().email().optional().nullable(),
    phone: z.string().max(32).optional().nullable(),
    address: z.string().optional().nullable(),
    termsDays: z.number().int().min(0).default(0),
    taxCode: z.string().min(1).default('NON'),
    npwp: z.string().max(32).optional().nullable(),
    notes: z.string().optional().nullable(),
});
export type CreateSupplierInput = z.infer<typeof CreateSupplierInput>;

export const UpdateSupplierInput = CreateSupplierInput.partial();
export type UpdateSupplierInput = z.infer<typeof UpdateSupplierInput>;

// -----------------------------------------------------------------------------
// Item Schemas
// -----------------------------------------------------------------------------

export const CreateItemInput = z.object({
    sku: z.string().min(1).max(64),
    barcode: z.string().max(64).optional().nullable(),
    name: z.string().min(1).max(190),
    description: z.string().optional().nullable(),
    categoryId: z.number().int().positive().optional().nullable(),
    uomId: z.number().int().positive(),
    sellingPrice: Money.nonnegative().default(0),
    minStock: Qty.nonnegative().default(0),
    maxStock: Qty.positive().optional().nullable(),
    taxCode: z.string().min(1).default('NON'),
    isSellable: z.boolean().default(true),
    isPurchasable: z.boolean().default(true),
    trackInventory: z.boolean().default(true),
});
export type CreateItemInput = z.infer<typeof CreateItemInput>;

export const UpdateItemInput = CreateItemInput.partial().omit({ sku: true });
export type UpdateItemInput = z.infer<typeof UpdateItemInput>;

// -----------------------------------------------------------------------------
// Sales Invoice Schemas
// -----------------------------------------------------------------------------

export const SalesInvoiceLineInput = z.object({
    itemId: z.number().int().positive(),
    description: z.string().max(255).optional().nullable(),
    qty: Qty.positive(),
    unitPrice: Money.nonnegative(),
    discountRate: z.number().min(0).max(100).default(0),
    taxCode: z.string().min(1),
    memo: z.string().max(255).optional().nullable(),
});
export type SalesInvoiceLineInput = z.infer<typeof SalesInvoiceLineInput>;

export const CreateSalesInvoiceInput = z.object({
    customerId: z.number().int().positive(),
    invoiceDate: ISODate,
    dueDate: ISODate,
    currency: z.string().default('IDR'),
    lines: z.array(SalesInvoiceLineInput).min(1),
    globalDiscountRate: z.number().min(0).max(100).default(0),
    shippingFee: Money.nonnegative().default(0),
    memo: z.string().max(255).optional().nullable(),
    shippingAddress: z.string().optional().nullable(),
});
export type CreateSalesInvoiceInput = z.infer<typeof CreateSalesInvoiceInput>;

export const UpdateSalesInvoiceInput = CreateSalesInvoiceInput.partial();
export type UpdateSalesInvoiceInput = z.infer<typeof UpdateSalesInvoiceInput>;

export const PostSalesInvoiceInput = z.object({
    idempotencyKey: z.string().min(8).max(128),
    postDate: ISODate.optional(),
});
export type PostSalesInvoiceInput = z.infer<typeof PostSalesInvoiceInput>;

export const VoidSalesInvoiceInput = z.object({
    reason: z.string().min(1).max(255),
});
export type VoidSalesInvoiceInput = z.infer<typeof VoidSalesInvoiceInput>;

// -----------------------------------------------------------------------------
// Sales Payment Schemas
// -----------------------------------------------------------------------------

export const PaymentAllocationInput = z.object({
    invoiceId: z.number().int().positive(),
    amount: Money.positive(),
});
export type PaymentAllocationInput = z.infer<typeof PaymentAllocationInput>;

export const ReceivePaymentInput = z.object({
    customerId: z.number().int().positive(),
    receivedDate: ISODate,
    method: z.enum(['CASH', 'BANK_TRANSFER', 'QRIS', 'CHECK', 'OTHER']),
    bankAccountId: z.number().int().positive().optional().nullable(),
    amountTotal: Money.positive(),
    allocations: z.array(PaymentAllocationInput).min(1),
    referenceNo: z.string().max(64).optional().nullable(),
    memo: z.string().max(255).optional().nullable(),
});
export type ReceivePaymentInput = z.infer<typeof ReceivePaymentInput>;

// -----------------------------------------------------------------------------
// Credit Note Schemas
// -----------------------------------------------------------------------------

export const CreditNoteLineInput = z.object({
    itemId: z.number().int().positive(),
    qty: Qty.positive(),
    unitPrice: Money.nonnegative(),
    taxCode: z.string().min(1),
    memo: z.string().max(255).optional().nullable(),
});
export type CreditNoteLineInput = z.infer<typeof CreditNoteLineInput>;

export const CreateCreditNoteInput = z.object({
    invoiceId: z.number().int().positive(),
    creditDate: ISODate,
    reasonCode: z.enum(['RETURN', 'PRICE_ADJUSTMENT', 'DAMAGED', 'OTHER']),
    restock: z.boolean().default(false),
    lines: z.array(CreditNoteLineInput).min(1),
    memo: z.string().max(255).optional().nullable(),
});
export type CreateCreditNoteInput = z.infer<typeof CreateCreditNoteInput>;

// -----------------------------------------------------------------------------
// Purchase Receipt Schemas
// -----------------------------------------------------------------------------

export const ReceiveItemLineInput = z.object({
    itemId: z.number().int().positive(),
    qty: Qty.positive(),
    unitCost: Money.nonnegative(),
    taxCode: z.string().min(1),
    memo: z.string().max(255).optional().nullable(),
});
export type ReceiveItemLineInput = z.infer<typeof ReceiveItemLineInput>;

export const CreateReceiptInput = z.object({
    supplierId: z.number().int().positive(),
    receiptDate: ISODate,
    lines: z.array(ReceiveItemLineInput).min(1),
    referenceNo: z.string().max(64).optional().nullable(),
    memo: z.string().max(255).optional().nullable(),
});
export type CreateReceiptInput = z.infer<typeof CreateReceiptInput>;

export const PostReceiptInput = z.object({
    idempotencyKey: z.string().min(8).max(128),
});
export type PostReceiptInput = z.infer<typeof PostReceiptInput>;

// -----------------------------------------------------------------------------
// Purchase Bill Schemas
// -----------------------------------------------------------------------------

export const BillLineInput = z.object({
    itemId: z.number().int().positive().optional().nullable(),
    accountId: z.number().int().positive().optional().nullable(),
    description: z.string().max(255).optional().nullable(),
    qty: Qty.positive().default(1),
    unitCost: Money.nonnegative(),
    taxCode: z.string().min(1),
    memo: z.string().max(255).optional().nullable(),
});
export type BillLineInput = z.infer<typeof BillLineInput>;

export const CreateBillInput = z.object({
    supplierId: z.number().int().positive(),
    billDate: ISODate,
    dueDate: ISODate,
    supplierInvoiceNo: z.string().max(64).optional().nullable(),
    lines: z.array(BillLineInput).min(1),
    memo: z.string().max(255).optional().nullable(),
});
export type CreateBillInput = z.infer<typeof CreateBillInput>;

// -----------------------------------------------------------------------------
// Purchase Payment Schemas
// -----------------------------------------------------------------------------

export const BillPaymentAllocationInput = z.object({
    billId: z.number().int().positive(),
    amount: Money.positive(),
});
export type BillPaymentAllocationInput = z.infer<typeof BillPaymentAllocationInput>;

export const PayBillsInput = z.object({
    supplierId: z.number().int().positive(),
    paymentDate: ISODate,
    method: z.enum(['CASH', 'BANK_TRANSFER', 'QRIS', 'CHECK', 'OTHER']),
    bankAccountId: z.number().int().positive().optional().nullable(),
    amountTotal: Money.positive(),
    allocations: z.array(BillPaymentAllocationInput).min(1),
    referenceNo: z.string().max(64).optional().nullable(),
    memo: z.string().max(255).optional().nullable(),
});
export type PayBillsInput = z.infer<typeof PayBillsInput>;

// -----------------------------------------------------------------------------
// Inventory Adjustment Schemas
// -----------------------------------------------------------------------------

export const InventoryAdjustmentLineInput = z.object({
    itemId: z.number().int().positive(),
    qtyDelta: Qty, // can be negative
    reasonCode: z.enum(['EXPIRED', 'DAMAGED', 'LOST', 'FOUND', 'INPUT_ERROR', 'OTHER']),
    memo: z.string().max(255).optional().nullable(),
});
export type InventoryAdjustmentLineInput = z.infer<typeof InventoryAdjustmentLineInput>;

export const CreateInventoryAdjustmentInput = z.object({
    adjDate: ISODate,
    lines: z.array(InventoryAdjustmentLineInput).min(1),
    memo: z.string().max(255).optional().nullable(),
});
export type CreateInventoryAdjustmentInput = z.infer<typeof CreateInventoryAdjustmentInput>;

export const PostAdjustmentInput = z.object({
    idempotencyKey: z.string().min(8).max(128),
});
export type PostAdjustmentInput = z.infer<typeof PostAdjustmentInput>;

// -----------------------------------------------------------------------------
// Stock Opname Schemas
// -----------------------------------------------------------------------------

export const CreateOpnameSessionInput = z.object({
    opnameDate: ISODate,
    location: z.string().max(64).optional().nullable(),
    itemIds: z.array(z.number().int().positive()).optional(), // empty = all items
    memo: z.string().max(255).optional().nullable(),
});
export type CreateOpnameSessionInput = z.infer<typeof CreateOpnameSessionInput>;

export const OpnameCountInput = z.object({
    itemId: z.number().int().positive(),
    countedQty: Qty.nonnegative(),
    notes: z.string().max(255).optional().nullable(),
});
export type OpnameCountInput = z.infer<typeof OpnameCountInput>;

export const SubmitOpnameInput = z.object({
    counts: z.array(OpnameCountInput).min(1),
});
export type SubmitOpnameInput = z.infer<typeof SubmitOpnameInput>;

// -----------------------------------------------------------------------------
// Report Query Schemas
// -----------------------------------------------------------------------------

export const SalesReportQuery = z.object({
    from: ISODate,
    to: ISODate,
    groupBy: z.enum(['day', 'week', 'month']).default('month'),
    customerId: z.coerce.number().int().positive().optional(),
    itemId: z.coerce.number().int().positive().optional(),
});
export type SalesReportQuery = z.infer<typeof SalesReportQuery>;

export const AgingReportQuery = z.object({
    asOf: ISODate,
});
export type AgingReportQuery = z.infer<typeof AgingReportQuery>;

export const InventoryReportQuery = z.object({
    asOf: ISODate.optional(),
    categoryId: z.coerce.number().int().positive().optional(),
});
export type InventoryReportQuery = z.infer<typeof InventoryReportQuery>;

export const FinancialReportQuery = z.object({
    from: ISODate.optional(),
    to: ISODate.optional(),
    asOf: ISODate.optional(),
});
export type FinancialReportQuery = z.infer<typeof FinancialReportQuery>;

export const GLDetailQuery = z.object({
    from: ISODate,
    to: ISODate,
    accountId: z.coerce.number().int().positive(),
});
export type GLDetailQuery = z.infer<typeof GLDetailQuery>;

// -----------------------------------------------------------------------------
// Period Lock Schema
// -----------------------------------------------------------------------------

export const CreatePeriodLockInput = z.object({
    periodStart: ISODate,
    periodEnd: ISODate,
    memo: z.string().max(255).optional().nullable(),
});
export type CreatePeriodLockInput = z.infer<typeof CreatePeriodLockInput>;
