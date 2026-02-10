// =============================================================================
// SAL Accounting System - Constants
// =============================================================================

// -----------------------------------------------------------------------------
// Error Codes
// -----------------------------------------------------------------------------

export const ErrorCodes = {
    // Auth
    AUTH_UNAUTHORIZED: 'AUTH_UNAUTHORIZED',
    AUTH_FORBIDDEN: 'AUTH_FORBIDDEN',
    AUTH_INVALID_CREDENTIALS: 'AUTH_INVALID_CREDENTIALS',
    AUTH_USER_INACTIVE: 'AUTH_USER_INACTIVE',
    AUTH_TOKEN_EXPIRED: 'AUTH_TOKEN_EXPIRED',

    // Validation
    VALIDATION_ERROR: 'VALIDATION_ERROR',

    // Resource
    RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',

    // Conflict
    CONFLICT: 'CONFLICT',
    DUPLICATE_ENTRY: 'DUPLICATE_ENTRY',

    // Period
    PERIOD_LOCKED: 'PERIOD_LOCKED',

    // Idempotency
    IDEMPOTENCY_REPLAY: 'IDEMPOTENCY_REPLAY',

    // Sales
    SLS_INV_POST_STOCK_NEGATIVE: 'SLS_INV_POST_STOCK_NEGATIVE',
    SLS_INV_ALREADY_POSTED: 'SLS_INV_ALREADY_POSTED',
    SLS_INV_NOT_DRAFT: 'SLS_INV_NOT_DRAFT',
    SLS_INV_HAS_PAYMENTS: 'SLS_INV_HAS_PAYMENTS',
    SLS_PAYMENT_EXCEEDS_BALANCE: 'SLS_PAYMENT_EXCEEDS_BALANCE',

    // Purchases
    PRC_RECEIPT_ALREADY_POSTED: 'PRC_RECEIPT_ALREADY_POSTED',
    PRC_BILL_ALREADY_POSTED: 'PRC_BILL_ALREADY_POSTED',

    // Inventory
    INV_ADJUSTMENT_ALREADY_POSTED: 'INV_ADJUSTMENT_ALREADY_POSTED',
    INV_OPNAME_INVALID_STATUS: 'INV_OPNAME_INVALID_STATUS',
    INV_NEGATIVE_STOCK: 'INV_NEGATIVE_STOCK',

    // Database
    DB_TX_FAILED: 'DB_TX_FAILED',
    DB_CONNECTION_ERROR: 'DB_CONNECTION_ERROR',

    // Server
    INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];

// -----------------------------------------------------------------------------
// HTTP Status Codes
// -----------------------------------------------------------------------------

export const HttpStatus = {
    OK: 200,
    CREATED: 201,
    NO_CONTENT: 204,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    UNPROCESSABLE_ENTITY: 422,
    INTERNAL_SERVER_ERROR: 500,
} as const;

// -----------------------------------------------------------------------------
// Document Statuses
// -----------------------------------------------------------------------------

export const DocumentStatus = {
    DRAFT: 'DRAFT',
    POSTED: 'POSTED',
    PARTIALLY_PAID: 'PARTIALLY_PAID',
    PAID: 'PAID',
    VOIDED: 'VOIDED',
    CANCELLED: 'CANCELLED',
} as const;

export type DocumentStatus = typeof DocumentStatus[keyof typeof DocumentStatus];

// -----------------------------------------------------------------------------
// Source Types (for ledgers and journals)
// -----------------------------------------------------------------------------

export const SourceType = {
    SALES_INVOICE: 'SALES_INVOICE',
    SALES_PAYMENT: 'SALES_PAYMENT',
    CREDIT_NOTE: 'CREDIT_NOTE',
    PURCHASE_RECEIPT: 'PURCHASE_RECEIPT',
    PURCHASE_BILL: 'PURCHASE_BILL',
    PURCHASE_PAYMENT: 'PURCHASE_PAYMENT',
    DEBIT_NOTE: 'DEBIT_NOTE',
    ADJUSTMENT: 'ADJUSTMENT',
    OPNAME: 'OPNAME',
    MANUAL_JOURNAL: 'MANUAL_JOURNAL',
} as const;

// -----------------------------------------------------------------------------
// Payment Methods
// -----------------------------------------------------------------------------

export const PaymentMethod = {
    CASH: 'CASH',
    BANK_TRANSFER: 'BANK_TRANSFER',
    QRIS: 'QRIS',
    CHECK: 'CHECK',
    OTHER: 'OTHER',
} as const;

// -----------------------------------------------------------------------------
// Account Types
// -----------------------------------------------------------------------------

export const AccountType = {
    ASSET: 'ASSET',
    LIABILITY: 'LIABILITY',
    EQUITY: 'EQUITY',
    INCOME: 'INCOME',
    COGS: 'COGS',
    EXPENSE: 'EXPENSE',
} as const;

// -----------------------------------------------------------------------------
// Default Account Mapping Keys
// -----------------------------------------------------------------------------

