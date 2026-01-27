-- =============================================================================
-- SAL Accounting System - Seed Data
-- Version: 1.0.0
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Account Types
-- -----------------------------------------------------------------------------

INSERT INTO account_types (code, name, normal_balance, display_order) VALUES
('ASSET', 'Assets', 'D', 1),
('LIABILITY', 'Liabilities', 'C', 2),
('EQUITY', 'Equity', 'C', 3),
('INCOME', 'Income', 'C', 4),
('COGS', 'Cost of Goods Sold', 'D', 5),
('EXPENSE', 'Expenses', 'D', 6);

-- -----------------------------------------------------------------------------
-- 2. Chart of Accounts (Basic Structure)
-- -----------------------------------------------------------------------------

-- Assets (1xxx)
INSERT INTO chart_of_accounts (account_code, account_name, account_type_code, is_header, is_system) VALUES
('1000', 'Assets', 'ASSET', 1, 1),
('1100', 'Current Assets', 'ASSET', 1, 1),
('1110', 'Cash on Hand', 'ASSET', 0, 1),
('1120', 'Bank - BCA', 'ASSET', 0, 0),
('1121', 'Bank - Mandiri', 'ASSET', 0, 0),
('1122', 'Bank - BNI', 'ASSET', 0, 0),
('1130', 'QRIS/E-Money', 'ASSET', 0, 0),
('1200', 'Accounts Receivable', 'ASSET', 0, 1),
('1210', 'AR - Trade', 'ASSET', 0, 1),
('1220', 'AR - Other', 'ASSET', 0, 0),
('1300', 'Inventory', 'ASSET', 0, 1),
('1310', 'Inventory - Finished Goods', 'ASSET', 0, 1),
('1320', 'Inventory - Raw Materials', 'ASSET', 0, 0),
('1400', 'Prepaid Expenses', 'ASSET', 0, 0),
('1500', 'Tax Receivable', 'ASSET', 0, 1),
('1510', 'PPN Input', 'ASSET', 0, 1),
('1600', 'Fixed Assets', 'ASSET', 1, 1),
('1610', 'Equipment', 'ASSET', 0, 0),
('1620', 'Vehicles', 'ASSET', 0, 0),
('1690', 'Accumulated Depreciation', 'ASSET', 0, 0);

-- Liabilities (2xxx)
INSERT INTO chart_of_accounts (account_code, account_name, account_type_code, is_header, is_system) VALUES
('2000', 'Liabilities', 'LIABILITY', 1, 1),
('2100', 'Current Liabilities', 'LIABILITY', 1, 1),
('2110', 'Accounts Payable', 'LIABILITY', 0, 1),
('2120', 'Accrued Expenses', 'LIABILITY', 0, 0),
('2130', 'Unearned Revenue', 'LIABILITY', 0, 0),
('2200', 'Tax Payable', 'LIABILITY', 1, 1),
('2210', 'PPN Output', 'LIABILITY', 0, 1),
('2220', 'PPh 21 Payable', 'LIABILITY', 0, 0),
('2230', 'PPh 23 Payable', 'LIABILITY', 0, 0),
('2300', 'Long-term Liabilities', 'LIABILITY', 1, 0),
('2310', 'Bank Loan', 'LIABILITY', 0, 0);

-- Equity (3xxx)
INSERT INTO chart_of_accounts (account_code, account_name, account_type_code, is_header, is_system) VALUES
('3000', 'Equity', 'EQUITY', 1, 1),
('3100', 'Owner Equity', 'EQUITY', 0, 1),
('3200', 'Retained Earnings', 'EQUITY', 0, 1),
('3300', 'Current Year Earnings', 'EQUITY', 0, 1);

-- Income (4xxx)
INSERT INTO chart_of_accounts (account_code, account_name, account_type_code, is_header, is_system) VALUES
('4000', 'Income', 'INCOME', 1, 1),
('4100', 'Sales Income', 'INCOME', 0, 1),
('4110', 'Product Sales', 'INCOME', 0, 1),
('4120', 'Service Income', 'INCOME', 0, 0),
('4200', 'Sales Discount', 'INCOME', 0, 1),
('4300', 'Sales Returns', 'INCOME', 0, 1),
('4400', 'Freight Income', 'INCOME', 0, 0),
('4900', 'Other Income', 'INCOME', 0, 0);

-- COGS (5xxx)
INSERT INTO chart_of_accounts (account_code, account_name, account_type_code, is_header, is_system) VALUES
('5000', 'Cost of Goods Sold', 'COGS', 1, 1),
('5100', 'COGS - Products', 'COGS', 0, 1),
('5200', 'Purchase Discount', 'COGS', 0, 0),
('5300', 'Inventory Shrinkage', 'COGS', 0, 1),
('5400', 'Inventory Adjustment', 'COGS', 0, 1);

