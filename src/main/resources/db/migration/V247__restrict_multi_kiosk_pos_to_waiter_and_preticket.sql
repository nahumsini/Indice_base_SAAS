-- The mobile Multi-kiosk is an operational launcher, not the full POS application.
-- Only waiter stations and pre-ticket creation are exposed through its employee channel.

UPDATE kiosk_definitions
SET employee_center_enabled = 1,
    employee_assignment_policy = 'SCOPE'
WHERE owner_module = 'POINT_OF_SALE'
  AND kiosk_type IN ('self_service', 'waiter_station');

UPDATE kiosk_definitions
SET employee_center_enabled = 0,
    employee_assignment_policy = 'EXPLICIT'
WHERE owner_module = 'POINT_OF_SALE'
  AND kiosk_type IN ('self_checkout', 'table_order_center', 'kitchen_display', 'customer_display');