export const DefaultAccountKeys = {
    AR_TRADE: 'AR_TRADE',
    AP_TRADE: 'AP_TRADE',
    INVENTORY_ASSET: 'INVENTORY_ASSET',
    SALES_INCOME: 'SALES_INCOME',
    SALES_DISCOUNT: 'SALES_DISCOUNT',
    SALES_RETURNS: 'SALES_RETURNS',
    COGS: 'COGS',
    INVENTORY_SHRINKAGE: 'INVENTORY_SHRINKAGE',
    INVENTORY_ADJUSTMENT: 'INVENTORY_ADJUSTMENT',
    PPN_OUTPUT: 'PPN_OUTPUT',
    PPN_INPUT: 'PPN_INPUT',
    CASH_ON_HAND: 'CASH_ON_HAND',
    RETAINED_EARNINGS: 'RETAINED_EARNINGS',
    CURRENT_EARNINGS: 'CURRENT_EARNINGS',
} as const;

// -----------------------------------------------------------------------------
// Permissions
// -----------------------------------------------------------------------------

export const Permissions = {
    // Dashboard
    DASHBOARD_VIEW: 'DASHBOARD_VIEW',

    // Master Data
    CUSTOMER_VIEW: 'CUSTOMER_VIEW',
    CUSTOMER_CREATE: 'CUSTOMER_CREATE',
    CUSTOMER_EDIT: 'CUSTOMER_EDIT',
    CUSTOMER_DELETE: 'CUSTOMER_DELETE',

    SUPPLIER_VIEW: 'SUPPLIER_VIEW',
    SUPPLIER_CREATE: 'SUPPLIER_CREATE',
    SUPPLIER_EDIT: 'SUPPLIER_EDIT',
    SUPPLIER_DELETE: 'SUPPLIER_DELETE',

    ITEM_VIEW: 'ITEM_VIEW',
    ITEM_CREATE: 'ITEM_CREATE',
    ITEM_EDIT: 'ITEM_EDIT',
    ITEM_DELETE: 'ITEM_DELETE',

    COA_VIEW: 'COA_VIEW',
    COA_CREATE: 'COA_CREATE',
    COA_EDIT: 'COA_EDIT',

    TAX_VIEW: 'TAX_VIEW',
    TAX_CREATE: 'TAX_CREATE',
    TAX_EDIT: 'TAX_EDIT',

    // Sales
    SALES_INVOICE_VIEW: 'SALES_INVOICE_VIEW',
    SALES_INVOICE_CREATE: 'SALES_INVOICE_CREATE',
    SALES_INVOICE_EDIT: 'SALES_INVOICE_EDIT',
    SALES_INVOICE_POST: 'SALES_INVOICE_POST',
    SALES_INVOICE_VOID: 'SALES_INVOICE_VOID',

    SALES_PAYMENT_VIEW: 'SALES_PAYMENT_VIEW',
    SALES_PAYMENT_CREATE: 'SALES_PAYMENT_CREATE',

    SALES_CREDIT_NOTE_VIEW: 'SALES_CREDIT_NOTE_VIEW',
    SALES_CREDIT_NOTE_CREATE: 'SALES_CREDIT_NOTE_CREATE',
    SALES_CREDIT_NOTE_POST: 'SALES_CREDIT_NOTE_POST',

    // Purchases
    PURCHASE_RECEIPT_VIEW: 'PURCHASE_RECEIPT_VIEW',
    PURCHASE_RECEIPT_CREATE: 'PURCHASE_RECEIPT_CREATE',
    PURCHASE_RECEIPT_POST: 'PURCHASE_RECEIPT_POST',

    PURCHASE_BILL_VIEW: 'PURCHASE_BILL_VIEW',
    PURCHASE_BILL_CREATE: 'PURCHASE_BILL_CREATE',
    PURCHASE_BILL_POST: 'PURCHASE_BILL_POST',

    PURCHASE_PAYMENT_VIEW: 'PURCHASE_PAYMENT_VIEW',
    PURCHASE_PAYMENT_CREATE: 'PURCHASE_PAYMENT_CREATE',

    // Inventory
    INVENTORY_VIEW: 'INVENTORY_VIEW',
    INVENTORY_ADJUSTMENT_VIEW: 'INVENTORY_ADJUSTMENT_VIEW',
    INVENTORY_ADJUSTMENT_CREATE: 'INVENTORY_ADJUSTMENT_CREATE',
    INVENTORY_ADJUSTMENT_POST: 'INVENTORY_ADJUSTMENT_POST',
    INVENTORY_OPNAME_CREATE: 'INVENTORY_OPNAME_CREATE',
    INVENTORY_OPNAME_POST: 'INVENTORY_OPNAME_POST',

    // Accounting
    JOURNAL_VIEW: 'JOURNAL_VIEW',
    JOURNAL_MANUAL_CREATE: 'JOURNAL_MANUAL_CREATE',

    // Reports
    REPORT_SALES: 'REPORT_SALES',
    REPORT_PURCHASES: 'REPORT_PURCHASES',
    REPORT_INVENTORY: 'REPORT_INVENTORY',
    REPORT_AR_AGING: 'REPORT_AR_AGING',
    REPORT_AP_AGING: 'REPORT_AP_AGING',
    REPORT_PNL: 'REPORT_PNL',
    REPORT_BALANCE_SHEET: 'REPORT_BALANCE_SHEET',
    REPORT_TRIAL_BALANCE: 'REPORT_TRIAL_BALANCE',
    REPORT_GL_DETAIL: 'REPORT_GL_DETAIL',
    REPORT_EXPORT: 'REPORT_EXPORT',

    // Admin
    USER_VIEW: 'USER_VIEW',
    USER_CREATE: 'USER_CREATE',
    USER_EDIT: 'USER_EDIT',
    USER_DELETE: 'USER_DELETE',

    ROLE_VIEW: 'ROLE_VIEW',
    ROLE_EDIT: 'ROLE_EDIT',

    PERIOD_LOCK_CREATE: 'PERIOD_LOCK_CREATE',
    AUDIT_LOG_VIEW: 'AUDIT_LOG_VIEW',

    SETTINGS_VIEW: 'SETTINGS_VIEW',
    SETTINGS_EDIT: 'SETTINGS_EDIT',

    // Approvals
    APPROVAL_DISCOUNT: 'APPROVAL_DISCOUNT',
    APPROVAL_ADJUSTMENT: 'APPROVAL_ADJUSTMENT',
    APPROVAL_VOID: 'APPROVAL_VOID',
} as const;