-- Expenses (6xxx)
INSERT INTO chart_of_accounts (account_code, account_name, account_type_code, is_header, is_system) VALUES
('6000', 'Operating Expenses', 'EXPENSE', 1, 1),
('6100', 'Salary & Wages', 'EXPENSE', 0, 0),
('6110', 'Employee Benefits', 'EXPENSE', 0, 0),
('6200', 'Rent Expense', 'EXPENSE', 0, 0),
('6210', 'Utilities', 'EXPENSE', 0, 0),
('6300', 'Marketing & Advertising', 'EXPENSE', 0, 0),
('6400', 'Transportation', 'EXPENSE', 0, 0),
('6410', 'Freight Out', 'EXPENSE', 0, 0),
('6500', 'Office Supplies', 'EXPENSE', 0, 0),
('6600', 'Depreciation Expense', 'EXPENSE', 0, 0),
('6700', 'Bank Charges', 'EXPENSE', 0, 0),
('6800', 'Professional Fees', 'EXPENSE', 0, 0),
('6900', 'Miscellaneous Expense', 'EXPENSE', 0, 0);

-- Update parent relationships
UPDATE chart_of_accounts SET parent_id = (SELECT id FROM (SELECT id FROM chart_of_accounts WHERE account_code = '1000') AS t) WHERE account_code IN ('1100', '1600');
UPDATE chart_of_accounts SET parent_id = (SELECT id FROM (SELECT id FROM chart_of_accounts WHERE account_code = '1100') AS t) WHERE account_code IN ('1110', '1120', '1121', '1122', '1130', '1200', '1300', '1400', '1500');
UPDATE chart_of_accounts SET parent_id = (SELECT id FROM (SELECT id FROM chart_of_accounts WHERE account_code = '1200') AS t) WHERE account_code IN ('1210', '1220');
UPDATE chart_of_accounts SET parent_id = (SELECT id FROM (SELECT id FROM chart_of_accounts WHERE account_code = '1300') AS t) WHERE account_code IN ('1310', '1320');
UPDATE chart_of_accounts SET parent_id = (SELECT id FROM (SELECT id FROM chart_of_accounts WHERE account_code = '1500') AS t) WHERE account_code IN ('1510');
UPDATE chart_of_accounts SET parent_id = (SELECT id FROM (SELECT id FROM chart_of_accounts WHERE account_code = '1600') AS t) WHERE account_code IN ('1610', '1620', '1690');

UPDATE chart_of_accounts SET parent_id = (SELECT id FROM (SELECT id FROM chart_of_accounts WHERE account_code = '2000') AS t) WHERE account_code IN ('2100', '2200', '2300');
UPDATE chart_of_accounts SET parent_id = (SELECT id FROM (SELECT id FROM chart_of_accounts WHERE account_code = '2100') AS t) WHERE account_code IN ('2110', '2120', '2130');
UPDATE chart_of_accounts SET parent_id = (SELECT id FROM (SELECT id FROM chart_of_accounts WHERE account_code = '2200') AS t) WHERE account_code IN ('2210', '2220', '2230');
UPDATE chart_of_accounts SET parent_id = (SELECT id FROM (SELECT id FROM chart_of_accounts WHERE account_code = '2300') AS t) WHERE account_code IN ('2310');

UPDATE chart_of_accounts SET parent_id = (SELECT id FROM (SELECT id FROM chart_of_accounts WHERE account_code = '3000') AS t) WHERE account_code IN ('3100', '3200', '3300');

UPDATE chart_of_accounts SET parent_id = (SELECT id FROM (SELECT id FROM chart_of_accounts WHERE account_code = '4000') AS t) WHERE account_code IN ('4100', '4200', '4300', '4400', '4900');
UPDATE chart_of_accounts SET parent_id = (SELECT id FROM (SELECT id FROM chart_of_accounts WHERE account_code = '4100') AS t) WHERE account_code IN ('4110', '4120');

UPDATE chart_of_accounts SET parent_id = (SELECT id FROM (SELECT id FROM chart_of_accounts WHERE account_code = '5000') AS t) WHERE account_code IN ('5100', '5200', '5300', '5400');

UPDATE chart_of_accounts SET parent_id = (SELECT id FROM (SELECT id FROM chart_of_accounts WHERE account_code = '6000') AS t) WHERE account_code IN ('6100', '6200', '6300', '6400', '6500', '6600', '6700', '6800', '6900');
UPDATE chart_of_accounts SET parent_id = (SELECT id FROM (SELECT id FROM chart_of_accounts WHERE account_code = '6100') AS t) WHERE account_code IN ('6110');
UPDATE chart_of_accounts SET parent_id = (SELECT id FROM (SELECT id FROM chart_of_accounts WHERE account_code = '6200') AS t) WHERE account_code IN ('6210');
UPDATE chart_of_accounts SET parent_id = (SELECT id FROM (SELECT id FROM chart_of_accounts WHERE account_code = '6400') AS t) WHERE account_code IN ('6410');

