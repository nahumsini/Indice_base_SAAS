-- A public-link audience and the authenticated employee channel are independent.
-- Multi-kiosk composition grants no authority: runtime still intersects membership,
-- module/tab permissions, organizational scope and each module adapter's invariants.

UPDATE kiosk_definitions definition
JOIN finance_payable_kiosks payable_kiosk
  ON payable_kiosk.company_id = definition.company_id
 AND payable_kiosk.id = definition.legacy_reference_id
SET definition.employee_center_enabled = CASE
        WHEN UPPER(TRIM(payable_kiosk.access_type)) IN ('MIXED', 'EMPLOYEE') THEN 1
        ELSE 0
    END,
    definition.employee_assignment_policy = 'SCOPE'
WHERE definition.owner_module = 'EXPENSES'
  AND definition.kiosk_type = 'accounts_payable';

UPDATE kiosk_definitions
SET employee_center_enabled = 1,
    employee_assignment_policy = 'SCOPE'
WHERE owner_module = 'PETTY_CASH'
  AND kiosk_type = 'receipt_capture';

UPDATE kiosk_definitions
SET employee_center_enabled = 1,
    employee_assignment_policy = 'SCOPE'
WHERE owner_module = 'POINT_OF_SALE'
  AND kiosk_type IN (
    'self_service',
    'self_checkout',
    'waiter_station',
    'table_order_center',
    'kitchen_display'
  );

UPDATE kiosk_definitions
SET employee_center_enabled = 0
WHERE owner_module = 'POINT_OF_SALE'
  AND kiosk_type = 'customer_display';