export type Permission = typeof Permissions[keyof typeof Permissions];

// -----------------------------------------------------------------------------
// Audit Actions
// -----------------------------------------------------------------------------

export const AuditAction = {
    CREATE: 'CREATE',
    UPDATE: 'UPDATE',
    DELETE: 'DELETE',
    POST: 'POST',
    VOID: 'VOID',
    APPROVE: 'APPROVE',
    LOGIN: 'LOGIN',
    LOGOUT: 'LOGOUT',
    LOGIN_FAILED: 'LOGIN_FAILED',
} as const;

// -----------------------------------------------------------------------------
// Settings Keys
// -----------------------------------------------------------------------------

export const SettingsKeys = {
    COMPANY_NAME: 'company_name',
    COMPANY_ADDRESS: 'company_address',
    COMPANY_PHONE: 'company_phone',
    COMPANY_EMAIL: 'company_email',
    COMPANY_NPWP: 'company_npwp',
    NO_NEGATIVE_STOCK: 'no_negative_stock',
    DEFAULT_TERMS_DAYS: 'default_terms_days',
    DEFAULT_CURRENCY: 'default_currency',
    FISCAL_YEAR_START: 'fiscal_year_start',
    APPROVAL_DISCOUNT_THRESHOLD: 'approval_discount_threshold',
    APPROVAL_ADJUSTMENT_THRESHOLD: 'approval_adjustment_threshold',
    INVOICE_FOOTER: 'invoice_footer',

    // Invoice Header Settings
    INVOICE_TEMPLATE: 'invoice_template', // 'classic' | 'modern' | 'minimal'
    COMPANY_BANK_NAME: 'company_bank_name',
    COMPANY_BANK_ACCOUNT: 'company_bank_account',
    COMPANY_BANK_HOLDER: 'company_bank_holder',
    INVOICE_SIGN_LEFT: 'invoice_sign_left', // e.g. 'Dibuat Oleh'
    INVOICE_SIGN_RIGHT: 'invoice_sign_right', // e.g. 'Diterima Oleh'
    INVOICE_SHOW_LOGO: 'invoice_show_logo', // 'true' | 'false'
    INVOICE_SHOW_BANK: 'invoice_show_bank', // 'true' | 'false'
    INVOICE_SHOW_SIGNATURE: 'invoice_show_signature', // 'true' | 'false'

    // Branding
    COMPANY_LOGO: 'company_logo', // URL or base64
    COMPANY_LETTERHEAD: 'company_letterhead', // URL or base64

    // Document Numbering Formats
    // e.g., 'INV/{YEAR}/{MONTH}/{SEQ}' or 'INV-{YY}{MM}-{SEQ}'
    FORMAT_SALES_INVOICE: 'format_sales_invoice',
    FORMAT_SALES_PAYMENT: 'format_sales_payment',
    FORMAT_SALES_CREDIT_NOTE: 'format_sales_credit_note',
    FORMAT_PURCHASE_RECEIPT: 'format_purchase_receipt',
    FORMAT_PURCHASE_BILL: 'format_purchase_bill',
    FORMAT_PURCHASE_PAYMENT: 'format_purchase_payment',
    FORMAT_INVENTORY_ADJUSTMENT: 'format_inventory_adjustment',
    FORMAT_INVENTORY_OPNAME: 'format_inventory_opname',
    FORMAT_JOURNAL_ENTRY: 'format_journal_entry',
} as const;