-- -----------------------------------------------------------------------------
-- 3. Default Account Mappings
-- -----------------------------------------------------------------------------

INSERT INTO default_account_mappings (mapping_key, account_id, description) VALUES
('AR_TRADE', (SELECT id FROM chart_of_accounts WHERE account_code = '1210'), 'Default AR for trade customers'),
('AP_TRADE', (SELECT id FROM chart_of_accounts WHERE account_code = '2110'), 'Default AP for suppliers'),
('INVENTORY_ASSET', (SELECT id FROM chart_of_accounts WHERE account_code = '1310'), 'Default inventory asset account'),
('SALES_INCOME', (SELECT id FROM chart_of_accounts WHERE account_code = '4110'), 'Default sales income'),
('SALES_DISCOUNT', (SELECT id FROM chart_of_accounts WHERE account_code = '4200'), 'Sales discount contra account'),
('SALES_RETURNS', (SELECT id FROM chart_of_accounts WHERE account_code = '4300'), 'Sales returns account'),
('COGS', (SELECT id FROM chart_of_accounts WHERE account_code = '5100'), 'Default COGS'),
('INVENTORY_SHRINKAGE', (SELECT id FROM chart_of_accounts WHERE account_code = '5300'), 'Inventory shrinkage/loss'),
('INVENTORY_ADJUSTMENT', (SELECT id FROM chart_of_accounts WHERE account_code = '5400'), 'Inventory adjustment account'),
('PPN_OUTPUT', (SELECT id FROM chart_of_accounts WHERE account_code = '2210'), 'PPN Output (VAT payable)'),
('PPN_INPUT', (SELECT id FROM chart_of_accounts WHERE account_code = '1510'), 'PPN Input (VAT receivable)'),
('CASH_ON_HAND', (SELECT id FROM chart_of_accounts WHERE account_code = '1110'), 'Cash on hand'),
('BANK_BCA', (SELECT id FROM chart_of_accounts WHERE account_code = '1120'), 'Bank BCA'),
('RETAINED_EARNINGS', (SELECT id FROM chart_of_accounts WHERE account_code = '3200'), 'Retained earnings'),
('CURRENT_EARNINGS', (SELECT id FROM chart_of_accounts WHERE account_code = '3300'), 'Current year earnings');

-- -----------------------------------------------------------------------------
-- 4. Tax Codes
-- -----------------------------------------------------------------------------

INSERT INTO tax_codes (code, name, rate, is_inclusive, tax_account_id, tax_input_account_id) VALUES
('NON', 'No Tax', 0.0000, 0, NULL, NULL),
('PPN11', 'PPN 11%', 0.1100, 0, 
  (SELECT id FROM chart_of_accounts WHERE account_code = '2210'),
  (SELECT id FROM chart_of_accounts WHERE account_code = '1510')),
('PPN11I', 'PPN 11% (Inclusive)', 0.1100, 1,
  (SELECT id FROM chart_of_accounts WHERE account_code = '2210'),
  (SELECT id FROM chart_of_accounts WHERE account_code = '1510')),
('PPN12', 'PPN 12%', 0.1200, 0,
  (SELECT id FROM chart_of_accounts WHERE account_code = '2210'),
  (SELECT id FROM chart_of_accounts WHERE account_code = '1510'));

-- -----------------------------------------------------------------------------
-- 5. Units of Measure
-- -----------------------------------------------------------------------------

INSERT INTO units_of_measure (code, name) VALUES
('PCS', 'Pieces'),
('KG', 'Kilogram'),
('GR', 'Gram'),
('L', 'Liter'),
('ML', 'Milliliter'),
('BOX', 'Box'),
('CTN', 'Carton'),
('DZ', 'Dozen'),
('SET', 'Set'),
('PAK', 'Pack'),
('BTL', 'Bottle'),
('CAN', 'Can'),
('BAG', 'Bag'),
('ROLL', 'Roll'),
('MTR', 'Meter');

-- -----------------------------------------------------------------------------
-- 6. Price Levels
-- -----------------------------------------------------------------------------

INSERT INTO price_levels (code, name) VALUES
('RETAIL', 'Retail'),
('WHOLESALE', 'Wholesale'),
('HORECA', 'Hotel/Restaurant/Cafe'),
('RESELLER', 'Reseller'),
('VIP', 'VIP Customer');

