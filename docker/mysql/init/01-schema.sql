-- =============================================================================
-- SAL Accounting System - Database Schema
-- Version: 1.0.0
-- Engine: InnoDB, charset utf8mb4
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. User Management & RBAC
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS users (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  email VARCHAR(190) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(190) NOT NULL,
  is_active TINYINT NOT NULL DEFAULT 1,
  last_login_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_users_email (email),
  INDEX idx_users_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS roles (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  code VARCHAR(64) NOT NULL UNIQUE,
  name VARCHAR(190) NOT NULL,
  description VARCHAR(255) NULL,
  is_active TINYINT NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_roles (
  user_id BIGINT NOT NULL,
  role_id BIGINT NOT NULL,
  assigned_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  assigned_by BIGINT NULL,
  PRIMARY KEY (user_id, role_id),
  CONSTRAINT fk_user_roles_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_user_roles_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
  CONSTRAINT fk_user_roles_assigned_by FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS role_permissions (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  role_id BIGINT NOT NULL,
  perm_code VARCHAR(64) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_role_perm (role_id, perm_code),
  CONSTRAINT fk_role_perm_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
  INDEX idx_role_perm_code (perm_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 2. Audit Trail & System
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  actor_user_id BIGINT NOT NULL,
  action VARCHAR(64) NOT NULL,
  entity_type VARCHAR(64) NOT NULL,
  entity_id BIGINT NOT NULL,
  occurred_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  before_json JSON NULL,
  after_json JSON NULL,
  meta_json JSON NULL,
  ip_address VARCHAR(45) NULL,
  user_agent VARCHAR(255) NULL,
  CONSTRAINT fk_audit_actor FOREIGN KEY (actor_user_id) REFERENCES users(id),
  INDEX idx_audit_entity (entity_type, entity_id),
  INDEX idx_audit_at (occurred_at),
  INDEX idx_audit_action (action),
  INDEX idx_audit_actor (actor_user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS period_locks (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  locked_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  locked_by BIGINT NOT NULL,
  memo VARCHAR(255) NULL,
  CONSTRAINT fk_period_lock_user FOREIGN KEY (locked_by) REFERENCES users(id),
  UNIQUE KEY uq_period_range (period_start, period_end),
  INDEX idx_period_dates (period_start, period_end)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS idempotency_keys (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  key_value VARCHAR(128) NOT NULL UNIQUE,
  entity_type VARCHAR(64) NOT NULL,
  entity_id BIGINT NULL,
  response_json JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME NOT NULL,
  INDEX idx_idemp_key (key_value),
  INDEX idx_idemp_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS app_settings (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  setting_key VARCHAR(64) NOT NULL UNIQUE,
  setting_value TEXT NOT NULL,
  setting_type VARCHAR(32) NOT NULL DEFAULT 'string',
  description VARCHAR(255) NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  updated_by BIGINT NULL,
  CONSTRAINT fk_settings_updated_by FOREIGN KEY (updated_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 3. Master Data - Chart of Accounts
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS account_types (
  code VARCHAR(32) PRIMARY KEY,
  name VARCHAR(64) NOT NULL,
  normal_balance CHAR(1) NOT NULL COMMENT 'D=Debit, C=Credit',
  display_order INT NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS chart_of_accounts (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  account_code VARCHAR(64) NOT NULL UNIQUE,
  account_name VARCHAR(190) NOT NULL,
  account_type_code VARCHAR(32) NOT NULL,
  parent_id BIGINT NULL,
  is_header TINYINT NOT NULL DEFAULT 0 COMMENT 'Header account for grouping',
  is_active TINYINT NOT NULL DEFAULT 1,
  is_system TINYINT NOT NULL DEFAULT 0 COMMENT 'System account, cannot be deleted',
  description VARCHAR(255) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_coa_type FOREIGN KEY (account_type_code) REFERENCES account_types(code),
  CONSTRAINT fk_coa_parent FOREIGN KEY (parent_id) REFERENCES chart_of_accounts(id),
  INDEX idx_coa_type (account_type_code),
  INDEX idx_coa_parent (parent_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS default_account_mappings (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  mapping_key VARCHAR(64) NOT NULL UNIQUE COMMENT 'e.g., INVENTORY_ASSET, AR, AP, SALES_INCOME',
  account_id BIGINT NOT NULL,
  description VARCHAR(255) NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_dam_account FOREIGN KEY (account_id) REFERENCES chart_of_accounts(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 4. Master Data - Tax
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS tax_codes (
  code VARCHAR(32) PRIMARY KEY,
  name VARCHAR(190) NOT NULL,
  rate DECIMAL(6,4) NOT NULL DEFAULT 0 COMMENT 'Rate in decimal, e.g., 0.11 for 11%',
  is_inclusive TINYINT NOT NULL DEFAULT 0 COMMENT '1=Tax included in price',
  tax_account_id BIGINT NULL COMMENT 'Account for output tax',
  tax_input_account_id BIGINT NULL COMMENT 'Account for input tax',
  is_active TINYINT NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_tax_output_account FOREIGN KEY (tax_account_id) REFERENCES chart_of_accounts(id),
  CONSTRAINT fk_tax_input_account FOREIGN KEY (tax_input_account_id) REFERENCES chart_of_accounts(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 5. Master Data - Customers
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS customer_groups (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  code VARCHAR(32) NOT NULL UNIQUE,
  name VARCHAR(190) NOT NULL,
  discount_rate DECIMAL(5,2) NOT NULL DEFAULT 0,
  is_active TINYINT NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS customers (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  customer_code VARCHAR(32) NOT NULL UNIQUE,
  name VARCHAR(190) NOT NULL,
  email VARCHAR(190) NULL,
  phone VARCHAR(32) NULL,
  billing_address TEXT NULL,
  shipping_address TEXT NULL,
  group_id BIGINT NULL,
  terms_days INT NOT NULL DEFAULT 0 COMMENT 'Payment term in days',
  credit_limit DECIMAL(18,2) NOT NULL DEFAULT 0,
  current_balance DECIMAL(18,2) NOT NULL DEFAULT 0 COMMENT 'Outstanding AR balance',
  tax_code VARCHAR(32) NOT NULL DEFAULT 'NON',
  npwp VARCHAR(32) NULL COMMENT 'Tax ID Number',
  is_active TINYINT NOT NULL DEFAULT 1,
  notes TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by BIGINT NULL,
  CONSTRAINT fk_customer_group FOREIGN KEY (group_id) REFERENCES customer_groups(id) ON DELETE SET NULL,
  CONSTRAINT fk_customer_tax FOREIGN KEY (tax_code) REFERENCES tax_codes(code),
  CONSTRAINT fk_customer_created_by FOREIGN KEY (created_by) REFERENCES users(id),
  INDEX idx_customer_name (name),
  INDEX idx_customer_active (is_active),
  INDEX idx_customer_group (group_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 6. Master Data - Suppliers
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS suppliers (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  supplier_code VARCHAR(32) NOT NULL UNIQUE,
  name VARCHAR(190) NOT NULL,
  email VARCHAR(190) NULL,
  phone VARCHAR(32) NULL,
  address TEXT NULL,
  terms_days INT NOT NULL DEFAULT 0,
  tax_code VARCHAR(32) NOT NULL DEFAULT 'NON',
  npwp VARCHAR(32) NULL,
  current_balance DECIMAL(18,2) NOT NULL DEFAULT 0 COMMENT 'Outstanding AP balance',
  is_active TINYINT NOT NULL DEFAULT 1,
  notes TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by BIGINT NULL,
  CONSTRAINT fk_supplier_tax FOREIGN KEY (tax_code) REFERENCES tax_codes(code),
  CONSTRAINT fk_supplier_created_by FOREIGN KEY (created_by) REFERENCES users(id),
  INDEX idx_supplier_name (name),
  INDEX idx_supplier_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 7. Master Data - Items (Inventory)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS item_categories (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  code VARCHAR(32) NOT NULL UNIQUE,
  name VARCHAR(190) NOT NULL,
  parent_id BIGINT NULL,
  is_active TINYINT NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_item_cat_parent FOREIGN KEY (parent_id) REFERENCES item_categories(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS units_of_measure (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  code VARCHAR(16) NOT NULL UNIQUE,
  name VARCHAR(64) NOT NULL,
  is_active TINYINT NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS items (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  sku VARCHAR(64) NOT NULL UNIQUE,
  barcode VARCHAR(64) NULL UNIQUE,
  name VARCHAR(190) NOT NULL,
  description TEXT NULL,
  category_id BIGINT NULL,
  uom_id BIGINT NOT NULL,
  avg_cost DECIMAL(18,4) NOT NULL DEFAULT 0 COMMENT 'Moving average cost',
  last_cost DECIMAL(18,4) NOT NULL DEFAULT 0 COMMENT 'Last purchase cost',
  selling_price DECIMAL(18,2) NOT NULL DEFAULT 0 COMMENT 'Default selling price',
  min_stock DECIMAL(18,4) NOT NULL DEFAULT 0 COMMENT 'Minimum stock level',
  max_stock DECIMAL(18,4) NULL COMMENT 'Maximum stock level',
  reorder_qty DECIMAL(18,4) NULL COMMENT 'Qty to reorder',
  tax_code VARCHAR(32) NOT NULL DEFAULT 'NON',
  income_account_id BIGINT NULL COMMENT 'Override sales income account',
  cogs_account_id BIGINT NULL COMMENT 'Override COGS account',
  inventory_account_id BIGINT NULL COMMENT 'Override inventory asset account',
  is_active TINYINT NOT NULL DEFAULT 1,
  is_sellable TINYINT NOT NULL DEFAULT 1,
  is_purchasable TINYINT NOT NULL DEFAULT 1,
  track_inventory TINYINT NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by BIGINT NULL,
  CONSTRAINT fk_item_category FOREIGN KEY (category_id) REFERENCES item_categories(id) ON DELETE SET NULL,
  CONSTRAINT fk_item_uom FOREIGN KEY (uom_id) REFERENCES units_of_measure(id),
  CONSTRAINT fk_item_tax FOREIGN KEY (tax_code) REFERENCES tax_codes(code),
  CONSTRAINT fk_item_income_account FOREIGN KEY (income_account_id) REFERENCES chart_of_accounts(id),
  CONSTRAINT fk_item_cogs_account FOREIGN KEY (cogs_account_id) REFERENCES chart_of_accounts(id),
  CONSTRAINT fk_item_inventory_account FOREIGN KEY (inventory_account_id) REFERENCES chart_of_accounts(id),
  CONSTRAINT fk_item_created_by FOREIGN KEY (created_by) REFERENCES users(id),
  INDEX idx_item_name (name),
  INDEX idx_item_category (category_id),
  INDEX idx_item_active (is_active),
  INDEX idx_item_sku (sku)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Price levels for different customer types
CREATE TABLE IF NOT EXISTS price_levels (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  code VARCHAR(32) NOT NULL UNIQUE,
  name VARCHAR(64) NOT NULL,
  is_active TINYINT NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS item_prices (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  item_id BIGINT NOT NULL,
  price_level_id BIGINT NOT NULL,
  unit_price DECIMAL(18,2) NOT NULL,
  min_qty DECIMAL(18,4) NOT NULL DEFAULT 1 COMMENT 'Minimum qty to get this price',
  effective_from DATE NULL,
  effective_to DATE NULL,
  is_active TINYINT NOT NULL DEFAULT 1,
  UNIQUE KEY uq_item_price (item_id, price_level_id, min_qty, effective_from),
  CONSTRAINT fk_item_prices_item FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE,
  CONSTRAINT fk_item_prices_level FOREIGN KEY (price_level_id) REFERENCES price_levels(id) ON DELETE CASCADE,
  INDEX idx_item_prices_item (item_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Stock summary table for fast lookup & locking
CREATE TABLE IF NOT EXISTS item_stock (
  item_id BIGINT PRIMARY KEY,
  on_hand DECIMAL(18,4) NOT NULL DEFAULT 0,
  on_order DECIMAL(18,4) NOT NULL DEFAULT 0 COMMENT 'Qty on PO not yet received',
  committed DECIMAL(18,4) NOT NULL DEFAULT 0 COMMENT 'Qty on SO not yet shipped',
  available DECIMAL(18,4) GENERATED ALWAYS AS (on_hand - committed) STORED,
  stock_value DECIMAL(18,4) NOT NULL DEFAULT 0,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_item_stock_item FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 8. Sales Module
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS sales_invoices (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  invoice_no VARCHAR(64) NOT NULL UNIQUE,
  customer_id BIGINT NOT NULL,
  invoice_date DATE NOT NULL,
  due_date DATE NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'IDR',
  exchange_rate DECIMAL(18,8) NOT NULL DEFAULT 1,
  status VARCHAR(24) NOT NULL DEFAULT 'DRAFT' COMMENT 'DRAFT, POSTED, PARTIALLY_PAID, PAID, VOIDED',
  subtotal DECIMAL(18,2) NOT NULL DEFAULT 0,
  discount_amount DECIMAL(18,2) NOT NULL DEFAULT 0,
  tax_total DECIMAL(18,2) NOT NULL DEFAULT 0,
  shipping_fee DECIMAL(18,2) NOT NULL DEFAULT 0,
  grand_total DECIMAL(18,2) NOT NULL DEFAULT 0,
  paid_amount DECIMAL(18,2) NOT NULL DEFAULT 0,
  balance_due DECIMAL(18,2) GENERATED ALWAYS AS (grand_total - paid_amount) STORED,
  memo TEXT NULL,
  internal_notes TEXT NULL,
  shipping_address TEXT NULL,
  terms_and_conditions TEXT NULL,
  posted_at DATETIME NULL,
  posted_by BIGINT NULL,
  voided_at DATETIME NULL,
  voided_by BIGINT NULL,
  void_reason VARCHAR(255) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by BIGINT NULL,
  CONSTRAINT fk_sales_inv_customer FOREIGN KEY (customer_id) REFERENCES customers(id),
  CONSTRAINT fk_sales_inv_posted_by FOREIGN KEY (posted_by) REFERENCES users(id),
  CONSTRAINT fk_sales_inv_voided_by FOREIGN KEY (voided_by) REFERENCES users(id),
  CONSTRAINT fk_sales_inv_created_by FOREIGN KEY (created_by) REFERENCES users(id),
  INDEX idx_sales_inv_date (invoice_date),
  INDEX idx_sales_inv_due_date (due_date),
  INDEX idx_sales_inv_status (status),
  INDEX idx_sales_inv_customer (customer_id),
  INDEX idx_sales_inv_no (invoice_no)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sales_invoice_lines (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  invoice_id BIGINT NOT NULL,
  line_no INT NOT NULL,
  item_id BIGINT NOT NULL,
  description VARCHAR(255) NULL,
  qty DECIMAL(18,4) NOT NULL,
  unit_price DECIMAL(18,4) NOT NULL,
  discount_rate DECIMAL(6,2) NOT NULL DEFAULT 0,
  discount_amount DECIMAL(18,2) NOT NULL DEFAULT 0,
  tax_code VARCHAR(32) NOT NULL,
  tax_rate DECIMAL(6,4) NOT NULL DEFAULT 0,
  line_subtotal DECIMAL(18,2) NOT NULL,
  line_tax DECIMAL(18,2) NOT NULL,
  line_total DECIMAL(18,2) NOT NULL,
  unit_cost DECIMAL(18,4) NOT NULL DEFAULT 0 COMMENT 'Cost at time of posting',
  memo VARCHAR(255) NULL,
  CONSTRAINT fk_sales_line_invoice FOREIGN KEY (invoice_id) REFERENCES sales_invoices(id) ON DELETE CASCADE,
  CONSTRAINT fk_sales_line_item FOREIGN KEY (item_id) REFERENCES items(id),
  CONSTRAINT fk_sales_line_tax FOREIGN KEY (tax_code) REFERENCES tax_codes(code),
  UNIQUE KEY uq_sales_line (invoice_id, line_no),
  INDEX idx_sales_line_item (item_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Bank/Cash accounts for payments
CREATE TABLE IF NOT EXISTS bank_accounts (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  account_name VARCHAR(190) NOT NULL,
  account_number VARCHAR(64) NULL,
  bank_name VARCHAR(64) NULL,
  account_type VARCHAR(32) NOT NULL DEFAULT 'BANK' COMMENT 'BANK, CASH, QRIS, EMONEY',
  coa_id BIGINT NOT NULL,
  current_balance DECIMAL(18,2) NOT NULL DEFAULT 0,
  is_active TINYINT NOT NULL DEFAULT 1,
  CONSTRAINT fk_bank_coa FOREIGN KEY (coa_id) REFERENCES chart_of_accounts(id),
  INDEX idx_bank_type (account_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sales_payments (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  payment_no VARCHAR(64) NOT NULL UNIQUE,
  customer_id BIGINT NOT NULL,
  received_date DATE NOT NULL,
  method VARCHAR(32) NOT NULL COMMENT 'CASH, BANK_TRANSFER, QRIS, CHECK, OTHER',
  bank_account_id BIGINT NULL,
  amount_total DECIMAL(18,2) NOT NULL,
  reference_no VARCHAR(64) NULL,
  memo TEXT NULL,
  posted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  posted_by BIGINT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_sales_pay_customer FOREIGN KEY (customer_id) REFERENCES customers(id),
  CONSTRAINT fk_sales_pay_bank FOREIGN KEY (bank_account_id) REFERENCES bank_accounts(id),
  CONSTRAINT fk_sales_pay_posted_by FOREIGN KEY (posted_by) REFERENCES users(id),
  INDEX idx_sales_pay_date (received_date),
  INDEX idx_sales_pay_customer (customer_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sales_payment_allocations (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  payment_id BIGINT NOT NULL,
  invoice_id BIGINT NOT NULL,
  amount DECIMAL(18,2) NOT NULL,
  UNIQUE KEY uq_payment_alloc (payment_id, invoice_id),
  CONSTRAINT fk_alloc_payment FOREIGN KEY (payment_id) REFERENCES sales_payments(id) ON DELETE CASCADE,
  CONSTRAINT fk_alloc_invoice FOREIGN KEY (invoice_id) REFERENCES sales_invoices(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Credit Notes
CREATE TABLE IF NOT EXISTS sales_credit_notes (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  credit_note_no VARCHAR(64) NOT NULL UNIQUE,
  invoice_id BIGINT NOT NULL COMMENT 'Related invoice',
  customer_id BIGINT NOT NULL,
  credit_date DATE NOT NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'DRAFT',
  reason_code VARCHAR(32) NOT NULL COMMENT 'RETURN, PRICE_ADJUSTMENT, DAMAGED, OTHER',
  restock TINYINT NOT NULL DEFAULT 0 COMMENT '1=Return items to stock',
  subtotal DECIMAL(18,2) NOT NULL DEFAULT 0,
  tax_total DECIMAL(18,2) NOT NULL DEFAULT 0,
  grand_total DECIMAL(18,2) NOT NULL DEFAULT 0,
  memo TEXT NULL,
  posted_at DATETIME NULL,
  posted_by BIGINT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by BIGINT NULL,
  CONSTRAINT fk_cn_invoice FOREIGN KEY (invoice_id) REFERENCES sales_invoices(id),
  CONSTRAINT fk_cn_customer FOREIGN KEY (customer_id) REFERENCES customers(id),
  CONSTRAINT fk_cn_posted_by FOREIGN KEY (posted_by) REFERENCES users(id),
  CONSTRAINT fk_cn_created_by FOREIGN KEY (created_by) REFERENCES users(id),
  INDEX idx_cn_date (credit_date),
  INDEX idx_cn_invoice (invoice_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sales_credit_note_lines (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  credit_note_id BIGINT NOT NULL,
  line_no INT NOT NULL,
  item_id BIGINT NOT NULL,
  qty DECIMAL(18,4) NOT NULL,
  unit_price DECIMAL(18,4) NOT NULL,
  tax_code VARCHAR(32) NOT NULL,
  tax_rate DECIMAL(6,4) NOT NULL DEFAULT 0,
  line_subtotal DECIMAL(18,2) NOT NULL,
  line_tax DECIMAL(18,2) NOT NULL,
  line_total DECIMAL(18,2) NOT NULL,
  memo VARCHAR(255) NULL,
  UNIQUE KEY uq_cn_line (credit_note_id, line_no),
  CONSTRAINT fk_cnl_cn FOREIGN KEY (credit_note_id) REFERENCES sales_credit_notes(id) ON DELETE CASCADE,
  CONSTRAINT fk_cnl_item FOREIGN KEY (item_id) REFERENCES items(id),
  CONSTRAINT fk_cnl_tax FOREIGN KEY (tax_code) REFERENCES tax_codes(code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 9. Purchases Module
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS purchase_receipts (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  receipt_no VARCHAR(64) NOT NULL UNIQUE,
  supplier_id BIGINT NOT NULL,
  receipt_date DATE NOT NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'DRAFT',
  reference_no VARCHAR(64) NULL COMMENT 'Supplier delivery/DO number',
  memo TEXT NULL,
  posted_at DATETIME NULL,
  posted_by BIGINT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by BIGINT NULL,
  CONSTRAINT fk_pr_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
  CONSTRAINT fk_pr_posted_by FOREIGN KEY (posted_by) REFERENCES users(id),
  CONSTRAINT fk_pr_created_by FOREIGN KEY (created_by) REFERENCES users(id),
  INDEX idx_pr_date (receipt_date),
  INDEX idx_pr_status (status),
  INDEX idx_pr_supplier (supplier_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS purchase_receipt_lines (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  receipt_id BIGINT NOT NULL,
  line_no INT NOT NULL,
  item_id BIGINT NOT NULL,
  qty DECIMAL(18,4) NOT NULL,
  unit_cost DECIMAL(18,4) NOT NULL,
  tax_code VARCHAR(32) NOT NULL,
  tax_rate DECIMAL(6,4) NOT NULL DEFAULT 0,
  line_value DECIMAL(18,4) NOT NULL,
  line_tax DECIMAL(18,2) NOT NULL DEFAULT 0,
  memo VARCHAR(255) NULL,
  UNIQUE KEY uq_prl (receipt_id, line_no),
  CONSTRAINT fk_prl_receipt FOREIGN KEY (receipt_id) REFERENCES purchase_receipts(id) ON DELETE CASCADE,
  CONSTRAINT fk_prl_item FOREIGN KEY (item_id) REFERENCES items(id),
  CONSTRAINT fk_prl_tax FOREIGN KEY (tax_code) REFERENCES tax_codes(code),
  INDEX idx_prl_item (item_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS purchase_bills (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  bill_no VARCHAR(64) NOT NULL UNIQUE,
  supplier_id BIGINT NOT NULL,
  bill_date DATE NOT NULL,
  due_date DATE NOT NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'DRAFT',
  supplier_invoice_no VARCHAR(64) NULL,
  subtotal DECIMAL(18,2) NOT NULL DEFAULT 0,
  tax_total DECIMAL(18,2) NOT NULL DEFAULT 0,
  grand_total DECIMAL(18,2) NOT NULL DEFAULT 0,
  paid_amount DECIMAL(18,2) NOT NULL DEFAULT 0,
  balance_due DECIMAL(18,2) GENERATED ALWAYS AS (grand_total - paid_amount) STORED,
  memo TEXT NULL,
  posted_at DATETIME NULL,
  posted_by BIGINT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by BIGINT NULL,
  CONSTRAINT fk_bill_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
  CONSTRAINT fk_bill_posted_by FOREIGN KEY (posted_by) REFERENCES users(id),
  CONSTRAINT fk_bill_created_by FOREIGN KEY (created_by) REFERENCES users(id),
  INDEX idx_bill_date (bill_date),
  INDEX idx_bill_due_date (due_date),
  INDEX idx_bill_status (status),
  INDEX idx_bill_supplier (supplier_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS purchase_bill_lines (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  bill_id BIGINT NOT NULL,
  line_no INT NOT NULL,
  item_id BIGINT NULL COMMENT 'NULL for expense line',
  account_id BIGINT NULL COMMENT 'Direct expense account if no item',
  description VARCHAR(255) NULL,
  qty DECIMAL(18,4) NOT NULL DEFAULT 1,
  unit_cost DECIMAL(18,4) NOT NULL,
  tax_code VARCHAR(32) NOT NULL,
  tax_rate DECIMAL(6,4) NOT NULL DEFAULT 0,
  line_subtotal DECIMAL(18,2) NOT NULL,
  line_tax DECIMAL(18,2) NOT NULL,
  line_total DECIMAL(18,2) NOT NULL,
  memo VARCHAR(255) NULL,
  UNIQUE KEY uq_bill_line (bill_id, line_no),
  CONSTRAINT fk_bill_line_bill FOREIGN KEY (bill_id) REFERENCES purchase_bills(id) ON DELETE CASCADE,
  CONSTRAINT fk_bill_line_item FOREIGN KEY (item_id) REFERENCES items(id),
  CONSTRAINT fk_bill_line_account FOREIGN KEY (account_id) REFERENCES chart_of_accounts(id),
  CONSTRAINT fk_bill_line_tax FOREIGN KEY (tax_code) REFERENCES tax_codes(code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS purchase_payments (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  payment_no VARCHAR(64) NOT NULL UNIQUE,
  supplier_id BIGINT NOT NULL,
  payment_date DATE NOT NULL,
  method VARCHAR(32) NOT NULL,
  bank_account_id BIGINT NULL,
  amount_total DECIMAL(18,2) NOT NULL,
  reference_no VARCHAR(64) NULL,
  memo TEXT NULL,
  posted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  posted_by BIGINT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_purch_pay_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
  CONSTRAINT fk_purch_pay_bank FOREIGN KEY (bank_account_id) REFERENCES bank_accounts(id),
  CONSTRAINT fk_purch_pay_posted_by FOREIGN KEY (posted_by) REFERENCES users(id),
  INDEX idx_purch_pay_date (payment_date),
  INDEX idx_purch_pay_supplier (supplier_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS purchase_payment_allocations (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  payment_id BIGINT NOT NULL,
  bill_id BIGINT NOT NULL,
  amount DECIMAL(18,2) NOT NULL,
  UNIQUE KEY uq_purch_pay_alloc (payment_id, bill_id),
  CONSTRAINT fk_purch_alloc_payment FOREIGN KEY (payment_id) REFERENCES purchase_payments(id) ON DELETE CASCADE,
  CONSTRAINT fk_purch_alloc_bill FOREIGN KEY (bill_id) REFERENCES purchase_bills(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Debit Notes (Purchase Returns)
CREATE TABLE IF NOT EXISTS purchase_debit_notes (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  debit_note_no VARCHAR(64) NOT NULL UNIQUE,
  bill_id BIGINT NULL,
  supplier_id BIGINT NOT NULL,
  debit_date DATE NOT NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'DRAFT',
  reason_code VARCHAR(32) NOT NULL,
  subtotal DECIMAL(18,2) NOT NULL DEFAULT 0,
  tax_total DECIMAL(18,2) NOT NULL DEFAULT 0,
  grand_total DECIMAL(18,2) NOT NULL DEFAULT 0,
  memo TEXT NULL,
  posted_at DATETIME NULL,
  posted_by BIGINT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by BIGINT NULL,
  CONSTRAINT fk_dn_bill FOREIGN KEY (bill_id) REFERENCES purchase_bills(id),
  CONSTRAINT fk_dn_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
  CONSTRAINT fk_dn_posted_by FOREIGN KEY (posted_by) REFERENCES users(id),
  CONSTRAINT fk_dn_created_by FOREIGN KEY (created_by) REFERENCES users(id),
  INDEX idx_dn_date (debit_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS purchase_debit_note_lines (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  debit_note_id BIGINT NOT NULL,
  line_no INT NOT NULL,
  item_id BIGINT NOT NULL,
  qty DECIMAL(18,4) NOT NULL,
  unit_cost DECIMAL(18,4) NOT NULL,
  tax_code VARCHAR(32) NOT NULL,
  tax_rate DECIMAL(6,4) NOT NULL DEFAULT 0,
  line_subtotal DECIMAL(18,2) NOT NULL,
  line_tax DECIMAL(18,2) NOT NULL,
  line_total DECIMAL(18,2) NOT NULL,
  memo VARCHAR(255) NULL,
  UNIQUE KEY uq_dnl (debit_note_id, line_no),
  CONSTRAINT fk_dnl_dn FOREIGN KEY (debit_note_id) REFERENCES purchase_debit_notes(id) ON DELETE CASCADE,
  CONSTRAINT fk_dnl_item FOREIGN KEY (item_id) REFERENCES items(id),
  CONSTRAINT fk_dnl_tax FOREIGN KEY (tax_code) REFERENCES tax_codes(code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 10. Inventory Module
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS stock_ledger (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  occurred_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  item_id BIGINT NOT NULL,
  source_type VARCHAR(32) NOT NULL COMMENT 'SALES_INVOICE, PURCHASE_RECEIPT, ADJUSTMENT, CREDIT_NOTE, DEBIT_NOTE, OPNAME, TRANSFER',
  source_id BIGINT NOT NULL,
  source_line_id BIGINT NULL,
  qty_delta DECIMAL(18,4) NOT NULL,
  unit_cost DECIMAL(18,4) NOT NULL DEFAULT 0,
  value_delta DECIMAL(18,4) NOT NULL DEFAULT 0,
  balance_qty DECIMAL(18,4) NOT NULL COMMENT 'Running Qty Balance',
  balance_value DECIMAL(18,4) NOT NULL COMMENT 'Running Value Balance',
  avg_cost_after DECIMAL(18,4) NOT NULL DEFAULT 0,
  memo VARCHAR(255) NULL,
  CONSTRAINT fk_ledger_item FOREIGN KEY (item_id) REFERENCES items(id),
  INDEX idx_ledger_item_time (item_id, occurred_at),
  INDEX idx_ledger_source (source_type, source_id),
  INDEX idx_ledger_occurred (occurred_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS inventory_adjustments (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  adjustment_no VARCHAR(64) NOT NULL UNIQUE,
  adj_date DATE NOT NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'DRAFT',
  adjustment_type VARCHAR(32) NOT NULL DEFAULT 'MANUAL' COMMENT 'MANUAL, OPNAME',
  memo TEXT NULL,
  posted_at DATETIME NULL,
  posted_by BIGINT NULL,
  approved_at DATETIME NULL,
  approved_by BIGINT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by BIGINT NULL,
  CONSTRAINT fk_adj_posted_by FOREIGN KEY (posted_by) REFERENCES users(id),
  CONSTRAINT fk_adj_approved_by FOREIGN KEY (approved_by) REFERENCES users(id),
  CONSTRAINT fk_adj_created_by FOREIGN KEY (created_by) REFERENCES users(id),
  INDEX idx_adj_date (adj_date),
  INDEX idx_adj_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS inventory_adjustment_lines (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  adjustment_id BIGINT NOT NULL,
  line_no INT NOT NULL,
  item_id BIGINT NOT NULL,
  qty_before DECIMAL(18,4) NOT NULL DEFAULT 0,
  qty_counted DECIMAL(18,4) NOT NULL DEFAULT 0,
  qty_delta DECIMAL(18,4) NOT NULL COMMENT 'Difference: counted - before',
  unit_cost DECIMAL(18,4) NOT NULL DEFAULT 0 COMMENT 'Avg cost at time of adjustment',
  value_delta DECIMAL(18,4) NOT NULL DEFAULT 0,
  reason_code VARCHAR(32) NOT NULL COMMENT 'EXPIRED, DAMAGED, LOST, FOUND, INPUT_ERROR, OTHER',
  memo VARCHAR(255) NULL,
  UNIQUE KEY uq_adjline (adjustment_id, line_no),
  CONSTRAINT fk_adjline_adj FOREIGN KEY (adjustment_id) REFERENCES inventory_adjustments(id) ON DELETE CASCADE,
  CONSTRAINT fk_adjline_item FOREIGN KEY (item_id) REFERENCES items(id),
  INDEX idx_adjline_item (item_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Stock Opname Sessions
CREATE TABLE IF NOT EXISTS stock_opname_sessions (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  session_no VARCHAR(64) NOT NULL UNIQUE,
  opname_date DATE NOT NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'OPEN' COMMENT 'OPEN, COUNTING, SUBMITTED, POSTED, CANCELLED',
  location VARCHAR(64) NULL,
  memo TEXT NULL,
  started_at DATETIME NULL,
  submitted_at DATETIME NULL,
  posted_at DATETIME NULL,
  adjustment_id BIGINT NULL COMMENT 'Generated adjustment',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by BIGINT NULL,
  CONSTRAINT fk_opname_adjustment FOREIGN KEY (adjustment_id) REFERENCES inventory_adjustments(id),
  CONSTRAINT fk_opname_created_by FOREIGN KEY (created_by) REFERENCES users(id),
  INDEX idx_opname_date (opname_date),
  INDEX idx_opname_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS stock_opname_items (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  session_id BIGINT NOT NULL,
  item_id BIGINT NOT NULL,
  system_qty DECIMAL(18,4) NOT NULL DEFAULT 0 COMMENT 'Qty from system at start',
  counted_qty DECIMAL(18,4) NULL COMMENT 'Physical count',
  variance DECIMAL(18,4) GENERATED ALWAYS AS (COALESCE(counted_qty, 0) - system_qty) STORED,
  counted_at DATETIME NULL,
  counted_by BIGINT NULL,
  notes VARCHAR(255) NULL,
  UNIQUE KEY uq_opname_item (session_id, item_id),
  CONSTRAINT fk_opname_item_session FOREIGN KEY (session_id) REFERENCES stock_opname_sessions(id) ON DELETE CASCADE,
  CONSTRAINT fk_opname_item_item FOREIGN KEY (item_id) REFERENCES items(id),
  CONSTRAINT fk_opname_item_counted_by FOREIGN KEY (counted_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 11. Accounting Module
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS journal_entries (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  entry_no VARCHAR(64) NOT NULL UNIQUE,
  entry_date DATE NOT NULL,
  source_type VARCHAR(32) NOT NULL COMMENT 'SALES_INVOICE, PURCHASE_RECEIPT, ADJUSTMENT, PAYMENT, MANUAL, etc.',
  source_id BIGINT NULL,
  is_manual TINYINT NOT NULL DEFAULT 0,
  is_reversal TINYINT NOT NULL DEFAULT 0,
  reversed_entry_id BIGINT NULL,
  memo TEXT NULL,
  total_debit DECIMAL(18,2) NOT NULL DEFAULT 0,
  total_credit DECIMAL(18,2) NOT NULL DEFAULT 0,
  posted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  posted_by BIGINT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_je_posted_by FOREIGN KEY (posted_by) REFERENCES users(id),
  CONSTRAINT fk_je_reversed FOREIGN KEY (reversed_entry_id) REFERENCES journal_entries(id),
  INDEX idx_je_date (entry_date),
  INDEX idx_je_source (source_type, source_id),
  INDEX idx_je_no (entry_no)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS journal_lines (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  journal_entry_id BIGINT NOT NULL,
  line_no INT NOT NULL,
  account_id BIGINT NOT NULL,
  dc CHAR(1) NOT NULL COMMENT 'D=Debit, C=Credit',
  amount DECIMAL(18,2) NOT NULL,
  memo VARCHAR(255) NULL,
  entity_type VARCHAR(32) NULL COMMENT 'CUSTOMER, SUPPLIER, ITEM for sub-ledger',
  entity_id BIGINT NULL,
  UNIQUE KEY uq_jl (journal_entry_id, line_no),
  CONSTRAINT fk_jl_je FOREIGN KEY (journal_entry_id) REFERENCES journal_entries(id) ON DELETE CASCADE,
  CONSTRAINT fk_jl_account FOREIGN KEY (account_id) REFERENCES chart_of_accounts(id),
  INDEX idx_jl_account (account_id),
  INDEX idx_jl_entity (entity_type, entity_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Account balances for faster reporting
CREATE TABLE IF NOT EXISTS account_balances (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  account_id BIGINT NOT NULL,
  period_year INT NOT NULL,
  period_month INT NOT NULL,
  opening_balance DECIMAL(18,2) NOT NULL DEFAULT 0,
  debit_total DECIMAL(18,2) NOT NULL DEFAULT 0,
  credit_total DECIMAL(18,2) NOT NULL DEFAULT 0,
  closing_balance DECIMAL(18,2) NOT NULL DEFAULT 0,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_account_period (account_id, period_year, period_month),
  CONSTRAINT fk_ab_account FOREIGN KEY (account_id) REFERENCES chart_of_accounts(id),
  INDEX idx_ab_period (period_year, period_month)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 12. Number Sequences
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS number_sequences (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  sequence_key VARCHAR(64) NOT NULL UNIQUE COMMENT 'e.g., SALES_INVOICE, PURCHASE_BILL',
  prefix VARCHAR(16) NOT NULL DEFAULT '',
  suffix VARCHAR(16) NOT NULL DEFAULT '',
  next_number BIGINT NOT NULL DEFAULT 1,
  number_length INT NOT NULL DEFAULT 6,
  reset_period VARCHAR(16) NULL COMMENT 'YEARLY, MONTHLY, NEVER',
  last_reset_date DATE NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
