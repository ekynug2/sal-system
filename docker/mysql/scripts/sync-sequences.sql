-- =============================================================================
-- SAL Accounting System - Sync Number Sequences
-- Run this script to sync sequences with existing data
-- =============================================================================

-- Sync CUSTOMER sequence
UPDATE number_sequences 
SET next_number = (
    SELECT COALESCE(MAX(CAST(SUBSTRING(customer_code, 2) AS UNSIGNED)), 0) + 1 
    FROM customers
)
WHERE sequence_key = 'CUSTOMER';

-- Sync SUPPLIER sequence  
UPDATE number_sequences 
SET next_number = (
    SELECT COALESCE(MAX(CAST(SUBSTRING(supplier_code, 2) AS UNSIGNED)), 0) + 1 
    FROM suppliers
)
WHERE sequence_key = 'SUPPLIER';

-- Verify the updates
SELECT sequence_key, prefix, next_number, number_length 
FROM number_sequences 
WHERE sequence_key IN ('CUSTOMER', 'SUPPLIER', 'ITEM');