-- -----------------------------------------------------------------------------
-- 7. Customer Groups
-- -----------------------------------------------------------------------------

INSERT INTO customer_groups (code, name, discount_rate) VALUES
('RETAIL', 'Retail Customer', 0),
('WHOLE', 'Wholesale Customer', 5),
('HORECA', 'Hotel/Restaurant/Cafe', 10),
('RESELLER', 'Reseller', 15),
('VIP', 'VIP Customer', 20);

-- -----------------------------------------------------------------------------
-- 8. Item Categories
-- -----------------------------------------------------------------------------

INSERT INTO item_categories (code, name) VALUES
('FOOD', 'Food & Beverages'),
('BEVERAGE', 'Beverages'),
('DAIRY', 'Dairy Products'),
('FROZEN', 'Frozen Products'),
('DRY', 'Dry Goods'),
('FRESH', 'Fresh Produce'),
('MEAT', 'Meat & Poultry'),
('SEAFOOD', 'Seafood'),
('BAKERY', 'Bakery'),
('CONDIMENT', 'Condiments & Sauces'),
('PACKAGING', 'Packaging Materials'),
('OTHER', 'Others');

-- Update parent for food & beverage subcategories
UPDATE item_categories SET parent_id = (SELECT id FROM (SELECT id FROM item_categories WHERE code = 'FOOD') AS t) 
WHERE code IN ('BEVERAGE', 'DAIRY', 'FROZEN', 'DRY', 'FRESH', 'MEAT', 'SEAFOOD', 'BAKERY', 'CONDIMENT');

-- -----------------------------------------------------------------------------
-- 9. Roles & Permissions
-- -----------------------------------------------------------------------------

INSERT INTO roles (code, name, description) VALUES
('ADMIN', 'Administrator', 'Full system access'),
('OWNER', 'Owner/Manager', 'Business reports & approvals'),
('FINANCE', 'Finance/Accounting', 'Financial transactions & reports'),
('SALES', 'Sales/CS', 'Sales invoice & customer management'),
('WAREHOUSE', 'Warehouse', 'Inventory & stock management'),
('PURCHASING', 'Purchasing', 'Purchase orders & receiving');

-- Create admin user (password: admin123 - change in production!)
-- Password hash for 'admin123' using bcrypt
INSERT INTO users (email, password_hash, full_name, is_active) VALUES
('admin@sal-system.local', '$2b$10$8OxlHPJRvwHN1l.1UGyzGejKj2F0K4MZYbxGdE/HpWxKZc3M5M.Wm', 'System Administrator', 1);

-- Assign admin role
INSERT INTO user_roles (user_id, role_id) VALUES
(1, (SELECT id FROM roles WHERE code = 'ADMIN'));

-- Permissions for each role
-- ADMIN gets all permissions
INSERT INTO role_permissions (role_id, perm_code)
SELECT r.id, p.perm_code FROM roles r
CROSS JOIN (
  SELECT 'DASHBOARD_VIEW' AS perm_code UNION ALL
  SELECT 'CUSTOMER_VIEW' UNION ALL SELECT 'CUSTOMER_CREATE' UNION ALL SELECT 'CUSTOMER_EDIT' UNION ALL SELECT 'CUSTOMER_DELETE' UNION ALL
  SELECT 'SUPPLIER_VIEW' UNION ALL SELECT 'SUPPLIER_CREATE' UNION ALL SELECT 'SUPPLIER_EDIT' UNION ALL SELECT 'SUPPLIER_DELETE' UNION ALL
  SELECT 'ITEM_VIEW' UNION ALL SELECT 'ITEM_CREATE' UNION ALL SELECT 'ITEM_EDIT' UNION ALL SELECT 'ITEM_DELETE' UNION ALL
  SELECT 'COA_VIEW' UNION ALL SELECT 'COA_CREATE' UNION ALL SELECT 'COA_EDIT' UNION ALL
  SELECT 'TAX_VIEW' UNION ALL SELECT 'TAX_CREATE' UNION ALL SELECT 'TAX_EDIT' UNION ALL
  SELECT 'SALES_INVOICE_VIEW' UNION ALL SELECT 'SALES_INVOICE_CREATE' UNION ALL SELECT 'SALES_INVOICE_EDIT' UNION ALL SELECT 'SALES_INVOICE_POST' UNION ALL SELECT 'SALES_INVOICE_VOID' UNION ALL
  SELECT 'SALES_PAYMENT_VIEW' UNION ALL SELECT 'SALES_PAYMENT_CREATE' UNION ALL
  SELECT 'SALES_CREDIT_NOTE_VIEW' UNION ALL SELECT 'SALES_CREDIT_NOTE_CREATE' UNION ALL SELECT 'SALES_CREDIT_NOTE_POST' UNION ALL
  SELECT 'PURCHASE_RECEIPT_VIEW' UNION ALL SELECT 'PURCHASE_RECEIPT_CREATE' UNION ALL SELECT 'PURCHASE_RECEIPT_POST' UNION ALL
  SELECT 'PURCHASE_BILL_VIEW' UNION ALL SELECT 'PURCHASE_BILL_CREATE' UNION ALL SELECT 'PURCHASE_BILL_POST' UNION ALL
  SELECT 'PURCHASE_PAYMENT_VIEW' UNION ALL SELECT 'PURCHASE_PAYMENT_CREATE' UNION ALL
  SELECT 'INVENTORY_VIEW' UNION ALL SELECT 'INVENTORY_ADJUSTMENT_CREATE' UNION ALL SELECT 'INVENTORY_ADJUSTMENT_POST' UNION ALL SELECT 'INVENTORY_OPNAME_CREATE' UNION ALL SELECT 'INVENTORY_OPNAME_POST' UNION ALL
  SELECT 'JOURNAL_VIEW' UNION ALL SELECT 'JOURNAL_MANUAL_CREATE' UNION ALL
  SELECT 'REPORT_SALES' UNION ALL SELECT 'REPORT_PURCHASES' UNION ALL SELECT 'REPORT_INVENTORY' UNION ALL SELECT 'REPORT_AR_AGING' UNION ALL SELECT 'REPORT_AP_AGING' UNION ALL SELECT 'REPORT_PNL' UNION ALL SELECT 'REPORT_BALANCE_SHEET' UNION ALL SELECT 'REPORT_TRIAL_BALANCE' UNION ALL SELECT 'REPORT_GL_DETAIL' UNION ALL SELECT 'REPORT_EXPORT' UNION ALL
  SELECT 'USER_VIEW' UNION ALL SELECT 'USER_CREATE' UNION ALL SELECT 'USER_EDIT' UNION ALL SELECT 'USER_DELETE' UNION ALL
  SELECT 'ROLE_VIEW' UNION ALL SELECT 'ROLE_EDIT' UNION ALL
  SELECT 'PERIOD_LOCK_CREATE' UNION ALL
  SELECT 'AUDIT_LOG_VIEW' UNION ALL
  SELECT 'SETTINGS_VIEW' UNION ALL SELECT 'SETTINGS_EDIT' UNION ALL
  SELECT 'APPROVAL_DISCOUNT' UNION ALL SELECT 'APPROVAL_ADJUSTMENT' UNION ALL SELECT 'APPROVAL_VOID'
) p
WHERE r.code = 'ADMIN';

-- OWNER permissions
INSERT INTO role_permissions (role_id, perm_code)
SELECT r.id, p.perm_code FROM roles r
CROSS JOIN (
  SELECT 'DASHBOARD_VIEW' AS perm_code UNION ALL
  SELECT 'CUSTOMER_VIEW' UNION ALL SELECT 'SUPPLIER_VIEW' UNION ALL SELECT 'ITEM_VIEW' UNION ALL SELECT 'COA_VIEW' UNION ALL
  SELECT 'SALES_INVOICE_VIEW' UNION ALL SELECT 'SALES_PAYMENT_VIEW' UNION ALL SELECT 'SALES_CREDIT_NOTE_VIEW' UNION ALL
  SELECT 'PURCHASE_RECEIPT_VIEW' UNION ALL SELECT 'PURCHASE_BILL_VIEW' UNION ALL SELECT 'PURCHASE_PAYMENT_VIEW' UNION ALL
  SELECT 'INVENTORY_VIEW' UNION ALL SELECT 'JOURNAL_VIEW' UNION ALL
  SELECT 'REPORT_SALES' UNION ALL SELECT 'REPORT_PURCHASES' UNION ALL SELECT 'REPORT_INVENTORY' UNION ALL SELECT 'REPORT_AR_AGING' UNION ALL SELECT 'REPORT_AP_AGING' UNION ALL SELECT 'REPORT_PNL' UNION ALL SELECT 'REPORT_BALANCE_SHEET' UNION ALL SELECT 'REPORT_TRIAL_BALANCE' UNION ALL SELECT 'REPORT_GL_DETAIL' UNION ALL SELECT 'REPORT_EXPORT' UNION ALL
  SELECT 'APPROVAL_DISCOUNT' UNION ALL SELECT 'APPROVAL_ADJUSTMENT' UNION ALL SELECT 'APPROVAL_VOID'
) p
WHERE r.code = 'OWNER';

-- FINANCE permissions
INSERT INTO role_permissions (role_id, perm_code)
SELECT r.id, p.perm_code FROM roles r
CROSS JOIN (
  SELECT 'DASHBOARD_VIEW' AS perm_code UNION ALL
  SELECT 'CUSTOMER_VIEW' UNION ALL SELECT 'SUPPLIER_VIEW' UNION ALL SELECT 'ITEM_VIEW' UNION ALL SELECT 'COA_VIEW' UNION ALL SELECT 'COA_CREATE' UNION ALL SELECT 'COA_EDIT' UNION ALL SELECT 'TAX_VIEW' UNION ALL
  SELECT 'SALES_INVOICE_VIEW' UNION ALL SELECT 'SALES_INVOICE_POST' UNION ALL SELECT 'SALES_INVOICE_VOID' UNION ALL
  SELECT 'SALES_PAYMENT_VIEW' UNION ALL SELECT 'SALES_PAYMENT_CREATE' UNION ALL
  SELECT 'SALES_CREDIT_NOTE_VIEW' UNION ALL SELECT 'SALES_CREDIT_NOTE_POST' UNION ALL
  SELECT 'PURCHASE_RECEIPT_VIEW' UNION ALL SELECT 'PURCHASE_RECEIPT_POST' UNION ALL
  SELECT 'PURCHASE_BILL_VIEW' UNION ALL SELECT 'PURCHASE_BILL_POST' UNION ALL
  SELECT 'PURCHASE_PAYMENT_VIEW' UNION ALL SELECT 'PURCHASE_PAYMENT_CREATE' UNION ALL
  SELECT 'INVENTORY_VIEW' UNION ALL SELECT 'INVENTORY_ADJUSTMENT_POST' UNION ALL SELECT 'INVENTORY_OPNAME_POST' UNION ALL
  SELECT 'JOURNAL_VIEW' UNION ALL SELECT 'JOURNAL_MANUAL_CREATE' UNION ALL
  SELECT 'REPORT_SALES' UNION ALL SELECT 'REPORT_PURCHASES' UNION ALL SELECT 'REPORT_INVENTORY' UNION ALL SELECT 'REPORT_AR_AGING' UNION ALL SELECT 'REPORT_AP_AGING' UNION ALL SELECT 'REPORT_PNL' UNION ALL SELECT 'REPORT_BALANCE_SHEET' UNION ALL SELECT 'REPORT_TRIAL_BALANCE' UNION ALL SELECT 'REPORT_GL_DETAIL' UNION ALL SELECT 'REPORT_EXPORT' UNION ALL
  SELECT 'PERIOD_LOCK_CREATE' UNION ALL SELECT 'AUDIT_LOG_VIEW'
) p
WHERE r.code = 'FINANCE';

-- SALES permissions
INSERT INTO role_permissions (role_id, perm_code)
SELECT r.id, p.perm_code FROM roles r
CROSS JOIN (
  SELECT 'DASHBOARD_VIEW' AS perm_code UNION ALL
  SELECT 'CUSTOMER_VIEW' UNION ALL SELECT 'CUSTOMER_CREATE' UNION ALL SELECT 'CUSTOMER_EDIT' UNION ALL
  SELECT 'ITEM_VIEW' UNION ALL
  SELECT 'SALES_INVOICE_VIEW' UNION ALL SELECT 'SALES_INVOICE_CREATE' UNION ALL SELECT 'SALES_INVOICE_EDIT' UNION ALL
  SELECT 'SALES_PAYMENT_VIEW' UNION ALL
  SELECT 'SALES_CREDIT_NOTE_VIEW' UNION ALL SELECT 'SALES_CREDIT_NOTE_CREATE' UNION ALL
  SELECT 'INVENTORY_VIEW' UNION ALL
  SELECT 'REPORT_SALES' UNION ALL SELECT 'REPORT_AR_AGING'
) p
WHERE r.code = 'SALES';

-- WAREHOUSE permissions
INSERT INTO role_permissions (role_id, perm_code)
SELECT r.id, p.perm_code FROM roles r
CROSS JOIN (
  SELECT 'DASHBOARD_VIEW' AS perm_code UNION ALL
  SELECT 'ITEM_VIEW' UNION ALL SELECT 'ITEM_CREATE' UNION ALL SELECT 'ITEM_EDIT' UNION ALL
  SELECT 'SALES_INVOICE_VIEW' UNION ALL
  SELECT 'PURCHASE_RECEIPT_VIEW' UNION ALL SELECT 'PURCHASE_RECEIPT_CREATE' UNION ALL
  SELECT 'INVENTORY_VIEW' UNION ALL SELECT 'INVENTORY_ADJUSTMENT_CREATE' UNION ALL SELECT 'INVENTORY_OPNAME_CREATE' UNION ALL
  SELECT 'REPORT_INVENTORY'
) p
WHERE r.code = 'WAREHOUSE';

-- PURCHASING permissions
INSERT INTO role_permissions (role_id, perm_code)
SELECT r.id, p.perm_code FROM roles r
CROSS JOIN (
  SELECT 'DASHBOARD_VIEW' AS perm_code UNION ALL
  SELECT 'SUPPLIER_VIEW' UNION ALL SELECT 'SUPPLIER_CREATE' UNION ALL SELECT 'SUPPLIER_EDIT' UNION ALL
  SELECT 'ITEM_VIEW' UNION ALL
  SELECT 'PURCHASE_RECEIPT_VIEW' UNION ALL SELECT 'PURCHASE_RECEIPT_CREATE' UNION ALL
  SELECT 'PURCHASE_BILL_VIEW' UNION ALL SELECT 'PURCHASE_BILL_CREATE' UNION ALL
  SELECT 'PURCHASE_PAYMENT_VIEW' UNION ALL
  SELECT 'INVENTORY_VIEW' UNION ALL
  SELECT 'REPORT_PURCHASES' UNION ALL SELECT 'REPORT_AP_AGING' UNION ALL SELECT 'REPORT_INVENTORY'
) p
WHERE r.code = 'PURCHASING';

-- -----------------------------------------------------------------------------
-- 10. Bank Accounts
-- -----------------------------------------------------------------------------

INSERT INTO bank_accounts (account_name, account_number, bank_name, account_type, coa_id) VALUES
('Kas Kecil', NULL, NULL, 'CASH', (SELECT id FROM chart_of_accounts WHERE account_code = '1110')),
('BCA', '1234567890', 'Bank Central Asia', 'BANK', (SELECT id FROM chart_of_accounts WHERE account_code = '1120')),
('Mandiri', '0987654321', 'Bank Mandiri', 'BANK', (SELECT id FROM chart_of_accounts WHERE account_code = '1121')),
('QRIS/GoPay', NULL, NULL, 'QRIS', (SELECT id FROM chart_of_accounts WHERE account_code = '1130'));

-- -----------------------------------------------------------------------------
-- 11. Number Sequences
-- -----------------------------------------------------------------------------

INSERT INTO number_sequences (sequence_key, prefix, next_number, number_length, reset_period) VALUES
('SALES_INVOICE', 'INV', 1, 6, 'YEARLY'),
('SALES_PAYMENT', 'RCV', 1, 6, 'YEARLY'),
('CREDIT_NOTE', 'CN', 1, 6, 'YEARLY'),
('PURCHASE_RECEIPT', 'GRN', 1, 6, 'YEARLY'),
('PURCHASE_BILL', 'BILL', 1, 6, 'YEARLY'),
('PURCHASE_PAYMENT', 'PAY', 1, 6, 'YEARLY'),
('DEBIT_NOTE', 'DN', 1, 6, 'YEARLY'),
('ADJUSTMENT', 'ADJ', 1, 6, 'YEARLY'),
('OPNAME', 'OPN', 1, 6, 'YEARLY'),
('JOURNAL', 'JV', 1, 6, 'YEARLY'),
('CUSTOMER', 'C', 1, 5, 'NEVER'),
('SUPPLIER', 'S', 1, 5, 'NEVER'),
('ITEM', 'I', 1, 5, 'NEVER');

-- -----------------------------------------------------------------------------
-- 12. Application Settings
-- -----------------------------------------------------------------------------

INSERT INTO app_settings (setting_key, setting_value, setting_type, description) VALUES
('company_name', 'SAL Trading Company', 'string', 'Company name for documents'),
('company_address', 'Jl. Contoh No. 123, Jakarta', 'string', 'Company address'),
('company_phone', '021-12345678', 'string', 'Company phone'),
('company_email', 'info@sal-system.local', 'string', 'Company email'),
('company_npwp', '00.000.000.0-000.000', 'string', 'Company tax ID'),
('no_negative_stock', 'true', 'boolean', 'Prevent posting if stock becomes negative'),
('default_terms_days', '30', 'number', 'Default payment terms in days'),
('default_currency', 'IDR', 'string', 'Default currency code'),
('fiscal_year_start', '01', 'string', 'Fiscal year start month (01-12)'),
('approval_discount_threshold', '20', 'number', 'Discount % requiring approval'),
('approval_adjustment_threshold', '5000000', 'number', 'Adjustment value requiring approval'),
('invoice_footer', 'Terima kasih atas kepercayaan Anda.', 'string', 'Default invoice footer text');

-- -----------------------------------------------------------------------------
-- 13. Sample Data - Customers
-- -----------------------------------------------------------------------------

INSERT INTO customers (customer_code, name, email, phone, billing_address, group_id, terms_days, credit_limit, tax_code) VALUES
('C00001', 'Restoran Sederhana', 'sederhana@email.com', '08111222333', 'Jl. Makanan No. 1, Jakarta', 
  (SELECT id FROM customer_groups WHERE code = 'HORECA'), 30, 50000000, 'PPN11'),
('C00002', 'Toko Sembako Jaya', 'sembakojaya@email.com', '08222333444', 'Jl. Pasar No. 2, Bandung',
  (SELECT id FROM customer_groups WHERE code = 'RESELLER'), 14, 25000000, 'PPN11'),
('C00003', 'Hotel Bintang Lima', 'purchasing@hotelbintang5.com', '08333444555', 'Jl. Mewah No. 3, Bali',
  (SELECT id FROM customer_groups WHERE code = 'HORECA'), 45, 100000000, 'PPN11'),
('C00004', 'Warung Bu Siti', 'busiti@email.com', '08444555666', 'Jl. Gang Kecil No. 4, Surabaya',
  (SELECT id FROM customer_groups WHERE code = 'RETAIL'), 0, 0, 'NON');

-- -----------------------------------------------------------------------------
-- 14. Sample Data - Suppliers
-- -----------------------------------------------------------------------------

INSERT INTO suppliers (supplier_code, name, email, phone, address, terms_days, tax_code) VALUES
('S00001', 'PT Sumber Pangan', 'order@sumberpangan.com', '021-5551234', 'Kawasan Industri MM2100, Bekasi', 30, 'PPN11'),
('S00002', 'CV Sayur Segar', 'sayursegar@email.com', '022-5554321', 'Pasar Induk Caringin, Bandung', 7, 'NON'),
('S00003', 'PT Daging Prima', 'sales@dagingprima.com', '021-5559876', 'Tangerang, Banten', 14, 'PPN11');

-- -----------------------------------------------------------------------------
-- 15. Sample Data - Items
-- -----------------------------------------------------------------------------

INSERT INTO items (sku, name, category_id, uom_id, avg_cost, selling_price, min_stock, tax_code, is_sellable, is_purchasable) VALUES
('FD-001', 'Beras Premium 5kg', (SELECT id FROM item_categories WHERE code = 'DRY'), (SELECT id FROM units_of_measure WHERE code = 'BAG'), 65000, 80000, 50, 'NON', 1, 1),
('FD-002', 'Minyak Goreng 2L', (SELECT id FROM item_categories WHERE code = 'DRY'), (SELECT id FROM units_of_measure WHERE code = 'BTL'), 28000, 35000, 100, 'NON', 1, 1),
('FD-003', 'Gula Pasir 1kg', (SELECT id FROM item_categories WHERE code = 'DRY'), (SELECT id FROM units_of_measure WHERE code = 'PAK'), 14000, 17000, 100, 'NON', 1, 1),
('BV-001', 'Air Mineral 600ml (box)', (SELECT id FROM item_categories WHERE code = 'BEVERAGE'), (SELECT id FROM units_of_measure WHERE code = 'CTN'), 45000, 55000, 50, 'PPN11', 1, 1),
('BV-002', 'Teh Botol 450ml (box)', (SELECT id FROM item_categories WHERE code = 'BEVERAGE'), (SELECT id FROM units_of_measure WHERE code = 'CTN'), 85000, 100000, 30, 'PPN11', 1, 1),
('DY-001', 'Susu UHT Full Cream 1L', (SELECT id FROM item_categories WHERE code = 'DAIRY'), (SELECT id FROM units_of_measure WHERE code = 'CTN'), 220000, 260000, 20, 'NON', 1, 1),
('MT-001', 'Ayam Potong Whole', (SELECT id FROM item_categories WHERE code = 'MEAT'), (SELECT id FROM units_of_measure WHERE code = 'KG'), 35000, 42000, 50, 'NON', 1, 1),
('MT-002', 'Daging Sapi Has Dalam', (SELECT id FROM item_categories WHERE code = 'MEAT'), (SELECT id FROM units_of_measure WHERE code = 'KG'), 130000, 155000, 20, 'NON', 1, 1),
('SF-001', 'Udang Vaname Size 40', (SELECT id FROM item_categories WHERE code = 'SEAFOOD'), (SELECT id FROM units_of_measure WHERE code = 'KG'), 85000, 100000, 20, 'NON', 1, 1),
('CD-001', 'Kecap Manis 600ml', (SELECT id FROM item_categories WHERE code = 'CONDIMENT'), (SELECT id FROM units_of_measure WHERE code = 'BTL'), 18000, 22000, 50, 'PPN11', 1, 1);

-- Initialize item_stock for all items
INSERT INTO item_stock (item_id, on_hand, stock_value)
SELECT id, 0, 0 FROM items;
